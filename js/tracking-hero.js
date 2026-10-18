// tracking-hero.js —— 动态追踪飞鸟 Hero
// 视觉参考：目标检测追踪框(Bounding Box) + 雷达环 + 编号标签 + 网格线
// 配色：深蓝近黑底 #0a0e27 / 青蓝高光 #00d4ff / 白鸟 #e8f4ff

(function () {
  'use strict';

  // ── 配置 ───────────────────────────────────────
  const CONFIG = {
    bg: '#0a0e27',           // 深蓝近黑底（图3主色）
    accent: '#00d4ff',       // 青蓝高光（图3撞色）
    accentDim: 'rgba(0,212,255,0.25)',
    accentFaint: 'rgba(0,212,255,0.08)',
    birdFill: '#e8f4ff',     // 白鸟（图2氛围）
    gridColor: 'rgba(0,180,216,0.10)',
    textColor: '#00d4ff',
    birdCount: 11,           // 飞鸟数量
    boxPadding: 12,          // 追踪框内边距
  };

  // ── 燕子/飞鸟剪影路径（侧视朝右飞行，叉尾+后掠翼）──
  const BIRD_PATH = new Path2D(
    'M42 10 C38 7 33 5 28 6 C22 2 14 -2 4 0 C10 4 14 7 19 9 L12 12 L2 8 L9 14 L0 16 L13 15 C20 17 30 16 36 13 C39 12 41 11 42 10 Z'
  );

  // ── Canvas 初始化 ──────────────────────────────
  const canvas = document.getElementById('tracking-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // ── 鸟类（每只独立状态）────────────────────────
  class Bird {
    constructor(id) {
      this.id = id;
      this.reset(true);
    }

    reset(initial = false) {
      // 随机入场方向（主要从左上→右下飞，少量反向）
      const fromLeft = Math.random() > 0.15;
      const fromTop = Math.random() > 0.3;

      this.scale = 0.4 + Math.random() * 0.9;     // 大小差异
      this.speed = 0.3 + Math.random() * 1.2;      // 飞行速度
      this.angle = (Math.random() * 40 - 20) * Math.PI / 180; // 倾角 ±20°
      this.wingPhase = Math.random() * Math.PI * 2; // 翅膀拍动相位差
      this.wingSpeed = 0.06 + Math.random() * 0.05;

      // 入场位置
      if (fromLeft) {
        this.x = initial ? Math.random() * W * 1.2 : -60 - Math.random() * 100;
      } else {
        this.x = initial ? Math.random() * W : W + 60 + Math.random() * 100;
        this.speed *= -0.7; // 反向慢飞
      }
      if (fromTop) {
        this.y = initial ? Math.random() * H : -60 - Math.random() * 80;
      } else {
        this.y = initial ? Math.random() * H : H + 60 + Math.random() * 80;
      }

      // 追踪框状态
      this.boxAlpha = 0.6 + Math.random() * 0.4;
      this.radarPhase = Math.random() * Math.PI * 2;
      this.radarSpeed = 0.02 + Math.random() * 0.02;
      this.labelPulse = Math.random() * Math.PI * 2;

      // 获取包围盒尺寸（用于画追踪框）
      this.boxW = 50 * this.scale + CONFIG.boxPadding * 2;
      this.boxH = 34 * this.scale + CONFIG.boxPadding * 2;
    }

    update(dt) {
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt * 0.6; // 水平主导
      this.wingPhase += this.wingSpeed * dt;
      this.radarPhase += this.radarSpeed * dt;
      this.labelPulse += 0.03 * dt;

      // 出界重置
      const margin = 120;
      if (this.x < -margin || this.x > W + margin ||
          this.y < -margin || this.y > H + margin) {
        this.reset();
      }
    }

    draw(ctx) {
      const bx = this.x - this.boxW / 2;
      const by = this.y - this.boxH / 2;

      // ① 雷达环（从鸟身向外扩散）
      this.drawRadar(ctx);

      // ② 追踪框（四角括号，非完整矩形）
      this.drawBoundingBox(ctx, bx, by);

      // ③ 连接线（鸟到框的角落）
      this.drawCrosshair(ctx, bx, by);

      // ④ 飞鸟本体
      this.drawBird(ctx);

      // ⑤ ID 标签
      this.drawLabel(ctx, bx, by);
    }

    drawRadar(ctx) {
      const maxR = Math.max(this.boxW, this.boxH) * 0.8;
      const r1 = ((this.radarPhase % (Math.PI * 2)) / (Math.PI * 2)) * maxR;
      const r2 = r1 + maxR * 0.4;
      if (r2 > maxR * 1.5) return;

      ctx.save();
      ctx.strokeStyle = CONFIG.accentDim;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r1, 0, Math.PI * 2);
      ctx.stroke();

      if (r2 < maxR * 1.5) {
        ctx.globalAlpha = Math.max(0, 1 - r2 / maxR);
        ctx.beginPath();
        ctx.arc(this.x, this.y, r2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawBoundingBox(ctx, bx, by) {
      const cornerLen = 10;
      const gap = 4; // 四角缺口
      const alpha = this.boxAlpha;

      ctx.save();
      ctx.strokeStyle = CONFIG.accent;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.2;

      // 左上角
      ctx.beginPath();
      ctx.moveTo(bx, by + cornerLen); ctx.lineTo(bx, by + gap);
      ctx.moveTo(bx + gap, by); ctx.lineTo(bx + cornerLen, by);
      ctx.stroke();

      // 右上角
      const rx = bx + this.boxW;
      ctx.beginPath();
      ctx.moveTo(rx - cornerLen, by); ctx.lineTo(rx - gap, by);
      ctx.moveTo(rx, by + gap); ctx.lineTo(rx, by + cornerLen);
      ctx.stroke();

      // 左下角
      const ry = by + this.boxH;
      ctx.beginPath();
      ctx.moveTo(bx, ry - cornerLen); ctx.lineTo(bx, ry - gap);
      ctx.moveTo(bx + gap, ry); ctx.lineTo(bx + cornerLen, ry);
      ctx.stroke();

      // 右下角
      ctx.beginPath();
      ctx.moveTo(rx - cornerLen, ry); ctx.lineTo(rx - gap, ry);
      ctx.moveTo(rx, ry - gap); ctx.lineTo(rx, ry - cornerLen);
      ctx.stroke();

      ctx.restore();
    }

    drawCrosshair(ctx, bx, by) {
      ctx.save();
      ctx.strokeStyle = CONFIG.accentFaint;
      ctx.lineWidth = 0.5;
      // 从鸟心到四个框角画虚线
      const corners = [
        [bx, by], [bx + this.boxW, by],
        [bx, by + this.boxH], [bx + this.boxW, by + this.boxH]
      ];
      ctx.setLineDash([3, 6]);
      corners.forEach(([cx, cy]) => {
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(cx, cy); ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();
    }

    drawBird(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.scale, this.scale);

      // 微微的翅膀拍动效果（Y轴缩放呼吸）
      const wingFlap = 1 + Math.sin(this.wingPhase) * 0.04;
      ctx.scale(1, wingFlap);

      // 如果是反向飞的，翻转
      if (this.speed < 0) ctx.scale(-1, 1);

      ctx.translate(-21, -9); // 居中偏移
      ctx.fillStyle = CONFIG.birdFill;
      ctx.fill(BIRD_PATH);
      ctx.restore();
    }

    drawLabel(ctx, bx, by) {
      const pulse = 0.7 + Math.sin(this.labelPulse) * 0.3;
      const label = String(this.id).padStart(2, '0');

      ctx.save();
      ctx.font = '10px "SimSun", "宋体", monospace';
      ctx.fillStyle = CONFIG.textColor;
      ctx.globalAlpha = pulse * 0.85;
      ctx.fillText(label, bx, by - 4);
      ctx.restore();
    }
  }

  // ── 场景管理 ───────────────────────────────────
  const birds = [];
  for (let i = 0; i < CONFIG.birdCount; i++) {
    birds.push(new Bird(i + 1));
  }

  let lastTime = performance.now();

  function drawGrid() {
    const step = 60;
    ctx.save();
    ctx.strokeStyle = CONFIG.gridColor;
    ctx.lineWidth = 0.5;

    for (let x = step; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = step; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawScanLine(time) {
    // 缓慢移动的水平扫描线
    const y = ((time * 0.03) % (H + 200)) - 100;
    const grad = ctx.createLinearGradient(0, y - 30, 0, y + 30);
    grad.addColorStop(0, 'rgba(0,212,255,0)');
    grad.addColorStop(0.5, 'rgba(0,212,255,0.06)');
    grad.addColorStop(1, 'rgba(0,212,255,0)');

    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, y - 30, W, 60);
    ctx.restore();
  }

  function animate(time) {
    const dt = Math.min((time - lastTime) / 16.67, 3); // 归一化 ~60fps
    lastTime = time;

    // 清屏
    ctx.fillStyle = CONFIG.bg;
    ctx.fillRect(0, 0, W, H);

    // 背景网格
    drawGrid();

    // 扫描线
    drawScanLine(time);

    // 更新 & 绘制所有鸟
    birds.forEach(b => { b.update(dt); b.draw(ctx); });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
