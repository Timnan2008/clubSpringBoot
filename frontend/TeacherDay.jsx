import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import Avatar from './Avatar';
import {en,tx} from './language';
import './TeacherDay.css';
export function TeacherBadge({person}){return person?.badges?.includes('teacher-day-2026')?<span className="teacher-day-badge">✦ {tx('2026 教师节限定','Teachers’ Day 2026')}</span>:null;}
export default function TeacherDayWelcome({account}){
 const [gift,setGift]=useState(null);const dialog=useRef();
 useEffect(()=>{if(account?.role!=='teacher')return;const c=new AbortController();fetch('/api/campus-social/teacher-day',{signal:c.signal}).then(r=>r.ok?r.json():null).then(d=>{if(!d?.celebrate)return;let dismissed=false;try{dismissed=sessionStorage.getItem('teacher-day:'+account.id+':'+d.date)==='seen'}catch{}if(!dismissed)setGift(d)}).catch(()=>{});return()=>c.abort()},[account?.id,account?.role]);
 useEffect(()=>{if(gift)dialog.current?.showModal()},[gift]);
 const close=()=>{try{sessionStorage.setItem('teacher-day:'+account.id+':'+gift.date,'seen')}catch{}dialog.current?.close();setGift(null)};
 if(!gift)return null;const teacher=en?gift.account.nameEn||gift.account.name:gift.account.name;const zhName=teacher.endsWith('老师')?teacher:teacher+'老师';
 return createPortal(<dialog className="teacher-day-welcome" ref={dialog} onCancel={e=>{e.preventDefault();close()}} aria-labelledby="teacher-day-title"><button className="teacher-day-close" onClick={close} aria-label={tx('关闭','Close')}>×</button><small>SEPTEMBER 10 · 2026</small><Avatar person={gift.account}/><h2 id="teacher-day-title">{en?`Happy Teachers’ Day, ${teacher}!`:`祝${zhName}教师节快乐`}</h2><p>{tx('感谢您的耐心、启发与陪伴。','Thank you for your patience, inspiration and care.')}</p><TeacherBadge person={gift.account}/><p className="teacher-day-note">{tx('教师节限定头像框和标签已为您装配，愿这份心意陪伴每一个闪光的日常。','Your commemorative avatar frame and badge are now equipped, with our warmest thanks.')}</p><button className="teacher-day-continue" onClick={close}>{tx('收下祝福，进入校园','Thank you · Enter campus')}</button></dialog>,document.body);
}
