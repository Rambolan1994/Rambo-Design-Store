/* ============================================================
   兰博设计摊 · 交互层
   纯本地交互：筛选、FAQ 折叠、目录滚动高亮、表单校验、复制邮箱
   ============================================================ */
window.LamboUI = (function () {
  'use strict';

  function init() {
    initFilters();
    initFaq();
    initToc();
    initForm();
    initCopy();
  }

  // 筛选标签：同组内互斥切换（视觉演示，不隐藏真实内容以保持还原）
  function initFilters() {
    document.querySelectorAll('.filter-row').forEach(function (row) {
      var pills = row.querySelectorAll('.filter-pill');
      pills.forEach(function (pill) {
        pill.addEventListener('click', function () {
          pills.forEach(function (p) { p.classList.remove('is-active'); });
          pill.classList.add('is-active');
        });
      });
    });
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
