import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const source = `import React from 'react';import {createRoot} from 'react-dom/client';import ClubOperations from './frontend/ClubOperations';import './frontend/workspace.css';createRoot(document.getElementById('root')).render(<ClubOperations club="1" token="test" section="sessions" activities={[{id:'event1',kind:'event',status:'scheduled',title:'测试活动',start:'2026-09-23T12:00',end:'2026-09-23T13:00',location:'教室'}]} members={Array.from({length:30},(_,i)=>({id:i,type:'student',name:'社员'+i,nameEn:'Student'}))} documents={[]} onChanged={()=>{}}/>);`;
const built=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,outfile:'fixture.js',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const assets=new Map(built.outputFiles.map(f=>['/'+f.path.split('/').pop(),f.contents]));
const operations={terms:[{id:'term1',name:'2026-2027',start:'2026-09-01',end:'2027-01-01'}],reports:[],attendance:[],candidates:[]};
let fail=false, writes=0;
const server=createServer(async(req,res)=>{
 if(req.url.startsWith('/api/')){
  res.setHeader('Content-Type','application/json');
  if(req.method==='PUT'){
   writes++;let raw='';for await(const x of req) raw+=x;
   await new Promise(r=>setTimeout(r,150));
   if(fail){res.statusCode=500;res.end(JSON.stringify({message:'保存失败，请重试'}));return;}
   operations.attendance=[{activity:'event1',marks:JSON.parse(raw).marks,updatedAt:'2026-09-26T12:00'}];
  }
  res.end(JSON.stringify(operations));return;
 }
 if(assets.has(req.url)){res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css':'text/javascript');res.end(assets.get(req.url));return;}
 res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<html><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script></html>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1100,height:700}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/?lang=zh`);
 const pick=page.getByRole('radiogroup').last();await pick.getByRole('button',{name:'已到',exact:true}).click();
 await page.getByRole('button',{name:'确认提交签到',exact:true}).click();
 await page.getByRole('button',{name:'确认提交',exact:true}).click();
 await page.getByRole('button',{name:'已保存',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'已保存',exact:true}).isDisabled(),true);
 const feedback=page.locator('.workspace-feedback');await feedback.waitFor();let box=await feedback.boundingBox();assert(box.y>=0&&box.y+box.height<=700);assert(await page.evaluate(()=>scrollY)>500);
 await pick.getByRole('button',{name:'请假',exact:true}).click();assert.equal(await page.getByRole('button',{name:'确认提交签到',exact:true}).isEnabled(),true);
 fail=true;await page.getByRole('button',{name:'确认提交签到',exact:true}).click();await page.getByRole('button',{name:'确认提交',exact:true}).click();await page.getByRole('alert').waitFor();box=await page.getByRole('alert').boundingBox();assert(box.y>=0&&box.y+box.height<=700);assert.equal(await page.getByRole('button',{name:'已保存',exact:true}).count(),0);
 assert.equal(writes,2);assert.deepEqual(errors,[]);
 await page.setViewportSize({width:390,height:740});box=await page.getByRole('alert').boundingBox();assert(box.x>=0&&box.x+box.width<=390);
 console.log('PASS long-page visible success/error; saved button; edits restore submit; failed save stays unsaved; mobile feedback fits');
}finally{await browser.close();server.close();}
