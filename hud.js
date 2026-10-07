/* Interface discreta: durante a viagem, menus e dicas somem após alguns segundos sem mouse ou teclas de menu.
   As teclas de direção não acordam a interface. */
(function(root){
 const IDLE=3500;let timer=0,enabled=true,allowed=()=>false;
 const driving=()=>{const c=root.GameInput.controls;return [c.throttle,c.brake,c.left,c.right,c.handbrake];};
 function idle(){if(enabled&&allowed())document.body.classList.add('ui-idle');else wake();}
 function wake(){document.body.classList.remove('ui-idle');clearTimeout(timer);if(enabled)timer=setTimeout(idle,IDLE);}
 addEventListener('pointermove',wake);addEventListener('pointerdown',wake);
 addEventListener('keydown',e=>{if(!driving().includes(e.key.toLowerCase()))wake();});
 root.HorizonHud={wake,configure(on,canHide){enabled=on;allowed=canHide;wake();}};
})(window);
