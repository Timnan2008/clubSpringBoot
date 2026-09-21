
// ============================================================
// UserLogin.js —— 登录/注册页的「按身份动态生成表单」脚本（gyhchang-cell 写的）
//
// 作用：页面上选「学生 / 社长 / 老师」时，下面会现长出不同的社团选择卡片：
//   · 学生：参与社团（多选）
//   · 社长：管理的社团（单选，必须 1 个）+ 参与社团（多选）+ 是否副社长
//   · 老师：负责的社团（多选）
// 说明：这是早期演示版本，现在登录注册页已改用 frontend/auth.jsx（React 版），
//       本文件保留作参考，线上登录页不再引用它。
// ============================================================

// 示例社团数据（真实情况从后端获取）
const clubs = await fetch(`/api/club/all`).then(r => r.json()).then(d => d.data);
console.log("clubs: " + clubs)

/** 身份下拉框变化时调用：清空并重建下面的社团卡片区。 */
function onRoleChange() {
const role = document.getElementById("role").value;
const area = document.getElementById("dynamic-area");
area.innerHTML = ""; // 清空

if (role === "user") {
area.appendChild(createMultiClubCard("参与的社团（可多选）"));
}

if (role === "club-president") {
area.appendChild(createSingleClubCard("管理的社团（必须 1 个）"));
area.appendChild(createMultiClubCard("参与的社团（可多选）"));

// Boolean 副社长选项
const deputyCard = document.createElement("div");
deputyCard.className = "card";
deputyCard.innerHTML = `
        <label>是否为副社长：</label>
        <select>
            <option value="false">否</option>
            <option value="true">是</option>
        </select>
    `;
area.appendChild(deputyCard);
}

if (role === "teacher") {
area.appendChild(createMultiClubCard("负责的社团（可多选）"));
}
}

/** 多选版社团卡片（复选框）。 */
function createMultiClubCard(title) {
return buildClubCard(title, false);
}

/** 单选版社团卡片（单选框）。 */
function createSingleClubCard(title) {
return buildClubCard(title, true);
}

/** 创建带 club 列表的卡片；singleSelect=true 用 radio，否则用 checkbox。 */
function buildClubCard(title, singleSelect) {
const card = document.createElement("div");
card.className = "card";

let html = `<h4>${title}</h4><div class="club-list">`;

clubs.forEach(c => {
html += `
        <div class="club-item">
            <img class="club-img" src="${c.clubItem}"/>
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
