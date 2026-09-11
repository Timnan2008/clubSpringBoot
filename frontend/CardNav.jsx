import Notifications from './Notifications';
import {MagnifyingGlass} from '@phosphor-icons/react';
import TeacherDayWelcome from './TeacherDay';
import { tr, changeLanguage, en } from "./language";
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './CardNav.css';
import './CampusTheme.css';
import Avatar from './Avatar';
import BackButton from './BackButton';
import {TextMorph} from './MotionPrimitives';
// Adapted from React Bits CardNav. See REACT-BITS-LICENSE.md.
export default function CardNav({
  active,
  guest = false,
  account: suppliedAccount, profile: suppliedProfile, accountLoading=false, siteOrigin = '', homeBack = false, autoHide = false
}) {
  const [fetchedProfile,setFetchedProfile]=useState(null),[hasOffice,setHasOffice]=useState(false),[tucked,setTucked]=useState(false);
  const restoredAt=useRef(0);const restore=()=>{restoredAt.current=performance.now()+350;setTucked(false)};
  const account=suppliedAccount||suppliedProfile?.account||fetchedProfile?.account;
  useEffect(()=>{if(suppliedProfile||accountLoading||guest||siteOrigin)return;const c=new AbortController();fetch('/api/campus-social/me',{signal:c.signal}).then(r=>r.ok?r.json():null).then(p=>{if(p){setFetchedProfile(p);setHasOffice(!!p.offices?.length)}}).catch(()=>{});return()=>c.abort()},[!!suppliedProfile,accountLoading,guest,siteOrigin]);

  useEffect(()=>{if(!autoHide)return;let last=scrollY,settling=0;const onScroll=()=>{const y=scrollY,now=performance.now();if(now<Math.max(settling,restoredAt.current)){last=y;return;}if(y<100||y<last-6){setTucked(false);settling=now+300;}else if(y>last+6){setTucked(true);setOpen(false);settling=now+300;}last=y};addEventListener('scroll',onScroll,{passive:true});return()=>removeEventListener('scroll',onScroll)},[autoHide]);
  useEffect(()=>{const me=suppliedProfile||fetchedProfile;if(!me?.account?.id||guest||siteOrigin&&siteOrigin!==location.origin)return;let active=true;import('./message-crypto.js').then(async({ensureIdentity})=>{const api=async(path,options={})=>{const response=await fetch('/api/campus-social'+path,options);if(!response.ok)throw Error('Key initialization unavailable');return response.json()};if(active)await ensureIdentity(me.account.id,api,(path,method,body)=>api(path,{method,headers:{'Content-Type':'application/json','X-Workspace-Token':me.token},body:JSON.stringify(body)}))}).catch(()=>{});return()=>{active=false}},[suppliedProfile?.account.id,fetchedProfile?.account.id]);
  const [open, setOpen] = useState(false),
    root = useRef(),
    content = useRef(),
    toggle = useRef();
  const groups = [{
    label: tr("校园"),
    links: [[tr("校园墙"), '/page/wall'], [tr("私信"), '/page/messages']]
  }, {
    label: tr("社团与活动"),
    links: [[en?"All clubs":"全部社团", "/page/search"], [tr("我的社团"), '/page/my-clubs'], [tr("羽毛球场预约"), '/page/booking'], ...(account && (['president','teacher','admin'].includes(account.role)||hasOffice||suppliedProfile?.offices?.length) ? [[tr("社团管理"), '/page/club/workspace']] : [])]
  }, {
    label: tr("我的账号"),
    links: [[en?'My calendar':'我的日历','/page/calendar'], [en?'My profile':'个人主页', '/page/user/home'], [tr("个人资料"), '/page/user/profile'], [en ? "Qingyuan Ideas" : "青源智造", "/page/suggestion"], [tr("返回社团官网"), '/']]
  }];
  useLayoutEffect(() => {
    const nav = root.current,
      box = content.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = () => {
      gsap.killTweensOf([nav, ...box.children]);
      gsap.to(nav, {
        height: open ? 60 + box.scrollHeight : 60,
        duration: reduced ? 0 : .4,
        ease: 'power3.out'
      });
      gsap.fromTo(box.children, {
        y: open ? 30 : 0,
        opacity: open ? 0 : 1
      }, {
        y: open ? 0 : 12,
        opacity: open ? 1 : 0,
        duration: reduced ? 0 : .35,
        stagger: open ? .07 : 0,
        ease: 'power3.out'
      });
    };
    animate();
    let width = box.getBoundingClientRect().width;
    const ro = new ResizeObserver(() => {
      const next = box.getBoundingClientRect().width;
      if (next !== width && open) gsap.set(nav, {
        height: 60 + box.scrollHeight
      });
      width = next;
    });
    ro.observe(box);
    return () => {
      ro.disconnect();
      gsap.killTweensOf([nav, ...box.children]);
    };
  }, [open, account?.role]);
  useLayoutEffect(() => {
    if (!open) return;
    const key = e => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggle.current.focus();
      }
    };
    const outside = e => {
      if (!root.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);
  return <><TeacherDayWelcome account={account}/><div className={"campus-top"+(autoHide?" campus-top--sticky":"")+(tucked&&!open?" campus-top--tucked":"")} onFocusCapture={restore} onPointerEnter={restore}><nav ref={root} className={'card-nav ' + (open ? 'open' : '')} aria-label={tr("校园导航")}><div className="card-nav-top"><button ref={toggle} type="button" className="card-nav-toggle" onClick={() => setOpen(v => !v)} aria-label={open ? tr("关闭菜单") : tr("打开菜单")} aria-expanded={open} aria-controls="campus-nav-cards"><span className="card-nav-lines"><i /><i /></span><TextMorph>{open?tr("关闭菜单"):tr("菜单")}</TextMorph></button><a className="card-nav-logo" href={siteOrigin+"/"} aria-label={tr("青浦世外社团官网")}><img src={siteOrigin+"/other%20photo/WFL-crest.svg"} alt={tr("校徽")} /><strong>QPWFLHS <span>CLUBS</span></strong></a><form className="card-nav-search" action={siteOrigin+(active === "wall" ? "/page/wall" : "/page/search")}><MagnifyingGlass size={18}/><input name="keyword" aria-label={active === "wall" ? (en?"Search posts and people":"搜索帖子和用户") : (en?"Search people, clubs and posts":"搜索用户、社团或帖子")} placeholder={active === "wall" ? (en?"Search posts and people":"搜索帖子和用户") : (en?"Search":"搜索")} defaultValue={active === "wall" ? new URLSearchParams(location.search).get("keyword") || "" : ""} maxLength={80}/><button type="submit" aria-label={en?"Search":"搜索"}><MagnifyingGlass size={18}/></button></form><Notifications enabled={!!account&&!guest&&!siteOrigin}/><a className="card-nav-account" href={siteOrigin+(guest ? "/page/user/login" : "/page/user/profile")}>{account?.avatarUrl && <Avatar person={account} />}<span>{(en&&account?.nameEn?account.nameEn:account?.name) || (guest ? (en ? "Sign in" : "登录 / 注册") : tr("个人资料"))}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg></a></div><div ref={content} className="card-nav-content" id="campus-nav-cards" inert={!open} aria-hidden={!open}>{groups.map((g, i) => <section className={'nav-card card-tone-' + i} key={g.label}><h2>{g.label}</h2><div>{g.links.map(([label, href]) => <a key={href} href={siteOrigin+href} tabIndex={open ? 0 : -1} aria-current={location.pathname === href ? 'page' : undefined}><svg className="nav-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg><span className="nav-link-label">{label}</span></a>)}</div></section>)}</div></nav><div className="campus-subnav" inert={tucked&&!open} aria-hidden={tucked&&!open}>{homeBack?<a className="campus-back" href={siteOrigin+"/"} title={en?"Back to homepage":"返回首页"} aria-label={en?"Back to homepage":"返回首页"}>←</a>:<BackButton fallback={siteOrigin+"/"}/>}<a href={siteOrigin+"/page/wall"} aria-current={active === 'wall' ? 'page' : undefined}>{tr("校园墙")}</a><a href={siteOrigin+"/page/messages"} aria-current={active === 'messages' ? 'page' : undefined}>{tr("私信")}</a><a href={siteOrigin+"/page/my-clubs"} aria-current={active === 'clubs' ? 'page' : undefined}>{tr("我的社团")}</a><a href={siteOrigin+"/page/calendar"} aria-current={active === 'calendar' ? 'page' : undefined}>{en?'Calendar':'我的日历'}</a><a href={siteOrigin+"/page/user/home"} aria-current={active === 'home' ? 'page' : undefined}>{en?'My profile':'个人主页'}</a><a href={siteOrigin+"/page/user/profile"} aria-current={active === 'profile' ? 'page' : undefined}>{tr("个人资料")}</a><button className="campus-language" type="button" onClick={changeLanguage} aria-label={en?"切换为中文":"Switch to English"}>{en?"中文":"EN"}</button></div></div></>;
}
