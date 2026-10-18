/* ════════════════════════════════════════════════════
   TrueFocus 导航交互 — 全站共享
   悬停聚焦当前词 + 四角框平滑移动到该词
   依赖结构见 css/tf-nav.css
   ════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var container = document.getElementById('tfContainer');
  if (!container) return;
  var frame = document.getElementById('tfFrame');
  if (!frame) return;
  var words = Array.prototype.slice.call(container.querySelectorAll('.tf-word'));

  function moveFrame(word) {
    var cr = container.getBoundingClientRect();
    var r = word.getBoundingClientRect();
    frame.style.left = (r.left - cr.left) + 'px';
    frame.style.top = (r.top - cr.top) + 'px';
    frame.style.width = r.width + 'px';
    frame.style.height = r.height + 'px';
    frame.classList.add('show');
  }
  function focus(word) {
    words.forEach(function (w) { w.classList.toggle('on', w === word); });
    moveFrame(word);
  }
  function blur() {
    // 离开导航时:有当前页(.on)就回到当前页聚焦,否则全部弱化
    if (current) focus(current);
    else { words.forEach(function (w) { w.classList.remove('on'); });
           frame.classList.remove('show'); }
  }
  // 进入页面:如果有 .on 标记的当前页,默认聚焦它(4 角框落在当前词上,给访问者"这是导航"的提示)
  var current = words.find(function (w) { return w.classList.contains('on'); });
  if (current) {
    requestAnimationFrame(function () { focus(current); });
  }
  words.forEach(function (w) {
    w.addEventListener('mouseenter', function () { focus(w); });
  });
  container.addEventListener('mouseleave', blur);
})();
