import React, {useState, useRef, useEffect, useLayoutEffect, useId} from 'react';
import Avatar from './Avatar';
import {postName} from './person-names.mjs';
import {tx, en} from './language';
import {mentionQuery, editMentions, insertMention} from './mention-state.mjs';
import './SocialAdditions.css';
import './Mentions.css';

export function MentionText({text = '', mentions = []}) {
  const parts = []; let at = 0;
  for (const m of [...mentions].sort((a,b) => a.start-b.start)) {
    if (m.start < at || m.end > text.length) continue;
    parts.push(text.slice(at,m.start));
    parts.push(<a className="user-mention" key={m.start} href={'/page/user/home?account='+encodeURIComponent(m.account)}>{text.slice(m.start,m.end)}</a>);
    at = m.end;
  }
  parts.push(text.slice(at)); return parts;
}

// A textarea mirror gives the actual wrapped line, including internal scroll.
function caretRect(input, caret) {
  const style = getComputedStyle(input), mirror = document.createElement('div');
  for (const name of ['boxSizing','fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','wordSpacing','textIndent','textTransform','tabSize','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth']) mirror.style[name] = style[name];
  Object.assign(mirror.style, {position:'fixed', left:'-10000px', top:'0', width:input.offsetWidth+'px', height:'auto', whiteSpace:'pre-wrap', overflowWrap:'break-word', borderStyle:'solid', visibility:'hidden'});
  mirror.textContent = input.value.slice(0, caret);
  const mark = document.createElement('span'); mark.textContent = input.value.slice(caret) || '\u200b';
  mirror.append(mark); document.body.append(mirror);
  const first = mark.getClientRects()[0], bounds = mirror.getBoundingClientRect(), box = input.getBoundingClientRect();
  const rect = {left:box.left + first.left-bounds.left-input.scrollLeft, top:box.top + first.top-bounds.top-input.scrollTop, height:parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.4};
  mirror.remove(); return rect;
}

export default function MentionComposer({value, onChange, mentions = [], onMentionsChange, ...props}) {
  const listId = useId(), input = useRef(null), root = useRef(null), popup = useRef(null), composing = useRef(false);
  const [query,setQuery] = useState(null), [results,setResults] = useState([]), [active,setActive] = useState(0), [loading,setLoading] = useState(false), [position,setPosition] = useState(null);
  function inspect(text, caret, ranges = mentions) {setQuery(mentionQuery(text,caret,ranges)); setActive(0);}
  function change(e) {
    const next = e.target.value, ranges = editMentions(value,next,mentions);
    onMentionsChange(ranges); onChange(next);
    if (!composing.current) inspect(next,e.target.selectionStart,ranges);
  }
  useEffect(() => {
    setResults([]);
    if (!query?.text.trim()) {setLoading(false); return;}
    const controller = new AbortController(); setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/campus-social/users?keyword='+encodeURIComponent(query.text.trim()),{signal:controller.signal});
        const rows = response.ok ? await response.json() : [];
        if (!controller.signal.aborted) {setResults(rows.slice(0,6)); setActive(0);}
      } catch {} finally {if (!controller.signal.aborted) setLoading(false);}
    },180);
    return () => {clearTimeout(timer); controller.abort();};
  },[query?.text, query?.start]);
  useEffect(() => {
    const close = e => {if (!root.current?.contains(e.target)) setQuery(null);};
    document.addEventListener('pointerdown',close); return () => document.removeEventListener('pointerdown',close);
  },[]);
  useLayoutEffect(() => {
    if (!query) {setPosition(null); return;}
    const place = () => {
      const field = input.current, bounds = root.current.getBoundingClientRect(), caret = caretRect(field,query.end);
      const width = Math.min(320,window.innerWidth-32), gap = 6;
      const viewportBottom = window.visualViewport ? window.visualViewport.offsetTop+window.visualViewport.height : innerHeight;
      const below = viewportBottom-caret.top-caret.height-gap-12, above = caret.top-12;
      const up = below < Math.min(210,popup.current?.scrollHeight||210) && above > below;
      const maxHeight = Math.min(304,Math.max(80,up ? above-gap : below));
      const height = Math.min(maxHeight,popup.current?.scrollHeight||80);
      setPosition({width, maxHeight, left:Math.max(16,Math.min(caret.left,innerWidth-width-16))-bounds.left, top:(up ? caret.top-gap-height : caret.top+caret.height+gap)-bounds.top});
    };
    place();
    const observer = new ResizeObserver(place); observer.observe(input.current);
    window.addEventListener('resize',place); window.addEventListener('scroll',place,true); window.visualViewport?.addEventListener('resize',place);
    return () => {observer.disconnect(); window.removeEventListener('resize',place); window.removeEventListener('scroll',place,true); window.visualViewport?.removeEventListener('resize',place);};
  },[query,value,results,loading]);
  useEffect(() => {popup.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'});},[active]);
  function choose(person) {
    if (!query) return;
    const next = insertMention(value,query,mentions,'@'+postName(person,en),person.id);
    if (next.value.length > (props.maxLength||1000)) return;
    onMentionsChange(next.mentions); onChange(next.value); setQuery(null); setResults([]);
    requestAnimationFrame(() => {input.current?.focus(); input.current?.setSelectionRange(next.caret,next.caret);});
  }
  return <div className="mention-composer" ref={root}>
    <textarea {...props} ref={input} value={value} onChange={change} onClick={e=>inspect(value,e.target.selectionStart)} onKeyUp={e=>{if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) inspect(value,e.target.selectionStart);}} onCompositionStart={()=>{composing.current=true;setQuery(null);}} onCompositionEnd={e=>{composing.current=false;inspect(e.target.value,e.target.selectionStart);}} aria-autocomplete="list" aria-expanded={!!query} aria-controls={query?listId:undefined} aria-activedescendant={query&&results[active]?listId+'-'+active:undefined} onKeyDown={e=>{
      if (e.nativeEvent.isComposing || composing.current) return;
      if (query && e.key==='Escape') {e.preventDefault();e.stopPropagation();setQuery(null);}
      else if (query && results.length && ['ArrowDown','ArrowUp','Enter'].includes(e.key)) {e.preventDefault();if(e.key==='Enter')choose(results[active]);else setActive(v=>(v+(e.key==='ArrowDown'?1:-1)+results.length)%results.length);}
    }}/>
    {query&&<div className="mention-options" style={{...position,visibility:position?'visible':'hidden'}} ref={popup} id={listId} role="listbox" aria-label={tx('提及用户','Mention a user')}>
      {results.map((person,i)=><button type="button" role="option" aria-selected={i===active} id={listId+'-'+i} key={person.id} onPointerDown={e=>e.preventDefault()} onClick={()=>choose(person)}><Avatar person={person}/><span className="mention-person"><strong>{postName(person,en)}</strong><small>{person.nickname?'@'+person.nickname:(en?person.name:person.nameEn)||tx('校园用户','Campus member')}</small></span></button>)}
      {!results.length&&<p role="status">{loading?tx('正在查找…','Searching…'):query.text?tx('没有找到用户','No matching users'):tx('输入姓名或昵称','Type a name or nickname')}</p>}
    </div>}
  </div>;
}
