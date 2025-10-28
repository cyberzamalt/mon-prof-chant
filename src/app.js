<script>
// --------------------------- CONSTS & STATE ---------------------------
const MIN_HZ = 60, MAX_HZ = 1200;
const DETECT_SIZE = 2048;               // meilleure stabilité que 512
const VISIBLE_WINDOW = 30;              // secondes visibles
const Y_RANGE_CENTS = 200;

let audioCtx = null, analyser = null, srcNode = null;
let yin = null, smoother = null;
let raf = null, recStart = 0, monitorOn = false;

const $ = s => document.querySelector(s);
const btnMic = $('#btnMic');
const btnRec = $('#btnRec');
const btnStop = $('#btnStop');
const badge = $('#badge');
const logBox = $('#log');
const canvas = $('#cv');
const ctx = canvas.getContext('2d');

const points = []; // {t, hz}

// --------------------------- LOG ---------------------------
function log(msg, lvl='INFO'){
  const n=new Date(), hh=String(n.getHours()).padStart(2,'0'),
        mm=String(n.getMinutes()).padStart(2,'0'),
        ss=String(n.getSeconds()).padStart(2,'0');
  logBox.textContent += `[${hh}:${mm}:${ss}] [${lvl}] ${msg}\n`;
  logBox.scrollTop = logBox.scrollHeight;
}

// --------------------------- DRAW ---------------------------
function fmtTime(s){ const m=Math.floor(s/60), ss=Math.floor(s%60); return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`; }
function hzToMidi(h){ return 69 + 12 * Math.log2(h/440); }
const MIDI_MIN = hzToMidi(MIN_HZ), MIDI_MAX = hzToMidi(MAX_HZ);

function drawBase(t0){
  const w=canvas.width, h=canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#0b1324'; ctx.fillRect(0,0,w,h);
  // lignes horizontales
  ctx.strokeStyle='#1a2642'; ctx.lineWidth=1;
  for(let i=0;i<8;i++){
    const y = 20 + i*((h-40)/7);
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
  }
  // 0 cent repère (centre)
  ctx.setLineDash([5,5]); ctx.strokeStyle='#10b981'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(0,h/2); ctx.lineTo(w,h/2); ctx.stroke(); ctx.setLineDash([]);

  // temps (1s)
  const left=50,right=10,drawW=w-left-right;
  ctx.strokeStyle='#22304f'; ctx.lineWidth=1;
  ctx.fillStyle='#9ca3af'; ctx.font='11px ui-monospace,monospace'; ctx.textAlign='center';
  const start = Math.floor(t0);
  for(let s=start; s<=t0+VISIBLE_WINDOW; s+=1){
    const x = left + ((s - t0)/VISIBLE_WINDOW) * drawW;
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
    if(s%5===0){ ctx.fillText(fmtTime(s), x, h-6); }
  }

  // labels simples à gauche
  ctx.fillStyle='#9ca3af'; ctx.font='10px ui-monospace,monospace'; ctx.textAlign='left';
  const labels = ['🔝 très aigu','aigu','moyen aigu','🎯 milieu','moyen grave','grave','très grave','🔻'];
  for(let i=0;i<labels.length;i++){
    const y = 20 + i*((h-40)/7);
    ctx.fillText(labels[i], 6, y-2);
  }
}
function mapMidiToY(midi, h){
  const top=20, bottom=h-28;
  const n = (midi - MIDI_MIN) / (MIDI_MAX - MIDI_MIN);
  return bottom - Math.min(1, Math.max(0, n)) * (bottom-top);
}
function drawCurve(tNow){
  const w=canvas.width, h=canvas.height;
  const left=50,right=10,drawW=w-left-right;
  const t0 = Math.max(0, tNow - VISIBLE_WINDOW);

  drawBase(t0);

  const pts = points.filter(p => p.t >= t0);
  if(!pts.length) return;

  ctx.strokeStyle='#3b82f6'; ctx.lineWidth=3.5; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath();
  for (let i=0;i<pts.length;i++){
    const p = pts[i];
    const x = left + ((p.t - t0)/VISIBLE_WINDOW) * drawW;
    const y = mapMidiToY(hzToMidi(p.hz), h);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.stroke();
}

// --------------------------- AUDIO ---------------------------
async function ensureAudio(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    log('AudioContext prêt ('+audioCtx.sampleRate+' Hz)');
  }
  if(audioCtx.state==='suspended') await audioCtx.resume();
}

async function initDetectorAndMic(){
  try{
    await ensureAudio();
    // flux micro
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation:false, noiseSuppression:false, autoGainControl:false }
    });
    srcNode = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = DETECT_SIZE;
    analyser.smoothingTimeConstant = 0;
    srcNode.connect(analyser);

    // YIN + smoother
    if(!window.YinDetector) throw new Error('yin-detector.js non chargé');
    yin = new YinDetector(audioCtx.sampleRate, DETECT_SIZE);
    if(!window.PitchSmoother) throw new Error('pitch-smoothing.js non chargé');
    smoother = new PitchSmoother({ medianWindowSize:5, smoothingFactor:0.75, maxPitchJump:250 });

    badge.textContent = 'Détecteur: OK';
    badge.className = 'badge ok';
    log('Détecteur initialisé - fenêtre '+DETECT_SIZE);
    btnRec.disabled = false;
    btnMic.disabled = true;
  }catch(err){
    badge.textContent = 'Détecteur: ERREUR (yin-detector.js non chargé)';
    badge.className = 'badge err';
    log('[ERROR] '+err.message, 'ERROR');
  }
}

// boucle live
const anaBuf = new Float32Array(DETECT_SIZE);
function tick(){
  analyser.getFloatTimeDomainData(anaBuf);
  const hz = yin.detect(anaBuf);
  const now = audioCtx.currentTime - recStart;

  if (hz && hz>=MIN_HZ && hz<=MAX_HZ){
    const sm = smoother.smooth(hz);
    if(sm){
      // fenêtre glissante
      points.push({t:now, hz:sm});
      const t0 = Math.max(0, now - VISIBLE_WINDOW - 0.5);
      while(points.length && points[0].t < t0) points.shift();
    }
  }

  drawCurve(now);
  if (monitorOn) raf = requestAnimationFrame(tick);
}

// --------------------------- UI ---------------------------
btnMic.addEventListener('click', initDetectorAndMic);

btnRec.addEventListener('click', ()=>{
  if(!yin || !analyser) return log('Active d’abord le micro', 'WARN');
  recStart = audioCtx.currentTime;
  points.length = 0;
  monitorOn = true;
  btnRec.disabled = true;
  btnStop.disabled = false;
  log('Live démarré');
  tick();
});

btnStop.addEventListener('click', ()=>{
  monitorOn = false;
  if (raf) cancelAnimationFrame(raf), raf=null;
  btnStop.disabled = true;
  btnRec.disabled = false;
  log('Live arrêté');
});

// init dessin
drawBase(0);
log('Interface prête — Live 30s, échelle ABS, fenêtre '+DETECT_SIZE);
</script>
