// One control map: arrows exclusively shift, W/S/A/D exclusively drive.
(function(root){
 const controls=Object.freeze({throttle:'w',brake:'s',left:'a',right:'d',camera:'c',pilot:'f',weather:'t',time:'h',lights:'l',photo:'v',radio:'m',handbrake:' ',pause:'p',reset:'r',settings:'o',seatUp:'pageup',seatDown:'pagedown',seatForward:'home',seatBack:'end',
   shiftLeft:'arrowleft',shiftRight:'arrowright',shiftUp:'arrowup',shiftDown:'arrowdown'});
 const GameInput={controls,isShift:key=>[controls.shiftLeft,controls.shiftRight,controls.shiftUp,controls.shiftDown].includes(key),
   sample:keys=>({throttle:!!keys[controls.throttle],brake:!!keys[controls.brake],handbrake:!!keys[controls.handbrake],steer:(keys[controls.right]?1:0)-(keys[controls.left]?1:0)})};
 root.GameInput=GameInput;if(typeof module!=='undefined')module.exports=GameInput;
})(typeof window!=='undefined'?window:globalThis);
