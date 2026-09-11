import {useRef} from 'react';
// Keep dialogs mounted during their short exit; honor the OS motion preference.
export function useAnimatedClose(ref,onClose){const closing=useRef(false);return async()=>{if(closing.current)return;closing.current=true;const el=ref.current;try{if(el&&!matchMedia('(prefers-reduced-motion: reduce)').matches){el.style.pointerEvents='none';await el.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.98)'}],{duration:120,easing:'ease-in',fill:'forwards'}).finished}}catch{}finally{onClose();closing.current=false}}}
