import React,{useEffect,useRef,useState} from 'react';
import {tx,en} from './language';
let loading,loadSequence=0;
// Keep one SDK request for all widgets; only cache successful initialization.
export function loadTurnstile(){
 if(window.turnstile?.render)return Promise.resolve(window.turnstile);
 if(loading)return loading;
 const pending=new Promise((resolve,reject)=>{
  let settled=false;const script=document.createElement('script'),callbackName='clubTurnstileReady'+(++loadSequence);
  const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=null;script.onerror=null;delete window[callbackName];if(error){script.remove();reject(error)}else resolve(window.turnstile)};
  const timer=setTimeout(()=>finish(Error('script-timeout')),30000);
  window[callbackName]=()=>window.turnstile?.render?finish():finish(Error('script-unavailable'));
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload='+callbackName;script.async=true;script.defer=true;
  // onload URL callback runs after SDK initialization; ready() is incompatible with async tags.
  script.onerror=()=>finish(Error('script-network'));document.head.append(script);
 });
 loading=pending;pending.catch(()=>{if(loading===pending)loading=null});return pending;
}
async function configuration(signal){const controller=new AbortController(),cancel=()=>controller.abort();signal.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,15000);try{const r=await fetch('/api/suggestion/verification',{signal:controller.signal});if(!r.ok)throw Error('configuration-network');const data=await r.json();if(!data.ready)throw Error('configuration-missing');return data}finally{clearTimeout(timer);signal.removeEventListener('abort',cancel)}}
export default function Turnstile({onToken,reset,action='suggestion'}){
 const root=useRef(),callback=useRef(onToken),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[passed,setPassed]=useState(false),[loaded,setLoaded]=useState(false);callback.current=onToken;
 useEffect(()=>{let live=true,id,api,timer;const abort=new AbortController();callback.current('');setPassed(false);setError('');setLoaded(false);
  const clear=()=>{if(live){setPassed(false);callback.current('')}};
  const start=async()=>{
   for(let n=0;n<3&&live;n++)try{
    const [ts,config]=await Promise.all([loadTurnstile(),configuration(abort.signal)]);
    if(!live)return;api=ts;
    id=ts.render(root.current,{sitekey:config.siteKey,action,theme:'light',size:'flexible',language:en?'en':'zh-cn',retry:'auto','retry-interval':3000,'refresh-expired':'auto','refresh-timeout':'auto',callback:token=>{if(live){setError('');setPassed(true);callback.current(token)}},'expired-callback':clear,'timeout-callback':clear,'error-callback':code=>{clear();if(live)setError(tx('验证暂未完成，正在重试。','Verification interrupted. Retrying.')+' ('+code+')');return true}});
    setLoaded(true);return;
   }catch(e){if(!live)return;if(e.message==='configuration-missing'){setError(tx('验证服务暂不可用，请稍后重试。','Verification is temporarily unavailable. Please retry later.'));return}if(n===2){setError(tx('暂时无法连接验证服务，请重试。','Unable to reach verification. Please retry.'));return}await new Promise(resolve=>{timer=setTimeout(resolve,1000*(n+1))})}
  };
  start();const online=()=>{if(live)setAttempt(n=>n+1)};window.addEventListener('online',online);
  return()=>{live=false;abort.abort();clearTimeout(timer);window.removeEventListener('online',online);if(api&&id!==undefined)api.remove(id)};
 },[attempt,reset,action]);
 return <div className="ideas-turnstile"><strong className="verification-label">{tx('安全验证 · Cloudflare','Security check · Cloudflare')}</strong>{!loaded&&!error&&<p role="status">{tx('正在连接验证服务…','Connecting to verification…')}</p>}<div ref={root}/>{passed&&<small className="ideas-verified" role="status">✓ {tx('人机验证已通过','Verification complete')}</small>}{error&&<p role="alert">{error} <button type="button" onClick={()=>setAttempt(n=>n+1)}>{tx('重试','Retry')}</button></p>}</div>;
}
