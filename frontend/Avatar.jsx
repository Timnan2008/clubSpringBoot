import React,{useEffect,useState} from 'react';
import {en} from './language';
import './Avatar.css';
export default function Avatar({person,className=''}){
 const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[person?.avatarUrl]);const look=person?.appearance||{},frame=look.frameUrl||(person?.avatarFrame==='teacher-day-2026'?'/images/teacher-day-2026-320.webp':'');
 return <span className={'campus-avatar '+className+(frame?' has-teacher-frame':'')}>{person?.avatarUrl&&!failed?<span className="avatar-photo"><img draggable="false" decoding="async" width="80" height="80" src={person.avatarUrl} style={{transform:`translate(${(look.avatarX||0)*100}%, ${(look.avatarY||0)*100}%) scale(${look.avatarScale||1})`}} alt="" onError={()=>setFailed(true)}/></span>:(en?person?.nameEn||person?.name:person?.name)?.slice(0,1)||(en?'U':'同')}{frame&&<img draggable="false" className="teacher-avatar-frame" loading="lazy" decoding="async" src={frame} srcSet={frame.includes('teacher-day-2026-320')?'/images/teacher-day-2026-320.webp 320w, /images/teacher-day-2026-640.webp 640w':undefined} sizes="(max-width:600px) 160px, 256px" style={{transform:`translate(${(look.x||0)*100}%, ${(look.y||0)*100}%) scale(${look.scale||1})`}} alt="" aria-hidden="true"/>}</span>;
}
