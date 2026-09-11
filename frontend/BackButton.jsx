import React from 'react';
import {tx} from './language';
function hasPrevious(){return history.length>1&&Boolean(document.referrer);}
export function goBack(fallback='/'){if(hasPrevious())history.back();else location.assign(fallback);}
export default function BackButton({fallback='/',className='campus-back',label=false}){const title=hasPrevious()?tx('返回上一级','Go back'):tx('返回首页','Back to homepage');return <button type="button" title={title} className={className} aria-label={title} onClick={()=>goBack(fallback)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 12H4m7-7-7 7 7 7"/></svg>{label&&title}</button>}
