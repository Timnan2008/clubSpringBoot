import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeIdentity,decryptMessage} from '../message-crypto.js';
import {encryptChatFile,decryptChatFile,prepareChatFiles,parseChatFiles,appendChatFiles} from '../chat-attachments.mjs';
test('file bytes are encrypted and authenticated for this sender, recipient and file',async()=>{
 const file=new File(['private file contents'],'notes.txt',{type:'text/plain'}),sealed=await encryptChatFile(file,'alice','bob');
 const bytes=await sealed.blob.arrayBuffer();assert(!Buffer.from(bytes).includes(Buffer.from('private file contents')));
 assert.equal(await(await decryptChatFile(bytes,sealed.metadata,'alice','bob')).text(),await file.text());
 await assert.rejects(()=>decryptChatFile(bytes,sealed.metadata,'alice','mallory'));
 const changed=new Uint8Array(bytes.slice(0));changed[0]^=1;await assert.rejects(()=>decryptChatFile(changed.buffer,sealed.metadata,'alice','bob'));
});
test('both parties recover image and file keys from the encrypted message, including a fresh identity import',async()=>{
 const a=await makeIdentity(),b=await makeIdentity();
 const files=[new File(['image bytes'],'photo.png',{type:'image/png'}),new File(['file bytes'],'notes.txt',{type:'text/plain'})];
 const prepared=await prepareChatFiles(a,b,'a','b','图片和文件',files),message={sender:'a',recipient:'b',text:prepared.text};assert(!prepared.text.includes('photo.png'));
 const exported=await crypto.subtle.exportKey('pkcs8',b.privateKey);const recovered={...b,privateKey:await crypto.subtle.importKey('pkcs8',exported,{name:'ECDH',namedCurve:'P-256'},true,['deriveBits'])};
 for(const [own,peer,id] of [[a,b,'a'],[recovered,a,'b']]){const payload=parseChatFiles(await decryptMessage(own,peer,id,message));assert.equal(payload.text,'图片和文件');for(let i=0;i<files.length;i++)assert.equal(await(await decryptChatFile(await prepared.files[i].blob.arrayBuffer(),payload.files[i],'a','b')).text(),await files[i].text());}
});
test('attachment-only message, empty file and full Chinese caption with four long names fit envelope limits',async()=>{
 const a=await makeIdentity(),b=await makeIdentity();const files=Array.from({length:4},(_,i)=>new File([''],('图'.repeat(115))+i+'.png',{type:'image/png'}));
 for(const caption of ['', '字'.repeat(2000)]){const result=await prepareChatFiles(a,b,'a','b',caption,files);assert(result.text.length<16000);assert.equal(parseChatFiles(await decryptMessage(b,a,'b',{sender:'a',recipient:'b',text:result.text})).files.length,4);}
});
test('selection limits are atomic and malformed metadata is never rendered',()=>{
 const kept=new File(['hello'],'notes.txt');assert.equal(appendChatFiles([kept],[kept]).length,1);
 assert.throws(()=>appendChatFiles([kept],[{name:'large',size:21*1024*1024}]));assert.equal(kept.size,5);
 assert.throws(()=>appendChatFiles([],Array.from({length:5},(_,i)=>new File([''],i+'.txt'))));
 assert.equal(parseChatFiles('chat-files:v1:{"text":"hello","files":[{"id":"../secret"}]}'),null);
});
