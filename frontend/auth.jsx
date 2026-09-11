import ForgotPassword from './ForgotPassword';
import {tr as localize} from './language';
import PasswordStrength,{passwordChecks} from './PasswordStrength';
import Turnstile from './Turnstile';
import BackButton from './BackButton';
import React, { useEffect, useRef, useState, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig, motion, AnimatePresence } from "motion/react";
import Stepper, { Step } from "./Stepper";
const ColorBends = lazy(() => import("./ColorBends"));
import "./ColorBends.css";
import "./auth.css";
const AUTH_COLORS=["#687fbd", "#8771ad", "#39405f"];
const host = document.getElementById("club-auth");
const en = host?.dataset.language === "en";
const t = (zh, eng) => (en ? eng : zh);
const emailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
async function request(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok || data.code !== 200)
    throw new Error(
      data.message && data.message !== "错误"
        ? localize(data.message)
        : t(
            "操作未成功，请检查信息后重试。",
            "Please check your details and try again.",
          ),
    );
  return data;
}
function Field({ label, id, ...props }) {
  return (
    <label className="auth-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} {...props} />
    </label>
  );
}
function Auth() {
  const [mode, setMode] = useState("login"),
    [step, setStep] = useState(1),
    [error, setError] = useState(""),
    [info, setInfo] = useState(""),
    [busy, setBusy] = useState(false),
    [sending, setSending] = useState(false),
    [cooldown, setCooldown] = useState(0),
    [done, setDone] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "", rememberMe: false });
  const [form, setForm] = useState({
    name: "",
    nameEn: "", nickname: "", studentNumber: "",
    role: "user",
    clubs: [],
    email: "",
    code: "",
    password: "",
    confirm: "",
  });
  const [clubs, setClubs] = useState([]),
    [clubError, setClubError] = useState(false),
    [clubLoading, setClubLoading] = useState(false),
    [clubRetry, setClubRetry] = useState(0),
    [showPassword, setShowPassword] = useState(false);
  const lock = useRef(false),
    sendLock = useRef(false),
    registerPanel = useRef(null);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(
      () => setCooldown((v) => Math.max(0, v - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [cooldown > 0]);
  useEffect(() => {
    if (form.role !== "teacher") return;
    const controller = new AbortController();
    setClubLoading(true);
    setClubError(false);
    fetch("/api/club/all", { signal: controller.signal })
      .then((r) => r.json())
      .then((r) => {
        if (r.code !== 200) throw Error();
        setClubs(r.data || []);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setClubError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setClubLoading(false);
      });
    return () => controller.abort();
  }, [form.role, clubRetry]);
  function change(key, value) {
    setForm((v) => ({ ...v, [key]: value }));
    setError("");
  }
  function switchMode(value) {
    if (busy || sending || value === mode) return;
    setMode(value);
    if (value === "register") setStep(1);
    setError("");
    setInfo("");
  }
  function validation(current) {
    if (current === 2 && form.role === "club-president")
      return t(
        "社长账号由管理员开通，请联系学校管理员。",
        "Club president accounts are created by an administrator.",
      );
    if (current === 1) {
      if (!form.name.trim() && !form.nameEn.trim())
        return t("中文名和英文名至少填写一项。", "Enter at least one of the two names.");
    }
    if (current === 3) {
      if(form.role==='user'&&!/^[A-Za-z0-9-]{1,32}$/.test(form.studentNumber.trim()))return t('请填写学生号。','Enter your student number.');
      if (!passwordChecks(form.password).every(Boolean)) return t("请满足下方全部密码要求。", "Meet all password requirements below.");
      if (form.password !== form.confirm)
        return t("两次输入的密码不一致。", "The passwords do not match.");
    }
    if (current === 4) {
      if (!emailValid(form.email.trim()))
        return t("请输入有效的邮箱地址。", "Enter a valid email address.");
      if (
        form.role === "teacher" &&
        !form.email.trim().toLowerCase().endsWith("@shwfl.edu.cn")
      )
        return t(
          "教师请使用 @shwfl.edu.cn 学校邮箱。",
          "Teachers must use their @shwfl.edu.cn school email.",
        );
      if (!/^\d{6}$/.test(form.code))
        return t(
          "请输入邮件中的 6 位数字验证码。",
          "Enter the six-digit email code.",
        );
    }
    return "";
  }
  async function guard(current) {
    const msg = validation(current);
    setError(msg);
    if (msg) return false;
    setInfo("");
    return true;
  }
  async function sendCode() {
    if (sendLock.current || cooldown > 0 || busy) return;
    const email = form.email.trim();
    if (!emailValid(email)) {
      setError(t("请输入有效的邮箱地址。", "Enter a valid email address."));
      return;
    }
    if (
      form.role === "teacher" &&
      !email.toLowerCase().endsWith("@shwfl.edu.cn")
    ) {
      setError(
        t(
          "教师请使用 @shwfl.edu.cn 学校邮箱。",
          "Teachers must use their @shwfl.edu.cn school email.",
        ),
      );
      return;
    }
    sendLock.current = true;
    setSending(true);
    setError("");
    setInfo("");
    try {
      await request("/api/email/send?" + new URLSearchParams({ email }));
      setCooldown(60);
      setInfo(
        t(
          "验证码已发送，请查看邮箱（含垃圾邮件）。",
          "Code sent. Check your inbox and spam folder.",
        ),
      );
    } catch (e) {
      setError(
        e.name === "TimeoutError"
          ? t("请求超时，请稍后重试。", "Request timed out. Please retry.")
          : e.message,
      );
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  }
  const [turnstileToken,setTurnstileToken]=useState(''),[verificationReset,setVerificationReset]=useState(0);
  async function register() {
    if(!turnstileToken){setError(t('请先完成人机验证。','Please complete verification first.'));return false;}
    if (!["user", "teacher"].includes(form.role)) {
      setError(
        t(
          "社长账号由管理员开通。",
          "Club president accounts are created by an administrator.",
        ),
      );
      return false;
    }
    if (lock.current || sending) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const email = form.email.trim();
      const body =
        form.role === "teacher"
          ? {
              teacherName: form.name.trim(),
              teacherNameEn: form.nameEn.trim(),
              teacherPassword: form.password,
              teacherEmail: email,
              clubs: form.clubs,
              userType: "teacher",
            }
          : {
              username: form.name.trim(),
              usernameEn: form.nameEn.trim(),
              password: form.password,
              email,
              userType: "user",
            };
      try { await request("/api/user/add/" + form.role, {...body,turnstileToken,emailCode:form.code.trim(),studentNumber:form.studentNumber.trim(),nickname:form.nickname.trim()}); } finally {setTurnstileToken('');setVerificationReset(v=>v+1);}
      setLogin({ email, password: "" });
      setForm((v) => ({ ...v, password: "", confirm: "", code: "" }));
      setDone(true);
      return true;
    } catch (e) {
      setError(
        e.name === "TimeoutError"
          ? t(
              "请求超时。若账号已创建，请尝试登录；否则可以重试。",
              "Request timed out. Try signing in if the account was created, or retry.",
            )
          : e.message,
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function signIn(event) {
    event.preventDefault();
    if (lock.current) return;
    if (!emailValid(login.email.trim()) || !login.password) {
      setError(t("请填写有效邮箱和密码。", "Enter your email and password."));
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await request("/api/user/login", {
        email: login.email.trim(),
        password: login.password,
        rememberMe: login.rememberMe,
      });
      try { const {syncIdentityAfterLogin}=await import('./message-crypto.js'); await syncIdentityAfterLogin(login.password);sessionStorage.removeItem('club-message-sync-pending'); }
      catch { sessionStorage.setItem('club-message-sync-pending','1'); }
      const next = new URLSearchParams(location.search).get('next');
      let target='/';
      if(next){try{const url=new URL(next,location.origin);if(url.origin===location.origin&&!/^\/page\/user\/(login|register)/.test(url.pathname))target=url.pathname+url.search+url.hash;}catch{}}
      window.location.assign(target);
    } catch (e) {
      setError(
        e.name === "TimeoutError"
          ? t("登录超时，请重试。", "Sign-in timed out. Please retry.")
          : e.message,
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const labels = [
    t("个人信息", "Your profile"),
    t("选择身份", "Your role"),
    t("设置密码", "Password"),
    t("验证邮箱", "Email verification"),
  ];
  return (
    <MotionConfig reducedMotion="user">
      <BackButton className="auth-mobile-back" fallback="/" label/>
      <motion.main className="auth-layout" initial={{opacity:0,y:24,scale:0.985}} animate={{opacity:1,y:0,scale:1}} transition={{duration:0.65,ease:[0.22,1,0.36,1]}}>
        <section className="auth-intro">
          <BackButton className="auth-back" fallback="/" label/>
          <p className="auth-eyebrow">QPWFLHS CLUBS</p>
          <h1>
            {t("你的热爱，", "Your people.")}
            <br />
            {t("从这里出发。", "Your next chapter.")}
          </h1>
          <p className="auth-intro-copy">
            {t(
              "遇见同频的伙伴，开启课堂之外的精彩。",
              "Meet like-minded people. Discover more beyond the classroom.",
            )}
          </p>
          <div className="auth-art" aria-hidden="true">
            <Suspense fallback={<div className="color-bends-container"/>}><ColorBends
              colors={AUTH_COLORS}
              rotation={90}
              speed={0.2}
              scale={1}
              frequency={1}
              warpStrength={1}
              mouseInfluence={1}
              noise={0.15}
              parallax={0.5}
              iterations={1}
              intensity={1.05}
              bandWidth={6}
              transparent
            /></Suspense>
          </div>
          <p className="auth-school">
            {t(
              "上海青浦世外高级中学 · 社团平台",
              "Shanghai Qingpu World Foreign Language High School",
            )}
          </p>
        </section>
        <section
          className="auth-card"
          aria-label={t("账号登录与注册", "Sign in and registration")}
        >
          <div
            className="auth-tabs"
            role="tablist"
            aria-label={t("账号入口", "Account")}
          >
            <button
              type="button"
              role="tab"
              id="login-tab"
              aria-controls="login-panel"
              aria-selected={mode === "login"}
              disabled={busy || sending}
              onClick={() => switchMode("login")}
            >
              {t("登录", "Sign in")}
            </button>
            <button
              type="button"
              role="tab"
              id="register-tab"
              aria-controls="register-panel"
              aria-selected={mode === "register"}
              disabled={busy || sending}
              onClick={() => switchMode("register")}
            >
              {t("注册", "Create account")}
            </button>
          </div>
          <AnimatePresence mode="wait" initial={false}>
          {mode === "forgot" ? <motion.div key="forgot" initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-24}}><ForgotPassword initialEmail={login.email} onBack={()=>switchMode("login")}/></motion.div> : mode === "login" ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -24, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -24, filter: "blur(4px)" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              id="login-panel"
              role="tabpanel"
              aria-labelledby="login-tab"
            >
              <header className="auth-heading">
                <p>{t("欢迎回来","WELCOME BACK")}</p>
                <h2>{t("欢迎回来", "Welcome back")}</h2>
                <span>
                  {t(
                    "登录账号，继续你的社团生活。",
                    "Sign in to pick up where you left off.",
                  )}
                </span>
              </header>
              <form onSubmit={signIn} noValidate>
                <Field
                  id="login-email"
                  label={t("邮箱", "Email")}
                  type="email"
                  autoComplete="username"
                  value={login.email}
                  onChange={(e) =>
                    setLogin((v) => ({ ...v, email: e.target.value }))
                  }
                  placeholder="you@example.com"
                  disabled={busy}
                />
                <Field
                  id="login-password"
                  label={t("密码", "Password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={login.password}
                  onChange={(e) =>
                    setLogin((v) => ({ ...v, password: e.target.value }))
                  }
                  placeholder={t("输入你的密码", "Enter your password")}
                  disabled={busy}
                />
                <div className="auth-password-actions">                <button
                  type="button"
                  className="auth-text-button"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword
                    ? t("隐藏密码", "Hide password")
                    : t("显示密码", "Show password")}
                </button>
                <button type="button" className="auth-text-button" disabled={busy} onClick={()=>switchMode("forgot")}>{t("忘记密码？","Forgot password?")}</button></div>
                <label className="auth-remember"><input type="checkbox" checked={login.rememberMe} disabled={busy} onChange={e=>setLogin(v=>({...v,rememberMe:e.target.checked}))}/><span>{t("记住我，30 天免登录", "Remember me for 30 days")}</span></label>
                <button type="submit" className="auth-primary" disabled={busy}>
                  {busy
                    ? t("登录中…", "Signing in…")
                    : t("登录 →", "Sign in →")}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 24, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: 24, filter: "blur(4px)" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              id="register-panel"
              role="tabpanel"
              aria-labelledby="register-tab"
              ref={registerPanel}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  e.target.tagName === "INPUT" &&
                  e.target.type !== "checkbox"
                ) {
                  e.preventDefault();
                  registerPanel.current?.querySelector(".next-button")?.click();
                }
              }}
            >
              {done ? (
                <motion.div
                  className="auth-success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <span className="auth-success-icon">✓</span>
                  <h2>{t("注册成功，欢迎加入！", "You’re all set!")}</h2>
                  <p>
                    {t(
                      "账号已经创建，现在可以登录探索社团。",
                      "Your account is ready. Sign in to explore the clubs.",
                    )}
                  </p>
                  <button
                    className="auth-primary"
                    onClick={() => switchMode("login")}
                  >
                    {t("去登录 →", "Sign in →")}
                  </button>
                </motion.div>
              ) : (
                <>
                  <header className="auth-heading">
                    <p>START SOMETHING NEW</p>
                    <h2>{t("创建账号", "Create an account")}</h2>
                  </header>
                  <Stepper
                    initialStep={1}
                    beforeStepChange={guard}
                    onStepChange={(v) => {
                      setStep(v);
                      setError("");
                      setTimeout(
                        () =>
                          registerPanel.current
                            ?.querySelector(".step-default input")
                            ?.focus(),
                        450,
                      );
                    }}
                    onFinalStepCompleted={register}
                    disableStepIndicators
                    nextButtonProps={{
                      disabled:
                        busy ||
                        sending ||
                        (step === 2 && form.role === "club-president"),
                    }}
                    backButtonProps={{ disabled: busy || sending }}
                    backButtonText={t("上一步", "Back")}
                    nextButtonText={t("下一步 →", "Continue →")}
                    completeButtonText={
                      busy
                        ? t("正在创建…", "Creating…")
                        : t("完成注册 →", "Create account →")
                    }
                    renderStepIndicator={({ step: position, currentStep }) => (
                      <div
                        className="auth-progress-item"
                        aria-label={labels[position - 1]}
                        aria-current={
                          position === currentStep ? "step" : undefined
                        }
                      >
                        <span
                          className={
                            "auth-progress-dot " +
                            (currentStep >= position ? "is-active" : "")
                          }
                        >
                          {currentStep > position ? (
                            "✓"
                          ) : currentStep === position ? (
                            <span className="auth-progress-active-dot" />
                          ) : (
                            position
                          )}
                        </span>
                      </div>
                    )}
                  >
                    <Step>
                      <h3>{labels[0]}</h3>
                      <div className="auth-two-fields">
                        <Field
                          id="register-name"
                          label={t("真实姓名（中文）", "Real name (Chinese)")}
                          autoComplete="name"
                          value={form.name}
                          onChange={(e) => change("name", e.target.value)}
                          placeholder={t("请填写本人真实姓名", "Your real name")}
                        />
                        <Field
                          id="register-name-en"
                          label={t("真实英文名 / 姓名拼音", "English name / Pinyin")}
                          value={form.nameEn}
                          onChange={(e) => change("nameEn", e.target.value)}
                          placeholder={t("真实英文名或姓名拼音", "English name or Pinyin")}
                        />
                      </div>
                      <Field id="register-nickname" label={t('昵称（选填）','Nickname (optional)')} maxLength={60} value={form.nickname} onChange={e=>change('nickname',e.target.value)}/>
                    </Step>
                    <Step>
                      <h3>{labels[1]}</h3>
                      <fieldset className="auth-role">
                        <legend>{t("你的身份", "Your role")}</legend>
                        {["user", "club-president", "teacher"].map((role) => (
                          <label
                            key={role}
                            className={form.role === role ? "selected" : ""}
                          >
                            <input
                              type="radio"
                              name="role"
                              value={role}
                              checked={form.role === role}
                              onChange={() => change("role", role)}
                            />
                            {role === "user"
                              ? t("学生", "Student")
                              : role === "club-president"
                                ? t("社长", "Club president")
                                : t("教师", "Teacher")}
                          </label>
                        ))}
                      </fieldset>
                      {form.role === "club-president" && (
                        <div className="auth-president-info" role="status">
                          <h4>
                            {t(
                              "社长账号由管理员开通",
                              "Created by your administrator",
                            )}
                          </h4>
                          <p>
                            {t(
                              "请联系学校管理员开通社长账号。已有账号，可直接登录。",
                              "Contact your school administrator to create a club president account. Already have an account? Sign in below.",
                            )}
                          </p>
                          <button
                            type="button"
                            className="auth-secondary"
                            onClick={() => switchMode("login")}
                          >
                            {t(
                              "已有账号，去登录 →",
                              "Already registered? Sign in →",
                            )}
                          </button>
                        </div>
                      )}
                      {form.role === "teacher" && (
                        <div className="auth-clubs">
                          <p>
                            {t(
                              "负责的社团（可多选）",
                              "Clubs you supervise (optional)",
                            )}
                          </p>
                          {clubLoading ? (
                            <p>{t("加载中…", "Loading…")}</p>
                          ) : clubError ? (
                            <button
                              type="button"
                              onClick={() => setClubRetry((v) => v + 1)}
                            >
                              {t(
                                "社团加载失败，点击重试",
                                "Could not load clubs. Retry",
                              )}
                            </button>
                          ) : (
                            <div className="auth-club-list">
                              {clubs.map((c) => (
                                <label key={c.id}>
                                  <input
                                    type="checkbox"
                                    checked={form.clubs.includes(c.id)}
                                    onChange={(e) =>
                                      change(
                                        "clubs",
                                        e.target.checked
                                          ? [...form.clubs, c.id]
                                          : form.clubs.filter(
                                              (v) => v !== c.id,
                                            ),
                                      )
                                    }
                                  />
                                  {en ? c.clubNameEn || c.clubName : c.clubName}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Step>
                    <Step>
                      <h3>{labels[2]}</h3>{form.role==='user'&&<><Field id="register-student-number" label={t('学生号','Student number')} required maxLength={32} value={form.studentNumber} onChange={e=>change('studentNumber',e.target.value)}/><p className="auth-help">{t('一个学生号只能绑定一个账户，绑定后不能修改。','One account per student number. It cannot be changed after registration.')}</p></>}
                      <p className="auth-hint">
                        {t(
                          "设置一个你能记住、别人不易猜到的密码。",
                          "Choose a password that’s hard for others to guess.",
                        )}
                      </p>
                      <Field
                        id="register-password"
                        label={t("密码", "Password")}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={(e) => change("password", e.target.value)}
                      />
                      <PasswordStrength value={form.password}/>
<Field
                        id="register-confirm"
                        label={t("确认密码", "Confirm password")}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={form.confirm}
                        onChange={(e) => change("confirm", e.target.value)}
                      />
                      <button
                        type="button"
                        className="auth-text-button"
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword
                          ? t("隐藏密码", "Hide password")
                          : t("显示密码", "Show password")}
                      </button>
                    </Step>
                    <Step>
                      <h3>{labels[3]}</h3>
                      <p className="auth-hint">
                        {form.role === "teacher"
                          ? t(
                              "请使用学校教师邮箱完成验证。",
                              "Verify with your school teacher email.",
                            )
                          : t(
                              "验证码将发送到你的邮箱，有效期为 5 分钟。",
                              "We’ll email a verification code, valid for 5 minutes.",
                            )}
                      </p>
                      <Field
                        id="register-email"
                        label={t("邮箱", "Email")}
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        disabled={sending || busy}
                        onChange={(e) => change("email", e.target.value)}
                        placeholder={
                          form.role === "teacher"
                            ? "name@shwfl.edu.cn"
                            : "you@example.com"
                        }
                      />
                      <Turnstile action="register" onToken={setTurnstileToken} reset={verificationReset}/>
                      <div className="auth-code-row">
                        <Field
                          id="register-code"
                          label={t("验证码", "Verification code")}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={form.code}
                          disabled={busy}
                          onChange={(e) =>
                            change("code", e.target.value.replace(/\D/g, ""))
                          }
                          placeholder="000000"
                        />
                        <button
                          type="button"
                          className="auth-secondary"
                          disabled={sending || busy || cooldown > 0}
                          onClick={sendCode}
                        >
                          {sending
                            ? t("发送中…", "Sending…")
                            : cooldown > 0
                              ? `${cooldown}s`
                              : t("获取验证码", "Send code")}
                        </button>
                      </div>
                    </Step>
                  </Stepper>
                </>
              )}
            </motion.div>
          )}
          </AnimatePresence>
          {error && (
            <p className="auth-message auth-error" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="auth-message auth-info" role="status">
              {info}
            </p>
          )}
          <p className="auth-footnote">
            {t(
              "为青浦世外的每一份热爱而建。",
              "A place for every passion at QPWFLHS.",
            )}
          </p>
        </section>
      </motion.main>
    </MotionConfig>
  );
}
if (host) createRoot(host).render(<Auth />);

import './CampusMotion.css';
