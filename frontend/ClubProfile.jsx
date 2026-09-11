import PersonIdentity, {realNames, postName} from './PersonIdentity';
import {compressImage} from './compress-image';
import {AnimatedNumber} from './MotionPrimitives';
import { tr,tx,en } from "./language";
import React, { useEffect, useState, useRef } from 'react';
export default function ClubProfile({
  club,
  token,
  onSaved
}) {
  const [form, setForm] = useState(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(''),
    [results, setResults] = useState([]),
    [target, setTarget] = useState(null),
    [role, setRole] = useState('vice_president');
  const lock = useRef(false);
  async function call(url, options = {}) {
    const r = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Token': token,
        ...options.headers
      }
    });
    const d = await r.json();
    if (!r.ok || d.code >= 400) throw Error(d.message || tr("操作失败，请重新登录或重试"));
    return d;
  }
  useEffect(() => {
    const c = new AbortController();
    setForm(null);
    setResults([]);
    setTarget(null);
    setError('');
    setNotice('');
    call(`/api/club-workspace/${club}/profile`, {
      signal: c.signal
    }).then(setForm).catch(e => {
      if (e.name !== 'AbortError') setError(tr(e.message));
    });
    return () => c.abort();
  }, [club]);
  async function run(action) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      setError(tr(e.message));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const save = e => {
    e.preventDefault();
    run(async () => {
      const data = await call(`/api/club-workspace/${club}/profile`, {
        method: 'PUT',
        body: JSON.stringify(form)
      });
      setForm(data);
      onSaved(data);
      setNotice(tr("社团资料已保存，官网展示已更新。"));
    });
  };
  const search = e => {
    e.preventDefault();
    run(async () => {
      setTarget(null);
      const matches = await call('/api/campus-social/users?' + new URLSearchParams({
        keyword: query.trim()
      }));
      setResults(matches.filter(a => ['student', 'president'].includes(a.role)));
      if (!matches.length) setNotice(tr("没有找到匹配的站内账号。"));
    });
  };
  const invite = () => run(async () => {
    await call('/api/campus-social/invitations', {
      method: 'POST',
      body: JSON.stringify({
        club: Number(club),
        recipient: target.id,
        role
      })
    });
    setNotice(tr("任职邀请已发送给 ") + target.name + tr("，对方接受后生效。"));
    setTarget(null);
  });
  return <div className="ws-profile-layout">{error && <p className="ws-error" role="alert">{error}</p>}{notice && <p className="ws-notice" role="status">{notice}</p>}<section className="ws-panel"><div className="ws-section-head"><div><h3>{tr("社团资料")}</h3><p>{tr("在这里更新官网上的名字、介绍与标语。")}</p></div><a className="ws-text-link" href="/page/messages">{tr("站内私信 ↗")}</a></div>{form ? <><div className="ws-club-likes">♡ <AnimatedNumber value={form.likes||0}/> {tx('次点赞','likes')}</div><form className="ws-profile-form" onSubmit={save}><div className="ws-bilingual">{[['','中文','Chinese'],['En','英文','English']].map(([suffix,zh,english])=><section key={suffix}><h4>{tx(zh,english)}</h4>{[['name','社团名称','Club name',100],['slogan','社团标语','Club slogan',200],['description','社团介绍','Introduction',1000]].map(([key,zh,enLabel,max])=><label key={key}>{tx(zh,enLabel)}{key==='description'?<textarea required maxLength={max} rows={6} value={form[key+suffix]||''} onChange={e=>setForm({...form,[key+suffix]:e.target.value})}/>:<input required maxLength={max} value={form[key+suffix]||''} onChange={e=>setForm({...form,[key+suffix]:e.target.value})}/>}</label>)}</section>)}</div><div className="ws-form-grid"><label>{tr('社长')}<input value={(en?form.presidentEn:form.president)||''} readOnly/></label><label>{tr('副社长')}<input value={(en?form.vicePresidentEn:form.vicePresident)||''} readOnly/></label></div><p className="ws-help">{tx('负责人姓名由已接受邀请的账户资料同步。','Team names are synced from the accounts that accepted their invitations.')}</p><button className="ws-primary" disabled={busy}>{tr('保存社团资料 →')}</button></form><div className="ws-media-grid">{[['logo','社团 Logo','Club logo','image/jpeg,image/png'],['video','社团视频','Club video','video/mp4']].map(([kind,zh,english,accept])=><section key={kind}><h4>{tx(zh,english)}</h4>{form[kind]&&(kind==='logo'?<img src={form.logo} alt="Logo"/>:<video controls preload="metadata" src={form.video}/>)}<label className="ws-media-upload">{tx('上传或更换','Upload or replace')}<input disabled={busy} type="file" accept={accept} onChange={e=>{const file=e.target.files[0];if(!file)return;run(async()=>{const body=new FormData();body.append('file',await compressImage(file));const response=await fetch('/api/club-workspace/'+club+'/media/'+kind,{method:'POST',headers:{'X-Workspace-Token':token},body});const data=await response.json();if(!response.ok)throw Error(data.message||tx('上传失败','Upload failed'));setForm(f=>({...f,[kind]:data.url}));setNotice(tx('文件已更新','Media updated'));});e.target.value=''}}/></label><p className="ws-help">{kind==='logo'?'JPG / PNG · 10 MB':'MP4 · 40 MB'}</p></section>)}</div></> : <p className="ws-help">{tr("正在载入资料…")}</p>}</section>
 <section className="ws-panel ws-invite-panel"><div className="ws-section-head"><div><h3>{tr("邀请社长 / 副社长")}</h3><p>{tr("搜索真实姓名，邀请站内账号共同管理社团。")}</p></div></div><form className="ws-member-search" onSubmit={search}><input aria-label={tr("搜索任职邀请对象")} value={query} maxLength={80} onChange={e => setQuery(e.target.value)} placeholder={en?"Search Chinese name, English name or nickname":"搜索中文名、英文名或昵称"} /><button disabled={busy || !query.trim()} className="ws-primary">{tr("搜索账号")}</button></form><div className="ws-account-results">{results.map(a => <button className={target?.id === a.id ? 'selected' : ''} onClick={() => setTarget(a)} key={a.id}><PersonIdentity person={a} query={query}/><span>{target?.id === a.id ? '✓' : tr("选择")}</span></button>)}</div>{target && <div className="ws-invite-confirm"><p>{tr("邀请")}<strong>{realNames(target)}</strong>{tr("担任")}</p><select aria-label={tr("邀请职位")} value={role} onChange={e => setRole(e.target.value)}><option value="vice_president">{tr("副社长")}</option><option value="president">{tr("社长")}</option></select><p className="ws-help">{tr("邀请将通过网站内私信发送。接受后获得本社团管理权限，同时保留其他社团职务。")}</p><button className="ws-primary" disabled={busy} onClick={invite}>{tr("发送站内邀请 →")}</button></div>}</section></div>;
}
