
let clubs = [];
const clubMemberState = {};

async function fetchClubs() {
  if (clubs.length) {
    return clubs;
  }

  try {
    const res = await fetch(`/api/club/all`);
    const data = await res.json();
    clubs = data.data || [];
  } catch (err) {
    console.error("加载社团列表失败", err);
    clubs = [];
  }

  return clubs;
}

async function onRoleChange() {
  const role = document.getElementById("role").value;
  const area = document.getElementById("dynamic-area");
  area.innerHTML = ""; // 清空

  if (role === "user") {
    await fetchClubs();
    area.appendChild(createMultiClubCard("参与的社团（可多选）"));
  }

  if (role === "club-president") {
    await fetchClubs();
    area.appendChild(createSingleClubCard("管理的社团（必须 1 个）"));
    area.appendChild(createMultiClubCard("参与的社团（可多选）"));

    const deputyCard = document.createElement("div");
    deputyCard.className = "card";
    deputyCard.innerHTML = `
      <h4>社团职务</h4>
      <label>是否为副社长：</label>
      <select id="isVicePresident">
        <option value="false">否</option>
        <option value="true">是</option>
      </select>
    `;
    area.appendChild(deputyCard);

    area.appendChild(createClubMemberManagerCard());
    area.appendChild(createClubInfoEditorCard());
    area.appendChild(createPasswordEmailEditorCard());
  }

  if (role === "teacher") {
    await fetchClubs();
    area.appendChild(createMultiClubCard("负责的社团（可多选）"));
  }
}

function createMultiClubCard(title) {
  return buildClubCard(title, false);
}

function createSingleClubCard(title) {
  return buildClubCard(title, true);
}

function createClubMemberManagerCard() {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <h4>社团成员管理</h4>
    <p>选择“管理的社团”后，加载成员并可以添加/移除成员邮箱。</p>
    <button type="button" class="load-members-btn">加载当前社团成员</button>
    <div class="member-control" style="display:none; margin-top:12px; gap:8px;">
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <input type="email" class="member-email-input" placeholder="新增成员邮箱" />
        <button type="button" class="add-member-btn">添加成员</button>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:8px;">
        <input type="email" class="remove-member-email-input" placeholder="移除成员邮箱" />
        <button type="button" class="remove-member-btn">移除成员</button>
      </div>
    </div>
    <div class="member-list" style="margin-top:10px; white-space:pre-wrap; min-height:40px;">当前尚未加载成员</div>
  `;

  const loadBtn = card.querySelector(".load-members-btn");
  const addBtn = card.querySelector(".add-member-btn");
  const removeBtn = card.querySelector(".remove-member-btn");

  loadBtn.addEventListener("click", () => loadClubMembers(card));
  addBtn.addEventListener("click", () => addClubMember(card));
  removeBtn.addEventListener("click", () => removeClubMember(card));

  return card;
}

function createClubInfoEditorCard() {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <h4>社团信息修改</h4>
    <p>选择“管理的社团”后，加载当前社团信息并提交更新。</p>
    <button type="button" class="load-club-info-btn">加载社团信息</button>
    <div class="club-info-form" style="display:none; margin-top:12px; gap:8px;">
      <input type="text" class="club-name" placeholder="社团名称" />
      <input type="text" class="club-name-en" placeholder="社团英文名称" />
      <input type="text" class="club-short-desc" placeholder="社团简介（20字以内）" />
      <textarea class="club-description" placeholder="社团详细描述" rows="4"></textarea>
      <button type="button" class="save-club-info-btn">保存社团信息</button>
    </div>
    <div class="club-info-status" style="margin-top:10px; min-height:20px; color:#555;"></div>
  `;

  card.querySelector(".load-club-info-btn").addEventListener("click", () => loadClubInfo(card));
  card.querySelector(".save-club-info-btn").addEventListener("click", () => saveClubInfo(card));

  return card;
}

