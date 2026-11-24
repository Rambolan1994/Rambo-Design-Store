/* ============================================================
   兰博设计摊 · 交互层
   纯本地交互：筛选、FAQ 折叠、目录滚动高亮、表单校验、复制邮箱
   ============================================================ */
window.LamboUI = (function () {
  'use strict';

  function init() {
    syncFilterPills();   // 依据文章实际分类补齐筛选胶囊
    initFilters();       // 分类筛选（knowledge 页真实过滤）
    initKbStats();       // 统计数字按真实数据同步
    initFaq();
    initToc();
    initForm();
    initCopy();
    initLightbox();     // 图片查看弹窗：打开/关闭/滚轮缩放/工具条
  }

  // 图片查看弹窗
  function initLightbox() {
    var overlay = document.getElementById('lightbox');
    if (!overlay) return;
    var stage = document.getElementById('lbStage');
    var image = document.getElementById('lbImage');
    var closeBtn = document.getElementById('lbClose');
    var zoombar = document.getElementById('lbZoombar');
    var zoomIn = document.getElementById('lbZoomIn');
    var zoomOut = document.getElementById('lbZoomOut');
    var zoomValue = document.getElementById('lbZoomValue');
    var cards = document.querySelectorAll('.img-card');
    if (!image || !cards.length) return;

    var scale = 1, offsetX = 0, offsetY = 0;
    var MIN = 0.5, MAX = 4, STEP = 0.25;
    var PAD = 40; // 允许的拖拽余量，保证图片不会被彻底拖出视口
    var spaceDown = false, dragging = false, suppressClick = false;
    var startX = 0, startY = 0, startOffsetX = 0, startOffsetY = 0;

    function applyTransform() {
      // transform 顺序：先 scale 后 translate，translate 不受 scale 影响 -> 拖动距离=鼠标移动距离
      image.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) scale(' + scale + ')';
      image.classList.toggle('is-zoomed', scale > 1);
      if (zoomValue) zoomValue.textContent = Math.round(scale * 100) + '%';
    }
    // 宽松边界：放大后仅允许在「溢出区域 + 余量」内拖动，缩小到贴合视口时归位
    function clampOffset() {
      if (!stage) return;
      var vw = stage.clientWidth, vh = stage.clientHeight;
      var bw = image.offsetWidth, bh = image.offsetHeight; // 未缩放的布局尺寸
      var maxX = Math.max(0, (bw * scale - vw) / 2 + PAD);
      var maxY = Math.max(0, (bh * scale - vh) / 2 + PAD);
      offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
      offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
    }
    function setScale(v) {
      scale = Math.max(MIN, Math.min(MAX, v));
      clampOffset();
      applyTransform();
    }
    function resetView() {
      scale = 1; offsetX = 0; offsetY = 0;
      applyTransform();
    }
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      suppressClick = true; // 吞掉拖拽结束时可能触发的 click，避免误关弹窗
      overlay.classList.remove('is-panning');
    }
    function open(card) {
      var media = card.querySelector('.img-card__media');
      if (media) {
        var bg = window.getComputedStyle(media).backgroundImage;
        image.style.backgroundImage = bg;
      }
      resetView();
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      endDrag();
      spaceDown = false;
      overlay.classList.remove('space-down');
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      resetView();
    }

    cards.forEach(function (card) {
      card.style.cursor = 'zoom-in';
      card.addEventListener('click', function () { open(card); });
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    // 点击图片以外区域（遮罩/舞台空白）关闭，点工具条不关闭；拖拽后的 click 不关闭
    if (stage) stage.addEventListener('click', function (e) {
      if (suppressClick) { suppressClick = false; return; }
      if (e.target === stage) close();
    });
    if (zoombar) zoombar.addEventListener('click', function (e) { e.stopPropagation(); });
    if (zoomIn) zoomIn.addEventListener('click', function () { setScale(scale + STEP); });
    if (zoomOut) zoomOut.addEventListener('click', function () { setScale(scale - STEP); });

    // 滚轮缩放（以指针位置为视觉参考，围绕中心缩放）
    if (stage) stage.addEventListener('wheel', function (e) {
      if (!overlay.classList.contains('is-open')) return;
      e.preventDefault();
      setScale(scale + (e.deltaY < 0 ? STEP : -STEP));
    }, { passive: false });

    image.setAttribute('draggable', 'false');
    // 空格 + 拖动：按住空格时光标变手掌，可上下左右任意方向平移图片
    if (stage) stage.addEventListener('mousedown', function (e) {
      if (!overlay.classList.contains('is-open')) return;
      if (!spaceDown || e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startOffsetX = offsetX; startOffsetY = offsetY;
      overlay.classList.add('is-panning');
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      offsetX = startOffsetX + (e.clientX - startX);
      offsetY = startOffsetY + (e.clientY - startY);
      clampOffset();
      applyTransform();
    });
    document.addEventListener('mouseup', endDrag);

    function setSpace(v) {
      spaceDown = v;
      if (!v) endDrag();
      overlay.classList.toggle('space-down', v);
    }
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('is-open')) return;
      // 空格：进入抓手模式（阻止默认滚动/按钮触发）
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (!spaceDown) setSpace(true);
        return;
      }
      if (e.key === 'Escape') close();
      else if (e.key === '+' || e.key === '=') setScale(scale + STEP);
      else if (e.key === '-') setScale(scale - STEP);
    });
    document.addEventListener('keyup', function (e) {
      if (e.code === 'Space' || e.key === ' ') setSpace(false);
    });
    window.addEventListener('blur', function () { setSpace(false); });
  }

  // 若文章出现新分类但筛选行没有对应胶囊，自动补一个，保持筛选与文章同步
  function syncFilterPills() {
    document.querySelectorAll('.filter-row').forEach(function (row) {
      var controls = row.querySelectorAll('.filter-pill[data-filter]');
      if (!controls.length) return; // 无 data-filter 的筛选行（如作品集）不处理
      var cards = document.querySelectorAll('.article-card[data-cat], .site-card[data-cat], .img-card[data-cat]');
      if (!cards.length) return;
      var existing = {};
      controls.forEach(function (p) {
        var f = p.getAttribute('data-filter');
        if (f && f !== 'all') existing[f] = true;
      });
      cards.forEach(function (c) {
        // 兼容逗号分隔的多分类，逐个补齐胶囊
        (c.getAttribute('data-cat') || '').split(',').forEach(function (raw) {
          var cat = raw.trim();
          if (cat && !existing[cat]) {
            existing[cat] = true;
            var b = document.createElement('button');
            b.className = 'filter-pill';
            b.type = 'button';
            b.setAttribute('data-filter', cat);
            b.textContent = cat;
            row.appendChild(b);
          }
        });
      });
    });
  }

  // 分类筛选：声明 data-filter 的胶囊 + 带 data-cat 的卡片 -> 真实过滤；其余保持视觉演示
  function initFilters() {
    document.querySelectorAll('.filter-row').forEach(function (row) {
      var pills = row.querySelectorAll('.filter-pill');
      var cards = document.querySelectorAll('.article-card[data-cat], .work-card[data-cat], .tool-card[data-cat], .site-card[data-cat], .img-card[data-cat]');
      var realFilter = cards.length > 0 && !!row.querySelector('.filter-pill[data-filter]');
      pills.forEach(function (pill) {
        pill.addEventListener('click', function () {
          pills.forEach(function (p) { p.classList.remove('is-active'); });
          pill.classList.add('is-active');
          if (!realFilter) return;
          var f = pill.getAttribute('data-filter') || 'all';
          cards.forEach(function (card) {
            // data-cat 支持逗号分隔的多分类（如「设计,AI」），命中任一即显示
            var cats = (card.getAttribute('data-cat') || '').split(',').map(function (c) { return c.trim(); });
            var show = (f === 'all') || (cats.indexOf(f) > -1);
            card.classList.toggle('is-filtered-out', !show);
          });
        });
      });
    });
  }

  // 统计数字：篇数 = 文章卡数量，分类数 = data-cat 去重数量，随 DOM 实时同步
  function initKbStats() {
    var noteEl = document.getElementById('kbNoteCount');
    var catEl = document.getElementById('kbCatCount');
    var bmSiteEl = document.getElementById('bmSiteCount');
    var bmCatEl = document.getElementById('bmCatCount');
    var imgCountEl = document.getElementById('imgCount');
    var imgCatEl = document.getElementById('imgCatCount');
    if (!noteEl && !catEl && !bmSiteEl && !bmCatEl && !imgCountEl && !imgCatEl) return;
    var cards = document.querySelectorAll('.article-card[data-cat]');
    var cats = {};
    cards.forEach(function (c) {
      var cat = c.getAttribute('data-cat');
      if (cat) cats[cat] = true;
    });
    if (noteEl) noteEl.textContent = cards.length;
    if (catEl) catEl.textContent = Object.keys(cats).length;

    // 网站收藏页：站点数 = 卡片数，分类数 = data-cat 去重数量
    if (bmSiteEl || bmCatEl) {
      var siteCards = document.querySelectorAll('.site-card[data-cat]');
      var siteCats = {};
      siteCards.forEach(function (c) {
        (c.getAttribute('data-cat') || '').split(',').forEach(function (raw) {
          var cat = raw.trim();
          if (cat) siteCats[cat] = true;
        });
      });
      if (bmSiteEl) bmSiteEl.textContent = siteCards.length;
      if (bmCatEl) bmCatEl.textContent = Object.keys(siteCats).length;
    }

    // 图片收藏页：图片数 = 卡片数，分类数 = data-cat 去重数量
    if (imgCountEl || imgCatEl) {
      var imgCards = document.querySelectorAll('.img-card[data-cat]');
      var imgCats = {};
      imgCards.forEach(function (c) {
        (c.getAttribute('data-cat') || '').split(',').forEach(function (raw) {
          var cat = raw.trim();
          if (cat) imgCats[cat] = true;
        });
      });
      if (imgCountEl) imgCountEl.textContent = imgCards.length;
      if (imgCatEl) imgCatEl.textContent = Object.keys(imgCats).length;
    }
  }

  // FAQ 手风琴：单项展开
  function initFaq() {
    var items = document.querySelectorAll('.faq-list details');
    if (!items.length) return;
    items.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (d.open) {
          items.forEach(function (o) { if (o !== d) o.open = false; });
        }
      });
    });
  }

  // 右侧目录：点击平滑滚动 + 滚动时高亮当前章节
  function initToc() {
    var links = document.querySelectorAll('.toc__link[data-target]');
    if (!links.length) return;
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.getElementById(link.getAttribute('data-target'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          links.forEach(function (l) { l.classList.remove('is-active'); });
          link.classList.add('is-active');
        }
      });
    });

    if ('IntersectionObserver' in window) {
      var targets = Array.prototype.map.call(links, function (l) {
        return document.getElementById(l.getAttribute('data-target'));
      }).filter(Boolean);
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            links.forEach(function (l) {
              l.classList.toggle('is-active', l.getAttribute('data-target') === en.target.id);
            });
          }
        });
      }, { rootMargin: '-80px 0px -70% 0px' });
      targets.forEach(function (t) { obs.observe(t); });
    }
  }

  // 留言表单：本地校验 + 成功提示（无后端，演示交互）
  function initForm() {
    var form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('[name=name]');
      var email = form.querySelector('[name=email]');
      var msg = form.querySelector('[name=message]');
      var tip = form.querySelector('.form-tip');
      if (!name.value.trim() || !email.value.trim() || !msg.value.trim()) {
        showTip(tip, '请填写完整的姓名、邮箱与留言内容。', false);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        showTip(tip, '邮箱格式看起来不太对，请检查。', false);
        return;
      }
      showTip(tip, '消息已记录（本地演示）。我会尽快回复你！', true);
      form.reset();
    });

    // 合作类型下拉：点击弹出简易选项
    var select = document.getElementById('coopSelect');
    if (select) {
      var menu = select.querySelector('.select-menu');
      var value = select.querySelector('.select-value');
      select.addEventListener('click', function (e) {
        if (e.target.closest('.select-option')) {
          var opt = e.target.closest('.select-option');
          value.textContent = opt.getAttribute('data-value');
          value.classList.remove('placeholder');
          menu.hidden = true;
          select.classList.add('is-filled');
          return;
        }
        menu.hidden = !menu.hidden;
        select.classList.toggle('is-open', !menu.hidden);
      });
    }
  }

  function showTip(tip, text, ok) {
    if (!tip) return;
    tip.textContent = text;
    tip.style.color = ok ? 'var(--signal)' : '#F6AD55';
    tip.hidden = false;
    clearTimeout(tip._t);
    tip._t = setTimeout(function () { tip.hidden = true; }, 4500);
  }

  // 复制邮箱
  function initCopy() {
    var btn = document.getElementById('copyEmail');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var mail = 'hello@lambodesign.com';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(mail).then(function () { flash(btn); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = mail; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); flash(btn); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  }

  function flash(btn) {
    var old = btn.textContent;
    btn.textContent = '已复制';
    btn.style.color = 'var(--signal)';
    setTimeout(function () { btn.textContent = old; btn.style.color = ''; }, 1600);
  }

  return { init: init };
})();
