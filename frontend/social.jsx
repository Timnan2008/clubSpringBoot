import {ChatComposer,ChatMessageFiles,chatPreview} from './ChatAttachments';
import {appendChatFiles,prepareChatFiles,parseChatFiles} from './chat-attachments.mjs';
import MentionComposer from './Mentions';
import {pageWindow} from './page-window.mjs';
import Post from './SocialPost';
import {PushPin,Prohibit,Info,X as CloseIcon,ArrowUp} from '@phosphor-icons/react';
import './SocialTheme.css';
import PersonIdentity, {realNames, postName} from './PersonIdentity';
import {TeacherBadge} from './TeacherDay';
import {appendAttachments} from './attachment-selection.mjs';
import {FileText, X, Eye} from '@phosphor-icons/react';
import {compressImage} from './compress-image';
import { tr,tx,en } from "./language";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, MotionConfig } from 'motion/react';
import './social.css';
import './ConversationRefinements.css';
import CardNav from './CardNav';
import AccountAvatar from './Avatar';
import CategoryPicker from './CategoryPicker';
import {AnimatedNumber,TextMorph} from './MotionPrimitives';
import { ensureIdentity, encryptMessage, decryptMessage, safetyCode, verifyPeer } from './message-crypto.js';
const base = '/api/campus-social',
  mode = document.getElementById('campus-social').dataset.mode || 'wall';
async function api(path = '', options = {}) {
  const r = await fetch(base + path, options);
  if (r.status === 401) {
    location.assign('/page/user/login?next=' + encodeURIComponent('/page/' + (mode === 'wall' ? 'wall' : 'messages')));
    throw Error(tr("请重新登录"));
  }
  const d = await r.json().catch(() => ({
    message: tr("网络异常，请稍后重试")
  }));
  if (!r.ok || d.code >= 400) throw Error(d.message || tr("操作未成功"));
  return d;
}
const stamp = s => s?.slice(0, 16).replace('T', ' ') || '';
const roles = {
  student: tr("学生"),
  president: tr("社长"),
  teacher: tr("教师"),
  admin: tx("管理员 · 学生","Administrator · Student"),
  anonymous: tr("匿名")
};
const personName=p=>postName(p,en);
function Icon({
  name,
  className = ''
}) {
  const paths = {
    home: 'M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3Z',
    search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z',
    mail: 'M3 5h18v14H3ZM3 6l9 7 9-7',
    heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    arrow: 'M7 17 17 7M7 7h10v10',
    back: 'M20 12H4m7-7-7 7 7 7',
    send: 'm3 3 19 9-19 9 4-9Zm4 9h15',
    refresh: 'M20 7a9 9 0 1 0 1 9M20 2v6h-6',
    user: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    calendar: 'M4 5h16v16H4ZM4 10h16M8 2v6m8-6v6',
    club: 'M3 21V7l9-4 9 4v14M8 21v-7h8v7M8 8h.01M16 8h.01',
    pen: 'm15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Zm0 0 1-6',
    globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18'
  };
  return <svg className={'social-icon ' + className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.chat} /></svg>;
}
function Avatar({
  person
}) {
  return <AccountAvatar person={person} className="social-avatar" />;
}
function ErrorMessage({
  children
}) {
  return children ? <p role="alert" className="social-error">{children}</p> : null;
}
function Empty({
  children
}) {
  return <div className="social-empty"><Icon name="chat" /><p>{children}</p></div>;
}
const postUrl=id=>'/page/wall?post='+encodeURIComponent(id);
const personRole=p=>{if(p?.role==='president'){const club=en?p.clubNameEn||p.clubName:p.clubName;const role=p.position==='vice_president'?tx('副社长','Vice President'):tx('社长','President');return club?club+(en?' · ':'')+role:role;}return roles[p?.role]||'';};
function PostDetail({id,profile,write}){const [post,setPost]=useState(null),[error,setError]=useState('');const load=()=>api('/posts/'+encodeURIComponent(id)).then(setPost).catch(e=>setError(tr(e.message)));useEffect(()=>{load();},[id]);return <section className="social-feed post-detail"><a className="post-return" href="/page/wall">← {tx('返回校园墙','Back to campus wall')}</a><h1>{tx('帖子详情','Post details')}</h1><ErrorMessage>{error}</ErrorMessage>{post&&<Post post={post} profile={profile} write={write} detail onLike={load} onReply={load} onRemove={()=>location.assign('/page/wall')}/>}</section>;}
const kinds = {
  recruit: tr("招募伙伴"),
  help: tr("互助求助"),
  team: tr("项目组队"),
  general: tr("校园分享"),
  other: tr("其他"),
  events: tr("活动公告")
};
const filterOptions = [['', tr("全部")], ...Object.entries(kinds)],
  postOptions = Object.entries(kinds).filter(([k]) => k !== 'events');
