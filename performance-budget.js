(function(root){
 class PerformanceBudget{
  constructor(){this.level=0;this.slow=this.fast=0;this.cpuMs=0;}
  update(fps,seconds,enabled,active,cpuMs=0){this.cpuMs=cpuMs;if(!enabled){this.level=0;this.slow=this.fast=0;return;}if(!active){this.slow=this.fast=0;return;}
   this.slow=fps<48?this.slow+seconds:0;this.fast=fps>57?this.fast+seconds:0;
   if(this.slow>=4){this.level=Math.min(3,this.level+1);this.slow=0;this.fast=0;}
   if(this.fast>=18){this.level=Math.max(0,this.level-1);this.fast=0;this.slow=0;}
  }
  get generationMs(){return Math.max(.5,Math.min(4,16.67-this.cpuMs-2));}
  get distantScale(){return [1,.85,.7,.55][this.level];}
 }
 root.PerformanceBudget=PerformanceBudget;root.HorizonPerformance=new PerformanceBudget();if(typeof module!=='undefined')module.exports=PerformanceBudget;
})(typeof window!=='undefined'?window:globalThis);
