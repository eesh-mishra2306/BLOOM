/**
 * Runs inline in <head> before first paint so the page never flashes the wrong theme,
 * motion level or text size. Kept dependency-free and tiny on purpose.
 * The same keys are read and written by the client prefs store (src/lib/prefs/store.ts).
 */
export const PREFS_STORAGE_KEY = "bloom.prefs.v1";

export const PREFS_BOOTSTRAP = `(function(){try{
var d=document.documentElement,p={};
try{p=JSON.parse(localStorage.getItem("${PREFS_STORAGE_KEY}")||"{}")||{}}catch(e){}
var mq=function(q){return window.matchMedia&&window.matchMedia(q).matches};
var discreet=p.discreet===true;
var t=p.theme||"system";
var dark=!discreet&&(t==="dark"||(t==="system"&&mq("(prefers-color-scheme: dark)")));
d.setAttribute("data-theme",dark?"dark":"light");
d.setAttribute("data-discreet",discreet?"true":"false");
var m=p.motion||"system";
d.setAttribute("data-motion",m==="system"?(mq("(prefers-reduced-motion: reduce)")?"reduced":"full"):(m==="reduced"?"reduced":"full"));
d.setAttribute("data-contrast",p.contrast==="high"?"high":"normal");
var s=Number(p.textScale);d.style.setProperty("--text-scale",String(s>=1&&s<=1.4?s:1));
if(discreet){document.title="Daybook";}
var l=p.lock||{};if(l.enabled&&l.pinHash){var u=Number(sessionStorage.getItem("bloom.unlockedAt")||0),to=(Number(l.timeoutMin)||5)*60000;if(!u||Date.now()-u>to)d.setAttribute("data-locked","1");}
}catch(e){}})();`;
