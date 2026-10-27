import {startArtifactsPreview} from '../dev/agent-artifacts-preview.mjs';
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const fixture=await startArtifactsPreview();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:950},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(fixture.url);
 await page.getByRole('button',{name:'新对话',exact:true}).click();
 const canvas=page.locator('.openclaw-ballpit canvas');await canvas.waitFor();
 await page.waitForTimeout(800);
 const baseline=await canvas.boundingBox();assert(baseline.height>200);
 await page.evaluate(()=>{
  window.canvasChanges=0;
  new MutationObserver(()=>window.canvasChanges++).observe(document.querySelector('.openclaw-ballpit canvas'),{attributes:true,attributeFilter:['width','height']});
  window.boxes=[];
  const tick=()=>{const c=document.querySelector('.openclaw-ballpit canvas');if(c){const b=c.getBoundingClientRect();window.boxes.push({y:b.y,height:b.height,width:b.width});}window.sampleFrame=requestAnimationFrame(tick);};tick();
 });
 for(let i=0;i<3;i++){
  await page.locator('.card-nav-toggle').click();await page.waitForTimeout(450);
  const menu=await page.locator('.card-nav').boundingBox();assert(menu.height>150);
  const navLink=page.locator('.card-nav-content a').first();if(await navLink.count()) await navLink.hover();
  await page.locator('.card-nav-toggle').click();await page.waitForTimeout(450);
 }
 const result=await page.evaluate(()=>{cancelAnimationFrame(window.sampleFrame);return {boxes:window.boxes,changes:window.canvasChanges};});
 assert(result.boxes.length>20);
 for(const b of result.boxes){assert(Math.abs(b.height-baseline.height)<1);assert(Math.abs(b.y-baseline.y)<1);assert(Math.abs(b.width-baseline.width)<1);}
 assert.equal(result.changes,0,'menu must not resize the WebGL buffer');
 await page.screenshot({path:'../../outputs/navigation-motion-20260927/menu-closed.png'});
 await page.locator('.card-nav-toggle').click();await page.waitForTimeout(450);
 await page.screenshot({path:'../../outputs/navigation-motion-20260927/menu-open.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
 assert((await canvas.boundingBox()).width>100);
 assert.deepEqual(errors,[]);
 console.log('PASS three menu open/close cycles: stable ballpit bounds, no buffer resets, WebGL renders, mobile resize and no JS errors');
}finally{await browser.close();fixture.server.close();}
