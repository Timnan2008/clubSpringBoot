import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mentionQuery,editMentions,insertMention} from '../mention-state.mjs';
import {wheelDistance,installClubScroll} from '../club-scroll.mjs';
test('selected mention stays complete while typing, including names with spaces',()=>{
 const first=insertMention('@ti',mentionQuery('@ti',3),[],'@Tim Tian','tim');
 const text=first.value+'你好 hello';
 assert.equal(mentionQuery(text,text.length,first.mentions),null);
 assert.equal(mentionQuery(first.value,8,first.mentions),null);
});
test('second and third mentions preserve earlier account ranges',()=>{
 let state=insertMention('@ti',mentionQuery('@ti',3),[],'@Tim Tian','tim');
 for(const [search,label,id] of [['bo','@Bob','bob'],['南','@南天','nan']]) {
  const value=state.value+'hello @'+search;
  const query=mentionQuery(value,value.length,state.mentions);
  assert.equal(query.text,search);
  state=insertMention(value,query,state.mentions,label,id);
 }
 assert.deepEqual(state.mentions.map(m=>m.account),['tim','bob','nan']);
 assert.deepEqual(state.mentions.map(m=>state.value.slice(m.start,m.end)),['@Tim Tian','@Bob','@南天']);
});
test('edits before mentions shift offsets; partial deletion removes only affected mention',()=>{
 const ranges=[{start:0,end:4,account:'a'},{start:5,end:9,account:'b'}];
 assert.deepEqual(editMentions('@Ann @Bob','Hi @Ann @Bob',ranges),ranges.map(m=>({...m,start:m.start+3,end:m.end+3})));
 assert.deepEqual(editMentions('@Ann @Bob','@An @Bob',ranges),[{start:4,end:8,account:'b'}]);
 assert.equal(mentionQuery('email@test.com',14),null);
 assert.equal(mentionQuery('@a\nhello',8),null);
});
test('replacement before a completed mention retains later offsets',()=>{
 const text='@ti @Bob', next=insertMention(text,{start:0,end:3,text:'ti'},[{start:4,end:8,account:'b'}],'@Tim Tian','t');
 assert.equal(next.value.slice(next.mentions[1].start,next.mentions[1].end),'@Bob');
});
test('trackpad horizontal momentum stays native, vertical wheel follows distance and direction',()=>{
 assert.equal(wheelDistance({deltaX:45,deltaY:2,deltaMode:0},600),0);
 assert.equal(wheelDistance({deltaX:0,deltaY:37,deltaMode:0},600),37);
 assert.equal(wheelDistance({deltaX:0,deltaY:-12,deltaMode:0},600),-12);
 assert.equal(wheelDistance({deltaX:0,deltaY:2,deltaMode:1},600),32);
 assert.equal(wheelDistance({deltaX:0,deltaY:50,ctrlKey:true},600),0);
 const handlers={}, container={scrollLeft:0,scrollWidth:1000,clientWidth:400,addEventListener:(type,fn)=>handlers[type]=fn,removeEventListener:()=>{}};
 const dispose=installClubScroll(container);let prevented=0;
 const wheel=dy=>handlers.wheel({deltaX:0,deltaY:dy,deltaMode:0,preventDefault:()=>prevented++});
 wheel(-20);assert.equal(prevented,0);wheel(100);assert.equal(container.scrollLeft,100);wheel(-40);assert.equal(container.scrollLeft,60);
 container.scrollLeft=600;wheel(40);assert.equal(prevented,2);dispose();
});
