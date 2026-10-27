import { startArtifactsPreview } from '../dev/agent-artifacts-preview.mjs';
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const fixture = await startArtifactsPreview(0, {background:true,live:true});
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
 const page=await browser.newPage({reducedMotion:'reduce'}), errors=[];
 page.on('pageerror', e=>errors.push(e.message));
 await page.goto(fixture.url);
 await page.getByRole('textbox',{name:'消息',exact:true}).fill('流式显示测试');
 await page.getByRole('button',{name:'发送消息',exact:true}).click();
 await page.getByText('正在后台核对资料',{exact:true}).waitFor();
 const id=[...fixture.jobs.keys()][0];
 const before=fixture.requests.filter(r=>r.method==='GET'&&r.path==='/api/openclaw/runs').length;
 let shown='正在后台核对资料';
 for(const text of ['，先','检查','社团','计划']) {
  const start=Date.now();fixture.appendThinking(id,text);shown+=text;
  await page.getByText(shown,{exact:true}).waitFor({timeout:1000});
  assert(Date.now()-start<900,'update must arrive before polling');
 }
 assert.equal(fixture.requests.filter(r=>r.method==='GET'&&r.path==='/api/openclaw/runs').length,before);
 fixture.closeObservers();
 fixture.appendThinking(id,'，重连补齐');shown+='，重连补齐';
 await page.getByText(shown,{exact:true}).waitFor({timeout:6000});
 for(let i=0;i<120&&!fixture.observerCount();i++) await new Promise(r=>setTimeout(r,50));
 assert(fixture.observerCount()>0);
 fixture.appendThinking(id,'，继续流动');shown+='，继续流动';
 await page.getByText(shown,{exact:true}).waitFor({timeout:1000});
 fixture.completeBackground(id,'实时回答完成');await page.getByText('实时回答完成',{exact:true}).waitFor({timeout:1000});
 await page.goto(new URL('/other',fixture.url).href);
 assert.equal(fixture.requests.filter(r=>r.path.endsWith('/stop')).length,0);
 await page.goto(fixture.url);await page.getByText('实时回答完成',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS incremental thinking delivered before polling, no polling per token, completion and navigation restore');
}finally{await browser.close();fixture.closeObservers();fixture.server.close();}
