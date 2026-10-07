/* H-pattern state and drivetrain math, independent of rendering/input devices. */
(function(root){
 const parameters=root.PhysicsConfig||(typeof require==='function'?require('./physics-config.js'):null);
 class Gearbox{
   constructor(){this.reset();}
   reset(){this.column=2;this.row=0;}
   get gear(){return this.row===0?0:this.row===-1?[-1,1,3,5][this.column]:[0,2,4,6][this.column];}
   marchaAtual(){return this.gear;}
   setGear(gear){if(gear===0){this.row=0;return;}if(gear===-1){this.column=0;this.row=-1;return;}this.column=Math.ceil(gear/2);this.row=gear%2?-1:1;}
   static rpmFor(speed,gear,p=parameters){return Math.abs(speed/p.wheelRadius*(p.gearRatios[gear]||0)*p.differential)*60/(2*Math.PI);}
   static torque(rpm,p=parameters){const curve=p.torqueCurve;if(rpm<=curve[0][0])return curve[0][1];for(let i=1;i<curve.length;i++)if(rpm<=curve[i][0]){const a=curve[i-1],b=curve[i];return a[1]+(b[1]-a[1])*(rpm-a[0])/(b[0]-a[0]);}return curve.at(-1)[1];}
   handleInput(key,speed,options={}){
     // Future clutch integration can supply canShift; no clutch key is required.
     if(options.canShift&&!options.canShift())return {accepted:false,reason:'clutch'};
     let column=this.column,row=this.row;
     if(key==='arrowleft'||key==='arrowright'){if(row!==0)return {accepted:false,reason:'gate'};column=Math.max(0,Math.min(3,column+(key==='arrowleft'?-1:1)));}
     else if(key==='arrowup')row=Math.max(-1,row-1);
     else if(key==='arrowdown')row=Math.min(1,row+1);
     else return {accepted:false,reason:'key'};
     if(column===0&&row===1)return {accepted:false,reason:'empty'};
     if(column===this.column&&row===this.row)return {accepted:false,reason:'edge'};
     const gear=row===0?0:row===-1?[-1,1,3,5][column]:[0,2,4,6][column],p={...parameters,...options};
     if(gear===-1&&Math.abs(speed)>=p.reverseSpeedLimit)return {accepted:false,reason:'reverse'};
     if(gear>0&&speed<-p.reverseSpeedLimit)return {accepted:false,reason:'moving'};
     if(gear>0&&Gearbox.rpmFor(speed,gear,p)>p.maxRpm&&options.downshiftPolicy!=='engineBrake')return {accepted:false,reason:'rpm'};
     this.column=column;this.row=row;return {accepted:true,gear};
   }
 }
 Gearbox.parameters=parameters;root.Gearbox=Gearbox;if(typeof module!=='undefined')module.exports=Gearbox;
})(typeof window!=='undefined'?window:globalThis);
