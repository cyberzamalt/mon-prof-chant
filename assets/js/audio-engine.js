<script>
/*!
 * audio-engine.js — câblage UI + audio + détection + dessin
 * Boutons: Activer micro, Enregistrer/Stop, modes: Absolu / A440 / Auto
 */
(function(){
  const VISIBLE_WINDOW = 30;
  const MIN_HZ=60, MAX_HZ=1200;
  const DETECT_SIZE=2048;

  // DOM
  const $ = sel => document.querySelector(sel);
  const logBox = $('#logBox');
  const canvas = $('#canvasRec');
  const ctx = canvas.getContext('2d');
  const btnMic = $('#btnMic');
  const btnRec = $('#btnRec');
  const btnStop = $('#btnStop');
  const btnAbs = $('#btnAbs'); const btnA440 = $('#btnA440'); const btnAuto = $('#btnAuto');
  const badge = $('#badge');

  // Log
  function log(lvl,msg){
    const n=new Date(),h=String(n.getHours()).padStart(2,'0'),m=String(n.getMinutes()).padStart(2,'0'),s=String(n.getSeconds()).padStart(2,'0');
    logBox.textContent += `[${h}:${m}:${s}] [${lvl}] ${msg}\n`;
    logBox.scrollTop = logBox.scrollHeight;
  }

  // State
  let audioCtx=null, analyser=null, micStream=null, mediaRecorder=null;
  let detector=null, smoother=null, anaBuf=null;
  let recStart=0, rafId=null, monitorOn=false;
  let scaleMode='abs';
  let points=[]; // {t,hz}
  let lastBaseSec=-1;

  // Init Detector + Smoother
  function initDetector(){
    if (!window.YinDetector){ badge.textContent='Détecteur: ERREUR (yin-detector.js non chargé)'; badge.className='badge err'; log('ERROR','YinDetector introuvable (vérifier chemin ./assets/vendor/yin-detector.js)'); return false; }
    detector = new YinDetector(audioCtx.sampleRate, DETECT_SIZE);
    detector.setThreshold(0.06);
    anaBuf = new Float32Array(DETECT_SIZE);
    badge.textContent='Détecteur: OK'; badge.className='badge ok';
    log('INFO','YinDetector initialisé');
    return true;
  }
  function initSmoother(){
    if (!window.PitchSmoother){ log('WARN','PitchSmoother indisponible → pas de lissage'); return; }
    smoother = new PitchSmoother({medianWindowSize:5, smoothingFactor:0.75, maxJumpHz:250});
    log('INFO','PitchSmoother initialisé (median=5, smooth=0.75, jump=250)');
  }

  // Audio
  async function ensureAudio(){
    if (!audioCtx){ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); log('INFO','AudioContext créé'); }
    if (audioCtx.state==='suspended'){ await audioCtx.resume(); log('INFO','AudioContext repris'); }
  }
  async function activateMic(){
    try{
      await ensureAudio();
      if(!micStream){
        micStream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
        log('INFO','Micro autorisé');
      }
      if(!analyser){
        const src = audioCtx.createMediaStreamSource(micStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = DETECT_SIZE; analyser.smoothingTimeConstant = 0;
        src.connect(analyser);
        log('INFO',`Analyser connecté (${DETECT_SIZE})`);
      }
      if (!initDetector()) return;
      initSmoother();
      monitorOn = true; recStart = audioCtx.currentTime;
      startLoop();
    }catch(e){ log('ERROR', 'activateMic: '+e.message); }
  }

  // Dessin
  function draw(now){
    const w=canvas.width, h=canvas.height, left=60,right=20,drawW=w-left-right;
    const t0 = Math.max(0, now - VISIBLE_WINDOW);
    const baseSec = Math.floor(t0);
    if (baseSec !== lastBaseSec){
      DrawUtils.drawBase(ctx, w, h, t0, VISIBLE_WINDOW);
      lastBaseSec = baseSec;
    } else {
      // recoller la base sans la recomposer
      DrawUtils.drawBase(ctx, w, h, t0, VISIBLE_WINDOW);
    }
    const pts = points.filter(p=>p.t>=t0);
    if(!pts.length) return;
    const minMidi = DrawUtils.hzToMidi(MIN_HZ), maxMidi = DrawUtils.hzToMidi(MAX_HZ);
    const mapped = pts.map(p=>{
      const x = left + ((p.t - t0)/VISIBLE_WINDOW) * drawW;
      const y = DrawUtils.mapPitchToY(p.hz, h, scaleMode, minMidi, maxMidi);
      return {x,y};
    });
    ctx.strokeStyle='#3b82f6'; ctx.lineWidth=3.5; ctx.lineCap='round'; ctx.lineJoin='round';
    DrawUtils.drawSmooth(ctx, mapped, 0.5);
  }

  // Boucle
  function startLoop(){
    if (rafId) return;
    const tick = ()=>{
      try{
        if (analyser && detector){
          analyser.getFloatTimeDomainData(anaBuf);
          const hz = detector.detect(anaBuf);
          if (hz>0 && hz>=MIN_HZ && hz<=MAX_HZ){
            const sm = smoother ? smoother.smooth(hz) : hz;
            if (sm && sm>0){
              const t = audioCtx.currentTime - recStart;
              points.push({t, hz: sm});
              // purge fenêtre glissante
              const cut = t - VISIBLE_WINDOW - 0.5;
              while(points.length && points[0].t < cut) points.shift();
            }
          }
        }
      }catch(e){ /* ignore frame error */ }
      const now = audioCtx ? (audioCtx.currentTime - recStart) : 0;
      draw(now);
      if (monitorOn) rafId = requestAnimationFrame(tick); else rafId=null;
    };
    DrawUtils.drawBase(ctx, canvas.width, canvas.height, 0, VISIBLE_WINDOW);
    rafId = requestAnimationFrame(tick);
  }

  // Record (simple: on/stop, exports pourront revenir après)
  async function startRec(){
    if (!micStream) return log('WARN','Active d’abord le micro');
    try{
      await ensureAudio();
      mediaRecorder = new MediaRecorder(micStream, {mimeType:'audio/webm;codecs=opus', audioBitsPerSecond:128000});
      mediaRecorder.ondataavailable = ()=>{};
      mediaRecorder.start(100);
      log('INFO','Enregistrement démarré');
    }catch(e){ log('ERROR','startRec: '+e.message); }
  }
  function stopRec(){
    try{
      if (mediaRecorder && mediaRecorder.state==='recording'){ mediaRecorder.stop(); log('INFO','Enregistrement arrêté'); }
    }catch(e){ log('ERROR','stopRec: '+e.message); }
  }

  // UI
  btnMic?.addEventListener('click', activateMic);
  btnRec?.addEventListener('click', startRec);
  btnStop?.addEventListener('click', stopRec);

  function setMode(m){
    scaleMode=m;
    btnAbs.classList.toggle('active', m==='abs');
    btnA440.classList.toggle('active', m==='a440');
    btnAuto.classList.toggle('active', m==='auto');
  }
  btnAbs?.addEventListener('click', ()=>setMode('abs'));
  btnA440?.addEventListener('click', ()=>setMode('a440'));
  btnAuto?.addEventListener('click', ()=>setMode('auto'));

  // Boot
  log('INFO','Interface prête — Live 30s, fenêtre 2048, modes de hauteur OK');
})();
</script>
