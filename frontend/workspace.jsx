import VicePresidentControls from './VicePresidentControls';
import { localizeActivity } from './activity-language.mjs';
import { tr, en, tx } from "./language";
import BackButton from './BackButton';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import './workspace.css';
import ClubProfile from './ClubProfile';
import ClubOperations from './ClubOperations';
import JoinRequestsPanel from './JoinRequestsPanel';
import CardNav from './CardNav';
import Avatar from './Avatar';
import DateJump from './DateJump';
import {FileArrowUp,FileText} from '@phosphor-icons/react';
const base = '/api/club-workspace';
const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const beijingNow = () => new Date(new Date().toLocaleString('en-US', {
  timeZone: 'Asia/Shanghai'
}));
const today = () => iso(beijingNow());
const tomorrow = () => {
  const d = beijingNow();
  d.setDate(d.getDate() + 1);
  return iso(d);
};
const roleNames = {
  member: tr("社员"),
  president: tr("社长"),
  vice_president: tr("副社长")
};
const statuses = {
  pending: tr("待审核"),
  approved: tr("已通过"),
  rejected: tr("未通过"),
  scheduled: tr("已安排")
};
async function api(path = '', options = {}) {
  const r = await fetch(base + path, {
    ...options,
    headers: {
      ...options.headers
    }
  });
  if (r.status === 401) {
    location.assign('/page/user/login?next=%2Fpage%2Fclub%2Fworkspace');
    throw Error(tr("请重新登录"));
  }
  const body = await r.json().catch(() => ({
    message: tr("请求未成功，请稍后重试")
  }));
  if (!r.ok || body.code >= 400) throw Error(body.message || tr("操作未成功，请重试"));
  return body;
}
function Modal({
  title,
  close,
  busy,
  children
}) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const panel = ref.current;
    panel.querySelector('input,textarea,button')?.focus();
    const key = e => {
      if (e.key === 'Escape' && !busy) close();
      if (e.key === 'Tab') {
        const items = [...panel.querySelectorAll('button,input,textarea,select,a[href]')].filter(n => !n.disabled);
        if (!items.length) return;
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [busy]);
  return <div className="ws-modal-backdrop" onMouseDown={e => {
    if (e.target === e.currentTarget && !busy) close();
  }}><section ref={ref} role="dialog" aria-modal="true" aria-labelledby="ws-dialog-title" className="ws-modal"><header><h2 id="ws-dialog-title">{title}</h2><button aria-label={tr("关闭弹窗")} disabled={busy} onClick={close}>×</button></header>{children}</section></div>;
}
function Empty({
  children
}) {
  return <div className="ws-empty"><span aria-hidden="true">○</span><p>{children}</p></div>;
}
function ActivityForm({
  application,
  date,
  busy,
  onSave
}) {
  return <form onSubmit={e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    onSave({
      ...data,
      participants: Number(data.participants)
    });
  }}>
    <label>{tr("活动名称")}<input name="title" maxLength={100} required placeholder={application ? tr("例如：校园艺术节展演") : tr("例如：每周社团活动")} /></label>
    <div className="ws-form-grid"><label>{tr("开始时间")}<input name="start" type="datetime-local" defaultValue={date + 'T15:30'} required /></label><label>{tr("结束时间")}<input name="end" type="datetime-local" defaultValue={date + 'T16:30'} required /></label></div>
    <div className="ws-form-grid"><label>{tr("活动地点")}<input name="location" required maxLength={150} placeholder={tr("教室、操场或其他场地")} /></label><label>{tr("预计参与人数")}<input name="participants" type="number" min="1" max="5000" defaultValue="20" required /></label></div>
    <label>{application ? tr("活动方案与场地需求") : tr("活动说明")}<textarea name="description" maxLength={3000} rows="4" required placeholder={application ? tr("请说明活动内容、所需场地与设备、组织安排。") : tr("填写活动内容与准备事项。")} /></label>
    <p className="ws-help">{application ? tr("提交后由管理员审核，通过后显示在活动日历中。") : tr("活动时间按北京时间显示。")}</p><button className="ws-primary" disabled={busy}>{busy ? tr("正在保存…") : application ? tr("提交申请 →") : tr("保存活动 →")}</button>
  </form>;
}
function Workspace() {
  const [profile, setProfile] = useState(null),
    [club, setClub] = useState(''),
    [data, setData] = useState(null),
    [members, setMembers] = useState([]),
    [tab, setTab] = useState('term'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [modal, setModal] = useState(null),
    [modalError, setModalError] = useState(''),
    [retry, setRetry] = useState(0),[uploadName,setUploadName]=useState('');
  const [month, setMonth] = useState(new Date(beijingNow().getFullYear(), beijingNow().getMonth(), 1)),
    [day, setDay] = useState(today()),
    [query, setQuery] = useState(''),
    [results, setResults] = useState(null),
    [searching, setSearching] = useState(false);
  const lock = useRef(false),
    searchRequest = useRef(null),
    currentClub = useRef(club);
  currentClub.current = club;
  useEffect(() => {
    const c = new AbortController();
    api('', {
      signal: c.signal
    }).then(p => {
      setProfile(p);
      setClub(String(p.clubs[0]?.id || ''));
    }).catch(e => {
      if (e.name !== 'AbortError') setError(tr(e.message));
    });
    return () => c.abort();
  }, [retry]);
  const reload = async (id, signal) => {
    const [d, m] = await Promise.all([api('/' + id, {
      signal
    }), api('/' + id + '/members', {
      signal
    })]);
    if (String(id) === currentClub.current) {
      setData(d);
      setMembers(m);
    }
  };
  useEffect(() => {
    if (!club) return;
    const c = new AbortController();
    setLoading(true);
    setData(null);
    setError('');
    setResults(null);
    setQuery('');
    searchRequest.current?.abort();
    reload(club, c.signal).catch(e => {
      if (e.name !== 'AbortError') setError(tr(e.message));
    }).finally(() => {
      if (!c.signal.aborted) setLoading(false);
    });
    return () => c.abort();
  }, [club]);
  useEffect(() => () => searchRequest.current?.abort(), []);
  const open = value => {
    setModalError('');
    setUploadName('');
    setModal(value);
  };
  const perform = async (path, method, body, isFile = false) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setModalError('');
    setNotice('');
    try {
      await api('/' + club + path, {
        method,
        headers: {
          'X-Workspace-Token': profile.token,
          ...(!isFile ? {
            'Content-Type': 'application/json'
          } : {})
        },
        body: body == null ? undefined : isFile ? body : JSON.stringify(body)
      });
      setModal(null);
      setResults(null);
      await reload(club);
      setNotice(tr("已保存"));
    } catch (e) {
      if (modal) setModalError(e.message);else setError(tr(e.message));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const search = async e => {
    e.preventDefault();
    if (!query.trim()) return;
    searchRequest.current?.abort();
    const c = new AbortController();
    searchRequest.current = c;
    setSearching(true);
    setResults(null);
    setError('');
    try {
      setResults(await api('/' + club + '/students?' + new URLSearchParams({
        keyword: query.trim()
      }), {
        signal: c.signal
      }));
    } catch (e) {
      if (e.name !== 'AbortError') setError(tr(e.message));
    } finally {
      if (!c.signal.aborted) setSearching(false);
    }
  };
  const selected = profile?.clubs.find(c => String(c.id) === club);
  const activities = (data?.activities || []).map(a => localizeActivity(a, selected, en)),
    events = activities.filter(a => a.status === 'scheduled' || a.status === 'approved'),
    applications = activities.filter(a => a.kind === 'application');
  const onDay = (e, d) => e.start.slice(0, 10) <= d && (e.end.slice(0, 10) > d || e.end.slice(0, 10) === d && !e.end.endsWith('T00:00'));
  const first = new Date(month.getFullYear(), month.getMonth(), 1),
    offset = (first.getDay() + 6) % 7;
  const days = Array.from({
    length: 42
  }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i - offset + 1));
  const tabs = [['term', tr("学期材料"), '01'], ['sessions', tr("活动签到与反馈"), '02'], ['recruitment', tr("招新确认"), '03'], ['members', tr("社员管理"), '04'], ['calendar', tr("活动日历"), '05'], ['profile', tr("社团资料"), '06'], ['files', tr("文件资料库"), '07'], ['applications', tr("校园活动申请"), '08']];
  return <MotionConfig reducedMotion="user"><CardNav active="workspace" account={profile ? profile.account || {
      name: profile.name,
      role: profile.admin ? 'admin' : 'president'
    } : null} /><main className="ws-shell">
    <aside className="ws-sidebar"><BackButton className="ws-back" fallback="/" label/><div className="ws-brand"><h1>{tr("社团管理")}</h1><p>{tr("学期材料、活动记录与成员管理")}</p></div>
      {profile && <label className="ws-club-select">{tr("当前社团")}<select aria-label={tr("选择社团")} value={club} disabled={busy || loading} onChange={e => setClub(e.target.value)}>{profile.clubs.map(c => <option value={c.id} key={c.id}>{en?c.nameEn||c.name:c.name}</option>)}</select></label>}
      <nav aria-label={tr("社团工作台")}>{tabs.map(([key, name, num]) => <button key={key} className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}><span>{num}</span>{name}<b>↗</b></button>)}</nav><div className="ws-sidebar-foot"><Avatar person={profile?.account || {
            name: profile?.name
          }} className="ws-avatar" /><div><strong>{(en ? profile?.account?.nameEn || profile?.name : profile?.name) || tr("正在载入")}</strong><small>{profile?.admin ? tr("管理员工作台") : tr("社团负责人工作台")}</small></div></div>
    </aside>
    <div className="ws-main"><header className="ws-page-header"><div><p>QPWFLHS / {(en ? selected?.nameEn || selected?.name : selected?.name) || tr("我的社团")}</p><h2>{tabs.find(t => t[0] === tab)[1]}</h2></div><span className="ws-date">{today().replaceAll('-', ' / ')}</span></header>
      {error && <div role="alert" className="ws-error">{error} <button onClick={() => profile && club ? reload(club).then(() => setError('')).catch(e => setError(tr(e.message))) : setRetry(v => v + 1)}>{tr("重试")}</button></div>}{notice && <p role="status" className="ws-notice">✓ {notice}</p>}
      {!profile ? <Empty>{tr("正在载入工作台…")}</Empty> : !club ? <Empty>{tr("尚未分配负责的社团，请联系管理员。")}</Empty> : loading || !data ? <Empty>{loading ? tr("正在载入社团数据…") : tr("暂时无法显示社团数据")}</Empty> : <>
        <div className="ws-stats"><div><span>{tr("社团成员")}</span><strong>{members.length}<small>{tr("人")}</small></strong></div><div><span>{tx('已安排社团活动','Scheduled club activities')}</span><strong>{events.filter(e=>e.kind==='event').length}<small>{tr("场")}</small></strong></div><div><span>{tr("待审核申请")}</span><strong>{applications.filter(a => a.status === 'pending').length}<small>{tr("份")}</small></strong></div><div><span>{tr("已提交文件")}</span><strong>{data.documents.length}<small>{tr("份")}</small></strong></div></div>
        <AnimatePresence mode="wait"><motion.div key={tab} initial={{
              opacity: 0,
              y: 8
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              y: -6
            }} transition={{
              duration: .15
            }}>
        {tab==='recruitment'&&<JoinRequestsPanel key={club} club={club} token={profile.token} onChanged={()=>reload(club)}/>}
        {['term', 'sessions', 'recruitment'].includes(tab) && <ClubOperations key={club + tab} club={club} token={profile.token} section={tab} activities={activities} members={members} documents={data.documents} onChanged={() => reload(club)} />}
        {tab === 'profile' && <ClubProfile key={club} club={club} token={profile.token} onSaved={info => setProfile(p => ({
                ...p,
                clubs: p.clubs.map(c => String(c.id) === club ? {
                  ...c,
                  name: info.name
                } : c)
              }))} />}
        {tab === 'calendar' && <div className="ws-calendar-layout"><section className="ws-panel ws-calendar"><div className="ws-section-head"><div><h3><DateJump value={day.startsWith(iso(month).slice(0,7))?day:iso(new Date(month.getFullYear(),month.getMonth(),1))} onChange={d=>{setDay(d);setMonth(new Date(d+'T12:00:00'))}}>{month.getFullYear()}{tr("年")}{month.getMonth() + 1}{tr("月")}</DateJump></h3><p>{tr("社团活动与已通过的校园活动")}</p></div><div className="ws-month-controls"><button aria-label={tr("上个月")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><button onClick={() => {
                        setMonth(new Date(beijingNow().getFullYear(), beijingNow().getMonth(), 1));
                        setDay(today());
                      }}>{tr("今天")}</button><button aria-label={tr("下个月")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div></div><div className="ws-weekdays">{[tr("一"), tr("二"), tr("三"), tr("四"), tr("五"), tr("六"), tr("日")].map(d => <span key={d}>{d}</span>)}</div><div className="ws-days">{days.map(date => {
                      const d = iso(date),
                        list = events.filter(e => onDay(e, d));
                      return <button key={d} aria-label={`${d}${list.length ? '，' + list.length + tr(" 场活动") : ''}`} aria-pressed={d === day} className={`${date.getMonth() !== month.getMonth() ? 'outside ' : ''}${d === day ? 'selected ' : ''}${d === today() ? 'today' : ''}`} onClick={() => setDay(d)}><span>{date.getDate()}</span>{list.slice(0, 2).map(e => <small key={e.id} className={e.kind === 'application' ? 'campus' : ''}>{e.title}</small>)}{list.length > 2 && <em>+{list.length - 2}</em>}</button>;
                    })}</div></section>
          <aside className="ws-panel ws-agenda"><div className="ws-section-head"><div><span className="ws-kicker">DAY PLAN</span><h3>{day.slice(5).replace('-', tr(" 月 "))}{tr("日")}</h3></div><button className="ws-primary" onClick={() => open({
                      kind: 'event'
                    })}>{tr("＋ 新增活动")}</button></div>{events.filter(e => onDay(e, day)).length === 0 ? <Empty>{tr("这一天暂无活动")}<br />{tr("可新增社团活动。")}</Empty> : events.filter(e => onDay(e, day)).sort((a, b) => a.start.localeCompare(b.start)).map(e => <article className="ws-agenda-event" key={e.id}><span>{e.start.slice(11, 16)} — {e.end.slice(11, 16)}</span><h4>{e.title}</h4><small className="ws-badge">{e.kind==='event'?tx('社团活动','Club activity'):tx('校园活动','Campus event')}</small><p>{e.location} · {e.participants?e.participants+tr("人"):tx("人数待确认","Attendance to be confirmed")}</p><p>{e.description}</p>{e.kind === 'event' ? <button className="ws-danger-text" disabled={busy} onClick={() => open({
                      kind: 'deleteEvent',
                      event: e
                    })}>{tr("删除活动")}</button> : <small className="ws-badge approved">{tr("校园活动 · 已通过")}</small>}</article>)}<p className="ws-help">{tr("北京时间 · 点击日期查看活动")}</p></aside>
        </div>}
        {tab === 'members' && <VicePresidentControls club={club} token={profile.token} onChanged={()=>reload(club)}/>}
        {tab === 'members' && <section className="ws-panel"><div className="ws-section-head"><div><h3>{tr("社团成员")}</h3><p>{tr("新增成员请在招新确认中查找学生并确认录取。")}</p></div><button className="ws-primary" onClick={() => setTab('recruitment')}>{tr("进入招新确认 ↗")}</button></div>
          <div className="ws-table-scroll"><table><thead><tr><th>{tr("姓名")}</th><th>{tr("英文名")}</th><th>{tr("身份")}</th><th>{tr("操作")}</th></tr></thead><tbody>{members.map(m => <tr key={m.type + m.id}><td><Avatar person={{
                            name: m.name,
                            avatarUrl: m.avatarUrl
                          }} className="ws-member-avatar" />{m.name}</td><td>{m.nameEn || '—'}</td><td><span className="ws-badge">{m.type==='admin'?tx("管理员 · 学生 · 社员","Administrator · Student · Member"):roleNames[m.role] || tr("社员")}</span></td><td>{m.role === 'member' ? <button className="ws-danger-text" disabled={busy} onClick={() => open({
                            kind: 'removeMember',
                            member: m
                          })}>{tr("移出社团")}</button> : <span className="ws-muted">{tr("管理员任免")}</span>}</td></tr>)}</tbody></table></div>{!members.length && <Empty>{tr("暂时没有社员，请在招新确认中添加。")}</Empty>}
        </section>}
        {tab === 'files' && <section className="ws-panel"><div className="ws-section-head"><div><h3>{tr("社团资料库")}</h3><p>{tr("提交活动方案、总结与社团材料，供指导教师和管理员查看。")}</p></div><button className="ws-primary" onClick={() => open({
                    kind: 'file'
                  })}>{tr("＋ 提交文件")}</button></div>{!data.documents.length ? <Empty>{tr("还没有提交文件")}<br />{tr("把社团的计划和成果收集在这里。")}</Empty> : <div className="ws-file-list">{data.documents.map(d => <article key={d.id}><span className="ws-file-icon"><FileText size={28} aria-hidden="true"/><small>{d.name.split('.').at(-1).toUpperCase().slice(0,4)}</small></span><div><h4>{d.name}</h4><p>{d.note || tr("无附加说明")}</p><small>{(d.size / 1024).toFixed(1)} KB · {d.createdAt.slice(0, 10)} · {d.submittedBy}</small></div><a href={`${base}/${club}/documents/${d.id}`} download>{tr("下载 ↓")}</a></article>)}</div>}</section>}
        {tab === 'applications' && <section className="ws-panel"><div className="ws-section-head"><div><h3>{tr("校园活动申请")}</h3><p>{profile.admin ? tr("审核社团提交的校园活动，批准后自动加入活动日历。") : tr("提交活动计划，查看审核进度。")}</p></div><button className="ws-primary" onClick={() => open({
                    kind: 'application'
                  })}>{tr("＋ 申请举行活动")}</button></div>{!applications.length ? <Empty>{tr("还没有校园活动申请")}<br />{tr("提交后由管理员审核。")}</Empty> : <div className="ws-application-list">{applications.map(a => <article key={a.id}><div className="ws-section-head"><h4>{a.title}</h4><span className={'ws-badge ' + a.status}>{statuses[a.status]}</span></div><p>{a.start.replace('T', ' ')} — {a.end.replace('T', ' ')} · {a.location} · {a.participants}{tr("人")}</p><p className="ws-description">{a.description}</p><small>{tr("提交人：")}{a.submittedBy}</small>{a.reviewNote && <p className="ws-review-note">{tr("审核意见：")}{a.reviewNote}</p>}{profile.admin && a.status === 'pending' && <button className="ws-primary" onClick={() => open({
                      kind: 'review',
                      application: a
                    })}>{tr("审核申请 →")}</button>}</article>)}</div>}</section>}
        </motion.div></AnimatePresence></>}
    </div>
    {modal && <Modal title={{
        event: tr("新增社团活动"),
        application: tr("申请举行校园活动"),
        file: tr("提交文件"),
        removeMember: tr("移出社员"),
        deleteEvent: tr("删除活动"),
        review: tr("审核校园活动")
      }[modal.kind]} close={() => setModal(null)} busy={busy}>
      {modalError && <p role="alert" className="ws-error">{modalError}</p>}
      {['event', 'application'].includes(modal.kind) && <ActivityForm application={modal.kind === 'application'} date={modal.kind === 'application' && day <= today() ? tomorrow() : day} busy={busy} onSave={body => perform(modal.kind === 'event' ? '/events' : '/applications', 'POST', body)} />}
      {modal.kind === 'file' && <form onSubmit={e => {
          e.preventDefault();
          perform('/documents', 'POST', new FormData(e.currentTarget), true);
        }}><label className="ws-file-drop"><FileArrowUp size={36} aria-hidden="true"/><strong>{uploadName||tr("选择文件")}</strong><span>{tx("点击选择文件","Click to choose a file")}</span><input aria-label={tr("选择文件")} onChange={e=>setUploadName(e.target.files[0]?.name||'')} type="file" name="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.zip" /></label><p className="ws-help">{tr("支持 PDF、Office 文档、文本、图片和 ZIP，单个文件不超过 20 MB。")}</p><label>{tr("文件说明")}<textarea name="note" maxLength={500} rows="3" placeholder={tr("这份文件用于什么活动或事项？")} /></label><button className="ws-primary" disabled={busy}>{busy ? tr("提交中…") : tr("提交文件 →")}</button></form>}
      {modal.kind === 'removeMember' && <><p>{tr("确认将「")}{modal.member.name}{tr("」移出本社团？这不会删除对方的账号。")}</p><div className="ws-modal-actions"><button disabled={busy} onClick={() => setModal(null)}>{tr("取消")}</button><button className="ws-primary" disabled={busy} onClick={() => perform(`/members/${modal.member.type}/${modal.member.id}`, 'DELETE')}>{tr("确认移出")}</button></div></>}
      {modal.kind === 'deleteEvent' && <><p>{tr("确认删除活动「")}{modal.event.title}」？</p><div className="ws-modal-actions"><button disabled={busy} onClick={() => setModal(null)}>{tr("取消")}</button><button className="ws-primary" disabled={busy} onClick={() => perform('/events/' + modal.event.id, 'DELETE')}>{tr("确认删除")}</button></div></>}
      {modal.kind === 'review' && <form onSubmit={e => {
          e.preventDefault();
          perform('/applications/' + modal.application.id + '/review', 'POST', Object.fromEntries(new FormData(e.currentTarget)));
        }}><p>{modal.application.title}</p><label>{tr("审核结果")}<select name="decision"><option value="approved">{tr("通过申请")}</option><option value="rejected">{tr("驳回申请")}</option></select></label><label>{tr("审核意见")}<textarea name="note" maxLength={1000} rows="3" placeholder={tr("驳回时请说明原因")} /></label><button disabled={busy} className="ws-primary">{busy ? tr("正在提交…") : tr("确认审核")}</button></form>}
    </Modal>}
  </main></MotionConfig>;
}
createRoot(document.getElementById('club-workspace')).render(<Workspace />);

import './CampusMotion.css';
