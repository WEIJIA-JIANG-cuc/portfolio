/* ============================================
   暖白书斋 · 飞燕创作集 — 交互逻辑
   导航 / 滚动淡入 / 滑动卡片 / 摄影视差
   ============================================ */

(function () {
  'use strict';

  // --- 导航栏 ---
  const navbar = document.querySelector('.navbar');
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', function () {
      menuToggle.classList.toggle('open');
      navLinks.classList.toggle('open');
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        menuToggle.classList.remove('open');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // --- 当前页面高亮 ---
  (function highlightCurrentNav() {
    var page = window.location.pathname.split('/').pop() || 'index.html';
    if (!navLinks) return;
    navLinks.querySelectorAll('a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href === page || (page === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });
  })();

  // --- 滚动淡入（IntersectionObserver） ---
  var fadeElements = document.querySelectorAll('.fade-up, .section-card, .gallery-item, .project-item, .article-card');

  if ('IntersectionObserver' in window && fadeElements.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    fadeElements.forEach(function (el) { observer.observe(el); });
  } else {
    // 降级：直接全部显示
    fadeElements.forEach(function (el) { el.classList.add('visible'); });
  }

  // --- Hero 内容淡入（时机由 CSS 的 transition-delay 2.9s 控制，这里仅触发） ---
  var heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    setTimeout(function () { heroContent.classList.add('visible'); }, 100);
  }

  // --- 摄影：滚动视差效果 ---
  (function initParallaxGallery() {
    var galleryItems = document.querySelectorAll('.gallery-item');
    if (!galleryItems.length) return;

    var imageWraps = document.querySelectorAll('.gallery-image-wrap');

    function onScroll() {
      galleryItems.forEach(function (item, i) {
        var rect = item.getBoundingClientRect();
        var viewHeight = window.innerHeight;
        if (rect.top < viewHeight && rect.bottom > 0) {
          var progress = (viewHeight - rect.top) / (viewHeight + rect.height);
          progress = Math.max(0, Math.min(1, progress));
          var offsetX = (progress - 0.5) * 20;
          var scale = 1 + (1 - Math.abs(progress - 0.5) * 2) * 0.03;
          if (imageWraps[i]) {
            imageWraps[i].style.transform =
              'translateX(' + offsetX + 'px) scale(' + scale + ')';
          }
        }
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  // --- 写作：滑动卡片（Tinder 式） ---
  (function initSwipeCards() {
    var container = document.querySelector('.swipe-container');
    if (!container) return;

    var cards = Array.from(container.querySelectorAll('.swipe-card'));
    if (!cards.length) return;

    var indicators = document.querySelector('.swipe-indicators');
    var currentIndex = cards.length - 1; // 最上面的卡片索引

    // 初始化卡片层叠
    function stackCards() {
      cards.forEach(function (card, i) {
        var offset = (cards.length - 1 - i) * 6;
        var rot = (cards.length - 1 - i) * 1.5;
        card.style.zIndex = String(cards.length - i);
        card.style.transform =
          'translateY(' + offset + 'px) rotate(' + rot + 'deg)';
        card.style.opacity = i === currentIndex ? '1' : '1';
      });
      updateIndicators();
    }

    function updateIndicators() {
      if (!indicators) return;
      var dots = indicators.querySelectorAll('.swipe-dot');
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === currentIndex);
      });
    }

    // 创建指示器点
    if (indicators) {
      cards.forEach(function (_, i) {
        var dot = document.createElement('span');
        dot.className = 'swipe-dot' + (i === currentIndex ? ' active' : '');
        indicators.appendChild(dot);
      });
    }

    stackCards();

    var activeCard = cards[currentIndex];
    var startX = 0, startY = 0, currentX = 0, currentY = 0;
    var isDragging = false;

    function onStart(x, y) {
      if (currentIndex < 0) return;
      isDragging = true;
      activeCard = cards[currentIndex];
      activeCard.classList.add('dragging');
      startX = x; startY = y;
      currentX = 0; currentY = 0;
    }

    function onMove(x, y) {
      if (!isDragging || !activeCard) return;
      currentX = x - startX;
      currentY = y - startY;
      var rotation = currentX * 0.08;
      var opacity = 1 - Math.abs(currentX) / 300;
      opacity = Math.max(0.4, opacity);
      activeCard.style.transform =
        'translate(' + currentX + 'px, ' + currentY + 'px) rotate(' + rotation + 'deg)';
      activeCard.style.opacity = String(opacity);
    }

    function onEnd() {
      if (!isDragging || !activeCard) return;
      isDragging = false;
      activeCard.classList.remove('dragging');

      var threshold = 100;
      if (Math.abs(currentX) > threshold) {
        // 滑出
        var direction = currentX > 0 ? 1 : -1;
        activeCard.style.transition =
          'transform 0.4s var(--ease-spring), opacity 0.3s ease';
        activeCard.style.transform =
          'translate(' + (currentX + direction * 400) + 'px, ' +
          (currentY + direction * 200) + 'px) rotate(' +
          (currentX * 0.08 + direction * 20) + 'deg)';
        activeCard.style.opacity = '0';

        currentIndex--;
        setTimeout(function () {
          if (activeCard) {
            activeCard.style.display = 'none';
          }
          if (currentIndex >= 0) {
            cards[currentIndex].style.transition =
              'transform 0.4s var(--ease-spring)';
            cards[currentIndex].style.transform =
              'translateY(0) rotate(0deg)';
          }
        }, 400);

        updateIndicators();
      } else {
        // 弹回
        activeCard.style.transition =
          'transform 0.4s var(--ease-spring), opacity 0.3s ease';
        var offset = (cards.length - 1 - currentIndex) * 6;
        var rot = (cards.length - 1 - currentIndex) * 1.5;
        activeCard.style.transform =
          'translateY(' + offset + 'px) rotate(' + rot + 'deg)';
        activeCard.style.opacity = '1';
      }
    }

    // 触摸事件
    activeCard = cards[currentIndex];
    container.addEventListener('touchstart', function (e) {
      if (currentIndex < 0) return;
      onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    container.addEventListener('touchmove', function (e) {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    container.addEventListener('touchend', onEnd);

    // 鼠标事件
    if (activeCard) {
      activeCard.addEventListener('mousedown', function (e) {
        if (currentIndex < 0) return;
        onStart(e.clientX, e.clientY);
        e.preventDefault();
      });
    }

    document.addEventListener('mousemove', function (e) {
      onMove(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', onEnd);

    // 点击展开/收起全文
    cards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (Math.abs(currentX) > 10 || Math.abs(currentY) > 10) return;
        card.classList.toggle('expanded');
      });
    });
  })();
})();
