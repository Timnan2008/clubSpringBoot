import React,{useEffect,useRef,useState} from 'react';
import {Paperclip,FileText,DownloadSimple,X,ArrowUp,ArrowClockwise} from '@phosphor-icons/react';
import {tx} from './language';
import {isChatImage,decryptChatFile} from './chat-attachments.mjs';
import './ChatAttachments.css';
import './PostMedia.css';
const sizeLabel=size=>size<1024*1024?Math.max(1,Math.ceil(size/1024))+' KB':(size/1024/1024).toFixed(1)+' MB';
function Draft({file,onRemove,disabled}){
 const [url,setUrl]=useState('');useEffect(()=>{if(!isChatImage(file.type))return;const url=URL.createObjectURL(file);setUrl(url);return()=>URL.revokeObjectURL(url)},[file]);
 return <li>{url?<img src={url} alt=""/>:<FileText size={26}/>}<span>{file.name}<small>{sizeLabel(file.size)}</small></span><button type="button" disabled={disabled} onClick={onRemove} aria-label={tx('移除附件：','Remove attachment: ')+file.name}><X size={16}/></button></li>;
}
export function ChatComposer({files,onFiles,onRemove,text,onText,inputRef,busy,disabled,onSend}){
 const picker=useRef(),[dragging,setDragging]=useState(false);
 return <form className={'chat-compose-area'+(dragging?' is-dragging':'')} onSubmit={onSend} onDragOver={e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();setDragging(true)}}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragging(false)}} onDrop={e=>{e.preventDefault();setDragging(false);if(!disabled&&!busy)onFiles([...e.dataTransfer.files])}}>
  {!!files.length&&<ul className="chat-draft-files">{files.map((file,index)=><Draft key={file.name+file.size+file.lastModified} file={file} disabled={busy} onRemove={()=>onRemove(index)}/>)}</ul>}
  <div className="social-chat-compose"><input className="chat-file-input" ref={picker} type="file" multiple disabled={disabled||busy} aria-label={tx('选择图片或文件','Choose images or files')} onChange={e=>{onFiles([...e.target.files]);e.target.value=''}}/><button className="chat-attach-button" type="button" disabled={disabled||busy} aria-label={tx('添加图片或文件','Add images or files')} title={tx('添加图片或文件 · 单个 20 MB','Add images or files · 20 MB each')} onClick={()=>picker.current?.click()}><Paperclip size={23}/></button>
  <textarea ref={inputRef} aria-label={tx('私信内容','Message')} rows={1} maxLength={2000} value={text} onChange={e=>onText(e.target.value)} onPaste={e=>{const images=[...e.clipboardData.items].filter(item=>item.kind==='file').map(item=>item.getAsFile()).filter(Boolean);if(images.length&&!busy&&!disabled){e.preventDefault();onFiles(images)}}} placeholder={tx('输入消息…','Message…')}/>
  <button type="submit" className="social-primary" disabled={busy||disabled||(!text.trim()&&!files.length)} aria-label={busy?tx('发送中…','Sending…'):tx('发送消息','Send message')}><ArrowUp size={22} weight="bold"/></button></div>
  {!!files.length&&<small className="chat-file-hint" role="status">{busy?tx('正在加密并发送附件…','Encrypting and sending attachments…'):tx('最多 4 个附件 · 单个 20 MB · 合计 40 MB','Up to 4 files · 20 MB each · 40 MB total')}</small>}
 </form>;
}
function ImageViewer({url,name,onClose}){
 const dialog=useRef();useEffect(()=>dialog.current?.showModal(),[]);
 return <dialog className="post-lightbox" ref={dialog} aria-label={name} onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><button type="button" className="post-lightbox-close" aria-label={tx('关闭','Close')} onClick={onClose}><X size={22}/></button><img src={url} alt={name}/></dialog>;
}
function ReceivedFile({file,message,me}){
 const root=useRef(),cached=useRef(''),inflight=useRef(null),controller=useRef(null),alive=useRef(true);
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false),[opened,setOpened]=useState(false);
 const image=isChatImage(file.type),peer=message.sender===me?message.recipient:message.sender;
 async function load(){
  if(cached.current)return cached.current;if(inflight.current)return inflight.current;
  setBusy(true);setFailed(false);controller.current=new AbortController();
  inflight.current=(async()=>{try{const response=await fetch('/api/campus-social/conversations/'+peer+'/messages/'+message.id+'/files/'+file.id,{signal:controller.current.signal,cache:'no-store'});if(!response.ok)throw Error("Attachment HTTP "+response.status);const blob=await decryptChatFile(await response.arrayBuffer(),file,message.sender,message.recipient);if(!alive.current)return '';const next=URL.createObjectURL(blob);cached.current=next;setUrl(next);return next;}catch(e){if(alive.current&&e.name!=='AbortError'){console.warn('Chat attachment unavailable:',e.name,e.message);setFailed(true);}return '';}finally{if(alive.current)setBusy(false);inflight.current=null;}})();return inflight.current;
 }
 useEffect(()=>{alive.current=true;let observer;if(image){observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load()}},{rootMargin:'120px'});observer.observe(root.current);}return()=>{alive.current=false;observer?.disconnect();controller.current?.abort();if(cached.current)URL.revokeObjectURL(cached.current);};},[file.id]);
 async function download(){const href=await load();if(!href||!alive.current)return;const a=document.createElement('a');a.href=href;a.download=file.name||'attachment';a.click();}
 return <div className="chat-received-file" ref={root}>
  {image&&(url?<button className="chat-image-preview" type="button" aria-label={tx('放大图片：','Enlarge image: ')+file.name} onClick={()=>setOpened(true)}><img src={url} alt={file.name} onLoad={e=>{const scroll=e.currentTarget.closest('.social-chat-scroll');if(scroll&&scroll.scrollHeight-scroll.scrollTop-scroll.clientHeight<350)scroll.scrollTop=scroll.scrollHeight;}}/></button>:<button className="chat-image-placeholder" type="button" disabled={busy} onClick={load}>{failed?<ArrowClockwise size={24}/>:<FileText size={28}/>}<span>{busy?tx('正在加载图片…','Loading image…'):tx('点击重试','Retry')}</span></button>)}
  <button className="chat-file-download" type="button" disabled={busy} onClick={download} aria-label={tx('下载附件：','Download attachment: ')+file.name}>{!image&&<FileText size={25}/>}<span><b>{file.name}</b><small>{busy?tx('正在加载…','Loading…'):failed?tx('加载失败，点击重试','Unable to load. Retry'):sizeLabel(file.size)}</small></span><DownloadSimple size={19}/></button>
  {opened&&url&&<ImageViewer url={url} name={file.name} onClose={()=>setOpened(false)}/>}
 </div>;
}
export function ChatMessageFiles({body,message,me}){return <div className="message-rich">{body.text&&<p>{body.text}</p>}<div className="chat-message-files">{body.files.map(file=><ReceivedFile key={file.id} file={file} message={message} me={me}/>)}</div></div>}
export function chatPreview(text){try{const {text:caption,files}=JSON.parse(text.slice('chat-files:v1:'.length));if(text.startsWith('chat-files:v1:')&&Array.isArray(files))return caption|| (files.every(f=>isChatImage(f.type))?tx('[图片]','[Image]'):tx('[文件]','[File]'));}catch{}return text;}
