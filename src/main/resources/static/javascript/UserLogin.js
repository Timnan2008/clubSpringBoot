
// 示例社团数据（真实情况从后端获取）
const clubs = await fetch(`/api/club/all`).then(r => r.json()).then(d => d.data);
console.log("clubs: " + clubs)

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

function createMultiClubCard(title) {
return buildClubCard(title, false);
}

function createSingleClubCard(title) {
return buildClubCard(title, true);
}

/** 创建带 club 列表的卡片 */
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
