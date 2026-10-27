import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='../../outputs/release-navigation-motion-20260927';
const server=createServer(async(req,res)=>{
 if(req.url.startsWith('/javascript/ui/')){
  const file=req.url.split('?')[0].slice('/javascript/ui/'.length);
  if(file.endsWith('.js')){res.setHeader('Content-Type','text/javascript');res.end('');return;}
  await new Promise(r=>setTimeout(r,450));
  try{res.setHeader('Content-Type','text/css');res.end(await readFile(root+'/ui/'+file));}catch{res.statusCode=404;res.end();}return;
 }
 res.setHeader('Content-Type','text/html;charset=utf-8');res.end(await readFile(root+(req.url.startsWith('/agent')?'/openclaw.html':'/campus-social.html')));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage();
 await page.addInitScript(()=>{window.colors=[];const sample=()=>{if(document.body)window.colors.push(getComputedStyle(document.body).backgroundColor);requestAnimationFrame(sample);};requestAnimationFrame(sample);});
 for(const [route,expected] of [['/wall','rgb(0, 0, 0)'],['/messages','rgb(0, 0, 0)'],['/agent','rgb(10, 10, 10)']]){
  await page.goto(`http://127.0.0.1:${server.address().port}${route}`);await page.waitForTimeout(600);
  const colors=await page.evaluate(()=>window.colors);assert(colors.length>5);assert(colors.every(c=>c===expected),JSON.stringify({route,colors}));
 }
 console.log('PASS wall/messages/Agent have correct dark background on every sampled frame before React, even with delayed CSS');
}finally{await browser.close();server.close();}
