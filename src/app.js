// src/app.js
(function () {
  "use strict";

  // ------- DOM -------
  const logBox = document.getElementById("logBox");
  const canvas = document.getElementById("canvasRec");
  const ctx = canvas.getContext("2d");
  const btnMic = document.getElementById("btnMic");
  const btnRecStart = document.getElementById("btnRecStart");
  const btnRecStop = document.getElementById("btnRecStop");
  const btnScaleAbs = document.getElementById("btnScaleAbs");
  const btnMode440 = document.getElementById("btnMode440");
  const btnModeAuto = document.getElementById("btnModeAuto");
  const badge = document.getElementById("pitchyStatus");

  // ------- Log -------
  function log(lvl, msg){
    const t = new Date().toTimeString().slice(0,8);
    logBox.textContent += `[${t}] [${lvl}] ${msg}\n`;
    logBox.scrollTop = logBox.scrollHeight;
  }

  // ------- State -------
  let audioCtx = null;
  let analyser = null;
  let micStream = null;
  let mediaRecorder = null;
  let chunks = [];
  let detector = null;
  let smoother = null;
  let rafId = 0;

  // rendu
  const points = []; // {t, cents|midi}
  const VISIBLE = 30; // s
  const MIN_HZ = 60, MAX_HZ = 1200;
  const DETECT_SIZE = 2048;

  let scaleMode = "abs"; // 'abs' | 'a440' | 'auto'
  const Y_RANGE_CENTS = 200;

  // ------- Helpers -------
  const hzToMidi = (hz) => 69 + 12 * Math.log2(hz / 440);
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  function centsFrom(hz, mode){
    if (mode === "a440") return 1200 * Math.log2(hz / 440);
    const midi = Math.round(hzToMidi(hz));
    const baseHz = 440 * Math.pow(2, (midi - 69) / 12);
    return 1200 * Math.log2(hz / baseHz);
  }
  function mapPitchToY(hz, h){
    if (scaleMode === "abs") {
      const MIDI_MIN = hzToMidi(MIN_HZ), MIDI_MAX = hzToMidi(MAX_HZ);
      const top=20, bottom=h-40;
      const n = clamp((hzToMidi(hz)-MIDI_MIN)/(MIDI_MAX-MIDI_MIN),0,1);
      return bottom - n*(bottom-top);
    } else {
      const cents = clamp(centsFrom(hz, scaleMode), -Y_RANGE_CENTS, Y_RANGE_CENTS);
      const H = h - 60; const mid = h/2;
      const pxPerCent = H / (2 * Y_RANGE_CENTS);
      return mid - cents * pxPerCent;
    }
  }
  function fmtTime(secs){ const m=String(Math.floor(secs/60)).padStart(2,"0"); const s=String(Math.floor(secs%60)).padStart(2,"0"); return `${m}:${s}`; }

  // ------- Draw -------
  const base = document.createElement("canvas"); base.width = canvas.width; base.height = canvas.height;
  let lastSec = -1;
  function drawBase(t0) {
    const w=base.width, h=base.height; const b=base.getContext("2d");
    b.clearRect(0,0,w,h);
    b.fillStyle="#0b1324"; b.fillRect(0,0,w,h);

    // lignes
    b.strokeStyle="#1a2642"; b.lineWidth=0.5;
    for (let i=0;i<6;i++){ const y=(h-40)/5*i+20; b.beginPath(); b.moveTo(0,y); b.lineTo(w,y); b.stroke(); }
    // ligne centrale
    b.strokeStyle="#10b981"; b.setLineDash([4,4]); b.lineWidth=2;
    b.beginPath(); b.moveTo(0,h/2); b.lineTo(w,h/2); b.stroke(); b.setLineDash([]);

    // temps
    const left=60, right=20, drawW=w-left-right;
    const start = Math.floor(t0);
    b.strokeStyle="#22304f"; b.lineWidth=0.5; b.fillStyle="#9ca3af"; b.font="10px monospace"; b.textAlign="center";
    for (let s=start; s<=t0+VISIBLE; s+=1) {
      const x = left + ((s - t0)/VISIBLE)*drawW;
      if (x>=left && x<=w-right) {
        b.beginPath(); b.moveTo(x,0); b.lineTo(x,h); b.stroke();
        if (s%5===0) b.fillText(fmtTime(s), x, h-6);
      }
    }

    // labels gauche
    b.fillStyle="#9ca3af"; b.font="9px monospace"; b.textAlign="left";
    const labels=['🔝 Très très aigu','Très aigu','Aigu','Moyen aigu','🎯 Milieu','Moyen grave','Grave','Très grave','🔻 Très très grave'];
    const pos=[0.05,0.18,0.30,0.42,0.50,0.58,0.70,0.82,0.95];
    for(let i=0;i<labels.length;i++){
      const y = pos[i]*(h-60)+20;
      b.fillText(labels[i],2,y+3);
      b.strokeStyle="#2a3a54"; b.lineWidth=0.5;
      b.beginPath(); b.moveTo(0,y); b.lineTo(58,y); b.stroke();
    }
  }

  function draw(tNow){
    const w=canvas.width, h=canvas.height, left=60,right=20,drawW=w-left-right;
    const t0 = Math.max(0, tNow - VISIBLE);
    if (Math.floor(t0) !== lastSec){ drawBase(t0); lastSec = Math.floor(t0); }

    ctx.clearRect(0,0,w,h);
    ctx.drawImage(base,0,0);

    // points visibles
    const vis = points.filter(p=>p.t>=t0);
    if (!vis.length) return;

    // courbe lisse
    ctx.strokeStyle=getComputedStyle(document.body).getPropertyValue('--blue').trim()||'#3b82f6';
    ctx.lineWidth=3; ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.beginPath();
    for (let i=0;i<vis.length;i++){
      const x = left + ((vis[i].t - t0)/VISIBLE)*drawW;
      const y = mapPitchToY(vis[i].hz, h);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  // ------- Audio -------
  async function ensureAudio(){ 
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") await audioCtx.resume();
  }

  async function activateMic(){
    try{
      await ensureAudio();
      micStream = await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}
      });
      const src = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = DETECT_SIZE;
      analyser.smoothingTimeConstant = 0;
      src.connect(analyser);

      // Détecteur + lisseur
      if (typeof YinDetector === "undefined") {
        badge.textContent = "Détecteur: ERREUR (yin-detector.js non chargé)";
        badge.className = "badge err";
        log("ERROR","YinDetector introuvable (vérifie chemin ./src/vendor/yin-detector.js)");
        return;
      }
      detector = new YinDetector(audioCtx.sampleRate, DETECT_SIZE);
      detector.threshold = 0.06;
      smoother = new PitchSmoother({ medianWindowSize:5, smoothingFactor:0.76, maxPitchJump:250 });

      badge.textContent = "Détecteur: OK";
      badge.className = "badge ok";
      btnRecStart.disabled = false;

      startMonitor();
      log("INFO","Micro OK, analyseur prêt ("+DETECT_SIZE+")");
    }catch(e){
      log("ERROR","activateMic: "+e.message);
      badge.textContent = "Détecteur: ERREUR";
      badge.className = "badge err";
    }
  }

  function startMonitor(){
    if (!detector || !analyser) return;
    if (rafId) cancelAnimationFrame(rafId);
    const buf = new Float32Array(DETECT_SIZE);
    const t0 = audioCtx.currentTime;

    const loop = ()=>{
      analyser.getFloatTimeDomainData(buf);
      const hz = detector.detect(buf);
      if (hz && hz >= MIN_HZ && hz <= MAX_HZ) {
        const sm = smoother ? smoother.smooth(hz) : hz;
        if (sm) {
          const t = audioCtx.currentTime - t0;
          points.push({t, hz: sm});
          // fenêtre glissante
          const cut = t - (VISIBLE+0.5);
          while(points.length && points[0].t < cut) points.shift();
        }
      }
      draw(audioCtx.currentTime - t0);
      rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  // ------- Record (simple) -------
  function startRec(){
    if (!micStream) return log("WARN","Active d'abord le micro");
    try{
      chunks.length = 0;
      mediaRecorder = new MediaRecorder(micStream, {mimeType:"audio/webm;codecs=opus"});
      mediaRecorder.ondataavailable = e=>{ if (e.data && e.data.size>0) chunks.push(e.data); };
      mediaRecorder.start(100);
      btnRecStart.disabled = true; btnRecStop.disabled = false;
      log("INFO","Enregistrement démarré");
    }catch(e){ log("ERROR","startRec: "+e.message); }
  }
  function stopRec(){
    try{
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        btnRecStart.disabled = false; btnRecStop.disabled = true;
        log("INFO","Enregistrement terminé ("+chunks.length+" segments)");
      }
    }catch(e){ log("ERROR","stopRec: "+e.message); }
  }

  // ------- UI events -------
  btnMic.addEventListener("click", activateMic);
  btnRecStart.addEventListener("click", startRec);
  btnRecStop.addEventListener("click", stopRec);

  btnScaleAbs.addEventListener("click", ()=>{ scaleMode="abs"; btnScaleAbs.classList.add("active"); btnMode440.classList.remove("active"); btnModeAuto.classList.remove("active"); });
  btnMode440.addEventListener("click", ()=>{ scaleMode="a440"; btnMode440.classList.add("active"); btnScaleAbs.classList.remove("active"); btnModeAuto.classList.remove("active"); });
  btnModeAuto.addEventListener("click",  ()=>{ scaleMode="auto"; btnModeAuto.classList.add("active"); btnScaleAbs.classList.remove("active"); btnMode440.classList.remove("active"); });

  // Sanity check au chargement
  window.addEventListener("load", ()=>{
    if (typeof YinDetector === "undefined") {
      badge.textContent = "Détecteur: ERREUR (yin-detector.js non chargé)";
      badge.className = "badge err";
      log("ERROR","YinDetector non défini → chemin de script invalide (404 = 'expected expression, got <')");
    } else {
      log("INFO","Interface prête — Live 30s, fenêtre 2048");
    }
  });
})();
