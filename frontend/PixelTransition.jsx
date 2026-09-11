import React,{useRef,useEffect,useState} from 'react';
import {gsap} from 'gsap';
import './PixelTransition.css';
import {tx} from './language';
// Adapted from React Bits PixelTransition (MIT); keyboard, reduced-motion and cleanup support.
export default function PixelTransition({firstContent,secondContent,onActivate,gridSize=10,pixelColor='#796094',animationStepDuration=.22,once=false,aspectRatio='100%',className='',style={}}){
 const grid=useRef(),active=useRef(),timeline=useRef(),state=useRef(false);const[shown,setShown]=useState(false);
 const change=value=>{if(state.current===value||(!value&&once))return;state.current=value;if(value)onActivate?.();timeline.current?.kill();const pixels=grid.current.children;
 const reveal=()=>{setShown(value);active.current.style.visibility=value?'visible':'hidden';};
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){gsap.set(pixels,{opacity:0});reveal();return;}
 const duration=Math.max(.05,animationStepDuration);gsap.set(pixels,{opacity:0});timeline.current=gsap.timeline().to(pixels,{opacity:1,duration:0,stagger:{amount:duration,from:'random'}}).call(reveal).to(pixels,{opacity:0,duration:0,stagger:{amount:duration,from:'random'}});
 };
 useEffect(()=>()=>timeline.current?.kill(),[]);
 const count=Math.min(16,Math.max(2,gridSize));
 return <div className={'pixelated-image-card '+className} style={{...style,'--pixel-color':pixelColor}} tabIndex={0} role="button" aria-pressed={shown} aria-label={tx("切换社团卡片","Switch club card")} onPointerEnter={e=>{if(e.pointerType==='mouse')change(true)}} onPointerLeave={e=>{if(e.pointerType==='mouse')change(false)}} onClick={()=>change(!state.current)} onFocus={()=>change(true)} onBlur={()=>change(false)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();change(!state.current)}}}>
 <div style={{paddingTop:aspectRatio}}/><div className="pixelated-image-card__default" aria-hidden={shown}>{firstContent}</div><div className="pixelated-image-card__active" ref={active} aria-hidden={!shown}>{secondContent}</div><div className="pixelated-image-card__pixels" ref={grid} aria-hidden="true">{Array.from({length:count*count},(_,i)=><i key={i} style={{width:(100/count+.1)+'%',height:(100/count+.1)+'%',left:(i%count)*100/count+'%',top:Math.floor(i/count)*100/count+'%'}}/>)}</div></div>
}
