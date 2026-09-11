import AccountDeletion from './AccountDeletion';
import AppearanceEditor from './AppearanceEditor';
import {TeacherBadge} from './TeacherDay';
import PasswordStrength from './PasswordStrength';
import PublicProfile from './PublicProfile';
import { en,tx,tr } from "./language";
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, MotionConfig } from 'motion/react';
import { ensureIdentity, exportIdentity, importIdentity } from './message-crypto.js';
import './account.css';
import CardNav from './CardNav';
import Avatar from './Avatar';
import AvatarEditor from './AvatarEditor';
import EmailEditor from './EmailEditor';
const mode = document.getElementById('campus-account').dataset.mode;
async function api(path, options = {}) {
  const r = await fetch('/api/campus-social' + path, options);
  if (r.status === 401) {
    location.assign('/page/user/login?next=' + encodeURIComponent(location.pathname));
    throw Error(tr("请重新登录"));
  }
  const d = await r.json();
  if (!r.ok) throw Error(d.message || tr("操作失败"));
  return d;
}
const roles = {
  student: tr("学生"),
  president: tr("社长"),
  vice_president: tr("副社长"),
  teacher: tr("教师"),
  admin: tx("管理员 · 学生","Administrator · Student")
};
function Account() {
  const [leaving,setLeaving]=useState(null),[resign,setResign]=useState(0),[resignClub,setResignClub]=useState(0),[details,setDetails]=useState({studentNumber:'',nickname:'',grade:'',classroom:'',tags:[],bio:''});
  const [profile, setProfile] = useState(null),
    [clubs, setClubs] = useState([]),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(''),
    [nameEn, setNameEn] = useState(''),
    [old, setOld] = useState(''),
    [password, setPassword] = useState(''),
    [repeat, setRepeat] = useState(''),
    [backupPassword, setBackupPassword] = useState(''),
    [keyStatus, setKeyStatus] = useState(tr("正在读取本机密钥…")),
    [backup, setBackup] = useState(null);
  const write = (path, method, body) => api(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Workspace-Token': profile.token
    },
    body: JSON.stringify(body)
  });
  const load = () => api('/me').then(p => {
    setProfile(p);setResignClub(old=>p.offices?.some(o=>o.id===old)?old:p.offices?.[0]?.id||0);setDetails(p.details||{studentNumber:"",nickname:"",grade:"",classroom:"",tags:[],bio:""});

    setName(p.account.name);
    setNameEn(p.account.nameEn);
  }).catch(e => setError(tr(e.message)));
  useEffect(() => {
    load();
    if(mode === 'clubs') api('/me/clubs').then(setClubs).catch(e=>setError(tr(e.message)));
  }, []);
  useEffect(() => {
    if (profile && mode === 'profile') ensureIdentity(profile.account.id, api, write).then(() => setKeyStatus(tr("本机加密密钥已就绪"))).catch(e => setKeyStatus(tr(e.message)));
  }, [profile?.account.id]);
  async function act(fn) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(tr(e.message));
    } finally {
      setBusy(false);
    }
  }
  return <MotionConfig reducedMotion="user"><CardNav active={mode} account={profile?.account} /><motion.main className="account-layout" initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }}><aside className="account-sidebar"><div className="account-identity"><Avatar person={profile?.account} /><h2>{(en?profile?.account.nameEn||profile?.account.name:profile?.account.name)||tr("校园账号")}</h2><TeacherBadge person={profile?.account}/><p>{roles[profile?.account.position || profile?.account.role] || tr("正在载入")}</p></div><nav><a href="/page/user/profile" className={mode === 'profile' ? 'active' : ''}>{tr("个人资料")}<span>01</span></a><a href="/page/my-clubs" className={mode === 'clubs' ? 'active' : ''}>{tr("我的社团")}<span>02</span></a><a href="/page/messages">{tr("站内私信")}<span>↗</span></a></nav></aside><section className="account-main"><header className="account-page-header"><div><h1>{mode === 'profile' ? tr("个人资料") : tr("我的社团")}</h1><p>{mode === 'profile' ? tx("管理个人信息与账号安全。","Manage your profile and account security.") : tr("查看已经参加的社团。")}</p></div>{profile&&mode==='profile'&&<a className="account-home-link" href={"/page/user/home?account="+profile.account.id}>{tx("查看我的个人主页","View my public profile")} ↗</a>}</header>{error && <p className="account-error" role="alert">{error}</p>}{notice && <p className="account-notice" role="status">{notice}</p>}{profile && (mode === 'profile' ? <><AvatarEditor profile={profile} onSaved={load} /><div className="account-card"><AppearanceEditor profile={profile} onSaved={load}/></div><form className="account-card" onSubmit={e => {
            e.preventDefault();
            act(async () => {
              await write('/me', 'PUT', {
                name,
                nameEn
              });
              await write('/me/details','PUT',details);
              await load();
              setNotice(tr("个人资料已保存"));
            });
          }}><div className="account-card-title"><h2>{tr("基本资料")}</h2></div><div className="account-field-grid"><label>{tr("真实姓名")}<input value={name} maxLength={100} onChange={e => setName(e.target.value)} /></label><label>{tr("英文名 / 姓名拼音")}<input value={nameEn} maxLength={100} onChange={e => setNameEn(e.target.value)} /></label></div><label>{tx('昵称','Nickname')}<input value={details.nickname} maxLength={60} onChange={e=>setDetails({...details,nickname:e.target.value})}/></label>{['student','president','admin'].includes(profile.account.role)&&<><label>{tx('学生号（绑定后不可修改）','Student number (cannot be changed once saved)')}<input value={details.studentNumber} readOnly={!!profile.details?.studentNumber} maxLength={32} onChange={e=>setDetails({...details,studentNumber:e.target.value})}/></label><div className="account-field-grid"><label>{tx('年级','Grade')}<select value={details.grade} onChange={e=>setDetails({...details,grade:e.target.value})}><option value="">{tx('选择年级','Select grade')}</option>{['G9','G10','G11','G12'].map(g=><option key={g}>{g}</option>)}</select></label><label>{tx('班级','Class')}<input value={details.classroom} maxLength={30} onChange={e=>setDetails({...details,classroom:e.target.value})} placeholder={tx('例如：1 班','e.g. Class 1')}/></label></div></>}<label>{tx('标签（逗号分隔，最多 8 个）','Tags (separate with commas, up to 8)')}<input value={details.tags.join(', ')} maxLength={200} onChange={e=>setDetails({...details,tags:e.target.value.split(/[,，]/).map(t=>t.trimStart())})}/></label><label>{tx('介绍自己','About you')}<textarea rows={4} maxLength={600} value={details.bio} onChange={e=>setDetails({...details,bio:e.target.value})}/></label><button disabled={busy}>{tr("保存资料 ↗")}</button></form>{profile.offices?.length>0&&<section className="account-card"><h2>{tx('卸任社长 / 副社长','Resign from your club role')}</h2><p>{tx('仅卸任选中的社团职务，保留社员身份和其他社团职务。','Resign from the selected office only. Keep membership and other club offices.')}</p><label>{tx('选择社团职务','Choose club office')}<select value={resignClub} onChange={e=>{setResignClub(+e.target.value);setResign(0)}}>{profile.offices.map(o=><option key={o.id} value={o.id}>{o.name} · {o.role}</option>)}</select></label>{resign===0?<button onClick={()=>setResign(1)}>{tx('申请卸任','Resign')}</button>:<><p>{resign===1?tx('确认要卸任当前职务？','Resign from this role?'):tx('再次确认：卸任后立即失去社团管理权限，重新任职需要邀请。','Final confirmation: management access ends immediately. An invitation is required to take a role again.')}</p><div className="account-confirm-actions"><button className="account-danger" disabled={busy} onClick={()=>resign===1?setResign(2):act(async()=>{await write('/me/resign','POST',{confirmation:'RESIGN',club:resignClub});setResign(0);await load();setNotice(tx('已卸任所选职务，其他社团职务已保留','Selected office resigned. Other offices are preserved.'))})}>{resign===1?tx('继续','Continue'):tx('确认卸任','Confirm resignation')}</button><button className="account-cancel" onClick={()=>setResign(0)}>{tr('取消')}</button></div></>}</section>}<EmailEditor profile={profile} write={write} onSaved={load}/><form className="account-card" onSubmit={e => {
            e.preventDefault();
            act(async () => {
              if (password !== repeat) throw Error(tr("两次新密码不一致"));
              await write('/me/password', 'PUT', {
                currentPassword: old,
                newPassword: password, keyEnvelope: await exportIdentity(profile.account.id,password)
              });
              setOld('');
              setPassword('');
              setRepeat('');
              setNotice(tr("登录密码已更新"));
            });
          }}><div className="account-card-title"><h2>{tr("账号安全")}</h2></div><label>{tr("当前密码")}<input type="password" autoComplete="current-password" value={old} required onChange={e => setOld(e.target.value)} /></label><div className="account-field-grid"><label>{tr("新密码")}<input type="password" minLength={8} maxLength={128} autoComplete="new-password" value={password} required onChange={e => setPassword(e.target.value)} /></label><label>{tr("确认新密码")}<input type="password" autoComplete="new-password" value={repeat} required onChange={e => setRepeat(e.target.value)} /></label></div><PasswordStrength value={password}/><button disabled={busy}>{tr("更新密码 ↗")}</button></form><details className="account-card account-key-advanced"><summary>{tx("加密私信 · 高级备份","Encrypted messages · Advanced backup")}</summary><p className="account-key-status">{keyStatus}</p><p className="account-hint">{tx("私信会在登录后自动恢复，恢复密钥由服务器加密保管。这里的手动备份仅用于额外保存或恢复旧设备上的历史密钥。","Messages restore automatically at sign-in using recovery keys encrypted by the server. Manual export is optional, or useful for recovering older device keys.")}</p><label>{tr("备份口令（至少 12 位）")}<input type="password" autoComplete="off" value={backupPassword} onChange={e => setBackupPassword(e.target.value)} /></label><div className="account-key-actions"><button disabled={busy || backupPassword.length < 12} onClick={() => act(async () => {
                const data = await exportIdentity(profile.account.id, backupPassword),
                  url = URL.createObjectURL(new Blob([data], {
                    type: 'application/json'
                  }));
                const a = document.createElement('a');
                a.href = url;
                a.download = 'qpwfl-private-key-' + profile.account.id.slice(0, 8) + '.json';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                setNotice(tr("密钥备份已导出，请分开保管文件与口令"));
              })}>{tr("导出加密备份 ↓")}</button><label className="account-file" title={backup?.name || tr("选择备份文件")}><span>{backup ? tr("已选择文件") : tr("选择备份文件")} <span aria-hidden="true">↑</span></span><input type="file" aria-label={tr("选择备份文件")} accept=".json,application/json" onChange={e => setBackup(e.target.files?.[0] || null)} /></label><button className="account-secondary" disabled={busy || !backup || backupPassword.length < 12} onClick={() => act(async () => {
                await importIdentity(profile.account.id, backupPassword, backup, api, write);
                setKeyStatus(tr("本机加密密钥已就绪"));
                setNotice(tr("密钥导入成功，可以返回私信"));
              })}>{tr("导入原密钥")}</button></div><p className="account-backup-filename" role="status">{backup ? backup.name : tr("尚未选择备份文件")}</p></details><AccountDeletion write={write} account={profile.account.id}/></> : <><div className="account-club-summary"><strong>{clubs.length.toString().padStart(2, '0')}</strong><div><h2>{tr("我参与的社团")}</h2><p>{tx('申请通过或由负责人添加后，会显示在这里。','Clubs appear here after your application is approved or a leader adds you.')}</p></div></div><div className="account-clubs">{clubs.map((c, i) => <article className="account-club-card" key={c.id}><div className="account-club-cover"><span>{String(i + 1).padStart(2, '0')}</span><b>{(en?c.nameEn||'C':c.name).slice(0,1)}</b><small>{tr(c.role)}</small></div><div className="account-club-info"><h2>{en?c.nameEn||'Club':c.name}</h2><p>{(en?c.sloganEn||c.descriptionEn:c.slogan||c.description)||tx('社团暂未填写介绍。','The club has not added an introduction yet.')}</p><a href={'/page/clubs/' + c.id}>{tr("查看社团 ↗")}</a><button className="account-leave" type="button" onClick={()=>setLeaving(c.id)}>{tx('退出社团','Leave club')}</button>{leaving===c.id&&<div className="account-leave-confirm"><p>{(profile.account.role==='admin'?tx('确认退出该社团？退出仅移除社员身份，管理员权限保留。','Leave this club? Only your membership will be removed. Administrator access is preserved.'):tx('确认退出？退出后会移除你的成员身份和该社团管理权限。','Leave this club? Your membership and any management access to this club will be removed.'))}</p><button disabled={busy} onClick={()=>act(async()=>{await write('/me/clubs/'+c.id,'DELETE');setClubs(await api('/me/clubs'));setLeaving(null);setNotice(tx('已退出社团','You have left the club'));await load()})}>{tx('确认退出','Confirm leave')}</button><button onClick={()=>setLeaving(null)}>{tx('取消','Cancel')}</button></div>}</div></article>)}</div>{!clubs.length && <div className="account-card account-empty"><h2>{tr("还没有参加社团")}</h2><p>{tr("还没有参加社团。可以先在校园墙认识伙伴，联系社长了解招新，再由负责人将你加入。")}</p><a href="/page/wall">{tr("去看看招募信息 ↗")}</a></div>}</>)}</section></motion.main></MotionConfig>;
}
createRoot(document.getElementById('campus-account')).render((location.pathname.endsWith('/home')||new URLSearchParams(location.search).has('account'))?<PublicProfile id={new URLSearchParams(location.search).get('account')}/>:<Account />);

import './CampusMotion.css';