function Wall({
  profile,
  write
}) {
  const [composing,setComposing]=useState(false),[mentions,setMentions]=useState([]);
  const composerRef=useRef();
  useEffect(()=>{
    if(!composing)return;
    const collapse=()=>{if(composerRef.current?.contains(document.activeElement))document.activeElement.blur();setComposing(false)};
    const outside=e=>{if(!composerRef.current?.contains(e.target))collapse()};
    const scroll=e=>{if(e.target===document||e.target===window||e.target===document.documentElement||e.target===document.body)collapse()};
    document.addEventListener('pointerdown',outside);document.addEventListener('scroll',scroll,true);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('scroll',scroll,true)};
  },[composing]);
  const [files,setFiles]=useState([]);const fileInput=useRef();
  const scopedClub=Number(new URLSearchParams(location.search).get('club'))||0;
  const [postingClub,setPostingClub]=useState((profile.clubs||[]).some(c=>c.id===scopedClub)?scopedClub:0),[clubName,setClubName]=useState('');
  useEffect(()=>{if(scopedClub)fetch('/api/club/id/'+scopedClub).then(r=>r.json()).then(d=>setClubName(d.data?.clubName||'')).catch(()=>{})},[scopedClub]);
  const [category, setCategory] = useState('recruit'),
    [anonymous, setAnonymous] = useState(false),
    [filter, setFilter] = useState(''),
    [events, setEvents] = useState([]);
  useEffect(() => {
    api('/events').then(items=>setEvents(scopedClub?items.filter(e=>Number(e.clubId)===scopedClub):items)).catch(e => setError(tr(e.message)));
  }, []);
  const [posts, setPosts] = useState([]),
    [page,setPage]=useState(1),[pages,setPages]=useState(1),
    [loading, setLoading] = useState(true),
    [text, setText] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false),
    loadSequence = useRef(0);
  async function load(targetPage = 1, keepPosts = false) {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError('');
    if(!keepPosts)setPosts([]);
    try {
      const d = await api('/posts?' + new URLSearchParams({
        page:targetPage,
        category: filter,
        club:scopedClub,
        keyword:new URLSearchParams(location.search).get('keyword')||''
      }));
      if (sequence !== loadSequence.current) return;
      setPosts(d.items);setPage(d.page||1);setPages(d.pages||1);
    } catch (e) {
      if (sequence === loadSequence.current) setError(tr(e.message));
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [filter]);
  useEffect(()=>{if(!loading&&location.hash.startsWith('#post-'))document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'center'});},[loading]);
  const publish = async e => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if(files.length){const body=new FormData();body.append('text',text);body.append('mentions',JSON.stringify(mentions));body.append('category',category);body.append('club',postingClub);body.append('anonymous',anonymous);for(const f of files)body.append('files',await compressImage(f));await api('/posts',{method:'POST',headers:{'X-Workspace-Token':profile.token},body});}else await write('/posts','POST',{text,category,club:postingClub,anonymous,mentions});
      setMentions([]);setFiles([]);if(fileInput.current)fileInput.current.value='';
      setText('');
      if (filter && filter !== category) setFilter(category);else await load();
    } catch (e) {
      setError(tr(e.message));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  return <><section className="social-feed"><header className="social-page-title"><h1>{clubName?clubName+' · ':''}{tr("校园墙")}</h1><button onClick={() => load()} disabled={loading} aria-label={tr("刷新校园墙")}><Icon name="refresh" /></button></header><WallSearchPeople/>{scopedClub>0&&<a className="wall-all-posts" href="/page/wall">← {tx('查看全部校园墙','All campus posts')}</a>}<div className="community-filter"><h2>{new URLSearchParams(location.search).get("keyword")?tx("帖子","Posts"):tx("浏览帖子","Browse posts")}</h2><CategoryPicker options={filterOptions} value={filter} onChange={setFilter} label={tr("浏览分类")} /></div>{!new URLSearchParams(location.search).get('keyword') && (profile.canPost ? <form ref={composerRef} className={"social-composer"+(anonymous?" is-anonymous":"")+(composing?" is-expanded":" is-collapsed")} onSubmit={publish} onFocusCapture={()=>setComposing(true)}>{!anonymous&&<Avatar person={profile.account} />}<div><label htmlFor="wall-composer" className="social-sr-only">{tr("发布校园动态")}</label><MentionComposer id="wall-composer" value={text} mentions={mentions} onMentionsChange={setMentions} maxLength={1000} rows={composing?3:1} placeholder={tr("有什么想和同学们说的？")} onChange={setText} /><div className="composer-options" inert={!composing} aria-hidden={!composing}><div>{(profile.clubs||[]).length>0&&<label className="wall-publisher">{tx('发布身份','Post as')}<select value={postingClub} onChange={e=>{setPostingClub(Number(e.target.value));if(Number(e.target.value))setAnonymous(false)}}><option value="0">{tx('个人','Myself')}</option>{profile.clubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}<div className="wall-upload"><div className="wall-upload-controls"><label>{files.length?tx('继续添加附件','Add more files'):tx('添加图片、视频或文件','Add images, videos or files')}<input ref={fileInput} aria-label={tx('添加附件','Add attachments')} disabled={busy} type="file" multiple accept=".jpg,.jpeg,.png,.mp4,.mov,.pdf,.txt" onChange={e=>{const selected=[...e.target.files];e.target.value='';if(!selected.length)return;const result=appendAttachments(files,selected);if(result.exceeded){setError(tx('最多 4 个附件，总计不超过 40 MB。已选附件已保留。','Up to 4 files, 40 MB total. Your previous selections have been kept.'));return}setFiles(result.files);setError('');setComposing(true)}}/></label><small>{tx('最多 4 个附件 · 合计 40 MB','Up to 4 files · 40 MB total')}</small></div><small className="wall-upload-formats">JPG / PNG / MP4 / MOV / PDF / TXT</small>{files.length>0&&<ul className="wall-upload-files" aria-label={tx('已选附件','Selected attachments')}>{files.map((f,i)=><li key={f.name+f.size+f.lastModified}><FileText size={20} aria-hidden="true"/><span className="wall-upload-name" title={f.name}>{f.name}</span><small>{(f.size/1024/1024).toFixed(2)} MB</small><button disabled={busy} type="button" aria-label={tx('移除附件：','Remove attachment: ')+f.name} onClick={()=>setFiles(current=>current.filter((_,n)=>n!==i))}><X size={16} aria-hidden="true"/></button></li>)}</ul>}</div><div className="community-compose-options"><CategoryPicker options={postOptions} value={category} onChange={setCategory} label={tr("发布类型")} /><label><input type="checkbox" disabled={postingClub>0} checked={anonymous} onChange={e => setAnonymous(e.target.checked)} />{tr("匿名发布")}</label></div>{anonymous && <p className="community-anonymous-note">{tr("其他同学看不到姓名和头像；后台保留账号归属。请勿在正文或附件中透露身份。")}</p>}<footer><span><Icon name="globe" />{tr("校内可见")}<small>{text.length}/1000</small></span><button className="social-primary" disabled={busy || !text.trim()}><TextMorph>{busy ? tr("发布中…") : tr("发布")}</TextMorph></button></footer></div></div></div></form> : <p className="social-view-note">{tr("浏览同学们的校园动态，私信交流也在这里。")}</p>)}<ErrorMessage>{error}</ErrorMessage><motion.div key={filter+page} initial={{
        opacity: 0,
        y: 9
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: .25
      }}>{!new URLSearchParams(location.search).get('keyword') && (filter === 'events' || filter === '') && events.map(e => <article className="community-event" key={e.id}><span>{tr("校园活动")}</span><h2>{e.title}</h2><p>{e.description}</p><div><b>{e.club}</b><time>{stamp(e.start)} — {stamp(e.end)}</time><small>{e.location}</small></div></article>)}{posts.map(p => <Post key={p.id} onPin={()=>load(1,true)} post={p} profile={profile} write={write} onRemove={id => setPosts(ps => ps.filter(p => p.id !== id))} onReply={async id=>{const updated=await api('/posts/'+id);setPosts(ps=>ps.map(p=>p.id===id?updated:p))}} onLike={id => setPosts(ps => ps.map(p => p.id === id ? {
          ...p,
          liked: !p.liked,
          likes: p.likes + (p.liked ? -1 : 1)
        } : p))} />)}{loading ? <p className="social-load">{tr("正在载入…")}</p> : !posts.length && !(events.length && !new URLSearchParams(location.search).get('keyword') && (filter === 'events' || filter === '')) ? <Empty>{new URLSearchParams(location.search).get("keyword")?tx("没有找到匹配的帖子，试试其他关键词。","No matching posts. Try another keyword."):tr("暂时没有这类帖子。")}</Empty> : <nav className="wall-pagination" aria-label={tx('帖子页码','Post pages')}><button disabled={page===1} onClick={()=>load(page-1)}>{tx('上一页','Previous')}</button>{pageWindow(page,pages).map(n=><button key={n} aria-current={page===n?'page':undefined} onClick={()=>load(n)}>{n}</button>)}<button disabled={page===pages} onClick={()=>load(page+1)}>{tx('下一页','Next')}</button></nav>}</motion.div></section><Discover /></>;
}
function WallSearchPeople() {
  const keyword = new URLSearchParams(location.search).get('keyword')?.trim() || '';
  const [people,setPeople]=useState(null),[error,setError]=useState('');
  useEffect(()=>{if(!keyword)return;const c=new AbortController();api('/users?'+new URLSearchParams({keyword,includeSelf:true}),{signal:c.signal}).then(setPeople).catch(e=>{if(e.name!=='AbortError')setError(tr(e.message))});return()=>c.abort()},[keyword]);
  if(!keyword)return null;
  return <section className="wall-search-summary" aria-label={tx('搜索结果','Search results')}><header><h2>{tx('搜索：','Search: ')}{keyword}</h2><a href="/page/wall">{tx('清除搜索','Clear search')}</a></header><h3>{tx('用户','People')}</h3><ErrorMessage>{error}</ErrorMessage>{people===null&&!error?<p>{tx('正在搜索…','Searching…')}</p>:people?.length?people.map(p=><a className="social-person-result" key={p.id} href={'/page/user/home?account='+p.id}><Avatar person={p}/><PersonIdentity person={p} query={keyword}/></a>):!error&&<p>{tx('没有匹配的用户','No matching people')}</p>}</section>;
}
function Discover() {
  const [query,setQuery]=useState(new URLSearchParams(location.search).get('keyword')||'');
  function search(e) {
    e.preventDefault();
    if(query.trim())location.assign('/page/wall?'+new URLSearchParams({keyword:query.trim()}));
  }
  return <aside className="social-right"><form className="social-discover-search" onSubmit={search}><Icon name="search" /><input aria-label={tx('搜索用户或帖子','Search people or posts')} placeholder={tx('搜索用户或帖子','Search people or posts')} value={query} maxLength={80} onChange={e => setQuery(e.target.value)} /><button type="submit" disabled={!query.trim()} aria-label={tx('搜索用户或帖子','Search people or posts')}><Icon name="arrow" /></button></form><section className="social-rail-card"><h2>{tr("校园服务")}</h2><a className="social-discover-link" href="/page/search"><strong>{tr("全部社团")}</strong><Icon name="arrow" /></a><a className="social-discover-link" href="/page/booking"><strong>{tr("羽毛球场预约")}</strong><span>{tr("3 楼场地 · 每段 20 分钟")}</span><Icon name="arrow" /></a><a className="social-discover-link" href="/page/suggestion"><strong>{tr("青源智造 · 创意箱")}</strong><Icon name="arrow" /></a></section><footer className="social-rail-footer">{tr("上海青浦世外高级中学")}</footer></aside>;
}
function Conversation({
  peer,
  profile,
  write,
  onBack,
  onChange
}) {
  const [chatFiles,setChatFiles]=useState([]);
  function addChatFiles(files){try{setChatFiles(appendChatFiles(chatFiles,files));setError('')}catch(e){setError(e.message==='file-size'?tx('单个附件不能超过 20 MB','Each attachment must be 20 MB or smaller'):tx('最多 4 个附件，合计不能超过 40 MB','Up to 4 attachments, 40 MB total'))}}
  const composerInput=useRef(null),securityDialog=useRef(null);const [securityOpen,setSecurityOpen]=useState(false);const loadedMessages=useRef(false),seenMessages=useRef(new Set()),arrivingMessages=useRef(new Set());
  useEffect(()=>{if(securityOpen)securityDialog.current?.showModal();else securityDialog.current?.close()},[securityOpen]);
  const [peerPending,setPeerPending]=useState(false),[cryptoAttempt,setCryptoAttempt]=useState(0),[syncPassword,setSyncPassword]=useState(""),[syncing,setSyncing]=useState(false);
  const [cryptoState, setCryptoState] = useState(null),
    [cryptoError, setCryptoError] = useState(''),
    [code, setCode] = useState('');
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const own = await ensureIdentity(profile.account.id, api, write),
          remote = await write('/keys/provision','POST',{account:peer.id});
        if (!remote.ready) {if(!cancelled){setPeerPending(true);setCryptoError("");setCryptoState(null);}return;}
        setPeerPending(false);
        await verifyPeer(profile.account.id, peer.id, remote);
        if (!cancelled) {
          setCryptoState(previous => previous?.peer.fingerprint === remote.fingerprint ? previous : {
            own,
            peer: remote
          });
          setCryptoError('');
          setCode(await safetyCode(own, remote));
        }
      } catch (e) {
        if (!cancelled) {
          setCryptoError(/尚未同步旧私信|重新登录以同步/.test(e.message)?tx('此设备尚未同步私信密钥。可在下方同步；如果原设备尚未备份密钥，请从原设备导出后，在个人资料中导入。','This device needs your message key. Sync below, or export the key from your original device and import it in Account settings.'):tr(e.message));
          setCryptoState(null);
        }
      }
    };
    init();
    const timer = setInterval(()=>{if(!document.hidden)init()}, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [peer.id,cryptoAttempt]);
  const [data, setData] = useState(null),
    [text, setText] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [olderLoading, setOlderLoading] = useState(false),
    [notice, setNotice] = useState('');
  useEffect(()=>{const input=composerInput.current;if(!input)return;input.style.height='0px';input.style.height=Math.min(160,Math.max(38,input.scrollHeight+2))+'px';input.style.overflowY=input.scrollHeight>160?'auto':'hidden';},[text]);
  const lock = useRef(false),
    list = useRef(),
    alive = useRef(true),
    last = useRef('');
  const load = useCallback(async () => {
    try {
      const d = await api('/conversations/' + peer.id);
      if (!alive.current) return;
      if(loadedMessages.current)for(const m of d.messages)if(!seenMessages.current.has(m.id))arrivingMessages.current.add(m.id);
      d.messages.forEach(m=>seenMessages.current.add(m.id));loadedMessages.current=true;
      setData(old => ({
        ...d,
        messages: [...(old?.messages || []).filter(m => !d.messages.some(n => n.id === m.id)), ...d.messages].map(m=>d.recalledIds?.includes(m.id)?{...m,text:"",recalled:true,read:true}:d.readIds?.includes(m.id)?{...m,read:true}:m),
        older: old?.messages?.length > 100 ? old.older : d.older
      }));
      setError('');
      if (!document.hidden&&d.messages.some(m => m.recipient === profile.account.id && !m.read)) {await write('/conversations/' + peer.id + '/read', 'POST');window.dispatchEvent(new Event('campus-notifications-changed'));}
    } catch (e) {
      if (alive.current) setError(tr(e.message));
    }
  }, [peer.id]);
  useEffect(() => {
    alive.current = true;
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 5000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, [load]);
  useEffect(() => {
    const id = data?.messages.at(-1)?.id || '';
    if (id !== last.current) {
      list.current?.scrollTo({
        top: list.current.scrollHeight,
        behavior: last.current ? 'smooth' : 'auto'
      });
      last.current = id;
    }
  }, [data]);
  async function action(fn) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
      onChange();
    } catch (e) {
      setError(tr(e.message));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const migrating = useRef(false);
  useEffect(() => {
    if (!cryptoState || !data || migrating.current) return;
    const messages = data.messages.filter(m => m.sender === profile.account.id && !m.recalled && !m.text.startsWith('e2ee:v1:'));
    if (!messages.length) return;
    migrating.current = true;
    (async () => {
      try {
        for (const m of messages) {
          const text = await encryptMessage(cryptoState.own, cryptoState.peer, m.sender, m.recipient, m.text);
          await write('/conversations/' + peer.id + '/history/' + m.id, 'PUT', {
            text
          });
        }
        await load();
      } catch (e) {
        if (alive.current) setError(tr("历史消息暂未完成加密：") + e.message);
      } finally {
        migrating.current = false;
      }
    })();
  }, [data, cryptoState]);
  const send = e => {
    e.preventDefault();
    if(lock.current||(!text.trim()&&!chatFiles.length)||!cryptoState||data?.messagingAllowed===false)return;
    const draft=text,attachments=[...chatFiles];
    action(async () => {
      if (!cryptoState) throw Error(tr("请先开启加密私信"));
      if(attachments.length){
        const prepared=await prepareChatFiles(cryptoState.own,cryptoState.peer,profile.account.id,peer.id,draft,attachments),body=new FormData();
        body.append('text',prepared.text);for(const file of prepared.files)body.append('files',file.blob,file.metadata.id);
        await api('/conversations/'+peer.id+'/attachments',{method:'POST',headers:{'X-Workspace-Token':profile.token},body});
        setChatFiles(current=>current.filter(file=>!attachments.includes(file)));
      }else{
        const encrypted=await encryptMessage(cryptoState.own,cryptoState.peer,profile.account.id,peer.id,draft);
        await write('/conversations/'+peer.id,'POST',{text:encrypted});
      }
      setText(current=>current===draft?'':current);
      composerInput.current?.focus();
    });
  };
  const older = async () => {
    if (olderLoading || !data?.older) return;
    setOlderLoading(true);
    try {
      const d = await api('/conversations/' + peer.id + '?before=' + data.older);
      if (alive.current) setData(old => ({
        ...old,
        older: d.older,
        messages: [...d.messages, ...old.messages]
      }));
    } catch (e) {
      setError(tr(e.message));
    } finally {
      setOlderLoading(false);
    }
  };
  return <section className="social-chat refined-chat"><header className="social-chat-header"><button className="social-chat-back" aria-label={tr("返回会话列表")} onClick={onBack}><Icon name="back" /></button><Avatar person={peer} /><a href={"/page/user/home?account="+peer.id}><PersonIdentity person={peer}/></a><div className="chat-preference-actions"><button title={data?.preferences?.pinned?tx("取消置顶","Unpin chat"):tx("置顶聊天","Pin chat")} aria-label={data?.preferences?.pinned?tx("取消置顶","Unpin chat"):tx("置顶聊天","Pin chat")} aria-pressed={!!data?.preferences?.pinned} disabled={busy||!data} onClick={()=>action(()=>write("/conversations/"+peer.id+"/preferences","PUT",{...data.preferences,pinned:!data.preferences.pinned}))}><PushPin size={20}/></button><button title={data?.preferences?.blocked?tx("解除拉黑","Unblock"):tx("拉黑用户","Block user")} aria-label={data?.preferences?.blocked?tx("解除拉黑","Unblock"):tx("拉黑用户","Block user")} aria-pressed={!!data?.preferences?.blocked} disabled={busy||!data} onClick={()=>action(()=>write("/conversations/"+peer.id+"/preferences","PUT",{...data.preferences,blocked:!data.preferences.blocked}))}><Prohibit size={20}/></button><button className="chat-info-button" aria-label={tx("聊天信息","Conversation information")} onClick={()=>setSecurityOpen(true)}><Info size={20}/></button></div></header><dialog ref={securityDialog} className="chat-security-dialog" aria-label={tx("聊天信息","Conversation information")} onCancel={()=>setSecurityOpen(false)} onClick={e=>{if(e.target===securityDialog.current)setSecurityOpen(false)}}><header><h2>{cryptoState ? tx("加密聊天 · 安全码","Encrypted chat · Safety code") : tr("正在准备加密私信")}</h2><button aria-label={tx("关闭","Close")} onClick={()=>setSecurityOpen(false)}><CloseIcon size={22}/></button></header><p>{tx("消息在设备上加密，服务器加密保管恢复密钥，支持邮箱找回聊天。双方可核对下方安全码。","Messages are encrypted on your device. Encrypted recovery keys are held by the server so email recovery can restore your chats. You can compare the safety code below.")}</p><code>{code}</code><a href="/page/user/profile">{tr("备份 / 导入私信密钥")}</a></dialog>{peerPending&&<p className="chat-info" role="status">{tx('对方尚未开启加密私信，等待对方进入网站后会自动连接。你无需重新登录。','This person has not activated encrypted messaging yet. We will connect automatically when they visit the site. You do not need to sign in again.')}</p>}{cryptoError&&<form className="chat-key-sync" onSubmit={async e=>{e.preventDefault();setSyncing(true);try{const {syncIdentityAfterLogin}=await import('./message-crypto.js');await syncIdentityAfterLogin(syncPassword);setSyncPassword('');setCryptoError('');setCryptoAttempt(v=>v+1)}catch(e){setCryptoError(tx('暂时无法同步：','Unable to sync: ')+e.message)}finally{setSyncing(false)}}}><p role="alert">{cryptoError}</p><label>{tx('在当前页面同步旧私信','Sync existing messages here')}<input type="password" autoComplete="current-password" value={syncPassword} onChange={e=>setSyncPassword(e.target.value)} placeholder={tx('当前账号密码','Current account password')}/></label><button disabled={syncing||!syncPassword}>{syncing?tx('同步中…','Syncing…'):tx('同步密钥','Sync keys')}</button></form>}{data?.messagingAllowed===false&&<p className="chat-info">{data.preferences?.blocked?tx('你已拉黑此用户。解除拉黑后可以继续私信。','You blocked this person. Unblock to resume messaging.'):tx('当前无法向此账号发送私信。','Messaging is currently unavailable for this account.')}</p>}<div className="social-chat-scroll" ref={list}>{data?.older && <button className="social-load-more" disabled={olderLoading} onClick={older}>{tr("查看更早消息")}</button>}{!data ? <Empty>{tr("正在载入会话…")}</Empty> : <>{data.invitations.map(i => <article className="social-invite" key={i.id}><span>{tr("社团任职邀请")}</span><h3>{i.clubName}</h3><p>{i.sender === profile.account.id ? tr("你邀请对方担任") : tr("邀请你担任")}<strong>{i.role === 'president' ? tr("社长") : tr("副社长")}</strong></p><small>{stamp(i.createdAt)}</small>{i.status === 'pending' && i.recipient === profile.account.id ? <><p className="social-muted">{tr("接受后获得该社团管理权限，真实姓名同步到官网。")}</p><div><button disabled={busy} className="social-primary" onClick={() => action(async () => {
                await write('/invitations/' + i.id + '/respond', 'POST', {
                  accept: true
                });
                setNotice(tr("已接受任职邀请，可以进入社团管理。"));
              })}>{tr("接受邀请")}</button><button disabled={busy} onClick={() => action(() => write('/invitations/' + i.id + '/respond', 'POST', {
                accept: false
              }))}>{tr("拒绝")}</button></div></> : <b>{i.status === 'accepted' ? tr("已接受") : i.status === 'declined' ? tr("已拒绝") : tr("等待对方确认")}</b>}</article>)}{!data.messages.length && !data.invitations.length && <Empty>{tr("向")}{personName(peer)}{tr("打个招呼吧。")}</Empty>}{data.messages.map(m => <div className={'social-message ' + (m.sender === profile.account.id ? 'own' : '')+(arrivingMessages.current.has(m.id)?' message-arriving':'')} key={m.id}><MessageContent message={m} cryptoState={cryptoState} me={profile.account.id} /><small>{stamp(m.createdAt)}{!m.recalled&&m.sender === profile.account.id ? ' · ' + (m.read ? tr("已读") : tx("未读","Unread")) : ''}</small>{m.sender===profile.account.id&&!m.recalled&&<button className="recall-message" type="button" disabled={busy} onClick={async()=>{if(lock.current)return;lock.current=true;setBusy(true);try{await write('/conversations/'+peer.id+'/messages/'+m.id,'DELETE');await load();window.dispatchEvent(new Event('campus-notifications-changed'))}catch(e){setError(tr(e.message))}finally{lock.current=false;setBusy(false)}}}>{tx('撤回','Recall')}</button>}</div>)}</>}</div>{notice && <p className="social-success">{notice} <a href="/page/club/workspace">{tr("进入管理 ↗")}</a></p>}<ErrorMessage>{error}</ErrorMessage><ChatComposer files={chatFiles} onFiles={addChatFiles} onRemove={index=>setChatFiles(current=>current.filter((_,i)=>i!==index))} text={text} onText={setText} inputRef={composerInput} busy={busy} disabled={!cryptoState||data?.messagingAllowed===false} onSend={send}/></section>;
}
function MessageContent({
  message,
  cryptoState,
  me
}) {
  const encrypted = message.text.startsWith('e2ee:v1:'),
    [value, setValue] = useState(tr("加密消息 · 等待本机密钥"));
  useEffect(() => {
    let active = true;
    if (encrypted && cryptoState) decryptMessage(cryptoState.own, cryptoState.peer, me, message).then(t => {
      if (active) setValue(t);
    }).catch(() => {
      if (active) setValue(tr("无法解密，请检查原密钥备份。"));
    });
    return () => {
      active = false;
    };
  }, [message.text, cryptoState]);
  if(message.recalled)return <p className="message-recalled">{tx("消息已撤回","Message recalled")}</p>;
  const rich=parseChatFiles(encrypted?value:message.text);if(rich)return <ChatMessageFiles body={rich} message={message} me={me}/>;
  return <p>{encrypted ? value : <><span className="message-legacy">{tr("历史消息 · 未端到端加密")}</span>{message.text}</>}</p>;
}
function InboxPreview({item,profile,write}){const [value,setValue]=useState('');useEffect(()=>{let active=true;const message=item.latestMessage;if(!message?.id){setValue(tr(item.preview));return}if(message.recalled){setValue(tx('消息已撤回','Message recalled'));return}if(!message.text.startsWith('e2ee:v1:')){setValue(message.text);return}setValue(tx('正在载入…','Loading…'));Promise.all([ensureIdentity(profile.account.id,api,write),api('/keys/'+item.account.id)]).then(async([own,peer])=>{await verifyPeer(profile.account.id,item.account.id,peer);const text=await decryptMessage(own,peer,profile.account.id,message);if(active)setValue(chatPreview(text))}).catch(()=>{if(active)setValue(tx('请同步聊天密钥','Sync your chat key'))});return()=>{active=false}},[item.latestMessage?.text,item.latestMessage?.recalled,item.account.id]);return <p>{item.blocked?tx('已拉黑','Blocked'):value}</p>}
function Messages({
  profile,
  write
}) {
  const [inbox, setInbox] = useState([]),
    [peer, setPeer] = useState(null),
    [query, setQuery] = useState(''),
    [results, setResults] = useState(null),
    [error, setError] = useState(''),
    [searching, setSearching] = useState(false);
  const searchRef = useRef();
  const load = useCallback(async () => {
    try {
      setInbox(await api('/inbox'));
    } catch (e) {
      setError(tr(e.message));
    }
  }, []);
  useEffect(() => {
    load();
    const club=new URLSearchParams(location.search).get('club');if(club&&/^\d+$/.test(club))api('/clubs/'+club+'/contact').then(setPeer).catch(e=>setError(tr(e.message)));
    const id = new URLSearchParams(location.search).get('with');
    if (id && /^[a-f0-9]{64}$/.test(id)) api('/conversations/' + id).then(d => setPeer(d.account)).catch(e => setError(tr(e.message)));
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 5000);
    return () => {
      clearInterval(timer);
      searchRef.current?.abort();
    };
  }, [load]);
  async function search(e) {
    e.preventDefault();
    searchRef.current?.abort();
    const c = new AbortController();
    searchRef.current = c;
    setSearching(true);
    setError('');
    try {
      setResults(await api('/users?' + new URLSearchParams({
        keyword: query.trim()
      }), {
        signal: c.signal
      }));
    } catch (e) {
      if (e.name !== 'AbortError') setError(tr(e.message));
    } finally {
      if (!c.signal.aborted) setSearching(false);
    }
  }
  return <div className={'social-messenger ' + (peer ? 'has-peer' : '')}><section className="social-inbox"><header><h1>{tr("私信")}</h1><button className="social-icon-button" aria-label={tr("新建私信")} onClick={() => document.getElementById('people-search')?.focus()}><Icon name="pen" /></button></header><form className="social-people-search" onSubmit={search}><Icon name="search" /><input id="people-search" aria-label={tr("按真实姓名搜索账号")} maxLength={80} value={query} onChange={e => setQuery(e.target.value)} placeholder={tx('搜索姓名 / 英文名 / 昵称','Search name or nickname')} /><button disabled={searching || !query.trim()} aria-label={tr("搜索私信用户")}><Icon name="arrow" /></button></form><ErrorMessage>{error}</ErrorMessage>{results !== null && <div className="social-search-results"><header>{tr("搜索结果")}<button onClick={() => setResults(null)}>{tr("收起")}</button></header>{results.length ? results.map(a => <button key={a.id} onClick={() => {
          setPeer(a);
          setResults(null);
        }}><Avatar person={a} /><PersonIdentity person={a} query={query}/></button>) : <p>{tr("没有找到匹配的站内用户。")}</p>}</div>}<div className="social-conversations">{inbox.map(i => <button key={i.account.id} className={peer?.id === i.account.id ? 'selected' : ''} onClick={() => setPeer(i.account)}><span className="conversation-avatar"><Avatar person={i.account} />{i.unread>0&&<span className="conversation-unread-dot" aria-label={tx("有未读消息","Unread messages")}/>}</span><div><strong>{i.pinned&&<PushPin size={14} aria-label={tx("已置顶","Pinned")}/>} {personName(i.account)}</strong><InboxPreview item={i} profile={profile} write={write}/></div>{i.unread > 0 && <b>{i.unread}</b>}</button>)}{!inbox.length && <Empty>{tr("搜索同学的姓名，")}<br />{tr("开始第一段对话。")}</Empty>}</div></section>{peer ? <Conversation key={peer.id} peer={peer} profile={profile} write={write} onBack={() => setPeer(null)} onChange={load} /> : <div className="social-chat-placeholder"><div><h2>{tr("选择一条私信")}</h2><p>{tr("选择已有会话，或按姓名查找同学。")}</p><button className="social-primary" onClick={() => document.getElementById('people-search')?.focus()}>{tr("新私信")}</button></div></div>}</div>;
}
function Social() {
 useEffect(()=>{document.body.classList.add('social-network-theme');return()=>document.body.classList.remove('social-network-theme')},[]);
  const [profile, setProfile] = useState(null),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    api('', {
      signal: c.signal
    }).then(setProfile).catch(e => {
      if (e.name !== 'AbortError') setError(tr(e.message));
    });
    return () => c.abort();
  }, [attempt]);
  const write = (path, method, body) => api(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Workspace-Token': profile.token
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  useEffect(() => {
    if (profile) ensureIdentity(profile.account.id, api, write).catch(() => {});
  }, [profile?.account.id]);
  return <MotionConfig reducedMotion="user"><CardNav autoHide={mode==='wall'} active={mode} account={profile?.account} /><motion.main initial={{
      opacity: 0,
      y: 12
    }} animate={{
      opacity: 1,
      y: 0
    }} className={'social-shell ' + mode}>{profile ? mode === 'wall' ? new URLSearchParams(location.search).get('post')?<PostDetail id={new URLSearchParams(location.search).get('post')} profile={profile} write={write}/>:<Wall profile={profile} write={write} /> : <Messages profile={profile} write={write} /> : <section className="social-loading"><ErrorMessage>{error}</ErrorMessage>{error ? <button onClick={() => setAttempt(v => v + 1)}>{tr("重试")}</button> : <Empty>{tr("正在载入校园生活…")}</Empty>}</section>}</motion.main></MotionConfig>;
}
createRoot(document.getElementById('campus-social')).render(<Social />);

import './CampusMotion.css';
