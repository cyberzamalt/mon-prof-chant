<script>
/*!
 * PitchSmoother — médiane + EMA + anti-sauts
 */
(function(){
  class PitchSmoother {
    constructor(opts={}){
      this.medianWindowSize = opts.medianWindowSize ?? 5;
      this.smoothingFactor  = opts.smoothingFactor  ?? 0.75; // 0.6-0.85
      this.maxJumpHz        = opts.maxJumpHz        ?? 250;
      this.minConf          = opts.minConfidence    ?? 0.2;
      this.buf = [];
      this.last = null;
    }
    reset(){ this.buf.length=0; this.last=null; }

    median(v){
      this.buf.push(v);
      if (this.buf.length > this.medianWindowSize) this.buf.shift();
      const s = [...this.buf].sort((a,b)=>a-b);
      return s[Math.floor(s.length/2)];
    }

    smooth(raw, conf=1){
      if (raw <= 0 || conf < this.minConf) return null;
      const m = this.median(raw);
      if (this.last != null) {
        const jump = Math.abs(m - this.last);
        if (jump > this.maxJumpHz) return this.last; // rejette saut impossible
      }
      const out = (this.last==null) ? m : (this.smoothingFactor*m + (1-this.smoothingFactor)*this.last);
      this.last = out;
      return out;
    }
  }
  window.PitchSmoother = PitchSmoother;
})();
</script>
