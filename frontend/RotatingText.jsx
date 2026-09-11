import {useState,useEffect} from 'react';
import {motion,AnimatePresence,useReducedMotion} from 'motion/react';
import './RotatingText.css';
// Adapted from React Bits RotatingText. No layout shift and no timer offscreen.
export default function RotatingText({texts=[],rotationInterval=2400,staggerDuration=.025}){
 const [index,setIndex]=useState(0),[visible,setVisible]=useState(!document.hidden),reduced=useReducedMotion();
 useEffect(()=>{const update=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 useEffect(()=>{if(reduced||!visible||texts.length<2)return;const t=setInterval(()=>setIndex(i=>(i+1)%texts.length),rotationInterval);return()=>clearInterval(t);},[texts.length,rotationInterval,reduced,visible]);
 const text=texts[index%Math.max(texts.length,1)]||'';
 return <span className="text-rotate" aria-label={texts.join('、')}><span className="text-rotate-sizer" aria-hidden="true">{texts.reduce((a,b)=>a.length>b.length?a:b,'')}</span><AnimatePresence mode="wait" initial={false}><span className="text-rotate-content" key={text} aria-hidden="true">{Array.from(text).map((c,i)=><motion.span key={i} initial={{y:reduced?0:'100%',opacity:0}} animate={{y:0,opacity:1}} exit={{y:reduced?0:'-120%',opacity:0}} transition={{type:'spring',damping:30,stiffness:400,delay:reduced?0:(text.length-i-1)*staggerDuration}}>{c===' '? '\u00a0':c}</motion.span>)}</span></AnimatePresence></span>;
}
