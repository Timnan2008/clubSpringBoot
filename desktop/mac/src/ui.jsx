import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {bridge} from './data';
export const UI=createContext(null);
export const useUI=()=>useContext(UI);
export async function read(key,input){const r=await bridge.read(key,input);if(!r.ok)throw Object.assign(Error(r.message),{auth:r.auth,status:r.status});return r.data}
export async function write(key,input){const r=await bridge.write(key,input);if(!r.ok)throw Object.assign(Error(r.message),{auth:r.auth});return r.data}
export function useResource(key,input={},enabled=true){const [state,set]=useState({loading:enabled,data:null,error:''});const [tick,bump]=useState(0);const encoded=JSON.stringify(input);useEffect(()=>{let active=true;if(!enabled){set({loading:false,data:null,error:''});return}set(s=>({...s,loading:true,error:''}));read(key,JSON.parse(encoded)).then(data=>active&&set({loading:false,data,error:''})).catch(e=>active&&set({loading:false,data:null,error:e.message}));return()=>{active=false}},[key,encoded,enabled,tick]);return {...state,reload:()=>bump(x=>x+1)}}
export function Field({label,children,...props}){return <label className="form-field"><span>{label}</span>{children||<input {...props}/>}</label>}
export function Feedback({error,success}){return error?<p className="form-error" role="alert">{error}</p>:success?<p className="form-success" role="status">{success}</p>:null}
export function Form({onSubmit,children,label='保存',disabled=false}){const [busy,setBusy]=useState(false),[error,setError]=useState('');return <form className="native-form" onSubmit={async e=>{e.preventDefault();setError('');setBusy(true);try{await onSubmit(new FormData(e.currentTarget))}catch(e){setError(e.message)}finally{setBusy(false)}}}>{children}<Feedback error={error}/><button className="button" disabled={busy||disabled}>{busy?'正在处理…':label}</button></form>}
export function Heading({tag,title,detail,children}){return <div className="page-heading"><div><div className="eyebrow">{tag||'CAMPUS DESKTOP'}</div><h1>{title}</h1>{detail&&<p>{detail}</p>}</div>{children}</div>}
export function ResourceState({resource,children}){if(resource.loading)return <div className="loading-state"><span className="live-dot"/>正在同步…</div>;if(resource.error)return <div className="inline-error"><p>{resource.error}</p><button className="text-button accent" onClick={resource.reload}>重新加载</button></div>;return children}
export const dateText=value=>value?String(value).replace('T',' ').slice(0,16):'';
