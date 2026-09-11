import {b64,unb64,encryptChatPayload} from './message-crypto.js';
const encoder=new TextEncoder(),prefix='chat-files:v1:';
export const MAX_CHAT_FILE=20*1024*1024;
export const isChatImage=type=>['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(type);
const context=(sender,recipient,id)=>encoder.encode(['qpwfl-chat-file-v1',sender,recipient,id].join('|'));
export function appendChatFiles(existing,incoming){
 const files=[...existing];
 for(const file of incoming){if(file.size>MAX_CHAT_FILE)throw Error('file-size');if(!files.some(f=>f.name===file.name&&f.size===file.size&&f.lastModified===file.lastModified))files.push(file);}
 if(files.length>4||files.reduce((sum,f)=>sum+f.size,0)>40*1024*1024)throw Error('file-total');
 return files;
}
export async function encryptChatFile(file,sender,recipient){
 if(file.size>MAX_CHAT_FILE)throw Error('file-size');
 const id=crypto.randomUUID(),key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']),iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:context(sender,recipient,id)},key,await file.arrayBuffer());
 return {metadata:{id,name:file.name.slice(0,120),type:file.type.slice(0,100),size:file.size,key:b64(await crypto.subtle.exportKey('raw',key)),iv:b64(iv)},blob:new Blob([encrypted],{type:'application/octet-stream'})};
}
export async function decryptChatFile(bytes,file,sender,recipient){
 if(bytes.byteLength!==file.size+16)throw Error('Invalid attachment size');
 const key=await crypto.subtle.importKey('raw',unb64(file.key),'AES-GCM',false,['decrypt']);
 const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(file.iv),additionalData:context(sender,recipient,file.id)},key,bytes);
 return new Blob([clear],{type:isChatImage(file.type)?file.type:'application/octet-stream'});
}
export async function prepareChatFiles(own,peer,sender,recipient,text,files){
 if(text.length>2000||!files.length)throw Error('Invalid message');appendChatFiles([],files);
 const encrypted=[];for(const file of files)encrypted.push(await encryptChatFile(file,sender,recipient));
 const body=prefix+JSON.stringify({text,files:encrypted.map(f=>f.metadata)});
 return {text:await encryptChatPayload(own,peer,sender,recipient,body),files:encrypted};
}
export function parseChatFiles(text){
 if(!text.startsWith(prefix))return null;
 try{
  const body=JSON.parse(text.slice(prefix.length));
  if(typeof body.text!=='string'||body.text.length>2000||!Array.isArray(body.files)||!body.files.length||body.files.length>4) return null;
  for(const f of body.files)if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(f.id)||typeof f.name!=='string'||f.name.length>120||typeof f.type!=='string'||!Number.isInteger(f.size)||f.size<0||f.size>MAX_CHAT_FILE||unb64(f.key).length!==32||unb64(f.iv).length!==12)return null;
  return body;
 }catch{return null;}
}
