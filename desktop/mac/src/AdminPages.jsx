import React, { useState } from "react";
import { Users, Plus, ShieldCheck, ChatTeardropText, Buildings } from "@phosphor-icons/react";
import { Panel, Action, Empty, Modal } from "./components";
import { Heading, Field, Form, ResourceState, useResource, useUI, write } from "./ui";
import { Gate } from "./ClubPages";
import { categories } from "./data";
const roleNames = { 0: "学生", 1: "社长 / 副社长", 2: "教师", 3: "管理员" };
export function AdminPages({ kind }) {
  const { data } = useUI();
  const staff = ["teacher", "admin"].includes(data.user?.role),
    admin = data.user?.role === "admin";
  const title = {
    accounts: "账号管理",
    moderation: "内容审核",
    suggestions: "建议管理",
    addClub: "添加社团",
  }[kind];
  return (
    <>
      <Heading title={title} detail="查看并处理校园管理事项。" />
      {!data.user ? (
        <Gate />
      ) : !staff || (kind === "addClub" && !admin) ? (
        <Empty
          title="当前账号没有此操作权限"
          detail="请使用有权限的校园账号。"
          icon={ShieldCheck}
        />
      ) : kind === "accounts" ? (
        <Accounts admin={admin} />
      ) : kind === "moderation" ? (
        <Moderation admin={admin} />
      ) : kind === "suggestions" ? (
        <Suggestions />
      ) : (
        <AddClub />
      )}
    </>
  );
}
function Confirm({ title, detail, label = "确认", run, close }) {
  return (
    <Modal title={title} onClose={close}>
      <p className="detail-text">{detail}</p>
      <Form label={label} onSubmit={run} />
    </Modal>
  );
}
function Accounts({ admin }) {
  const ui = useUI(),
    r = useResource("staffAccounts"),
    clubs = useResource("staffClubs");
  const [search, setSearch] = useState(""),
    [selected, setSelected] = useState(null),
    [confirm, setConfirm] = useState(null);
  const rows = (Array.isArray(r.data) ? r.data : []).filter((a) =>
    `${a.username} ${a.usernameEn} ${a.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  const managed = Array.isArray(clubs.data) ? clubs.data : clubs.data?.clubs || [];
  async function done(key, body) {
    await write(key, { body });
    setConfirm(null);
    setSelected(null);
    r.reload();
    ui.data.refresh();
    ui.toast("账号信息已更新");
  }
  return (
    <Panel title="校园账号" icon={Users}>
      <div className="admin-toolbar">
        <label className="form-field">
          <span>查找账号</span>
          <input
            aria-label="查找校园账号"
            placeholder="输入姓名、英文名或邮箱"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span className="muted">{rows.length} 个账号</span>
      </div>
      <ResourceState resource={r}>
        {rows.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>英文名 / 邮箱</th>
                  <th>身份</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={`${a.userRight}-${a.id}-${a.usernameEn}`}>
                    <td>{a.username}</td>
                    <td>
                      {a.usernameEn}
                      <small>{a.email}</small>
                    </td>
                    <td>{roleNames[a.userRight] || "校园账号"}</td>
                    <td>
                      <Action secondary onClick={() => setSelected(a)}>
                        管理
                      </Action>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="没有找到账号" />
        )}
      </ResourceState>
      {selected && (
        <Modal title={`管理账号 · ${selected.username}`} onClose={() => setSelected(null)}>
          {admin && (
            <Form
              label="修改身份"
              onSubmit={(fd) => {
                const role = Number(fd.get("role"));
                setConfirm({
                  title: "确认修改身份",
                  detail: `将 ${selected.username} 的身份改为${roleNames[role]}？`,
                  run: () =>
                    done("accountRole", { usernameEn: selected.usernameEn, newRole: role }),
                });
              }}
            >
              <Field label="账号身份">
                <select
                  name="role"
                  defaultValue={[0, 2, 3].includes(selected.userRight) ? selected.userRight : 0}
                >
                  <option value="0">学生</option>
                  <option value="2">教师</option>
                  <option value="3">管理员</option>
                </select>
              </Field>
            </Form>
          )}
          <div className="admin-form-section">
            <h3>任命社长 / 副社长</h3>
            <ResourceState resource={clubs}>
              {managed.length ? (
                <Form
                  label="提交任命"
                  onSubmit={(fd) =>
                    setConfirm({
                      title: "确认任命",
                      detail: `为 ${selected.username} 设置所选社团职务？`,
                      run: () =>
                        done("appointPresident", {
                          usernameEn: selected.usernameEn,
                          clubId: Number(fd.get("clubId")),
                          isVicePresident: fd.get("office") === "vice",
                        }),
                    })
                  }
                >
                  <Field label="选择社团">
                    <select name="clubId">
                      {managed.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.clubName || c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="职务">
                    <select name="office">
                      <option value="president">社长</option>
                      <option value="vice">副社长</option>
                    </select>
                  </Field>
                </Form>
              ) : (
                <p className="muted">没有可管理的社团。</p>
              )}
            </ResourceState>
          </div>
          {selected.userRight === 1 && (
            <div className="admin-form-section">
              <Action
                secondary
                onClick={() =>
                  setConfirm({
                    title: "撤销社团职务",
                    detail: `确认撤销 ${selected.username} 的社长 / 副社长职务？`,
                    run: () => done("revokePresident", { userId: selected.id }),
                  })
                }
              >
                撤销社团职务
              </Action>
            </div>
          )}
        </Modal>
      )}
      {confirm && <Confirm {...confirm} close={() => setConfirm(null)} />}
    </Panel>
  );
}
function Suggestions() {
  const ui = useUI(),
    r = useResource("suggestions");
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [confirm, setConfirm] = useState(null);
  const rows = (Array.isArray(r.data) ? r.data : []).filter(
    (s) =>
      (filter === "all" || (filter === "passed" ? s.pass : !s.pass)) &&
      `${s.title} ${s.context} ${s.name}`.includes(search),
  );
  async function done(key, id) {
    await write(key, { id });
    setConfirm(null);
    r.reload();
    ui.toast("建议已处理");
  }
  return (
    <Panel title="校园建议" icon={ChatTeardropText}>
      <div className="admin-toolbar">
        <input
          aria-label="搜索校园建议"
          placeholder="搜索标题或内容"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="建议状态" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">全部建议</option>
          <option value="pending">待审核</option>
          <option value="passed">已通过</option>
        </select>
      </div>
      <ResourceState resource={r}>
        {rows.length ? (
          rows.map((s) => (
            <article className="admin-record" key={s.id}>
              <header>
                <div>
                  <span className="version-chip">{s.pass ? "已通过" : "待审核"}</span>
                  <h3>{s.title}</h3>
                  <small>{s.name || "校园用户"}</small>
                </div>
                <div className="button-row">
                  {!s.pass && (
                    <Action
                      onClick={() =>
                        setConfirm({
                          title: "通过建议",
                          detail: `确认通过“${s.title}”？通过后会公开显示。`,
                          run: () => done("suggestionPass", s.id),
                        })
                      }
                    >
                      通过
                    </Action>
                  )}
                  <Action
                    secondary
                    onClick={() =>
                      setConfirm({
                        title: "删除建议",
                        detail: `确认删除“${s.title}”？`,
                        run: () => done("suggestionDelete", s.id),
                      })
                    }
                  >
                    删除
                  </Action>
                </div>
              </header>
              <p>{s.context}</p>
            </article>
          ))
        ) : (
          <Empty title="暂无符合条件的建议" />
        )}
      </ResourceState>
      {confirm && <Confirm {...confirm} close={() => setConfirm(null)} />}
    </Panel>
  );
}
function Moderation({ admin }) {
  const ui = useUI(),
    words = useResource("moderationWords"),
    strikes = useResource("moderationStrikes");
  const [search, setSearch] = useState(""),
    [tab, setTab] = useState("words"),
    [confirm, setConfirm] = useState(null);
  const rows = (words.data?.words || []).filter((w) => w.word.includes(search));
  async function done(key, input) {
    await write(key, input);
    setConfirm(null);
    words.reload();
    strikes.reload();
    ui.toast("审核设置已更新");
  }
  return (
    <>
      <div className="tabs">
        <button className={tab === "words" ? "active" : ""} onClick={() => setTab("words")}>
          词库
        </button>
        <button className={tab === "strikes" ? "active" : ""} onClick={() => setTab("strikes")}>
          违规记录
        </button>
      </div>
      <Panel title={tab === "words" ? "内容词库" : "账号违规记录"} icon={ShieldCheck}>
        {!admin && <p className="muted admin-help">教师可查看记录，修改由管理员操作。</p>}
        {tab === "words" ? (
          <>
            <div className="admin-toolbar">
              <input
                aria-label="搜索词库"
                placeholder="搜索词条"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="muted">{rows.length} 个词条</span>
            </div>
            {admin && (
              <Form
                label="添加词条"
                onSubmit={async (fd) => {
                  await done("moderationAdd", { body: { word: fd.get("word") } });
                }}
              >
                <Field label="新增词条" name="word" required maxLength={100} />
              </Form>
            )}
            <ResourceState resource={words}>
              <div className="word-list">
                {rows.length ? (
                  rows.map((w, i) => (
                    <div className="word-row" key={`${w.source}-${w.word}-${i}`}>
                      <strong>{w.word}</strong>
                      <span>{w.source}</span>
                      {admin && w.source === "本机" && (
                        <button
                          className="text-button accent"
                          onClick={() =>
                            setConfirm({
                              title: "移除词条",
                              detail: `确认从补充词库移除“${w.word}”？`,
                              run: () => done("moderationDelete", { word: w.word }),
                            })
                          }
                        >
                          移除
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <Empty title="没有找到词条" />
                )}
              </div>
            </ResourceState>
          </>
        ) : (
          <ResourceState resource={strikes}>
            {(strikes.data?.accounts || []).length ? (
              strikes.data.accounts.map((a) => (
                <article key={a.account} className="admin-record">
                  <header>
                    <div>
                      <h3>{a.banned ? "限制中" : "已解除限制"}</h3>
                      <small className="account-id">{a.account}</small>
                      <p>
                        累计 {a.strikes} 次 ·{" "}
                        {a.banned ? `剩余 ${a.remainingMinutes} 分钟` : "当前可正常使用"}
                      </p>
                    </div>
                    {admin && a.banned && (
                      <Action
                        secondary
                        onClick={() =>
                          setConfirm({
                            title: "解除限制",
                            detail: "确认解除这个账号的限制？",
                            run: () => done("moderationForgive", { body: { account: a.account } }),
                          })
                        }
                      >
                        解除限制
                      </Action>
                    )}
                  </header>
                </article>
              ))
            ) : (
              <Empty title="暂无违规记录" />
            )}
          </ResourceState>
        )}
      </Panel>
      {confirm && <Confirm {...confirm} close={() => setConfirm(null)} />}
    </>
  );
}
function AddClub() {
  const ui = useUI(),
    [added, setAdded] = useState(null);
  const fields = [
    ["clubName", "社团名称", 100, true],
    ["clubNameEn", "英文名称", 100, true],
    ["president", "社长姓名", 50, true],
    ["presidentEn", "社长英文名", 100, true],
    ["vicePresident", "副社长姓名", 50, false],
    ["vicePresidentEn", "副社长英文名", 100, false],
    ["teacher", "指导老师", 50, true],
    ["teacherEn", "指导老师英文名", 100, true],
    ["sortDescription", "一句话简介", 20, true],
    ["sortDescriptionEn", "英文简介", 200, false],
  ];
  return (
    <Panel title="新建校园社团" icon={Buildings}>
      {added ? (
        <Empty
          title={`${added}已创建`}
          detail="可以在发现社团中查看。"
          action="浏览社团"
          onAction={() => ui.navigate("discover")}
        />
      ) : (
        <Form
          label="创建社团"
          onSubmit={async (fd) => {
            const body = Object.fromEntries(fd.entries());
            body.greatClub = false;
            await write("clubAdd", { body });
            setAdded(body.clubName);
            ui.data.refresh();
          }}
        >
          <div className="form-grid">
            {fields.map(([name, label, maxLength, required]) => (
              <Field key={name} {...{ name, label, maxLength, required }} />
            ))}
            <Field label="社团分类">
              <select name="clubClass">
                {Object.entries(categories).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="社团项目 / 领域" name="clubItem" required maxLength={100} />
          </div>
          <Field label="社团介绍">
            <textarea name="clubDescription" required maxLength={1000} rows={5} />
          </Field>
          <Field label="英文介绍">
            <textarea name="clubDescriptionEn" maxLength={1000} rows={5} />
          </Field>
        </Form>
      )}
    </Panel>
  );
}
