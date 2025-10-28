<script>
// Smoother combiné médiane + EMA + garde-fou de saut en cents
(function(root,factory){
  root.PitchSmoother = factory();
}(typeof self!=="undefined"?self:this,function(){

  function centsBetween(hzA, hzB){
    if(!hzA || !hzB) return 0;
    return 1200 * Math.log2(hzB / hzA);
  }

  class PitchSmoother{
    constructor(opts={}){
      this.medianWindowSize = Math.max(3, (opts.medianWindowSize|0) || 5);
      if (this.medianWindowSize % 2 === 0) this.medianWindowSize += 1;
      this.smoothingFactor = (opts.smoothingFactor ?? 0.75);
      this.maxPitchJump = (opts.maxPitchJump ?? 250);   // en cents
      this.minConfidence = (opts.minConfidence ?? 0.2);

      this._win = [];
      this._ema = null;
      this._lastHz = null;
    }

    reset(){
      this._win.length = 0;
      this._ema = null;
      this._lastHz = null;
    }

    _median(arr){
      const tmp = arr.slice().sort((a,b)=>a-b);
      return tmp[(tmp.length-1)>>1];
    }

    smooth(hz){
      if(!hz || !isFinite(hz)) return null;

      // Garde-fou: gros saut -> on accepte mais on ré-initialise doucement
      const jump = centsBetween(this._lastHz, hz);
      if (this._lastHz && Math.abs(jump) > this.maxPitchJump) {
        this._win.length = 0;
        this._ema = null;
      }

      this._lastHz = hz;
      this._win.push(hz);
      if (this._win.length > this.medianWindowSize) this._win.shift();
      const med = (this._win.length >= 3) ? this._median(this._win) : hz;

      // EMA vers la médiane
      this._ema = (this._ema==null) ? med : (this.smoothingFactor * this._ema + (1 - this.smoothingFactor) * med);
      return this._ema;
    }
  }

  return PitchSmoother;
}));
</script>
