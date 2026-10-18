/* ============================================
 *  飞燕 Hero — 真实 SVG 素材群飞 + 名字淡入
 *  依赖：js/swallow-lib.js（window.SwallowLib）
 * ============================================ */
(function initSwallowHero() {
  var canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof p5 === 'undefined' || !window.SwallowLib) return;

  var sketch = function (p) {
    var birds = [];
    var images = null;
    var ready = false;
    var startTime = 0;
    var nameRevealed = false;
    var lastSpawn = 0;

    // Hero 参数（覆盖 DEFAULTS）
    var HERO_CFG = {
      flockSize: 14,
      scale: 1.3,
      scaleJitter: 0.25,
      color: '#2B2723',
      tailColor: '#2B2723',
      flightDurMin: 3200, flightDurMax: 4600,
      staggerSpan: 1100,
      arcBow: 0.32,
      startDelay: 500,
      loopInterval: 3800,
    };

    function spawn() {
      birds = [];
      var N = HERO_CFG.flockSize;
      for (var i = 0; i < N; i++) {
        var b = new SwallowLib.SwallowBird(p, p.width, p.height, i, N, HERO_CFG);
        b.birthTime = p.millis();
        birds.push(b);
      }
      lastSpawn = p.millis();
    }

    p.setup = async function () {
      var w = canvas.offsetWidth || window.innerWidth;
      var h = canvas.offsetHeight || window.innerHeight;
      p.createCanvas(w, h).parent('hero-canvas');
      images = await SwallowLib.buildBirdImages(p, HERO_CFG.color);
      ready = true;
      startTime = p.millis();
      spawn();
    };

    p.draw = function () {
      p.clear();
      if (!ready) return;

      var now = p.millis();

      // 名字淡入（首群起飞后触发一次）
      if (!nameRevealed && now - startTime > 800) {
        nameRevealed = true;
        var heroContent = document.querySelector('.hero-content');
        if (heroContent) heroContent.classList.add('visible');
      }

      for (var i = 0; i < birds.length; i++) {
        birds[i].update();
        birds[i].display(images);
      }

      // 群飞循环：全部飞完后等待间隔再起飞一群
      if (birds.length && birds.every(function (b) { return b.done; })) {
        if (now - lastSpawn > HERO_CFG.loopInterval) spawn();
      }
    };

    p.windowResized = function () {
      var w = canvas.offsetWidth || window.innerWidth;
      var h = canvas.offsetHeight || window.innerHeight;
      p.resizeCanvas(w, h);
    };
  };

  new p5(sketch);
})();
