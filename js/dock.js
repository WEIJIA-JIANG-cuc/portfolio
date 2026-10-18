/* ============================================
   Dock 导航 — macOS 风格 hover 放大镜放大
   ============================================ */
(function () {
  'use strict';
  var dock = document.querySelector('.dock');
  if (!dock) return;

  var items = Array.prototype.slice.call(dock.querySelectorAll('.dock-item'));
  if (!items.length) return;

  function update(e) {
    var mx = e.clientX;
    items.forEach(function (it) {
      var r = it.getBoundingClientRect();
      var center = r.left + r.width / 2;
      var dist = Math.abs(mx - center);
      var scale = Math.max(1, 1.75 - dist / 150);
      it.style.transform = 'scale(' + scale.toFixed(3) + ')';
    });
  }

  function reset() {
    items.forEach(function (it) { it.style.transform = 'scale(1)'; });
  }

  dock.addEventListener('mousemove', update);
  dock.addEventListener('mouseleave', reset);
})();
