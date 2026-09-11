import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';import CardNav from './CardNav';
const root=document.getElementById('school-cardnav');const site=['localhost','127.0.0.1'].includes(location.hostname)?'http://localhost:8088':'https://qpwflhsclub.com';
function BookingNav(){const[account,setAccount]=useState(null);useEffect(()=>{fetch('account.php',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{const a=d?.account||d;if(a?.email)setAccount({name:a.display_name,nameEn:a.display_name,role:['student','president','teacher','admin'][a.level]||'student'})}).catch(()=>{})},[]);return <CardNav siteOrigin={site} account={account}/>}
if(root)createRoot(root).render(<BookingNav/>);

import './CampusMotion.css';
