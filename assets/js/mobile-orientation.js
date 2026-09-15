"use strict";
(()=>{
const $=id=>document.getElementById(id),mobile=()=>matchMedia("(pointer:coarse)").matches,landscape=()=>window.innerWidth>window.innerHeight;
let allowNext=false,waiting=false,playing=false;
function installStyle(){
 if($("gfOrientationStyle"))return;
 const s=document.createElement("style");s.id="gfOrientationStyle";
 s.textContent=`
 #gfOrientationGate{position:fixed;inset:0;z-index:10000000;display:none;align-items:center;justify-content:center;padding:24px;background:#02050d;color:#fff;text-align:center;font-family:Inter,Segoe UI,Arial,sans-serif}
 #gfOrientationGate.active{display:flex}
 #gfOrientationGate .box{width:min(92%,430px);padding:30px 22px;border:1px solid rgba(0,234,255,.35);border-radius:20px;background:linear-gradient(145deg,#0b1730,#030817);box-shadow:0 25px 80px rgba(0,0,0,.7)}
 #gfOrientationGate .phone{font-size:4rem;display:block;margin-bottom:12px}
 #gfOrientationGate h2{font-size:1.5rem;margin-bottom:10px}
 #gfOrientationGate p{color:#b9c9dc;line-height:1.55}
 body.gf-game-fullscreen{overflow:hidden!important;touch-action:none!important}
 body.gf-game-fullscreen>header,body.gf-game-fullscreen>nav,body.gf-game-fullscreen>footer{display:none!important}
 .game-container.gf-mobile-fullscreen{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;border-radius:0!important;z-index:999999!important;background:#030711!important;overflow:hidden!important}
 .game-container.gf-mobile-fullscreen #gameCanvas{width:100%!important;height:100%!important;display:block!important}
 .game-container.gf-mobile-fullscreen .game-hud{z-index:1000002!important}
 .game-container.gf-mobile-fullscreen .game-controls{z-index:1000003!important}
 .game-container.gf-mobile-fullscreen .mobile-joystick,.game-container.gf-mobile-fullscreen .mobile-fire-control{z-index:1000004!important}
 .game-container.gf-mobile-fullscreen .game-overlay{z-index:1000010!important}
 .game-container.gf-mobile-fullscreen .mobile-joystick{position:absolute!important;left:max(30px,env(safe-area-inset-left))!important;bottom:max(105px,calc(env(safe-area-inset-bottom) + 105px))!important;width:148px!important;height:148px!important;border-radius:50%!important;display:flex!important}
 .game-container.gf-mobile-fullscreen .mobile-fire-control{position:absolute!important;right:max(34px,env(safe-area-inset-right))!important;bottom:max(112px,calc(env(safe-area-inset-bottom) + 112px))!important;width:108px!important;height:108px!important;border-radius:50%!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:3rem!important;line-height:1!important;padding:0!important;border:2px solid rgba(255,255,255,.5)!important;box-shadow:0 0 0 6px rgba(255,90,30,.12),0 10px 35px rgba(0,0,0,.5)!important;backdrop-filter:blur(4px)!important}
 .game-container.gf-mobile-fullscreen .mobile-fire-control span{display:none!important}
 .game-container.gf-mobile-fullscreen .joystick-arrows{display:none!important}
 @media(pointer:coarse) and (orientation:landscape){
   .game-container .mobile-joystick{display:flex!important;left:max(30px,env(safe-area-inset-left))!important;bottom:max(105px,calc(env(safe-area-inset-bottom) + 105px))!important;width:148px!important;height:148px!important;border-radius:50%!important}
   .game-container .mobile-fire-control{display:flex!important;right:max(34px,env(safe-area-inset-right))!important;bottom:max(112px,calc(env(safe-area-inset-bottom) + 112px))!important;width:108px!important;height:108px!important;border-radius:50%!important;align-items:center!important;justify-content:center!important;font-size:3rem!important;line-height:1!important;padding:0!important;border:2px solid rgba(255,255,255,.5)!important;box-shadow:0 0 0 6px rgba(255,90,30,.12),0 10px 35px rgba(0,0,0,.5)!important;backdrop-filter:blur(4px)!important}
   .game-container .mobile-fire-control span,.game-container .joystick-arrows{display:none!important}
 }
 @media(pointer:coarse) and (orientation:portrait){body.gf-game-playing .game-container{filter:blur(3px)}}
 @media(pointer:fine){#mobileJoystick,#mobileFireControl{display:none!important}}
 `;
 document.head.appendChild(s)
}
function gate(){
 if($("gfOrientationGate"))return;
 const g=document.createElement("div");g.id="gfOrientationGate";
 g.innerHTML='<div class="box"><span class="phone">📱↔️</span><h2>Gire o celular</h2><p>O Galaxy Frontier foi projetado para jogar em <strong>tela cheia na horizontal</strong>. Vire o celular de lado para continuar.</p></div>';
 document.body.appendChild(g)
}
function updateGate(){
 if(!mobile())return;
 gate();
 const g=$("gfOrientationGate"),mustBlock=playing&&!landscape();
 g.classList.toggle("active",waiting||mustBlock);
 if(landscape()&&waiting){
   waiting=false;g.classList.remove("active");
   const b=$("startGame");
   if(b&&!allowNext){allowNext=true;playing=true;document.body.classList.add("gf-game-playing","gf-game-fullscreen");b.click();setTimeout(()=>{allowNext=false},350)}
 }
}
async function prepare(){
 if(!mobile())return true;
 const gc=$("gameContainer");
 if(landscape()){
   playing=true;document.body.classList.add("gf-game-playing","gf-game-fullscreen");
   try{if(gc&&!document.fullscreenElement&&gc.requestFullscreen)await gc.requestFullscreen({navigationUI:"hide"})}catch{}
   return true
 }
 waiting=true;gate();$("gfOrientationGate").classList.add("active");
 try{if(gc&&!document.fullscreenElement&&gc.requestFullscreen)await gc.requestFullscreen({navigationUI:"hide"})}catch{}
 try{if(screen.orientation?.lock)await screen.orientation.lock("landscape")}catch{}
 updateGate();return false
}
function intercept(e){
 if(allowNext||!mobile())return;
 const b=e.target.closest("#startGame,#restartGame");
 if(b){e.preventDefault();e.stopImmediatePropagation();prepare()}
}
function desktopArrowFallback(){
 if(mobile())return;
 const map={ArrowLeft:["a","KeyA"],ArrowRight:["d","KeyD"],ArrowUp:["w","KeyW"],ArrowDown:["s","KeyS"]};
 const held=new Set();
 document.addEventListener("keydown",e=>{if(!map[e.code]||held.has(e.code))return;held.add(e.code);const [key,code]=map[e.code];document.dispatchEvent(new KeyboardEvent("keydown",{key,code,bubbles:true,cancelable:true}))},{capture:true});
 document.addEventListener("keyup",e=>{if(!map[e.code])return;held.delete(e.code);const [key,code]=map[e.code];document.dispatchEvent(new KeyboardEvent("keyup",{key,code,bubbles:true,cancelable:true}))},{capture:true});
 window.addEventListener("blur",()=>held.clear())
}
installStyle();gate();desktopArrowFallback();document.addEventListener("click",intercept,true);window.addEventListener("resize",updateGate);window.addEventListener("orientationchange",updateGate);screen.orientation?.addEventListener?.("change",updateGate);document.addEventListener("fullscreenchange",updateGate);updateGate();
})();