function createPasswordEmailEditorCard() {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <h4>密码 / 邮箱修改</h4>
    <div style="display:flex; flex-direction:column; gap:8px;">
      <input id="new-password" type="password" placeholder="新密码" />
      <input id="confirm-password" type="password" placeholder="确认新密码" />
      <input id="new-email" type="email" placeholder="新邮箱" />
      <input id="confirm-email" type="email" placeholder="确认新邮箱" />
      <button type="button" class="apply-password-email-btn">应用修改</button>
    </div>
    <div class="password-email-status" style="margin-top:10px; min-height:20px; color:#555;"></div>
  `;

  card.querySelector(".apply-password-email-btn").addEventListener("click", applyPasswordEmailChange);

  return card;
}

function getSelectedClubIds(title) {
  return [...document.querySelectorAll(`input[name="${title}"]:checked`)].map((i) => Number(i.value));
}

function getClubMemberState(clubId) {
  if (!clubMemberState[clubId]) {
    clubMemberState[clubId] = { members: [] };
  }
  return clubMemberState[clubId];
}

function loadClubMembers(card) {
  const clubId = getSelectedClubIds("管理的社团（必须 1 个）")[0];
  if (!clubId) {
    alert("请先选择一个管理社团");
    return;
  }

  const state = getClubMemberState(clubId);
  const control = card.querySelector(".member-control");
  control.style.display = "flex";
  updateMemberList(card, state);
}

function addClubMember(card) {
  const clubId = getSelectedClubIds("管理的社团（必须 1 个）")[0];
  if (!clubId) {
    alert("请先选择一个管理社团");
    return;
  }

  const input = card.querySelector(".member-email-input");
  const email = input.value.trim();
  if (!email || !email.includes("@")) {
    alert("请输入有效成员邮箱");
    return;
  }

  const state = getClubMemberState(clubId);
  if (!state.members.includes(email)) {
    state.members.push(email);
    input.value = "";
    updateMemberList(card, state);
  } else {
    alert("该成员邮箱已存在列表中");
  }
}

function removeClubMember(card) {
  const clubId = getSelectedClubIds("管理的社团（必须 1 个）")[0];
  if (!clubId) {
    alert("请先选择一个管理社团");
    return;
  }

  const input = card.querySelector(".remove-member-email-input");
  const email = input.value.trim();
  if (!email) {
    alert("请输入要移除的成员邮箱");
    return;
  }

  const state = getClubMemberState(clubId);
  const index = state.members.indexOf(email);
  if (index >= 0) {
    state.members.splice(index, 1);
    input.value = "";
    updateMemberList(card, state);
  } else {
    alert("列表中没有该成员邮箱");
  }
}

function updateMemberList(card, state) {
  const list = card.querySelector(".member-list");
  if (!state.members.length) {
    list.textContent = "当前社团成员为空，您可以添加成员邮箱。";
    return;
  }

  list.textContent = "当前社团成员：\n" + state.members.map((email, index) => `${index + 1}. ${email}`).join("\n");
}

async function loadClubInfo(card) {
  const clubId = getSelectedClubIds("管理的社团（必须 1 个）")[0];
  if (!clubId) {
    alert("请先选择一个管理社团");
    return;
  }

  const infoForm = card.querySelector(".club-info-form");
  const status = card.querySelector(".club-info-status");
  status.textContent = "正在加载社团信息...";

  try {
    const res = await fetch(`/api/club/id/${clubId}`);
    const result = await res.json();
    const club = result.data;

    if (!club) {
      throw new Error("未找到社团信息");
    }

    card._loadedClub = club;
    infoForm.style.display = "flex";
    card.querySelector(".club-name").value = club.clubName || "";
    card.querySelector(".club-name-en").value = club.clubNameEn || "";
    card.querySelector(".club-short-desc").value = club.sortDescription || "";
    card.querySelector(".club-description").value = club.clubDescription || "";
    status.textContent = "已加载社团信息，可修改后保存。";
  } catch (err) {
    console.error(err);
    status.textContent = "加载社团信息失败，请稍后重试。";
  }
}

async function saveClubInfo(card) {
  const clubId = getSelectedClubIds("管理的社团（必须 1 个）")[0];
  if (!clubId) {
    alert("请先选择一个管理社团");
    return;
  }

  const loadedClub = card._loadedClub || {};
  const name = card.querySelector(".club-name").value.trim();
  const nameEn = card.querySelector(".club-name-en").value.trim();
  const shortDesc = card.querySelector(".club-short-desc").value.trim();
  const description = card.querySelector(".club-description").value.trim();
  const status = card.querySelector(".club-info-status");

  if (!name || !nameEn || !shortDesc || !description) {
    alert("请填写所有社团信息字段");
    return;
  }

  const payload = {
    clubId: loadedClub.clubId || Number(clubId),
    clubName: name,
    clubNameEn: nameEn,
    clubItem: loadedClub.clubItem || "",
    president: loadedClub.president || "",
    presidentEn: loadedClub.presidentEn || "",
    vicePresident: loadedClub.vicePresident || "",
    vicePresidentEn: loadedClub.vicePresidentEn || "",
    teacher: loadedClub.teacher || "",
    teacherEn: loadedClub.teacherEn || "",
    clubClass: loadedClub.clubClass || "",
    sortDescription: shortDesc,
    clubDescription: description,
    clubDescriptionEn: loadedClub.clubDescriptionEn || "",
    sortDescriptionEn: loadedClub.sortDescriptionEn || "",
    isGreatClub: loadedClub.isGreatClub || false,
    clubURL: loadedClub.clubURL || "",
    video: loadedClub.video || "",
    videoLike: loadedClub.videoLike || 0,
  };

  try {
    const res = await fetch(`/api/club/${clubId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();

    if (res.ok) {
      status.textContent = "社团信息更新成功。";
      return result.data;
    }

    status.textContent = result.message || "更新失败，请检查输入。";
  } catch (err) {
    console.error(err);
    status.textContent = "社团信息保存失败，请稍后重试。";
  }
}

