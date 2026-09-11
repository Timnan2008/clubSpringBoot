function tr(s) {
  const en = (new URLSearchParams(location.search).get("lang") || document.cookie.split("; ").find(v => v.startsWith("club_language="))?.split("=")[1]) === "en";
  return en ? {
    "预约未成功，请检查填写内容后重试。": "Booking failed. Please check the details and try again.",
    "请先登录": "Please sign in",
    "<div class=\"booking-login-required\"><p>预约将直接绑定社团官网账号。</p><a href=\"account.php?login=1\">登录社团官网</a><span>登录后从官网进入预约页面即可。</span></div>": "<div class=\"booking-login-required\"><p>Bookings are linked to your school account.</p><a href=\"account.php?login=1\">Sign in to QPWFLHS Clubs</a><span>After signing in, open Court booking from the school website.</span></div>",
    "预约须知": "Booking rules",
    "<span class=\"booking-rules-icon\" aria-hidden=\"true\">!</span><p>严禁恶意占场、预约后无故不使用等行为。<strong>违者将被禁止预约3楼场地。</strong></p><div class=\"booking-modal-actions\"><button type=\"button\" class=\"booking-secondary\">返回</button><button type=\"button\" class=\"booking-primary\">我已知晓，继续</button></div>": "<span class=\"booking-rules-icon\" aria-hidden=\"true\">!</span><p>Do not reserve courts maliciously or fail to use a booking without a valid reason.<strong>Violators will be banned from booking the third-floor courts.</strong></p><div class=\"booking-modal-actions\"><button type=\"button\" class=\"booking-secondary\">Back</button><button type=\"button\" class=\"booking-primary\">I understand, continue</button></div>",
    "预约时段": "Book a slot",
    "<p class=\"booking-modal-loading\">正在载入…</p>": "<p class=\"booking-modal-loading\">Loading…</p>",
    "备注（可选）": "Notes (optional)",
    "如有需要，请填写备注": "Add a note if needed",
    "<button type=\"button\" class=\"booking-secondary\">取消</button><button type=\"submit\" class=\"booking-primary\">确认预约</button>": "<button type=\"button\" class=\"booking-secondary\">Cancel</button><button type=\"submit\" class=\"booking-primary\">Confirm booking</button>",
    "正在预约…": "Booking…",
    "<div class=\"booking-success\"><span>✓</span><h2>预约成功</h2><p>该时段已锁定，不能修改或取消。</p></div>": "<div class=\"booking-success\"><span>✓</span><h2>Booking confirmed</h2><p>This slot is locked and cannot be changed or cancelled.</p></div>",
    "网络异常，请稍后重试。": "Network error. Please try again later.",
    "确认预约": "Confirm booking",
    "<p class=\"booking-form-status is-error\">预约表单载入失败，请刷新页面后重试。</p>": "<p class=\"booking-form-status is-error\">Unable to load the form. Refresh the page and try again.</p>",
    "查看我的预约": "My bookings",
    "<p class=\"booking-modal-loading\">正在查询当前账号…</p>": "<p class=\"booking-modal-loading\">Loading your account…</p>",
    "查询失败": "Unable to load bookings",
    "查询失败，请稍后重试。": "Unable to load bookings. Please retry later.",
    "3楼羽毛球场": "Third-floor badminton court",
    "预约这个时段": "Book this slot",
    "不可预约": "Unavailable",
    "此时段已被预约": "This slot has been booked",
    "中文": "中文",
    "切换为中文": "切换为中文"
  }[s] || s : s;
}
(() => {
  'use strict';

  // The school calendar books one fixed slot. MRBS's multi-cell drag handlers
  // otherwise leave their selection overlay over our clickable slot links.
  document.addEventListener('mousedown', event => {
    const cell=event.target.closest?.('table.dwm_main td');
    if(!cell)return;
    event.stopImmediatePropagation();
    if(event.button===0){event.preventDefault();cell.querySelector('a')?.focus({preventScroll:true});}
  },true);
  const pad = value => String(value).padStart(2, '0');
  const en = (new URLSearchParams(location.search).get('lang') || document.cookie.split('; ').find(v => v.startsWith('club_language='))?.split('=')[1]) === 'en';
  const tx = (zh, english) => en ? english : zh;
  document.documentElement.lang = en ? 'en' : 'zh-CN';
  document.title=tx('羽毛球场预约 · 青浦世外','Court booking · QPWFLHS');
  if(['en','zh'].includes(new URLSearchParams(location.search).get('lang'))) document.cookie=`club_language=${en?'en':'zh'}; Path=/; Max-Age=31536000; SameSite=Lax`;
  const weekdays = en ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const parseIsoDate = value => {
    const parts = String(value || '').split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };
  const formatIsoDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const formatTime = seconds => `${Math.floor(seconds / 3600)}:${pad(Math.floor(seconds % 3600 / 60))}`;
  const formatSlot = seconds => `${formatTime(seconds)}～${formatTime(seconds + 20 * 60)}`;
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
  let accountPromise;
  window.addEventListener("pageshow", e => { if(e.persisted) location.reload(); });
  const loadAccount = () => {
    if (!accountPromise) {
      accountPromise = fetch('account.php', {
        credentials: 'same-origin', cache: 'no-store'
      }).then(async response => {
        if (!response.ok) throw new Error('login');
        return response.json();
      });
    }
    return accountPromise;
  };
  const getNextMonday = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setDate(today.getDate() + (now.getDay() === 0 ? 1 : 8 - now.getDay()));
    return today;
  };
  const ensureNextWeek = () => {
    if (!document.body.classList.contains('index')) return false;
    const nextMonday = getNextMonday();
    const nextFriday = new Date(nextMonday);
    nextFriday.setDate(nextFriday.getDate() + 4);
    const pageDate = parseIsoDate(document.body.dataset.pageDate);
    const inBookingWeek = Number.isFinite(pageDate.getTime()) && pageDate >= nextMonday && pageDate <= nextFriday;
    if (document.body.dataset.view === 'week' && inBookingWeek) return false;
    const params = new URLSearchParams({
      view: 'week',
      page_date: formatIsoDate(nextMonday),
      area: document.body.dataset.area || '1',
      room: document.body.dataset.room || '1'
    });
    window.location.replace(`index.php?${params}`);
    return true;
  };
  const whenReactReady = callback => {
    if (window.mountAeroShards) callback();else window.addEventListener('school-react-ready', callback, {
      once: true
    });
  };
  const initReactBits = () => {
    if (document.querySelector('.aero-shards-host')) return;
    const host = document.createElement('div');
    host.className = 'aero-shards-host';
    host.setAttribute('aria-hidden', 'true');
    document.body.prepend(host);
    if (!document.querySelector('link[data-aero-shards]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = 'css/aero-shards.bundle.css?v=20260910-18';
      stylesheet.dataset.aeroShards = 'true';
      document.head.appendChild(stylesheet);
    }
    const mount = () => {
      window.mountAeroShards?.(host);
      window.dispatchEvent(new Event('school-react-ready'));
    };
    if (window.mountAeroShards) mount();else {
      const script = document.createElement('script');
      script.src = 'js/aero-shards.bundle.js?v=20260910-18';
      script.async = true;
      script.onload = mount;
      script.onerror = () => {
        host.dataset.failed = 'true';
      };
      document.head.appendChild(script);
    }
  };
  const closeModal = () => {
    const layer = document.querySelector('.booking-modal-layer');
    const restore = layer?._restoreFocus;
    layer?._cancelPending?.();
    layer?.remove();
    document.body.classList.remove('booking-modal-open');
    restore?.focus?.();
  };
  const createModal = (title, restoreFocus) => {
    closeModal();
    const layer = document.createElement('div');
    layer.className = 'booking-modal-layer';
    layer._restoreFocus = restoreFocus;
    layer.innerHTML = `<section class="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title"><button type="button" class="booking-modal-close" aria-label="${tx('关闭','Close')}">×</button><h2 id="booking-modal-title"></h2><div class="booking-modal-content"></div></section>`;
    layer.querySelector('h2').textContent = title;
    layer.querySelector('.booking-modal-close').addEventListener('click', closeModal);
    layer.addEventListener('click', event => {
      if (event.target === layer) closeModal();
    });
    document.body.appendChild(layer);
    document.body.classList.add('booking-modal-open');
    requestAnimationFrame(() => layer.classList.add('is-visible'));
    return layer;
  };
  const dateLabel = iso => {
    const date = parseIsoDate(iso);
    return Number.isFinite(date.getTime()) ? en ? date.toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    }) : `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}` : iso;
  };
  const messageFromHtml = html => {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return parsed.querySelector('.error, .ui-state-error, h1 + p, main p')?.textContent?.trim() || tr("预约未成功，请检查填写内容后重试。");
  };
  const showLoginRequired = (layer, content) => {
    layer.querySelector('h2').textContent = tr("请先登录");
    content.innerHTML = tr("<div class=\"booking-login-required\"><p>预约将直接绑定社团官网账号。</p><a href=\"account.php?login=1\">登录社团官网</a><span>登录后从官网进入预约页面即可。</span></div>");
  };

  // This decision belongs to this submission only; it is never stored across bookings.
  const confirmBookingRules = (layer, form, submit) => new Promise(resolve => {
    const content = layer.querySelector('.booking-modal-content');
    const title = layer.querySelector('h2');
    title.textContent = tr("预约须知");
    const notice = document.createElement('div');
    notice.className = 'booking-rules';
    notice.innerHTML = tr("<span class=\"booking-rules-icon\" aria-hidden=\"true\">!</span><p>严禁恶意占场、预约后无故不使用等行为。<strong>违者将被禁止预约3楼场地。</strong></p><div class=\"booking-modal-actions\"><button type=\"button\" class=\"booking-secondary\">返回</button><button type=\"button\" class=\"booking-primary\">我已知晓，继续</button></div>");
    content.replaceChildren(notice);
    let settled = false;
    const finish = accepted => {
      if (settled) return;
      settled = true;
      delete layer._cancelPending;
      title.textContent = tr("预约时段");
      content.replaceChildren(form);
      submit.focus();
      resolve(accepted);
    };
    layer._cancelPending = () => finish(false);
    notice.querySelector('.booking-secondary').addEventListener('click', () => finish(false));
    notice.querySelector('.booking-primary').addEventListener('click', () => finish(true));
    notice.querySelector('.booking-secondary').focus();
  });
  const openBookingModal = async link => {
    accountPromise = null;
    const layer = createModal(tr("预约时段"), link);
    const content = layer.querySelector('.booking-modal-content');
    if (!(await confirmBookingRules(layer, document.createElement('div'), link))) {
      if (layer.isConnected) closeModal();
      return;
    }
    content.innerHTML = tr("<p class=\"booking-modal-loading\">正在载入…</p>");
    try {
      let account;
      try {
        account = await loadAccount();
      } catch {
        showLoginRequired(layer, content);
        return;
      }
      if(Number(account.level)===2){
        const note=document.createElement('div');note.className='booking-rules';note.innerHTML=`<p>${tx('教师预约将先挂起，不占用学生预约名额。周日 19:00 后，空余时段按教师提交顺序分配。','Teacher requests stay pending without blocking students. After Sunday 19:00, free slots are assigned in submission order.')}</p><button type="button" class="booking-primary">${tx('我已知晓，继续','I understand, continue')}</button>`;content.replaceChildren(note);await new Promise(resolve=>{note.querySelector('button').onclick=resolve;layer._cancelPending=resolve;});delete layer._cancelPending;if(!layer.isConnected)return;
      }
      const response = await fetch(link.dataset.bookingUrl, {
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error('load');
      const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
      const sourceForm = parsed.querySelector('form#main');
      if (!sourceForm) throw new Error('form');
      const form = sourceForm.cloneNode(true);
      form.classList.remove('js_hidden');
      form.querySelectorAll('legend').forEach(el=>el.textContent=tx('预约信息','Booking details'));
      const nameInput = form.querySelector('#name');
      const description = form.querySelector('#description');
      const startDate = form.querySelector('#start_date')?.value || '';
      const startSeconds = Number(form.querySelector('#start_seconds')?.value || 0);
      const endDate = form.querySelector('#end_date');
      if (endDate) endDate.disabled = false;
      const keep = new Set([description?.closest('div')]);
      form.querySelectorAll('fieldset:first-of-type > div').forEach(div => {
        if (!keep.has(div)) div.classList.add('school-hidden-field');
      });
      form.querySelectorAll('fieldset').forEach((fieldset, index) => {
        if (index > 0) fieldset.classList.add('school-hidden-field');
      });
      const summary = document.createElement('div');
      summary.className = 'booking-modal-summary';
      summary.innerHTML = `<span>${tx('3楼羽毛球场','Third-floor court')} · ${escapeHtml(account.display_name)}</span><strong>${dateLabel(startDate)} · ${formatSlot(startSeconds)}</strong><small>${escapeHtml(account.email)}</small>`;
      form.prepend(summary);
      nameInput.value = account.display_name;
      const descriptionLabel = form.querySelector('label[for="description"]');
      if (descriptionLabel) descriptionLabel.textContent = tr("备注（可选）");
      description.placeholder = tr("如有需要，请填写备注");
      description.maxLength = 255;
      const actions = document.createElement('div');
      actions.className = 'booking-modal-actions';
      actions.innerHTML = tr("<button type=\"button\" class=\"booking-secondary\">取消</button><button type=\"submit\" class=\"booking-primary\">确认预约</button>");
      actions.querySelector('.booking-secondary').addEventListener('click', closeModal);
      form.appendChild(actions);
      content.replaceChildren(form);
      description.focus();
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const submit = actions.querySelector('.booking-primary');
        if (submit.disabled) return;
        const status = document.createElement('p');
        status.className = 'booking-form-status';
        submit.disabled = true;
        submit.textContent = tr("正在预约…");
        form.querySelector('.booking-form-status')?.remove();
        actions.before(status);
        try {
          const payload = new FormData(form);
          payload.set('school_rules_ack', '1');
          const result = await fetch(form.action, {
            method: 'POST',
            body: payload,
            credentials: 'same-origin'
          });
          if((result.headers.get('content-type')||'').includes('application/json')){const data=await result.json();if(!result.ok||data.error)throw Error(data.error||tx('预约失败','Booking failed'));if(data.status==='unavailable'){status.textContent=tx('该时段已有预约，教师挂起未获分配。','This slot is unavailable. Your request could not be assigned.');submit.disabled=false;return;}content.replaceChildren();const message=document.createElement('div');message.className='booking-success';const heading=document.createElement('h2');heading.textContent=data.pending?tx('教师挂起','Teacher pending'):tx('预约成功','Booking confirmed');const text=document.createElement('p');text.textContent=data.pending?tx('周日 19:00 后按顺序分配空位，可在“我的预约”查看结果。','Free slots are assigned after Sunday 19:00. Check My bookings for the result.'):tx('场地已为你保留。','The court is reserved for you.');const close=document.createElement('button');close.textContent=tx('完成','Done');close.onclick=()=>location.reload();message.append(heading,text,close);content.append(message);return;}
          const html = await result.text();
          if (result.redirected && /index\.php/.test(result.url)) {
            layer.querySelector('.booking-modal').innerHTML = tr("<div class=\"booking-success\"><span>✓</span><h2>预约成功</h2><p>该时段已锁定，不能修改或取消。</p></div>");
            window.setTimeout(() => window.location.reload(), 900);
            return;
          }
          status.textContent = messageFromHtml(html);
          status.classList.add('is-error');
        } catch (error) {
          status.textContent = error.message || tr("网络异常，请稍后重试。");
          status.classList.add('is-error');
        }
        submit.disabled = false;
        submit.textContent = tr("确认预约");
      });
    } catch {
      content.innerHTML = tr("<p class=\"booking-form-status is-error\">预约表单载入失败，请刷新页面后重试。</p>");
    }
  };
  const openBooking = (link, event) => {
    event.preventDefault();
    if (link.dataset.opening === 'true') return;
    link.dataset.opening = 'true';
    openBookingModal(link).finally(() => {
      link.dataset.opening = 'false';
    });
  };
  const openMyBookings = async button => {
    const layer = createModal(tr("查看我的预约"), button);
    const content = layer.querySelector('.booking-modal-content');
    content.innerHTML = tr("<p class=\"booking-modal-loading\">正在查询当前账号…</p>");
    try {
      const response = await fetch('my_bookings.php', {
        credentials: 'same-origin'
      });
      const data = await response.json();
      if (response.status === 401) {
        showLoginRequired(layer, content);
        return;
      }
      if (!response.ok) throw new Error(data.error || tr("查询失败"));
      const account = `<div class="my-bookings-account"><strong>${escapeHtml(data.account.display_name)}</strong><span>${escapeHtml(data.account.email)}</span></div>`;
      if (!data.bookings.length) {
        content.innerHTML = `${account}<div class="my-bookings-empty"><strong>${tx('无预约','No bookings')}</strong><span>${tx('当前账号还没有预约记录。','No reservations for your account yet.')}</span></div>`;
        return;
      }
      content.innerHTML = `${account}<div class="my-bookings-results">${data.bookings.map(item => `<article class="my-booking-card"><div><strong>${escapeHtml(en && item.date ? dateLabel(item.date) : item.date_label)}</strong><span>${escapeHtml(en ? 'Third-floor badminton court' : item.room_name)}</span></div><time>${escapeHtml(item.time_label)}</time>${item.status ? `<strong>${escapeHtml(item.status==='pending'?tx('教师挂起','Teacher pending'):tx('未获分配','Not assigned'))}</strong>` : ''}${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}</article>`).join('')}</div>`;
    } catch (error) {
      content.innerHTML = `<p class="booking-form-status is-error">${escapeHtml(error.message || tr("查询失败，请稍后重试。"))}</p>`;
    }
  };
  const localizeCalendar = () => {
    document.querySelectorAll('.dwm_main tbody tr').forEach(row=>{
      const heading=row.querySelector('th[data-seconds]');if(!heading)return;
      const minute=Number(heading.dataset.seconds)/60;
      const allowed=[[690,770],[990,1110]].some(([a,b])=>minute>=a&&minute+20<=b&&(minute-a)%20===0);
      if(!allowed){row.hidden=true;row.querySelectorAll('a').forEach(a=>{a.removeAttribute('href');a.tabIndex=-1});}
    });
    if(en)document.querySelectorAll('.dwm_main .first_last').forEach(el=>{if(el.textContent.trim()==='时间')el.textContent='Time';});
    const headers = [...document.querySelectorAll('.dwm_main thead th[data-date]')];
    if (!headers.length) return;
    headers.forEach(header => {
      const date = parseIsoDate(header.dataset.date);
      const link = header.querySelector('a');
      if (!link || !Number.isFinite(date.getTime())) return;
      link.textContent = (header.parentElement?.rowIndex ?? 0) === 0 ? weekdays[date.getDay()] : en ? date.toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric'
      }) : `${date.getMonth() + 1}月${date.getDate()}日`;
      link.removeAttribute('href');
    });
    const uniqueDates = [...new Set(headers.map(header => header.dataset.date))].filter(Boolean).sort();
    const heading = document.querySelector('h2.date');
    if (heading && uniqueDates.length) {
      const start = parseIsoDate(uniqueDates[0]);
      const end = parseIsoDate(uniqueDates[uniqueDates.length - 1]);
      const text = `下一周预约 · ${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日－${end.getMonth() + 1}月${end.getDate()}日`;
      heading.textContent = '';
      const host = document.createElement('span');
      heading.appendChild(host);
      host.textContent = en ? `Next week · ${start.toLocaleDateString('en-GB')} – ${end.toLocaleDateString('en-GB')}` : text;
    }
    document.querySelectorAll('.dwm_main tbody th[data-seconds]').forEach(cell => {
      const seconds = Number(cell.dataset.seconds);
      if (!Number.isFinite(seconds)) return;
      const label = document.createElement('span');
      label.className = 'booking-time-range';
      label.textContent = formatSlot(seconds);
      cell.replaceChildren(label);
    });
    const arrow = document.querySelector('nav.arrow');
    if (arrow && uniqueDates.length) {
      const start = parseIsoDate(uniqueDates[0]);
      const end = parseIsoDate(uniqueDates[uniqueDates.length - 1]);
      const label = document.createElement('span');
      label.className = 'booking-window-label';
      label.textContent = en ? `Bookable dates: ${start.toLocaleDateString('en-GB')} – ${end.toLocaleDateString('en-GB')}` : `可预约日期：${start.getMonth() + 1}月${start.getDate()}日－${end.getMonth() + 1}月${end.getDate()}日`;
      arrow.appendChild(label);
    }
    const location = document.querySelector('nav.main_calendar nav.location');
    if (location) {
      location.replaceChildren();
      const roomLabel = document.createElement('span');
      roomLabel.className = 'room-label';
      roomLabel.textContent = tr("3楼羽毛球场");
      const myBookings = document.createElement('button');
      myBookings.type = 'button';
      myBookings.className = 'my-bookings-button';
      myBookings.textContent = tr("查看我的预约");
      myBookings.addEventListener('click', () => openMyBookings(myBookings));
      location.append(roomLabel, myBookings);
    }
    document.querySelectorAll('.dwm_main td.new a').forEach(link => {
      if(link.closest('tr')?.hidden)return;
      link.removeAttribute('title');
      const seconds = Number(link.closest('tr')?.querySelector('th[data-seconds]')?.dataset.seconds);
      link.dataset.label = tx('预约', 'Book');
      link.setAttribute('aria-label', Number.isFinite(seconds) ? `${tx('预约','Book')} ${formatSlot(seconds)}` : tr("预约这个时段"));
      link.dataset.bookingUrl = link.href;
      link.href = '#';
      link.addEventListener('click', event => openBooking(link, event));
    });
    document.querySelectorAll('.dwm_main td.booked').forEach(cell => {
      const booking = cell.querySelector('.booking') || cell;
      booking.replaceChildren();
      const label = document.createElement('span');
      label.textContent = tr("不可预约");
      label.setAttribute('aria-label', tr("此时段已被预约"));
      booking.appendChild(label);
    });
    const table = document.querySelector('.table_container');
    ['dragstart', 'selectstart'].forEach(type => table?.addEventListener(type, event => event.preventDefault()));
  };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();
    if (event.key !== 'Tab') return;
    const modal = document.querySelector('.booking-modal');
    if (!modal) return;
    const items = [...modal.querySelectorAll('button, a[href], input, textarea, select, [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
    if (!items.length) return;
    const first = items[0],
      last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  const initNavigation = () => {
    const banner = document.querySelector('body > header.banner');
    if (!banner) return;
    const nav=document.createElement('div');nav.id='school-cardnav';banner.prepend(nav);
    const css=document.createElement('link');css.rel='stylesheet';css.href='css/aero-shards.bundle.css?v=20260910-18';document.head.append(css);
    const script=document.createElement('script');script.src='js/aero-shards.bundle.js?v=20260910-18';script.defer=true;document.head.append(script);
    const company = banner.querySelector('.company');
    if (company) {
      const title = document.createElement('h1');
      title.textContent = tx('羽毛球场预约', 'Badminton court booking');
      company.replaceChildren(title);
    }
    document.querySelectorAll('.company_more_info').forEach(el=>el.remove());
    const info = document.createElement('p');info.className='company_more_info';company?.append(info);
    if (info) info.textContent = tx('试运行阶段仅开放午休和晚间休息时段：11:30–12:50 / 16:30–18:30。每段20分钟，每周最多三次，每天一次。', 'Trial operation: lunch and evening breaks only, 11:30–12:50 / 16:30–18:30. 20-minute slots, up to 3 per week and 1 per day.');
    const rules = document.createElement('button');
    rules.type = 'button';
    rules.className = 'school-rules-link';
    rules.textContent = tx('预约须知 ↗', 'Booking rules ↗');
    rules.onclick = async () => {
      const layer = createModal(tx('预约须知', 'Booking rules'), rules);
      await confirmBookingRules(layer, document.createElement('div'), rules);
      if (layer.isConnected) closeModal();
    };
    const windowNote=document.createElement('section');windowNote.className='school-window-note';
    const windowTitle=document.createElement('h2');windowTitle.textContent=tx('预约开放时间','Booking opening hours');
    const studentWindow=document.createElement('p');studentWindow.textContent=tx('学生（含社长、副社长）：每周六、周日 13:00–19:00，可预约下一周场地。','Students (including presidents and vice presidents): Saturday and Sunday, 13:00–19:00, for next week’s courts.');
    const teacherWindow=document.createElement('p');teacherWindow.textContent=tx('教师：可先提交挂起申请，周日 19:00 统一按提交顺序分配剩余时段。','Teachers: submit a pending request in advance. Remaining slots are assigned in submission order on Sunday at 19:00.');
    const zone=document.createElement('small');zone.textContent=tx('以上均为北京时间（UTC+8）','All times are China Standard Time (UTC+8)');
    windowNote.append(windowTitle,studentWindow,teacherWindow,zone);banner.append(windowNote,rules);
  };
  const markPending = async()=>{try{const r=await fetch('teacher_queue.php',{cache:'no-store'});if(!r.ok)return;const data=await r.json();document.querySelectorAll('.dwm_main td.new a').forEach(link=>{if(!link.dataset.bookingUrl)return;const u=new URL(link.dataset.bookingUrl);const y=Number(u.searchParams.get('year')),mo=Number(u.searchParams.get('month')),d=Number(u.searchParams.get('day'));const date=`${y}-${pad(mo)}-${pad(d)}`;const seconds=Number(link.closest('tr')?.querySelector('th[data-seconds]')?.dataset.seconds);const pending=data.pending.some(p=>{const time=new Date(Number(p.start_time)*1000);const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(time);const hm=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(time).split(':');return parts===date&&Number(hm[0])*3600+Number(hm[1])*60===seconds;});if(pending){const label=document.createElement('small');label.className='teacher-pending-label';label.textContent=tx('教师挂起','Teacher pending');link.parentElement.append(label);}})}catch{}};
  const apply = () => {
    initNavigation();
    if (ensureNextWeek()) return;
    localizeCalendar();markPending();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, {
    once: true
  });else apply();
})();
