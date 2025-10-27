/* App — orchestre UI, YIN, smoothing, dessin */
(function () {
  // ----------- DOM
  const $ = (s) => document.querySelector(s);
  const logBox = $("#logBox");

  const ui = {
    btnMic: $("#btnMic"),
    btnStart: $("#btnRecStart"),
    btnStop: $("#btnRecStop"),
    btnMonOff: $("#btnMonOff"),
    btnMonOn: $("#btnMonOn"),
    tScaleAbs: $("#btnScaleAbs"),
    tA440: $("#btnMode440"),
    tAuto: $("#btnModeAuto"),
    status: $("#pitchyStatus"),
    timer: $("#timerRec"),
    canvasRec: $("#canvasRec"),
    canvasRef: $("#canvasRef"),
    debugRec: $("#debugRec"),
  };

  // ----------- Log
  function log(lvl, msg) {
    const n = new Date();
    const t = `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}:${String(n.getSeconds()).padStart(2, "0")}`;
    logBox.textContent += `[${t}] [${lvl}] ${msg}\n`;
    logBox.scrollTop = logBox.scrollHeight;
  }

  // ----------- État
  const STATE = {
    visibleWindow: 30,
    yCents: 200,
    minHz: 60,
    maxHz: 1200,
    detectSize: 2048,        // important pour stabilité & justesse
    scaleMode: "abs",        // 'abs' | 'a440' | 'auto'
    monitorOn: false,
    recStartT: 0,
    rafId: null,
    t0Base: -1,
    recorded: [],            // {t, hz}
    rawCount: 0,
    keptCount: 0,
    detector: null,
    smoother: null,
    anaBuf: null
  };

  function fmtTime(secs) {
    const mm = String((secs / 60) | 0).padStart(2, "0");
    const ss = String(Math.floor(secs % 60)).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  // ----------- Initialisation
  function setupUI() {
    ui.btnMic.onclick = async () => {
      try {
        await AudioEngine.activateMic({ fftSize: STATE.detectSize });
        log("INFO", `Analyser prêt (${STATE.detectSize})`);
        initDetector();
        initSmoother();
        STATE.recStartT = AudioEngine.ctx.currentTime;
        STATE.monitorOn = true;
        startLoop();
      } catch (e) {
        log("ERROR", "Mic: " + e.message);
      }
    };

    ui.btnStart.onclick = () => { STATE.recStartT = AudioEngine.ctx.currentTime; STATE.monitorOn = true; };
    ui.btnStop.onclick = () => { STATE.monitorOn = false; };
    ui.btnMonOn.onclick = () => { STATE.monitorOn = true; startLoop(); };
    ui.btnMonOff.onclick = () => { STATE.monitorOn = false; };

    ui.tScaleAbs.onclick = () => { setScale("abs"); };
    ui.tA440.onclick = () => { setScale("a440"); };
    ui.tAuto.onclick = () => { setScale("auto"); };

    setScale("abs");
    Graph.drawBase(ui.canvasRec, { t0: 0, windowSec: STATE.visibleWindow, yCents: STATE.yCents, labels: true });
    Graph.drawBase(ui.canvasRef, { duration: 1, yCents: STATE.yCents, labels: true });
    log("INFO", "Interface prête — Live 30s, échelle ABS, fenêtre 2048");
  }

  function setScale(mode) {
    STATE.scaleMode = mode;
    ui.tScaleAbs.classList.toggle("active", mode === "abs");
    ui.tA440.classList.toggle("active", mode === "a440");
    ui.tAuto.classList.toggle("active", mode === "auto");
  }

  function initDetector() {
    try {
      if (typeof window.YinDetector === "undefined") throw new Error("YinDetector is not defined (script non chargé ? chemin/casse ?)");
      STATE.detector = new window.YinDetector(AudioEngine.ctx.sampleRate, STATE.detectSize);
      STATE.detector.setThreshold(0.06);
      STATE.anaBuf = new Float32Array(STATE.detectSize);
      ui.status.textContent = "Détecteur: OK";
      ui.status.className = "badge ok";
      log("INFO", "Détecteur YIN initialisé (thr=0.06)");
    } catch (e) {
      ui.status.textContent = "Détecteur: ERREUR";
      ui.status.className = "badge err";
      log("ERROR", "initDetector: " + e.message);
    }
  }

  function initSmoother() {
    // Optionnel — utilise PitchSmoother si dispo, sinon EMA simple
    if (typeof window.PitchSmoother === "function") {
      STATE.smoother = new window.PitchSmoother({
        medianWindowSize: 5,
        smoothingFactor: 0.75,
        maxPitchJump: 250,
        minConfidence: 0.2
      });
      log("INFO", "PitchSmoother initialisé (median:5, smooth:0.75, jump:250)");
      return;
    }
    // fallback EMA
    let last = null, factor = 0.75;
    STATE.smoother = {
      smooth(hz) { last = last == null ? hz : (factor * hz + (1 - factor) * last); return last; },
      reset() { last = null; }
    };
    log("WARN", "PitchSmoother indisponible — EMA fallback");
  }

  // ----------- Boucle
  function startLoop() {
    if (!STATE.detector || !AudioEngine.analyser) return;
    if (STATE.rafId) return;

    const ctxRec = ui.canvasRec.getContext("2d");
    const left = 60, right = 20, w = ui.canvasRec.width, drawW = w - left - right;

    const tick = () => {
      try {
        AudioEngine.analyser.getFloatTimeDomainData(STATE.anaBuf);
        const hz = STATE.detector.detect(STATE.anaBuf);

        if (hz > 0 && hz >= STATE.minHz && hz <= STATE.maxHz) {
          STATE.rawCount++;
          const sm = STATE.smoother ? STATE.smoother.smooth(hz) : hz;
          if (sm && sm > 0) {
            const t = AudioEngine.ctx.currentTime - STATE.recStartT;
            STATE.recorded.push({ t, hz: sm });
            STATE.keptCount++;

            // fenêtrage glissant
            const t0cut = Math.max(0, t - STATE.visibleWindow - 0.5);
            while (STATE.recorded.length && STATE.recorded[0].t < t0cut) STATE.recorded.shift();
          }
        }
      } catch (e) {
        // éviter de casser la boucle en cas de glitch
      }

      // Dessin
      const now = AudioEngine.ctx.currentTime - STATE.recStartT;
      const t0 = Math.max(0, now - STATE.visibleWindow);
      const baseSec = Math.floor(t0);
      if (baseSec !== STATE.t0Base) {
        Graph.drawBase(ui.canvasRec, { t0, windowSec: STATE.visibleWindow, yCents: STATE.yCents, labels: true });
        STATE.t0Base = baseSec;
      } else {
        // effacer + recoller base déjà à jour
        Graph.drawBase(ui.canvasRec, { t0, windowSec: STATE.visibleWindow, yCents: STATE.yCents, labels: true });
      }

      if (STATE.recorded.length) {
        const { mapPitchToY } = Graph.mappers({
          scaleMode: STATE.scaleMode,
          minHz: STATE.minHz, maxHz: STATE.maxHz,
          yCents: STATE.yCents, height: ui.canvasRec.height
        });

        const pts = STATE.recorded.map(p => ({
          x: left + ((p.t - t0) / STATE.visibleWindow) * drawW,
          y: mapPitchToY(p.hz)
        }));

        Graph.strokeSmooth(ctxRec, pts, { strokeStyle: "#3b82f6", lineWidth: 3.5, tension: 0.5, drawDots: false });
      }

      ui.debugRec.textContent = `Détections brutes: ${STATE.rawCount} | Points lissés: ${STATE.keptCount}`;
      ui.timer.textContent = fmtTime(now);

      if (STATE.monitorOn) {
        STATE.rafId = requestAnimationFrame(tick);
      } else {
        STATE.rafId = null;
      }
    };

    // première base + lancement
    Graph.drawBase(ui.canvasRec, { t0: 0, windowSec: STATE.visibleWindow, yCents: STATE.yCents, labels: true });
    STATE.rafId = requestAnimationFrame(tick);
  }

  // ----------- Bootstrap
  document.addEventListener("DOMContentLoaded", setupUI);
})();
