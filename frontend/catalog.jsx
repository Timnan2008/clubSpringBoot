import Avatar from './Avatar';
import {ArrowUpRight} from '@phosphor-icons/react';
import PersonIdentity, {realNames, postName} from './PersonIdentity';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import CardNav from './CardNav';
import PixelTransition from './PixelTransition';
import AsciiCursor from './AsciiCursor';
import videoVariants from './video-variants.json';
import RotatingText from './RotatingText';
import ClubJoin from './ClubJoin';
import {AnimatedNumber,TextMorph} from './MotionPrimitives';
import ClubLikes from './ClubLikes';
import { en, tx } from './language';
import './catalog.css';

const host = document.getElementById('club-catalog');
const categories = [['', '全部社团', 'All clubs'], ['creativity', '创造', 'Creativity'], ['activity', '活动', 'Activity'], ['service', '服务', 'Service'], ['study', '学术', 'Study']];
const label = kind => { const c = categories.find(c => c[0] === kind); return c ? (en ? c[2] : c[1]) : tx('社团', 'Club'); };
// Reject executable and foreign embedding schemes while allowing existing media paths.
const media = value => {
  if (!value || typeof value !== 'string') return '';
  if (value.includes('WFL-logo.png')) return '/other%20photo/WFL-crest.svg';
  try { const u = new URL(value, location.origin); if (u.origin === location.origin && videoVariants[u.pathname]) u.pathname = videoVariants[u.pathname]; return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
};
async function read(url, signal) {
  const r = await fetch(url, { signal }); const d = await r.json();
  if (!r.ok || (d.code && d.code !== 200)) throw new Error(tx('加载失败，请重试。', 'Unable to load. Please try again.'));
  return d.data ?? d;
}
function Logo({ src, name, large = false }) {
  const [failed, setFailed] = useState(false);
  return <div className={'club-art' + (large ? ' club-art-large' : '')}>{src && !failed ? <img src={media(src)} alt={name} loading={large ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} /> : <span>{name?.slice(0, 1) || 'C'}</span>}</div>;
}
function ClubFilm({src,poster,name}){
 const [failed,setFailed]=useState(false);
 return <div className="club-film"><video controls playsInline preload="metadata" poster={poster||undefined} aria-label={name+tx(' · 社团视频',' · Club film')} src={src} onError={()=>setFailed(true)}/>{failed&&<p role="status">{tx('视频暂时无法播放。','The video could not be loaded.')} <a href={src} target="_blank" rel="noopener noreferrer">{tx('打开原视频','Open original video')} ↗</a></p>}</div>;
}
const memes=[1,2,3].map(n=>'/images/club-memes/cat-'+n+'.png');
function Catalog() {
  const [meme,setMeme]=useState(()=>Math.floor(Math.random()*memes.length));
  const nextMeme=()=>setMeme(previous=>(previous+1+Math.floor(Math.random()*(memes.length-1)))%memes.length);
  useEffect(()=>{if(host.dataset.mode==='detail')memes.forEach(src=>{const image=new Image();image.src=src;image.decode?.().catch(()=>{});});},[]);
  const [query, setQuery] = useState(new URLSearchParams(location.search).get('keyword') || ''), [category, setCategory] = useState(host.dataset.category || '');

  const detail = host.dataset.mode === 'detail';const [posts,setPosts]=useState([]),[people,setPeople]=useState([]),[leaders,setLeaders]=useState({});
  useEffect(()=>{if(detail||!query.trim()||host.dataset.authenticated!=='true'){setPosts([]);setPeople([]);return;}const c=new AbortController();const timer=setTimeout(()=>Promise.all([fetch('/api/campus-social/posts?'+new URLSearchParams({keyword:query.trim()}),{signal:c.signal}).then(r=>r.ok?r.json():{items:[]}),fetch('/api/campus-social/users?'+new URLSearchParams({keyword:query.trim()}),{signal:c.signal}).then(r=>r.ok?r.json():[])]).then(([posts,users])=>{setPosts(posts.items);setPeople(users)}).catch(()=>{}),250);return()=>{clearTimeout(timer);c.abort()}},[query]);
  const [account, setAccount] = useState(null), [items, setItems] = useState([]), [club, setClub] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    if(detail)read('/api/campus-social/clubs/'+host.dataset.id+'/leaders',controller.signal).then(setLeaders).catch(()=>{});
    if (host.dataset.authenticated === 'true') read('/api/campus-social', controller.signal).then(d => setAccount(d.account)).catch(() => {});
    read(detail ? `/api/club/id/${host.dataset.id}` : '/api/club/all', controller.signal).then(d => { if(detail) { setClub(d); document.title = (en ? d.clubNameEn : d.clubName) + ' · QPWFLHS'; } else setItems(d); }).catch(e => { if(e.name !== 'AbortError') setError(e.message); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  const localized = (zh, english) => en && english ? english : zh;
  const filtered = items.filter(c => (!category || c.clubClass === category) && [c.clubName, c.clubNameEn, c.sortDescription].some(v => (v || '').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const name = club && localized(club.clubName, club.clubNameEn);
  return <main className="catalog-shell">{detail&&Number(host.dataset.id)===1&&<AsciiCursor/>}<CardNav autoHide={detail} homeBack={!detail} account={account} guest={host.dataset.authenticated !== "true"} />
    {loading ? <div className="catalog-status" role="status">{tx('正在载入社团…', 'Loading clubs…')}</div> : error ? <div className="catalog-status" role="alert"><p>{error}</p><button onClick={() => location.reload()}>{tx('重新加载', 'Retry')}</button></div> : detail && club ? <>

      <section className="club-hero"><div><div className="club-eyebrow">QPWFLHS CLUBS <span>/ {label(club.clubClass)}</span></div><h1>{name}</h1>{!en && club.clubNameEn && <p className="club-english-name">{club.clubNameEn}</p>}<p className="club-slogan">{localized(club.sortDescription, club.sortDescriptionEn)}</p>{Number(club.id)===28&&<div className="robot-motto"><span>{tx('一起','Together, we')}</span><RotatingText texts={en?['Design.','Build.','Create.']:['设计','编程','创造']}/></div>}<ClubLikes club={club} account={account}/><ClubJoin club={club} account={account} authenticated={host.dataset.authenticated==='true'}/></div><PixelTransition className="club-logo-card" firstContent={<div className="club-pixel-front"><span>QPWFLHS CLUBS</span><img src={media(club.clubItem)||'/other%20photo/WFL-crest.svg'} alt={name} decoding="async"/></div>} onActivate={nextMeme} secondContent={<div className="club-pixel-meme"><img src={memes[meme]} alt={tx('猫咪表情包','Cat meme')} decoding="async"/></div>} gridSize={10} pixelColor="#796094"/></section>
      <div className="club-detail-grid"><div><section className="club-section"><h2>{tx('关于我们', 'About the club')}</h2><p className="club-description">{localized(club.clubDescription, club.clubDescriptionEn) || tx('社团正在完善介绍。', 'The club is preparing its introduction.')}</p></section>{media(club.video) && <section className="club-section"><h2>{tx('社团影像', 'Club film')}</h2><ClubFilm src={media(club.video)} poster={media(club.clubItem)} name={name}/></section>}</div><aside><section className="club-people"><h2>{tx('负责人', 'Club leaders')}</h2><dl>{[['president',tx('社长','President'),localized(club.president,club.presidentEn)],['vice_president',tx('副社长','Vice president'),localized(club.vicePresident,club.vicePresidentEn)],['teacher',tx('指导教师','Adviser'),localized(club.teacher,club.teacherEn)]].map(([key,role,person]) => <div key={key}><dt>{role}</dt><dd>{leaders[key]?.length?leaders[key].map(p=><a className="club-person-link" key={p.id} href={'/page/user/home?account='+p.id}>{localized(p.name,p.nameEn)}</a>):(key==='teacher'?(person||tx('暂无','None')):tx('暂无','None'))}</dd></div>)}</dl></section><section className="club-membership-note"><h2>{tx('想认识这个社团？', 'Interested in this club?')}</h2><p>{tx('提交入社申请，也可以先私信负责人了解活动安排。', 'Apply to join, or message the club team to learn about their activities.')}</p><a href={"/page/messages?club="+club.id}>{tx('前往私信', 'Open messages')} ↗</a><a href={'/page/wall?club='+club.id}>{tx('查看社团发布的校园墙','View this club’s posts')} ↗</a></section></aside></div>
    </> : <><header className="catalog-heading"><div className="club-eyebrow">QPWFLHS / CLUB DIRECTORY</div><h1>{host.dataset.mode === 'search' ? tx('找到你的社团', 'Find your club') : tx('社团，在这里相遇', 'Meet your next club')}</h1><p>{tx('从兴趣出发，看看同学们正在做什么。', 'Start with an interest. See what others are creating.')}</p></header><form className="catalog-search" onSubmit={e => { e.preventDefault(); const url = new URL(location.href); url.searchParams.set('keyword', query); history.replaceState(null,'',url); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input aria-label={tx('搜索社团','Search clubs')} value={query} onChange={e => setQuery(e.target.value)} placeholder={tx('搜索名称、关键词…', 'Search names or keywords…')} />{query && <button type="button" onClick={() => setQuery('')} aria-label={tx('清空','Clear')}>×</button>}</form><div className="catalog-filters" aria-label={tx('社团类别','Club category')}>{categories.map(([id,zh,english]) => <button key={id} aria-pressed={category === id} onClick={() => setCategory(id)}><TextMorph>{en ? english : zh}</TextMorph></button>)}<span aria-live="polite"><AnimatedNumber value={filtered.length}/> {tx('个社团','clubs')}</span></div>{people.length>0&&<section className="catalog-post-results catalog-people-results"><h2>{tx('校园用户','Campus members')}</h2>{people.map(p=><a href={'/page/user/home?account='+p.id} key={p.id}><Avatar person={p}/><PersonIdentity person={p} query={query}/><ArrowUpRight size={18}/></a>)}</section>}{posts.length>0&&<section className="catalog-post-results"><h2>{tx('校园帖子','Campus posts')}</h2>{posts.map(p=><a key={p.id} href={'/page/wall?keyword='+encodeURIComponent(query)+'#post-'+p.id}>{p.anonymous?<small>{tx('匿名同学','Anonymous')}</small>:<PersonIdentity person={p.author} query={query}/>}<p>{p.text.slice(0,200)}</p></a>)}</section>}<div className="club-grid">{filtered.map(c => <a className="club-tile" href={`/page/clubs/${c.id}`} key={c.id}><Logo src={c.clubItem} name={localized(c.clubName,c.clubNameEn)} /><div className="club-tile-copy"><small>{label(c.clubClass)}</small><h2>{localized(c.clubName,c.clubNameEn)}<span>↗</span></h2><p>{localized(c.sortDescription,c.sortDescriptionEn)}</p></div></a>)}</div>{!filtered.length && <p className="catalog-status">{tx('没有找到相关社团，试试其他关键词。', 'No matching clubs. Try another keyword.')}</p>}</>}
    <footer className="catalog-footer">QPWFLHS CLUBS <span>{tx('上海青浦世外高级中学', 'Shanghai Qingpu World Foreign Language High School')}</span></footer>
  </main>;
}
createRoot(host).render(<Catalog />);
window.addEventListener('pageshow', e => { if(e.persisted) location.reload(); });

import './CampusMotion.css';
