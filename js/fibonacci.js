/* ============================================
   斐波那契黑框 + 红燕飞行（首页 Hero）
   纯 SVG + requestAnimationFrame，无外部依赖
   阶段：黑框淡入 → 螺旋绘制 → 红燕沿螺旋飞行
   ============================================ */
(function () {
  'use strict';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var frame = document.getElementById('fibFrame');
  var path = document.getElementById('fibPath');
  var fly = document.getElementById('swallowFly');
  if (!frame || !path || !fly) return;

  var cx = 500, cy = 500;

  /* --- 1. 斐波那契黑框（外框 + 黄金分割线 + 对角） --- */
  function rect(x, y, w, h, wbar) {
    var r = document.createElementNS(SVGNS, 'rect');
    r.setAttribute('x', x); r.setAttribute('y', y);
    r.setAttribute('width', w); r.setAttribute('height', h);
    r.setAttribute('fill', 'none');
    r.setAttribute('stroke', '#000000');
    r.setAttribute('stroke-width', wbar || 3);
    r.setAttribute('rx', 4);
    return r;
  }
  function line(x1, y1, x2, y2) {
    var l = document.createElementNS(SVGNS, 'line');
    l.setAttribute('x1', x1); l.setAttribute('y1', y1);
    l.setAttribute('x2', x2); l.setAttribute('y2', y2);
    l.setAttribute('stroke', '#000000');
    l.setAttribute('stroke-width', 1.4);
    l.setAttribute('opacity', 0.55);
    return l;
  }
  var S = 680, ox = cx - S / 2, oy = cy - S / 2;
  frame.appendChild(rect(ox, oy, S, S, 3.5));           // 外框
  var gv = ox + S * 0.382, gh = oy + S * 0.382;         // 黄金分割
  frame.appendChild(line(gv, oy, gv, oy + S));
  frame.appendChild(line(ox, gh, ox + S, gh));
  frame.appendChild(line(ox, oy, ox + S, oy + S));       // 对角
  // 内嵌旋转方块，强化"斐波那契方块"意象
  frame.appendChild(rect(ox + S * 0.18, oy + S * 0.18, S * 0.64, S * 0.64, 1.2));

  /* --- 2. 斐波那契螺旋曲线（对数螺旋近似） --- */
  var pts = [];
  var N = 420;
  for (var i = 0; i <= N; i++) {
    var t = i / N;
    var ang = t * Math.PI * 4.2;        // 约 2 圈
    var r = 28 + t * (S / 2 - 30);      // 由内到外
    pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
  }
  var d = 'M ' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
  for (var k = 1; k < pts.length; k++) {
    d += ' L ' + pts[k][0].toFixed(1) + ' ' + pts[k][1].toFixed(1);
  }
  path.setAttribute('d', d);

  /* --- 3. 红燕沿螺旋飞行（rAF） --- */
  var prog = 0;
  function tick() {
    prog += 0.0016;
    if (prog > 1) prog = 0;
    var idx = prog * (pts.length - 1);
    var i0 = Math.floor(idx);
    var i1 = Math.min(i0 + 1, pts.length - 1);
    var f = idx - i0;
    var x = pts[i0][0] + (pts[i1][0] - pts[i0][0]) * f;
    var y = pts[i0][1] + (pts[i1][1] - pts[i0][1]) * f;
    var dx = pts[i1][0] - pts[i0][0];
    var dy = pts[i1][1] - pts[i0][1];
    var ang = Math.atan2(dy, dx) * 180 / Math.PI;
    fly.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')');
    requestAnimationFrame(tick);
  }
  tick();
})();
