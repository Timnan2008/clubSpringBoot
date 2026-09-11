import PersonIdentity, {realNames, postName} from './PersonIdentity';
import { localizeTerm } from './activity-language.mjs';
import { tr, en, tx } from "./language";
import { useEffect, useRef, useState } from 'react';
import './ClubOperations.css';
import Pagination from './Pagination';
const names = {
    proposal: tr("学期初提案"),
    review: tr("学期末总结与回顾"),
    feedback: tr("活动反馈记录")
  },
  states = {
    present: tr("已到"),
    leave: tr("请假"),
    absent: tr("缺勤")
  };
const timestamp = () => new Date().toLocaleString('sv-SE', {
  timeZone: 'Asia/Shanghai'
}).replace(' ', 'T');
const dateText = s => s?.slice(0, 16).replace('T', ' ') || '—';
export default function ClubOperations({
  club,
  token,
  section,
  activities,
  members,
  documents,
  onChanged
}) {
  const [data, setData] = useState(null),
    [term, setTerm] = useState(''),
    [newTerm, setNewTerm] = useState(false),
    [editor, setEditor] = useState(null),
    [form, setForm] = useState({}),
    [activity, setActivity] = useState(''),
    [marks, setMarks] = useState({}),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(''),
    [results, setResults] = useState(null),
    [candidateNote, setCandidateNote] = useState(''),
    [confirm, setConfirm] = useState(null);
  const [feedbackPage,setFeedbackPage]=useState(1);
  const lock = useRef(false);
  const base = `/api/club-workspace/${club}`,
    api = async (path, method = 'GET', body) => {
      const file = body instanceof FormData;
      const r = await fetch(base + path, {
        method,
        headers: {
          'X-Workspace-Token': token,
          ...(body && !file ? {
            'Content-Type': 'application/json'
          } : {})
        },
        body: body ? file ? body : JSON.stringify(body) : undefined
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message || tr("操作未成功"));
      return d;
    };
  async function reload() {
    const d = await api('/operations');
    setData(d);
    setTerm(previous => d.terms.some(t => t.id === previous) ? previous : (d.terms.find(t => t.start <= timestamp().slice(0, 10) && t.end >= timestamp().slice(0, 10)) || d.terms[0])?.id || '');
    return d;
  }
  useEffect(() => {
    let alive = true;
    api('/operations').then(d => {
      if (!alive) return;
      setData(d);
      setTerm((d.terms.find(t => t.start <= timestamp().slice(0, 10) && t.end >= timestamp().slice(0, 10)) || d.terms[0])?.id || '');
    }).catch(e => {
      if (alive) setError(tr(e.message));
    });
    return () => {
      alive = false;
    };
  }, [club]);
  async function run(fn) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(tr(e.message));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const current = data?.terms.find(t => t.id === term),
    events = activities.filter(a => a.kind === 'event' && a.status === 'scheduled' && current && a.start.slice(0, 10) >= current.start && a.start.slice(0, 10) <= current.end).sort((a, b) => a.start.localeCompare(b.start));
  useEffect(() => {
    setEditor(null);
    setFeedbackPage(1);
    setResults(null);
    setConfirm(null);
    setActivity('');
  }, [term, section]);
  useEffect(() => {
    if (events.length && !events.some(a => a.id === activity)) setActivity((events.filter(a => a.start <= timestamp()).at(-1) || events[0]).id);
  }, [term, activities, activity, data?.terms]);
  const feedbackPages=Math.max(1,Math.ceil(events.length/6)),visibleFeedbackPage=Math.min(feedbackPage,feedbackPages);
  const selected = events.find(a => a.id === activity),
    attendance = data?.attendance.find(a => a.activity === activity);
  useEffect(() => {
    setMarks(Object.fromEntries((attendance?.marks || []).map(m => [m.member, m.status])));
  }, [activity, attendance]);
  const report = (kind, id = '') => data?.reports.find(r => r.term === term && r.kind === kind && r.activity === id);
  const due = a => events.find(next => next.start > a.start)?.start || current?.end + 'T23:59';
  const reportStatus = (r, deadline) => r?.status === 'submitted' ? tr("已提交") : r?.status === 'draft' ? tr("草稿") : deadline < timestamp() ? tr("待补交") : tr("待提交");
  function edit(kind, a) {
    const r = report(kind, a?.id || '');
    setEditor({
      kind,
      activity: a?.id || ''
    });
    setForm(r || {
      title: kind === 'feedback' ? a.title + tr(" · 活动记录") : localizeTerm(current.name, en) + ' · ' + names[kind],
      content: '',
      feedback: '',
      improvements: '',
      document: ''
    });
    setError('');
    setNotice('');
  }
  const saveReport = e => {
    e.preventDefault();
    const status = e.nativeEvent.submitter?.value || 'submitted';
    run(async () => {
      await api('/operations/reports', 'PUT', {
        ...form,
        term,
        kind: editor.kind,
        activity: editor.activity,
        status
      });
      await reload();
      setEditor(null);
      setNotice(status === 'draft' ? tr("草稿已保存") : tr("记录已提交"));
    });
  };
  const rows = new Map(members.map(m => [m.type + ':' + m.id, {
    member: m.type + ':' + m.id,
    name: m.name,
    nameEn: m.nameEn
  }]));
  for (const m of attendance?.marks || []) if (!rows.has(m.member)) rows.set(m.member, {
    ...m,
    former: true
  });
  const badge = (r, deadline) => <span className={'ops-status ' + (r?.status === 'submitted' ? 'submitted' : deadline < timestamp() ? 'late' : '')}>{reportStatus(r, deadline)}</span>;
  return <div className="ops-root">{error && <p className="ws-error" role="alert">{error}</p>}{notice && <p className="ws-notice" role="status">{notice}</p>}{!data ? <p className="ws-help">{tr("正在载入学期记录…")}{error && <button onClick={() => run(reload)}>{tr("重试")}</button>}</p> : <><div className="ops-term-bar"><label>{tr("学期")}<select aria-label={tr("选择学期")} value={term} disabled={busy} onChange={e => setTerm(e.target.value)}>{!data.terms.length && <option value="">{tr("尚未设置学期")}</option>}{data.terms.map(t => <option key={t.id} value={t.id}>{localizeTerm(t.name, en)}</option>)}</select></label><span>{current ? current.start + tr(" 至 ") + current.end : tr("先设置学期起止日期，再填写材料和招新名单。")}</span><button disabled={busy} onClick={() => setNewTerm(v => !v)}>{newTerm ? tr("收起") : tr("＋ 新建学期")}</button></div>
 {newTerm && <form className="ws-panel ops-new-term" onSubmit={e => {
        e.preventDefault();
        const input = Object.fromEntries(new FormData(e.currentTarget));
        run(async () => {
          const t = await api('/operations/terms', 'POST', input);
          await reload();
          setTerm(t.id);
          setNewTerm(false);
          setNotice(tr("学期已创建"));
        });
      }}><h3>{tr("设置学期")}</h3><label>{tr("学期名称")}<input name="name" required maxLength={80} placeholder={tr("例如：2026—2027 学年第一学期")} /></label><div className="ws-form-grid"><label>{tr("开始日期")}<input name="start" type="date" required /></label><label>{tr("结束日期")}<input name="end" type="date" required /></label></div><button disabled={busy} className="ws-primary">{tr("保存学期")}</button></form>}
 {current && (editor ? <section className="ws-panel ops-report-editor"><div className="ws-section-head"><h3>{names[editor.kind]}</h3><button disabled={busy} onClick={() => setEditor(null)}>{tr("返回列表")}</button></div><form onSubmit={saveReport}><label>{tr("标题")}<input aria-label={tr("记录标题")} value={form.title} required maxLength={160} onChange={e => setForm({
              ...form,
              title: e.target.value
            })} /></label><label>{editor.kind === 'proposal' ? tr("目标、活动计划与资源需求") : editor.kind === 'review' ? tr("本学期开展情况、成果与目标完成情况") : tr("活动过程与实际开展情况")}<textarea value={form.content} required maxLength={10000} rows={7} onChange={e => setForm({
              ...form,
              content: e.target.value
            })} /></label><label>{editor.kind === 'proposal' ? tr("社员需求与预期收获") : tr("社员反应与反馈")}<textarea value={form.feedback} required={editor.kind === 'feedback'} maxLength={5000} rows={4} onChange={e => setForm({
              ...form,
              feedback: e.target.value
            })} /></label><label>{editor.kind === 'proposal' ? tr("风险与预案（选填）") : tr("问题、改进与下次安排")}<textarea value={form.improvements} required={editor.kind !== 'proposal'} maxLength={5000} rows={4} onChange={e => setForm({
              ...form,
              improvements: e.target.value
            })} /></label><div className="ops-attachment"><label>{tr("附件（选填）")}<select aria-label={tr("选择记录附件")} value={form.document} onChange={e => setForm({
                ...form,
                document: e.target.value
              })}><option value="">{tr("无附件")}</option>{documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>{form.document&&<a href={`${base}/documents/${form.document}`} download>{tx("下载所选附件","Download selected attachment")}</a>}<label className="ops-upload">{tr("上传附件")}<input type="file" disabled={busy} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.zip" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 20 * 1024 * 1024) {
                  setError(tr("附件不能超过 20 MB"));
                  e.target.value = '';
                  return;
                }
                const body = new FormData();
                body.append('file', file);
                body.append('note', names[editor.kind]);
                run(async () => {
                  const d = await api('/documents', 'POST', body);
                  await onChanged();
                  setForm(f => ({
                    ...f,
                    document: d.id
                  }));
                  setNotice(tr("附件已上传，请保存或提交记录"));
                });
              }} /></label></div><p className="ws-help">{tr("在线填写即可提交；如有学校统一表格，可在这里附上。附件不超过 20 MB。")}</p><div className="ops-actions">{form.status !== 'submitted' && <button name="intent" value="draft" formNoValidate disabled={busy}>{tr("保存草稿")}</button>}<button name="intent" value="submitted" className="ws-primary" disabled={busy}>{busy ? tr("保存中…") : form.status === 'submitted' ? tr("更新提交") : tr("提交记录")}</button></div></form></section> : <>
 {section === 'term' && <><div className="ops-report-grid">{['proposal', 'review'].map(kind => {
              const r = report(kind),
                deadline = (kind === 'proposal' ? current.start : current.end) + 'T23:59';
              return <section className="ws-panel ops-report-card" key={kind}><div className="ws-section-head"><h3>{names[kind]}</h3>{badge(r, deadline)}</div><p>{kind === 'proposal' ? tr("填写本学期目标、活动计划、分工与资源需求。") : tr("回顾活动成果、社员反馈，记录问题与后续改进。")}</p><small>{tr("建议提交日期：")}{deadline.slice(0, 10)}</small>{r && <small>{tr("最近保存：")}{dateText(r.updatedAt)}{r.submittedAt && tr(" · 提交：") + dateText(r.submittedAt)}</small>}<button className="ws-primary" disabled={busy} onClick={() => edit(kind)}>{r ? tr("查看 / 编辑") : tr("开始填写")}</button></section>;
            })}</div><section className="ws-panel ops-weekly"><div className="ws-section-head"><div><h3>{tr("活动反馈记录")}</h3><p>{tr("每场活动结束后填写，一般在下一次活动前提交。")}</p></div></div>{events.length ? <div className="ws-table-scroll"><table><thead><tr><th>{tr("活动")}</th><th>{tr("建议提交前")}</th><th>{tr("状态")}</th><th>{tr("操作")}</th></tr></thead><tbody>{events.slice((visibleFeedbackPage-1)*6,visibleFeedbackPage*6).map(a => <tr key={a.id}><td><strong>{a.title}</strong><small>{dateText(a.start)}</small></td><td>{dateText(due(a))}</td><td>{badge(report('feedback', a.id), due(a))}</td><td><button disabled={busy} onClick={() => edit('feedback', a)}>{tr("填写 / 查看")}</button></td></tr>)}</tbody></table><Pagination page={visibleFeedbackPage} pages={feedbackPages} onChange={setFeedbackPage}/></div> : <p className="ws-help">{tr("这个学期还没有活动。先在活动日历中安排活动，再填写对应记录。")}</p>}</section></>}
 {section === 'sessions' && <section className="ws-panel"><div className="ws-section-head"><div><h3>{tr("活动签到")}</h3><p>{tr("未登记的成员不会自动记为缺勤。活动开始后可以登记或更正。")}</p></div></div><label className="ops-activity-select">{tr("选择活动")}<select aria-label={tr("选择签到活动")} value={activity} disabled={busy} onChange={e => setActivity(e.target.value)}>{!events.length && <option value="">{tr("本学期暂无活动")}</option>}{events.map(a => <option value={a.id} key={a.id}>{a.start.slice(0, 10)} · {a.title}</option>)}</select></label>{selected && <><div className="ops-session-meta"><span>{dateText(selected.start)} — {selected.end.slice(11, 16)} · {selected.location}</span><button disabled={busy} onClick={() => edit('feedback', selected)}>{tr("填写活动反馈 ↗")}</button></div><div className="ops-attendance-counts">{Object.entries(states).map(([k, v]) => <span key={k}>{v} <b>{Object.values(marks).filter(s => s === k).length}</b></span>)}<span>{tr("未登记")}<b>{[...rows.keys()].filter(k => !marks[k]).length}</b></span></div>{selected.start > timestamp() && <p className="ws-help">{tr("这场活动尚未开始，开始后开放签到。")}</p>}<form onSubmit={e => {
              e.preventDefault();
              run(async () => {
                await api('/operations/attendance/' + activity, 'PUT', {
                  marks: Object.entries(marks).filter(([, status]) => status).map(([member, status]) => ({
                    member,
                    status
                  }))
                });
                await reload();
                setNotice(tr("签到已保存"));
              });
            }}><div className="ws-table-scroll"><table><thead><tr><th>{tr("社员")}</th><th>{tr("英文名")}</th><th>{tr("签到状态")}</th></tr></thead><tbody>{[...rows.values()].map(m => <tr key={m.member}><td>{m.name}{m.former && <small>{tr("已离开社团 · 历史记录")}</small>}</td><td>{m.nameEn}</td><td><select aria-label={tr("签到状态：") + m.name + ' ' + m.member} disabled={busy || selected.start > timestamp()} value={marks[m.member] || ''} onChange={e => setMarks({
                          ...marks,
                          [m.member]: e.target.value
                        })}><option value="" disabled>{tr("未登记")}</option>{Object.entries(states).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td></tr>)}</tbody></table></div>{!rows.size && <p className="ws-help">{tr("暂无社员，请先在招新确认中添加成员。")}</p>}<div className="ops-actions"><span className="ws-help">{attendance ? tr("最近保存：") + dateText(attendance.updatedAt) : tr("还没有保存签到记录")}</span><button className="ws-primary" disabled={busy || !rows.size || selected.start > timestamp()}>{tr("保存签到")}</button></div></form></>}</section>}
 {section === 'recruitment' && <section className="ws-panel"><div className="ws-section-head"><div><h3>{tr("招新人员确认")}</h3><p>{tr("查找已注册的学生，加入待确认名单；确认录取后才成为社员。")}</p></div></div><form className="ws-member-search" onSubmit={e => {
            e.preventDefault();
            run(async () => {
              setResults(await api('/students?' + new URLSearchParams({
                keyword: query.trim()
              })));
            });
          }}><input aria-label={tr("搜索招新学生")} maxLength={80} placeholder={tx("中文名、英文名或昵称","Chinese name, English name or nickname")} value={query} onChange={e => setQuery(e.target.value)} /><button disabled={busy || !query.trim()} className="ws-primary">{tr("查找学生")}</button></form>{results && <div className="ops-candidate-search"><label>{tr("名单备注（选填）")}<input value={candidateNote} maxLength={500} onChange={e => setCandidateNote(e.target.value)} placeholder={tr("例如：已完成面谈")} /></label>{results.map(s => <div className="ops-search-person" key={s.id}><PersonIdentity person={s} query={query}/><button disabled={busy || data.candidates.some(c => c.term === term && c.student === s.id)} onClick={() => run(async () => {
                await api('/operations/candidates', 'POST', {
                  term,
                  student: s.id,
                  note: candidateNote
                });
                await reload();
                setNotice(tr("已加入待确认名单，尚未加入社团"));
              })}>{tr("加入待确认")}</button></div>)}{!results.length && <p className="ws-help">{tr("没有找到可添加的学生。")}</p>}</div>}<div className="ops-candidate-list">{data.candidates.filter(c => c.term === term).map(c => <article key={c.id}><div><strong>{en?c.nameEn||c.name:c.name||c.nameEn}</strong><small>{c.nameEn}{tr("· 学生账号 #")}{c.student}</small>{c.note && <p>{c.note}</p>}</div><span className={'ops-status ' + (c.status === 'confirmed' ? 'submitted' : '')}>{{
                  pending: tr("待确认"),
                  confirmed: tr("已加入社团"),
                  declined: tr("未录取")
                }[c.status]}</span>{c.status === 'pending' && <div className="ops-actions"><button disabled={busy} onClick={() => setConfirm({
                  id: c.id,
                  name: c.name,
                  action: 'decline'
                })}>{tr("不录取")}</button><button className="ws-primary" disabled={busy} onClick={() => setConfirm({
                  id: c.id,
                  name: c.name,
                  action: 'confirm'
                })}>{tr("确认录取")}</button></div>}{confirm?.id === c.id && <div className="ops-confirm" role="group" aria-label={tr("确认招新决定")}><p>{confirm.action === 'confirm' ? tr("确认将 ") + c.name + tr(" 加入本社团？") : tr("确认本次不录取 ") + c.name + "？"}</p><button disabled={busy} onClick={() => setConfirm(null)}>{tr("取消")}</button><button disabled={busy} className="ws-primary" onClick={() => run(async () => {
                  await api('/operations/candidates/' + c.id + '/' + confirm.action, 'POST');
                  await reload();
                  await onChanged();
                  setConfirm(null);
                  setResults(null);
                  setNotice(confirm.action === 'confirm' ? tr("已录取，成员已加入社团") : tr("招新决定已保存"));
                })}>{tr("确定")}</button></div>}</article>)}</div>{!data.candidates.some(c => c.term === term) && <p className="ws-help">{tr("本学期还没有招新名单。")}</p>}</section>}
 </>)}</>}</div>;
}
