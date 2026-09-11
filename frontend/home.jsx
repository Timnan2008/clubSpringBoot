import {createRoot} from 'react-dom/client';
const host=document.getElementById('darkveil-background');
if(host&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const start=()=>import('./DarkVeil').then(({default:DarkVeil})=>createRoot(host).render(<DarkVeil speed={.4} resolutionScale={.5} verticalOffset={.6}/>)).catch(()=>{});if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:1800});else setTimeout(start,350);}

import './CampusMotion.css';

import {installClubScroll} from './club-scroll.mjs';
const clubs=document.getElementById('club-scroll');
if(clubs) installClubScroll(clubs);
