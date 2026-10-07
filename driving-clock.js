// Fixed simulation clock shared by the browser and frame-rate regression tests.
(function(root){
  const fields=['x','y','z','heading','pitch','roll'];
  class DrivingClock {
    constructor(physics,onStep=null){this.onStep=onStep;this.physics=physics;this.step=1/120;this.maxFrame=.25;this.reset();}
    snapshot(){return Object.fromEntries(fields.map(k=>[k,this.physics[k]]));}
    reset(){this.accumulator=0;this.previous=this.snapshot();}
    advance(frameTime,input,config){
      this.accumulator+=Math.max(0,Math.min(frameTime,this.maxFrame));
      let steps=0;
      while(this.accumulator+1e-12>=this.step&&steps<30){
        this.previous=this.snapshot();this.physics.update(this.step,input,config);this.onStep?.(this.step);
        this.accumulator=Math.max(0,this.accumulator-this.step);steps++;
      }
      return steps;
    }
    pose(){const alpha=this.accumulator/this.step,current=this.snapshot(),result={};
      for(const k of fields){let delta=current[k]-this.previous[k];
        if(k==='heading')delta=Math.atan2(Math.sin(delta),Math.cos(delta));
        result[k]=this.previous[k]+delta*alpha;}
      return result;
    }
  }
  root.DrivingClock=DrivingClock;
  if(typeof module!=='undefined')module.exports=DrivingClock;
})(typeof window!=='undefined'?window:globalThis);