function applyPasswordEmailChange() {
  const newPassword = document.getElementById("new-password").value.trim();
  const confirmPassword = document.getElementById("confirm-password").value.trim();
  const newEmail = document.getElementById("new-email").value.trim();
  const confirmEmail = document.getElementById("confirm-email").value.trim();
  const status = document.querySelector(".password-email-status");

  if (!newPassword && !newEmail) {
    alert("请输入要修改的新密码或新邮箱");
    return;
  }

  if (newPassword) {
    if (newPassword !== confirmPassword) {
      alert("两次输入的密码不一致");
      return;
    }
    document.getElementById("password").value = newPassword;
  }

  if (newEmail) {
    if (newEmail !== confirmEmail) {
      alert("两次输入的邮箱不一致");
      return;
    }
    document.getElementById("email").value = newEmail;
  }

  status.textContent = "密码/邮箱修改已应用到主表单，可继续提交。";
}

/** 创建带 club 列表的卡片 */
function buildClubCard(title, singleSelect) {
  const card = document.createElement("div");
  card.className = "card";

  let html = `<h4>${title}</h4><div class="club-list">`;

  clubs.forEach((c) => {
    html += `
        <div class="club-item">
            <img class="club-img" src="${c.clubItem}" />
            <div class="club-text">
                <span class="club-cn">${c.clubName}</span>
                <span class="club-en">${c.clubNameEn}</span>
            </div>
            <input type="${singleSelect ? "radio" : "checkbox"}"
                   name="${title}"
                   value="${c.id}"
                   style="margin-left:auto; transform:scale(1.3);" />
        </div>
    `;
  });

  html += "</div>";
  card.innerHTML = html;

  return card;
}
