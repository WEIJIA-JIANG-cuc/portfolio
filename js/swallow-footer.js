/* ============================================
 *  飞燕衔信 页脚 — 真实素材飞燕飞入 + 信封
 *  依赖：js/swallow-lib.js（window.SwallowLib）
 * ============================================ */
(function initSwallowFooter() {
  var canvas = document.getElementById('footer-canvas');
  if (!canvas || typeof p5 === 'undefined' || !window.SwallowLib) return;

  var sketch = function (p) {
    var bird = null;
    var images = null;
    var ready = false;
    var startTime = 0;
    var envScale = 0;          // 信封缩放淡入

    // 页脚参数：单只、从左侧飞入、到右侧悬停、朝右衔信
    var FOOT_CFG = {
      flockSize: 1,
      scale: 1.7,
      scaleJitter: 0,
      color: '#2B2723',
      tailColor: '#2B2723',
      entrySide: 'left',
      entryXMin: 60, entryXMax: 160,
      flightDurMin: 2600, flightDurMax: 2600,
      staggerSpan: 0,
      arcBow: 0.18,
      hover: true,
      hoverAngle: Math.PI / 2,   // 头朝右，衔信在右侧
      hoverXRatio: 0.52,
      hoverYRatio: 0.34,
    };

    p.setup = async function () {
      var w = canvas.offsetWidth || window.innerWidth;
      var h = canvas.offsetHeight || 320;
      p.createCanvas(w, h).parent('footer-canvas');
      images = await SwallowLib.buildBirdImages(p, FOOT_CFG.color);
      ready = true;
      startTime = p.millis();
      bird = new SwallowLib.SwallowBird(p, w, h, 0, 1, FOOT_CFG);
      bird.birthTime = p.millis();
    };

    function drawEnvelope() {
      if (envScale <= 0.02) return;
      var s = bird.scale;
      var ex = bird.x + 20 * s;
      var ey = bird.y + 2 * s;
      p.push();
      p.translate(ex, ey);
      p.scale(envScale);
      p.rectMode(p.CENTER);
      // 信封主体
      p.fill(255, 250, 245);
      p.stroke(194, 112, 61, 140);
      p.strokeWeight(1);
      p.rect(0, 0, 38, 26, 3);
      // 封口三角
      p.noStroke();
      p.fill(194, 112, 61, 50);
      p.triangle(-19, -13, 19, -13, 0, 1);
      // 底线
      p.stroke(194, 112, 61, 90);
      p.line(-19, 0, 19, 0);
      p.pop();
    }

    p.draw = function () {
      p.clear();
      if (!ready || !bird) return;

      bird.update();
      bird.display(images);

      if (bird.arrived) {
        if (envScale < 1) envScale = Math.min(1, envScale + 0.04);
        drawEnvelope();
      }
    };

    p.windowResized = function () {
      var w = canvas.offsetWidth || window.innerWidth;
      var h = canvas.offsetHeight || 320;
      p.resizeCanvas(w, h);
    };
  };

  new p5(sketch);
})();
