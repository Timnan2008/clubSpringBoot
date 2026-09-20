// ============================================================
// ibm-background.js —— 首页/404 页的「玻璃卡片视差矩阵」背景（gyhchang-cell 写的）
//
// 效果：在 .bg-viewport 里铺 15 张写着 QPWFL 的玻璃卡片，分 5 层（lv1~lv5）随机漂浮，
//       鼠标移动时整个舞台跟着轻微旋转，做出景深感。
// 用法：页面里放一个 <div class="bg-viewport"></div> 再引入本文件即可（样式在 index_style.css）。
// ============================================================
(function () {
  var viewport = document.querySelector('.bg-viewport');
  // 页面上没有这个容器就直接不做事（比如其它页面引到了这个脚本）
  if (!viewport) return;

  // Create inner stage for parallax rotation
  var stage = document.createElement('div');
  stage.className = 'bg-stage';
  viewport.appendChild(stage);

  // 每张卡片的位置：t=上下位置(vh)、l=左右位置(vw)、layer=第几层（决定大小/模糊）
  var positions = [
    { t: 75, l: 5, layer: 'lv1' }, { t: 85, l: 45, layer: 'lv1' }, { t: 95, l: 85, layer: 'lv1' },
    { t: 55, l: -5, layer: 'lv2' }, { t: 65, l: 35, layer: 'lv2' }, { t: 45, l: 75, layer: 'lv2' },
    { t: 30, l: 15, layer: 'lv3' }, { t: 40, l: 55, layer: 'lv3' }, { t: 15, l: -10, layer: 'lv3' },
    { t: 10, l: 10, layer: 'lv4' }, { t: 20, l: 50, layer: 'lv4' }, { t: 30, l: 90, layer: 'lv4' },
    { t: -15, l: 20, layer: 'lv5' }, { t: -20, l: 60, layer: 'lv5' }, { t: -10, l: -20, layer: 'lv5' }
  ];

  // 逐张造卡片：位置、漂浮动画的时长与延迟、以及这只卡片自己的漂移方向 --fx/--fy/--fz
  positions.forEach(function (pos) {
    var wrap = document.createElement('div');
    wrap.className = 'bg-card-wrapper ' + pos.layer;
    wrap.style.top = pos.t + 'vh';
    wrap.style.left = pos.l + 'vw';
    wrap.style.animationDuration = (5 + Math.random() * 4).toFixed(2) + 's';
    wrap.style.animationDelay = '-' + (Math.random() * 10).toFixed(2) + 's';
    wrap.style.setProperty('--fx', ((Math.random() - 0.5) * 24).toFixed(1) + 'px');
    wrap.style.setProperty('--fy', (-8 - Math.random() * 20).toFixed(1) + 'px');
    wrap.style.setProperty('--fz', (8 + Math.random() * 30).toFixed(1) + 'px');
    wrap.innerHTML = '<div class="bg-card"><div class="bg-text">QPWFL</div></div>';
    stage.appendChild(wrap);
  });

  // Mouse parallax tracking
  document.addEventListener('mousemove', function (e) {
    var xAxis = (window.innerWidth / 2 - e.pageX) / 45;
    var yAxis = (window.innerHeight / 2 - e.pageY) / 45;
    stage.style.transform = 'rotateY(' + xAxis + 'deg) rotateX(' + yAxis + 'deg)';
  });
})();
