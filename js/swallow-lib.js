/* ============================================================
 *  SwallowLib — 真实 SVG 飞燕（本地化，无 CDN 依赖）
 *  ------------------------------------------------------------
 *  来源：skill-curtain-branch-swallow（p5-animation）的 swallow.js
 *  改造点：
 *   1. 3 个飞燕 SVG 已内联为字符串常量 → 离线 / file:// 直接可用
 *   2. 改用 p5 实例模式（this.p.*），可在任意画布尺寸飞行
 *   3. 颜色通过内嵌 fill 实现，默认墨色 #2B2723（适配暖白底）
 *   4. 新增 hover 模式：飞到目标点后悬停（供页脚“飞燕衔信”使用）
 *
 *  Kimi 定制时只看这一层：BIRD_SVG_* 改素材、DEFAULTS 改量/色/速。
 * ============================================================ */
window.SwallowLib = (function () {
  'use strict';

  // ---- 飞燕素材（原始 SVG，含 <style>，运行时会被剥离并内嵌 fill）----
  const BIRD_SVG_BODY = '<?xml version="1.0" encoding="UTF-8"?><svg id="_图层_2" data-name="图层 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16.68 68.51"><defs><style>.cls-1{fill:#000000;}</style></defs><g id="_图层_1-2" data-name="图层 1"><polygon class="cls-1" points="8.51 0 0 14.83 8.95 68.51 16.68 14.9 8.51 0"/></g></svg>';
  const BIRD_SVG_WING_L = '<?xml version="1.0" encoding="UTF-8"?><svg id="_图层_2" data-name="图层 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66.33 28.04"><defs><style>.cls-1{fill:#000000;}</style></defs><g id="_图层_1-2" data-name="图层 1"><path class="cls-1" d="M66.33,0v12.5c-25.58,0-48.87,5.89-66.33,15.54C13.74,11.21,38.3,0,66.33,0Z"/></g></svg>';
  const BIRD_SVG_WING_R = '<?xml version="1.0" encoding="UTF-8"?><svg id="_图层_2" data-name="图层 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66.33 28.04"><defs><style>.cls-1{fill:#000000;}</style></defs><g id="_图层_1-2" data-name="图层 1"><path class="cls-1" d="M66.33,28.04C48.86,18.39,25.57,12.5,0,12.5V0c28.03,0,52.59,11.21,66.33,28.04Z"/></g></svg>';

  // 素材显式像素尺寸（与 SVG viewBox 对应）
  const BIRD_BODY_W = 17, BIRD_BODY_H = 69;
  const BIRD_WING_W = 66, BIRD_WING_H = 28;

  // ---- 默认参数（Hero / 页脚各自覆盖）----
  const DEFAULTS = {
    // 群
    flockSize: 14,
    flightDurMin: 2800, flightDurMax: 4200,
    staggerSpan: 1000,
    // 弧线
    arcBow: 0.30, arcJitter: 0.10,
    easePower: 2.8,
    // 入场方向 / 位置（左外或右外）
    entrySide: 'right', entryXMin: 30, entryXMax: 320,
    // 退场（画布左侧外）
    exitXMin: -420, exitXMax: -60,
    // 外观
    scale: 1.3, scaleJitter: 0.22,
    wingFlapSpeed: 0.22, wingScaleMin: 0.20,
    color: '#000000', tailColor: '#000000',
    // 叉尾（Verlet 物理）
    tailHalfW: 0.5, tailCount: 12, tailLen: 90,
    tailSpread: 8, tailDamping: 0.94, tailIters: 5, tailRootTransfer: 0.3,
    // hover（页脚用）
    hover: false, hoverAngle: null,   // hoverAngle 单位弧度，null=用飞行朝向
    hoverXRatio: 0.55, hoverYRatio: 0.32,
    // 节奏
    startDelay: 600, loopInterval: 4000,
  };

  // ---- SVG → p5.Image（fill 直接内嵌行内，绕过 CSS）----
  function makeBirdImage(p, svgText, fillHex, w, h) {
    const colored = svgText.replace(
      /(<(?:path|polygon|circle|ellipse|rect|polyline|line)\s)/gi,
      '$1fill="' + fillHex + '" '
    );
    const blob = new Blob([colored], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const p5img = p.createImage(w, h);
    const native = new Image();
    return new Promise((resolve, reject) => {
      native.onload = () => {
        p5img.drawingContext.drawImage(native, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(p5img);
      };
      native.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
      native.src = url;
    });
  }

  async function buildBirdImages(p, fillHex) {
    const [body, wingL, wingR] = await Promise.all([
      makeBirdImage(p, BIRD_SVG_BODY, fillHex, BIRD_BODY_W, BIRD_BODY_H),
      makeBirdImage(p, BIRD_SVG_WING_L, fillHex, BIRD_WING_W, BIRD_WING_H),
      makeBirdImage(p, BIRD_SVG_WING_R, fillHex, BIRD_WING_W, BIRD_WING_H),
    ]);
    return { body, wingL, wingR };
  }

  // ============================================================
  //  SwallowBird — 单只飞燕
  // ============================================================
  class SwallowBird {
    constructor(p, w, h, index, total, cfg) {
      this.p = p;
      const c = Object.assign({}, DEFAULTS, cfg || {});
      this.c = c;
      this.w = w; this.h = h;

      // 入场：画布右侧外或左侧外
      this.startX = (c.entrySide === 'left')
        ? -p.random(c.entryXMin, c.entryXMax)
        : w + p.random(c.entryXMin, c.entryXMax);
      this.startY = p.random(60, Math.max(80, h - 60));

      // 退场 / hover 目标
      if (c.hover) {
        this.exitX = w * c.hoverXRatio;
        this.exitY = h * c.hoverYRatio;
      } else {
        this.exitX = p.random(c.exitXMin, c.exitXMax);
        this.exitY = p.random(60, Math.max(80, h - 60));
      }

      // 贝塞尔控制点（弧线）
      const mx = (this.startX + this.exitX) / 2;
      const my = (this.startY + this.exitY) / 2;
      const dx = this.exitX - this.startX;
      const dy = this.exitY - this.startY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const perpX = dy / dist, perpY = -dx / dist;
      const bow = dist * (c.arcBow + p.random(-c.arcJitter, c.arcJitter));
      this.cpX = mx + perpX * bow + p.random(-50, 50);
      this.cpY = my + perpY * bow + p.random(-50, 50);

      // 时间
      const span = Math.max(total - 1, 1);
      this.startDelay = (index / span) * c.staggerSpan;
      this.flightDuration = p.random(c.flightDurMin, c.flightDurMax);
      this.birthTime = 0;

      // 状态
      this.x = this.startX; this.y = this.startY;
      this.prevX = this.x; this.prevY = this.y;
      this.opacity = 0; this.done = false; this.arrived = false;

      // 翅膀
      this.wingPhase = p.random(p.TWO_PI);
      this.wingTime = p.random(p.TWO_PI);

      // 缩放
      this.scale = c.scale * p.random(1 - c.scaleJitter, 1 + c.scaleJitter);

      // 素材尺寸
      this._bodyW = BIRD_BODY_W; this._bodyH = BIRD_BODY_H;
      this._wingLW = BIRD_WING_W; this._wingLH = BIRD_WING_H;
      this._wingRW = BIRD_WING_W; this._wingRH = BIRD_WING_H;

      // 锚点（相对 wingL 左上角原点，1:1 还原结构）
      this._aWingLX = 0; this._aWingLY = 0;
      this._aWingRX = 68; this._aWingRY = 0;
      this._aBodyX = 58; this._aBodyY = -14.5;
      this._aTailX = 67; this._aTailY = 54;

      this._centerX = null; this._centerY = null;

      // Verlet 叉尾
      this._tailL = []; this._tailR = [];
      this._initTail();
    }

    _initTail() {
      const c = this.c, p = this.p;
      const N = c.tailCount, segLen = c.tailLen / (N - 1);
      const ax = this._aTailX, ay = this._aTailY;
      const spread = p.radians(c.tailSpread);
      const angL = p.PI / 2 + spread, angR = p.PI / 2 - spread;
      for (let i = 0; i < N; i++) {
        const d = i * segLen;
        this._tailL.push({ x: ax + Math.cos(angL) * d, y: ay + Math.sin(angL) * d, px: ax + Math.cos(angL) * d, py: ay + Math.sin(angL) * d });
        this._tailR.push({ x: ax + Math.cos(angR) * d, y: ay + Math.sin(angR) * d, px: ax + Math.cos(angR) * d, py: ay + Math.sin(angR) * d });
      }
    }

    _updateTail() {
      const c = this.c, p = this.p;
      const N = c.tailCount, segLen = c.tailLen / (N - 1);
      const damp = c.tailDamping, transfer = c.tailRootTransfer, iters = c.tailIters;
      const ax = this._aTailX, ay = this._aTailY;
      for (const fork of [this._tailL, this._tailR]) {
        const rpx = fork[0].x, rpy = fork[0].y;
        fork[0].px = fork[0].x; fork[0].py = fork[0].y;
        fork[0].x = ax; fork[0].y = ay;
        const rdx = fork[0].x - rpx, rdy = fork[0].y - rpy;
        for (let i = 1; i < N; i++) {
          const pt = fork[i];
          const vx = (pt.x - pt.px) * damp, vy = (pt.y - pt.py) * damp;
          pt.px = pt.x; pt.py = pt.y;
          pt.x += vx + rdx * transfer; pt.y += vy + rdy * transfer;
        }
        for (let it = 0; it < iters; it++) {
          for (let i = 0; i < N - 1; i++) {
            const a = fork[i], b = fork[i + 1];
            let ddx = b.x - a.x, ddy = b.y - a.y;
            const d = Math.sqrt(ddx * ddx + ddy * ddy) || 0.001;
            const corr = (d - segLen) / d * 0.5;
            if (i > 0) { a.x += ddx * corr; a.y += ddy * corr; }
            if (i < N - 2) { b.x -= ddx * corr; b.y -= ddy * corr; }
          }
        }
      }
    }

    _calcCenter() {
      const bW = this._bodyW, bH = this._bodyH;
      const lW = this._wingLW, lH = this._wingLH, rW = this._wingRW, rH = this._wingRH;
      const minX = Math.min(this._aWingLX, this._aWingRX, this._aBodyX);
      const maxX = Math.max(this._aWingLX + lW, this._aWingRX + rW, this._aBodyX + bW);
      const minY = Math.min(this._aWingLY, this._aWingRY, this._aBodyY);
      const maxY = Math.max(this._aWingLY + lH, this._aWingRY + rH, this._aBodyY + bH);
      this._centerX = (minX + maxX) / 2;
      this._centerY = (minY + maxY) / 2;
    }

    update() {
      const p = this.p, c = this.c;
      const elapsed = p.millis() - this.birthTime - this.startDelay;
      if (elapsed < 0) {
        this.opacity = 0; this.prevX = this.x; this.prevY = this.y; this._updateTail();
        return;
      }
      this.opacity = p.constrain(p.map(elapsed, 0, 200, 0, 255), 0, 255);
      const rawT = p.constrain(elapsed / this.flightDuration, 0, 1);
      this.prevX = this.x; this.prevY = this.y;
      if (rawT >= 1) {
        if (c.hover) {
          this.arrived = true;
          this.x = this.exitX;
          this.y = this.exitY + Math.sin(this.wingTime * 1.2) * 6; // 悬停微浮
        } else {
          this.done = true; this.x = this.exitX; this.y = this.exitY;
        }
      } else {
        const t = 1 - Math.pow(1 - rawT, c.easePower);
        const u = 1 - t;
        this.x = u * u * this.startX + 2 * u * t * this.cpX + t * t * this.exitX;
        this.y = u * u * this.startY + 2 * u * t * this.cpY + t * t * this.exitY;
      }
      this.wingTime += c.wingFlapSpeed;
      this._updateTail();
    }

    display(images) {
      const p = this.p;
      if (this.opacity <= 0 || this.done) return;
      if (!images || !images.body || !images.wingL || !images.wingR) return;
      if (this._centerX === null) this._calcCenter();

      p.push();
      p.translate(this.x, this.y);

      // 朝向：hover 到达后用固定角度，否则按位移计算
      const ddx = this.x - this.prevX, ddy = this.y - this.prevY;
      let ang;
      if (this.c.hover && this.arrived && this.c.hoverAngle != null) {
        ang = this.c.hoverAngle;
      } else if (Math.abs(ddx) < 0.01 && Math.abs(ddy) < 0.01) {
        ang = -p.PI / 4;
      } else {
        ang = Math.atan2(ddx, -ddy);
      }
      p.rotate(ang);
      p.translate(-this._centerX, -this._centerY);
      p.scale(this.scale);

      // 翅膀扑动
      const flap = (Math.sin(this.wingTime + this.wingPhase) + 1) / 2;
      const wingSX = p.lerp(this.c.wingScaleMin, 1.0, flap);

      // 右翅
      p.push(); p.translate(this._aWingRX, this._aWingRY); p.scale(wingSX, 1);
      p.tint(255, this.opacity); p.image(images.wingR, 0, 0); p.noTint(); p.pop();
      // 左翅
      p.push(); p.translate(this._aWingLX + this._wingLW, this._aWingLY); p.scale(wingSX, 1);
      p.tint(255, this.opacity); p.image(images.wingL, -this._wingLW, 0); p.noTint(); p.pop();
      // 身体
      p.push(); p.translate(this._aBodyX, this._aBodyY);
      p.tint(255, this.opacity); p.image(images.body, 0, 0); p.noTint(); p.pop();

      // Verlet 叉尾
      const tc = p.color(this.c.tailColor);
      const N = this.c.tailCount;
      p.noStroke();
      for (const fork of [this._tailL, this._tailR]) {
        const normals = [];
        for (let i = 0; i < N; i++) {
          let nx = 0, ny = 0;
          if (i > 0) { let ex = fork[i].x - fork[i - 1].x, ey = fork[i].y - fork[i - 1].y; const dl = Math.sqrt(ex * ex + ey * ey) || 1; nx += -ey / dl; ny += ex / dl; }
          if (i < N - 1) { let ex = fork[i + 1].x - fork[i].x, ey = fork[i + 1].y - fork[i].y; const dl = Math.sqrt(ex * ex + ey * ey) || 1; nx += -ey / dl; ny += ex / dl; }
          const nl = Math.sqrt(nx * nx + ny * ny) || 1;
          normals.push({ x: nx / nl * this.c.tailHalfW, y: ny / nl * this.c.tailHalfW });
        }
        for (let i = 0; i < N - 1; i++) {
          const a1 = this.opacity * (1 - i / (N - 1));
          const a2 = this.opacity * (1 - (i + 1) / (N - 1));
          const p1 = fork[i], n1 = normals[i], p2 = fork[i + 1], n2 = normals[i + 1];
          p.fill(p.red(tc), p.green(tc), p.blue(tc), a1);
          p.beginShape();
          p.vertex(p1.x + n1.x, p1.y + n1.y); p.vertex(p1.x - n1.x, p1.y - n1.y);
          p.fill(p.red(tc), p.green(tc), p.blue(tc), a2);
          p.vertex(p2.x - n2.x, p2.y - n2.y); p.vertex(p2.x + n2.x, p2.y + n2.y);
          p.endShape(p.CLOSE);
        }
      }
      p.pop();
    }
  }

  return { BIRD_SVG_BODY, BIRD_SVG_WING_L, BIRD_SVG_WING_R, buildBirdImages, SwallowBird, DEFAULTS };
})();
