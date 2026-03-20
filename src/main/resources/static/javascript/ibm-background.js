// ibm-background.js — Ultra-Glass Parallax Matrix
// Shared by index page (.bg-viewport) and 404 page (.bg-viewport)
(function () {
  var viewport = document.querySelector('.bg-viewport');
  if (!viewport) return;

  // Create inner stage for parallax rotation
  var stage = document.createElement('div');
  stage.className = 'bg-stage';
  viewport.appendChild(stage);

  var positions = [
    { t: 75, l: 5, layer: 'lv1' }, { t: 85, l: 45, layer: 'lv1' }, { t: 95, l: 85, layer: 'lv1' },
    { t: 55, l: -5, layer: 'lv2' }, { t: 65, l: 35, layer: 'lv2' }, { t: 45, l: 75, layer: 'lv2' },
    { t: 30, l: 15, layer: 'lv3' }, { t: 40, l: 55, layer: 'lv3' }, { t: 15, l: -10, layer: 'lv3' },
    { t: 10, l: 10, layer: 'lv4' }, { t: 20, l: 50, layer: 'lv4' }, { t: 30, l: 90, layer: 'lv4' },
    { t: -15, l: 20, layer: 'lv5' }, { t: -20, l: 60, layer: 'lv5' }, { t: -10, l: -20, layer: 'lv5' }
  ];

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
