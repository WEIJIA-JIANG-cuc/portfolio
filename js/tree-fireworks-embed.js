/* ============================================================
 *  树上花火 · 内嵌版（p5 实例模式）
 *  ------------------------------------------------------------
 *  从 tree-fireworks.html 的全局模式改造而来，可直接嵌入
 *  vibecoding.html 页面，无需 iframe。
 *
 *  用法：在页面中放 <div id="tree-fireworks-canvas"></div>，
 *        然后加载本脚本（需先加载 p5.js 库）。
 * ============================================================ */

(function () {
  'use strict';

  const SEED = 20260803;
  const BASE_Y = 800;

  const F = { curve: false, weed: true, small: true };
  const TWEAK = { bright: true, airy: true, focus: false };

  // 炸开物理
  const BURST_MIN = 16.0;
  const BURST_MAX = 28.0;
  const GRAVITY = 0.78;
  const DRAG = 0.955;
  const BURST_DUR = 3;
  const MAX_DELAY = 2;
  const GLOW_W = 3.2;
  const GLOW_A = 22;

  let plants = [];
  let smallPlants = [];
  let fillers = [];
  let weeds = [];

  // ---- 辅助函数 ----
  function lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * t;
  }

  function makeStemColor(p, depth) {
    let h = p.random(70, 95);
    let s = p.random(16, 30);
    let b = p.lerp(58, 44, depth);
    let a = p.lerp(58, 90, depth);
    return p.color(h, s, b, a);
  }

  function drawFiller(p, f) {
    p.stroke(f.c);
    p.strokeWeight(f.w);
    p.noFill();
    p.beginShape();
    p.vertex(f.x, f.baseY);
    p.quadraticVertex(f.x + f.curve * 0.6, (f.baseY + f.topY) / 2, f.x + f.curve, f.topY);
    p.endShape();
  }

  function drawWeed(p, w) {
    p.stroke(w.c);
    p.strokeWeight(w.w);
    p.noFill();
    p.beginShape();
    p.vertex(w.x, w.baseY);
    let midX = w.x + w.bend * 0.5;
    let midY = (w.baseY + w.tipY) / 2 + p.random(-5, 5);
    p.quadraticVertex(midX, midY, w.tipX, w.tipY);
    p.endShape();
    for (let fk of w.forks) {
      let fx = p.lerp(w.x, w.tipX, fk.t) + w.bend * fk.t * (1 - fk.t);
      let fy = p.lerp(w.baseY, w.tipY, fk.t);
      p.stroke(w.c);
      p.strokeWeight(w.w * 0.7);
      p.line(fx, fy, fx + fk.dx, fy - fk.dy);
    }
  }

  // ---- Plant 类 ----
  class Plant {
    constructor(p, x, y, h, scale, tier, depth, layer) {
      this.p = p;
      this.base = p.createVector(x, y);
      this.h = h;
      this.scale = scale;
      this.tier = tier;
      this.layer = layer;
      this.faded = layer === 0;
      this.swayOffset = p.random(1000);
      this.top = p.createVector(x, y - h);
      this.dir = (x - p.width / 2) >= 0 ? 1 : -1;
      this.stemCol = makeStemColor(p, depth);
      if (this.faded) {
        this.stemCol = p.color(p.hue(this.stemCol), p.saturation(this.stemCol) * 0.65, p.brightness(this.stemCol) + 14, p.alpha(this.stemCol) * 0.5);
      }
      this.coreColor = p.color(p.random(72, 92), p.random(20, 34), p.random(58, 76), this.faded ? 6 : 10);
      this.stemCurve = this.dir * p.random(10, 34) * scale + p.random(-7, 7) * scale;
      this.exploded = false;
      this.staticScene = false;
      this.regrowTimer = 0;
      this.flash = 0;
      this.wiggle = 0;
      this.filaments = [];
      this.buildFilaments(p);
    }
    buildFilaments(p) {
      this.filaments = [];
      let density = (this.tier === 2) ? 1.2 : 1.0;
      let fc = Math.floor(p.random(80, 120) * this.scale * density);
      for (let i = 0; i < fc; i++) this.filaments.push(new Filament(p, this.top, this.scale, this.tier, this.faded));
    }
    explode() {
      this.exploded = true;
      this.flash = 1;
      for (let f of this.filaments) {
        f.pending = true;
        f.pendingTimer = 0;
        f.delay = this.p.random(0, MAX_DELAY);
      }
    }
    update(p) {
      this.wiggle *= 0.90;
      let wind = p.map(p.noise(p.frameCount * 0.005 + this.swayOffset), 0, 1, -10, 10) * this.scale;
      let wig = Math.sin(p.frameCount * 0.3 + this.swayOffset) * this.wiggle * 20 * this.scale;
      this.top.x = this.base.x + wind + wig;
      this.top.y = this.base.y - this.h;
      if (this.flash > 0) this.flash -= 0.035;
      if (!this.staticScene) for (let f of this.filaments) f.update(p, this.top);
    }
    displayStem(p) {
      p.stroke(this.stemCol);
      p.noFill();
      p.strokeWeight(2.2 * this.scale);
      p.beginShape();
      p.vertex(this.base.x, this.base.y);
      p.quadraticVertex(this.base.x + this.stemCurve, this.base.y - this.h * 0.5, this.top.x, this.top.y);
      p.endShape();
    }
    displayCrown(p) {
      if (this.staticScene) {
        p.noStroke();
        p.fill(0, 0, 62, this.faded ? 50 : 60);
        p.ellipse(this.top.x, this.top.y, 8 * this.scale, 8 * this.scale);
        return;
      }
      if (this.flash > 0) {
        let r = (1 - this.flash) * 60 * this.scale + 8;
        p.noFill();
        p.stroke(85, 18, 96, this.flash * 28);
        p.strokeWeight(2 * this.scale);
        p.ellipse(this.top.x, this.top.y, r * 2, r * 2);
      }
      p.noStroke();
      p.fill(this.coreColor);
      p.ellipse(this.top.x, this.top.y, 88 * this.scale, 80 * this.scale);
      p.noStroke();
      p.fill(70, 26, this.faded ? 40 : 24);
      p.ellipse(this.top.x, this.top.y, 7 * this.scale, 5 * this.scale);
      if (!this.exploded) {
        for (let k = 0; k < 4; k++) {
          let a = p.random(p.TWO_PI);
          let o = p5.Vector.fromAngle(a).mult(40 * this.scale).add(this.top);
          let len = p.random(150, 210) * this.scale;
          p.stroke(80, 22, 92, this.faded ? 16 : 30);
          p.strokeWeight(1.1 * this.scale); p.noFill();
          let end = p5.Vector.fromAngle(a).mult(len).add(o);
          let mid = p5.Vector.lerp(o, end, 0.5);
          let perp = p5.Vector.fromAngle(a + p.HALF_PI).mult(len * 0.12);
          let cp = p5.Vector.add(mid, perp);
          p.beginShape();
          p.vertex(o.x, o.y);
          p.quadraticVertex(cp.x, cp.y, end.x, end.y);
          p.endShape();
        }
      }
      for (let f of this.filaments) f.display(p);
    }
  }

  // ---- Filament 类 ----
  class Filament {
    constructor(p, top, scale, tier, faded) {
      this.top = top; this.scale = scale; this.tier = tier; this.faded = faded;
      let a = p.random(p.TWO_PI);
      if (a > p.HALF_PI - 0.16 && a < p.HALF_PI + 0.16) {
        a = (a < p.HALF_PI) ? p.HALF_PI - 0.16 - p.random(0, 0.3) : p.HALF_PI + 0.16 + p.random(0, 0.3);
      }
      this.baseAngle = a;
      let radial = 0.82 + 0.18 * Math.sin(a * 3 + p.random(0, p.TWO_PI));
      if (a > p.HALF_PI - 0.6 && a < p.HALF_PI + 0.6) radial *= 0.8;
      this.length = p.random(72, 132) * radial;
      this.thickness = p.random(0.7, 1.7);
      this.crownOffset = p5.Vector.random2D().mult(p.random(0, 5));
      this.pickColor(p);
      this.sway = p.random(0.01, 0.026);
      this.phase = p.random(1000);
      this.attached = true;
      this.pending = false;
      this.pendingTimer = 0;
      this.delay = 0;
      this.impulse = 0;
      this.burstAge = 0;
      this.pos = p.createVector(0, 0);
      this.vel = p.createVector(0, 0);
      this.acc = p.createVector(0, GRAVITY);
      this.life = 100;
      this.rot = this.baseAngle;
      this.tumbleSpeed = p.random(-0.03, 0.03);
    }
    pickColor(p) {
      let r = p.random();
      let hue, sat, bri;
      if (r < 0.40)      { hue = p.random(72, 86);  sat = p.random(18, 34); bri = p.random(82, 96); }
      else if (r < 0.80) { hue = p.random(82, 100); sat = p.random(28, 48); bri = p.random(56, 74); }
      else if (r < 0.88) { hue = p.random(38, 52);  sat = p.random(36, 54); bri = p.random(66, 84); }
      else if (r < 0.95) { hue = p.random(30, 44);  sat = p.random(40, 58); bri = p.random(62, 78); }
      else if (r < 0.985){ hue = p.random(60, 82);  sat = p.random(24, 44); bri = p.random(44, 62); }
      else               { hue = p.random(14, 28);  sat = p.random(32, 50); bri = p.random(42, 58); }
      let briBoost = this.tier === 0 ? -4 : this.tier === 2 ? 5 : 0;
      let satBoost = this.tier === 0 ? -3 : this.tier === 2 ? 3 : 0;
      if (this.faded) { briBoost += 10; satBoost -= 6; }
      briBoost += 4;
      this.hue = hue;
      this.sat = p.constrain(sat + satBoost, 8, 78);
      this.bri = p.constrain(bri + briBoost, 32, 98);
    }
    detach(p, origin) {
      this.attached = false;
      this.pos = origin.copy();
      let angle = this.baseAngle + p.random(-0.2, 0.2);
      let speed = p.random(BURST_MIN, BURST_MAX);
      this.vel = p5.Vector.fromAngle(angle).mult(speed);
      this.vel.y -= p.random(2.5, 5.5);
      this.rot = angle;
      this.impulse = 1;
    }
    alive() { return this.attached ? true : (this.life > 0); }
    update(p, currentTop) {
      if (this.attached) {
        this.top = currentTop;
        let t = p.frameCount * this.sway + this.phase;
        this.rot = this.baseAngle + Math.sin(t) * 0.08;
        if (this.pending) {
          this.pendingTimer++;
          if (this.pendingTimer > this.delay) {
            let origin = this.top.copy().add(p5.Vector.mult(this.crownOffset, this.scale));
            this.detach(p, origin);
          }
        }
      } else {
        this.vel.add(this.acc);
        let drag = (this.impulse > 0) ? 0.992 : DRAG;
        this.vel.mult(drag);
        this.vel.x += p.map(p.noise(p.frameCount * 0.012 + this.phase), 0, 1, -0.04, 0.04);
        if (this.vel.y < 1.2) this.vel.y += 0.06;
        this.pos.add(this.vel);
        if (this.impulse > 0) this.impulse -= 1.0 / BURST_DUR;
        let targetRot = this.vel.heading();
        this.rot = lerpAngle(this.rot, targetRot, 0.04);
        this.rot += Math.sin(p.frameCount * 0.1 + this.phase) * 0.10 + this.tumbleSpeed;
        this.life -= 2.2;
      }
    }
    display(p) {
      let aAlpha = this.faded ? 55 : 96;
      let alpha = this.attached ? aAlpha : p.map(this.life, 0, 100, 0, aAlpha, true);
      if (alpha <= 0) return;
      let len = this.attached ? this.length : this.length * 0.92;
      let curve, origin;
      if (this.attached) {
        curve = this.length * 0.14;
        origin = this.top.copy().add(p5.Vector.mult(this.crownOffset, this.scale));
      } else {
        curve = p.lerp(this.length * 0.14, this.length * 0.5, p.map(this.life, 100, 0, 0, 1, true));
        origin = this.pos;
      }
      // 柔光外框
      p.stroke(this.hue, this.sat * 0.7, Math.min(this.bri + 10, 100), this.faded ? 14 : GLOW_A);
      p.strokeWeight(this.thickness * GLOW_W); p.noFill();
      this.drawCurve(p, origin, this.rot, len, curve);
      // 主线
      p.stroke(this.hue, this.sat, this.bri, alpha);
      p.strokeWeight(this.thickness); p.noFill();
      this.drawCurve(p, origin, this.rot, len, curve);
    }
    drawCurve(p, origin, angle, len, curve) {
      let end = p5.Vector.fromAngle(angle).mult(len).add(origin);
      let mid = p5.Vector.lerp(origin, end, 0.5);
      let cp;
      if (this.attached) {
        let perpAngle = angle + (Math.cos(angle) >= 0 ? -p.HALF_PI : p.HALF_PI);
        let outward = p5.Vector.fromAngle(perpAngle).mult(curve);
        cp = p5.Vector.add(mid, outward);
      } else {
        cp = p.createVector(mid.x, mid.y + curve);
      }
      p.beginShape();
      p.vertex(origin.x, origin.y);
      p.quadraticVertex(cp.x, cp.y, end.x, end.y);
      p.endShape();
    }
  }

  // ---- p5 实例模式入口 ----
  new p5(function (p) {

    p.setup = function () {
      let cnv = p.createCanvas(540, 900);
      cnv.parent('tree-fireworks-canvas');
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.randomSeed(SEED);
      p.noiseSeed(SEED);

      // 1. 主茎 x 分布（28 株）
      let N = 28;
      let xs = [];
      let attempts = 0;
      while (xs.length < N && attempts < N * 140) {
        let t = p.random(0.05, 0.95);
        let x = p.lerp(105, 435, t) + p.randomGaussian() * 12;
        x = p.constrain(x, 95, 445);
        let tooClose = false;
        for (let ox of xs) if (p.abs(x - ox) < 9) { tooClose = true; break; }
        if (!tooClose) xs.push(x);
        attempts++;
      }
      xs.sort((a, b) => a - b);
      while (xs.length < N) xs.push(p.random(115, 425));

      // 2. 主茎数据
      let plantData = [];
      for (let x of xs) {
        let distCenter = p.abs(x - p.width / 2);
        let fan = p.map(distCenter, 0, 220, 1, 0.6, true);
        let h = p.random(330, 500) * fan * p.random(0.92, 1.08);
        if (p.random() < 0.26) h *= p.random(0.5, 0.82);
        let baseY = BASE_Y + p.random(-26, 20);
        let crownY = p.constrain(baseY - h, 300, 540);
        h = baseY - crownY;
        let scale = p.map(distCenter, 0, 220, 1.18, 0.72, true) * p.random(0.9, 1.08);
        let tier = crownY < 350 ? 0 : crownY > 440 ? 2 : 1;
        let depth = p.random();
        let layer = depth < 0.5 ? 0 : 1;
        plantData.push({ x, baseY, crownY, h, scale, tier, depth, layer });
      }

      // 景深后层
      for (let d of plantData) {
        if (d.layer === 0) {
          d.scale *= p.random(0.62, 0.78);
          d.crownY = p.constrain(d.crownY - p.random(14, 28), 260, 480);
          d.h = d.baseY - d.crownY;
        }
      }

      plantData.sort((a, b) => a.layer - b.layer);
      for (let d of plantData) plants.push(new Plant(p, d.x, d.baseY, d.h, d.scale, d.tier, d.depth, d.layer));

      // 3. 矮小烟花草（11 株）
      for (let i = 0; i < 6; i++) {
        let x = p.lerp(96, 444, p.random()) + p.randomGaussian() * 20;
        x = p.constrain(x, 90, 450);
        let h = p.random(110, 210);
        let baseY = BASE_Y + p.random(-18, 22);
        let crownY = p.constrain(baseY - h, 540, 720);
        h = baseY - crownY;
        let scale = 0.34 + Math.pow(p.random(), 1.8) * 0.42;
        let sp = new Plant(p, x, baseY, h, scale, 2, p.random(0.6, 1), 1);
        sp.staticScene = true;
        smallPlants.push(sp);
      }

      // 4. 杂草/倾倒枯茎（22 丛）
      for (let i = 0; i < 22; i++) {
        let x = p.lerp(82, 458, p.random()) + p.randomGaussian() * 12;
        x = p.constrain(x, 75, 465);
        let baseY = BASE_Y + p.random(-4, 28);
        let tipX = p.constrain(x + p.random(-60, 60), 75, 465);
        let tipY = p.random(640, 830);
        let bend = (tipX - x) * p.random(0.35, 0.55) + p.random(-12, 12);
        let w = p.random(0.6, 1.5);
        let r = p.random();
        let c;
        if (r < 0.30) c = p.color(p.random(70, 100), p.random(16, 32), p.random(56, 76), p.random(55, 82));
        else if (r < 0.70) c = p.color(p.random(35, 55), p.random(34, 54), p.random(58, 80), p.random(50, 78));
        else c = p.color(p.random(38, 52), p.random(22, 38), p.random(66, 86), p.random(40, 65));
        let forks = [];
        let nf = Math.floor(p.random(1, 4));
        for (let k = 0; k < nf; k++) forks.push({ dx: p.random(-22, 22), dy: p.random(12, 42), t: p.random(0.3, 0.7) });
        weeds.push({ x, baseY, tipX, tipY, bend, w, c, forks });
      }

      // 5. 前景短茎（6 株）
      for (let i = 0; i < 6; i++) {
        let x = p.lerp(86, 454, p.random()) + p.randomGaussian() * 12;
        x = p.constrain(x, 80, 460);
        let topY = p.random(680, 820);
        if (x > 120 && x < 240) { x = p.random(240, 440); }
        let baseY = BASE_Y + p.random(-6, 24);
        let curve = p.random(-28, 28);
        if (p.abs(curve) < 8) curve += (curve < 0 ? -10 : 10);
        let w = p.random(0.7, 1.6);
        let depth = p.random(0.78, 1.0);
        let c = makeStemColor(p, depth);
        c = p.color(p.hue(c), p.saturation(c) * 0.7, p.brightness(c) + 8, p.alpha(c) * 0.65);
        fillers.push({ x, topY, baseY, curve, w, c });
      }
    };

    p.draw = function () {
      p.background(40, 2, 98);

      // 接地阴影
      p.noStroke();
      for (let i = 0; i < 3; i++) {
        p.fill(70, 22, 42, 5);
        p.ellipse(p.width / 2, 836, 360 - i * 44, 66 - i * 12);
      }

      for (let pl of plants) pl.update(p);
      for (let pl of smallPlants) pl.update(p);

      // 景深：后层
      let back = plants.filter(pl => pl.layer === 0);
      let front = plants.filter(pl => pl.layer === 1);
      for (let pl of back) pl.displayStem(p);
      for (let pl of back) pl.displayCrown(p);

      // 薄雾
      p.noStroke();
      p.fill(40, 2, 98, 15);
      p.rect(0, 0, p.width, p.height);
      p.fill(40, 2, 98, 6);
      p.rect(0, 320, p.width, 360);

      // 前景层
      for (let pl of front) pl.displayStem(p);
      for (let pl of front) pl.displayCrown(p);

      if (F.small) {
        for (let pl of smallPlants) { pl.displayStem(p); pl.displayCrown(p); }
      }

      for (let f of fillers) drawFiller(p, f);
      if (F.weed) { for (let w of weeds) drawWeed(p, w); }

      // 标题
      p.noStroke();
      p.fill(75, 22, 26);
      p.textAlign(p.CENTER, p.TOP);
      p.textFont('Noto Serif SC');
      p.textSize(44);
      p.text("树上花火", p.width / 2, 70);

      p.noStroke();
      p.fill(80, 10, 35, 30);
      p.textAlign(p.CENTER);
      p.textSize(11);
      p.text("鼠标滑过 / 点击大花触发炸开", p.width / 2, 134);
    };

    p.mousePressed = function () { triggerNear(p, p.mouseX, p.mouseY); };
    p.mouseMoved = function () { triggerNear(p, p.mouseX, p.mouseY); };

    function triggerNear(p, mx, my) {
      for (let pl of plants) {
        if (!pl.exploded) {
          let d = p.dist(mx, my, pl.top.x, pl.top.y);
          if (d < 70 * pl.scale) pl.explode();
        }
      }
      for (let pl of smallPlants) {
        let d = p.dist(mx, my, pl.top.x, pl.top.y);
        if (d < 55 * pl.scale && pl.wiggle < 1) pl.wiggle = 1;
      }
    }

  });

})();
