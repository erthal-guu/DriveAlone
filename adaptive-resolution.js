(function(root){class AdaptiveResolution{
 constructor(){this.reset();}reset(){this.scale=1;this.slow=this.fast=0;}
 update(fps,seconds,enabled,active=true){const before=this.scale;if(!enabled){this.reset();return before!==this.scale;}if(!active){this.slow=this.fast=0;return false;}
  this.slow=fps<50?this.slow+seconds:0;this.fast=fps>57?this.fast+seconds:0;
  if(this.slow>=6){this.scale=Math.max(.65,Math.round((this.scale-.1)*100)/100);this.slow=0;}
  if(this.fast>=12){this.scale=Math.min(1,Math.round((this.scale+.05)*100)/100);this.fast=0;}
  return this.scale!==before;
 }
}root.AdaptiveResolution=AdaptiveResolution;if(typeof module!=='undefined')module.exports=AdaptiveResolution;})(typeof window!=='undefined'?window:globalThis);
