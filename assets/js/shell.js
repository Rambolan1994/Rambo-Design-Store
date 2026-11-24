/* ============================================================
   兰博设计摊 · 共用外壳（侧栏 + 顶栏）
   7 页通过 <body data-page="..."> 声明当前页，集中管理高亮
   节点结构与配色取自 Ardot 设计稿
   ============================================================ */
(function () {
  'use strict';

  var ICON = 'assets/icons/';
  var MENU = [
    { key: 'bookmarks',  label: '网站收藏', icon: 'i-bookmark.svg', href: 'bookmarks.html' },
    { key: 'kb',      label: '知识库',   icon: 'i-kb.svg',      href: 'knowledge.html',
      children: [
        { label: '摘录', href: 'knowledge.html#zhailu' },
        { label: '原创', href: 'original.html#yuanchuang' }
      ] },
    { key: 'images',  label: '图片收藏', icon: 'i-image.svg',   href: 'images.html' },
    { key: 'toolbox',    label: '工具箱',   icon: 'i-toolbox.svg',  href: 'toolbox.html' },
    { key: 'works',   label: '作品集',   icon: 'i-works.svg',   href: 'works.html' },
    { key: 'about',   label: '关于我',   icon: 'i-about.svg',   href: 'about.html' },
    { key: 'contact', label: '联系我', icon: 'i-contact.svg', href: 'contact.html' }
  ];

  // 各 page 对应的激活菜单 + 面包屑末级
  var PAGE_MAP = {
    works:       { active: 'works',   crumb: '作品集' },
    'work-detail': { active: 'works', crumb: '作品集' },
    kb:          { active: 'kb',      crumb: '知识库' },
    'kb-detail': { active: 'kb',      crumb: '知识库' },
    original:      { active: 'kb',    crumb: '原创' },
    'original-ui': { active: 'kb',    crumb: '原创' },
    'original-side': { active: 'kb',  crumb: '原创' },
    'original-ai': { active: 'kb',    crumb: '原创' },
    toolbox:     { active: 'toolbox',   crumb: '工具箱' },
    'word-counter': { active: 'toolbox', crumb: '工具箱 / 字数统计' },
    'ratio-converter': { active: 'toolbox', crumb: '工具箱 / 比例换算' },
    'image-editor': { active: 'toolbox', crumb: '工具箱 / 图片编辑' },
    images:      { active: 'images',    crumb: '图片收藏' },
    bookmarks:   { active: 'bookmarks', crumb: '网站收藏' },
    about:       { active: 'about',   crumb: '关于我' },
    contact:     { active: 'contact', crumb: '联系我' }
  };

  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function buildSidebar(active) {
    var hash = window.location.hash;
    var navHtml = MENU.map(function (m) {
      var on = m.key === active;
      var hasChildren = !!(m.children && m.children.length);
      var item = '<a class="nav__item' + (on ? ' is-active' : '') + (hasChildren ? ' nav__item--group' : '') + '" href="' + m.href + '"' +
        (on ? ' aria-current="page"' : '') + (hasChildren ? ' tabindex="-1"' : '') + '>' +
        (on ? '<span class="nav__indicator"></span>' : '') +
        '<span class="nav__icon" style="-webkit-mask-image:url(' + ICON + m.icon + ');mask-image:url(' + ICON + m.icon + ');"></span>' +
        '<span class="nav__label">' + m.label + '</span>' +
        '</a>';
      if (m.children && m.children.length) {
        var sub = m.children.map(function (c) {
          var subOn = hash === '#' + c.href.split('#')[1];
          return '<a class="nav__subitem' + (subOn ? ' is-active' : '') + '" href="' + c.href + '">' +
            '<span class="nav__subdot"></span><span class="nav__sublabel">' + c.label + '</span></a>';
        }).join('');
        item += '<div class="nav__sub">' + sub + '</div>';
      }
      return item;
    }).join('');

    return el(
      '<aside class="sidebar" aria-label="主导航">' +
        '<div class="sidebar__logo">' +
          '<span class="logo-mark"><img src="' + ICON + 'logo.svg" alt="兰博设计摊 Logo"></span>' +
          '<span class="brand"><span class="brand__name">兰博设计摊</span>' +
          '<span class="brand__sub">LAMBO\'S DESIGN</span></span>' +
        '</div>' +
        '<button class="nav-toggle" type="button" aria-label="打开菜单" aria-expanded="false">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
        '<div class="sidebar__divider"></div>' +
        '<nav class="nav">' + navHtml + '</nav>' +
        '<div class="sidebar__spacer"></div>' +
        '<div class="sidebar__foot">' +
          '<div class="status"><span class="status__dot"></span>' +
          '<span class="status__text">当前可接单 · Freelance</span></div>' +
          '<div class="copyright">2026 · LAMBO\'S DESIGN</div>' +
        '</div>' +
      '</aside>'
    );
  }

  // 移动端：汉堡包 → 一级下拉 → 二级手风琴
  function initMobileNav(sidebar) {
    var mq = window.matchMedia('(max-width:860px)');
    var toggle = sidebar.querySelector('.nav-toggle');
    var nav = sidebar.querySelector('.nav');
    if (!toggle || !nav) return;

    var groups = Array.prototype.slice.call(nav.querySelectorAll('.nav__item--group'));

    function closeMenu() {
      nav.classList.remove('is-open');
      toggle.classList.remove('is-active');
      toggle.setAttribute('aria-expanded', 'false');
      groups.forEach(function (g) {
        g.classList.remove('is-expanded');
        if (g.nextElementSibling && g.nextElementSibling.classList.contains('nav__sub')) {
          g.nextElementSibling.classList.remove('is-open');
        }
      });
    }

    function openMenu() {
      nav.classList.add('is-open');
      toggle.classList.add('is-active');
      toggle.setAttribute('aria-expanded', 'true');
      // 若当前处于某二级项，自动展开其父分组
      var activeSub = nav.querySelector('.nav__subitem.is-active');
      if (activeSub) {
        var sub = activeSub.parentNode;
        var g = sub.previousElementSibling;
        if (g && g.classList.contains('nav__item--group')) {
          g.classList.add('is-expanded');
          sub.classList.add('is-open');
        }
      }
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (nav.classList.contains('is-open')) closeMenu(); else openMenu();
    });

    // 有二级菜单的一级项：移动端拦截跳转，改为展开二级
    groups.forEach(function (g) {
      g.addEventListener('click', function (e) {
        if (!mq.matches) return;
        e.preventDefault();
        var sub = g.nextElementSibling;
        if (!sub || !sub.classList.contains('nav__sub')) return;
        var willOpen = !sub.classList.contains('is-open');
        // 手风琴：先收起其他分组
        groups.forEach(function (other) {
          other.classList.remove('is-expanded');
          if (other.nextElementSibling && other.nextElementSibling.classList.contains('nav__sub')) {
            other.nextElementSibling.classList.remove('is-open');
          }
        });
        if (willOpen) {
          g.classList.add('is-expanded');
          sub.classList.add('is-open');
        }
      });
    });

    // 普通一级项、二级项点击后收起整个菜单
    Array.prototype.slice.call(nav.querySelectorAll('.nav__item:not(.nav__item--group), .nav__subitem'))
      .forEach(function (a) {
        a.addEventListener('click', function () { if (mq.matches) closeMenu(); });
      });

    // 点击菜单外部收起
    document.addEventListener('click', function (e) {
      if (mq.matches && nav.classList.contains('is-open') && !sidebar.contains(e.target)) closeMenu();
    });

    // 回到桌面端时清理移动态，避免残留
    function onMq(e) { if (!e.matches) closeMenu(); }
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  function buildTopbar(crumb) {
    return el(
      '<header class="topbar">' +
        '<div class="crumb"><span class="crumb__a">工作台</span>' +
          '<span class="crumb__sep">/</span>' +
          '<span class="crumb__cur">' + crumb + '</span></div>' +
        '<div class="topbar__right">' +
          '<label class="search">' +
            '<span class="search__icon"><img src="' + ICON + 'i-search.svg" alt="" aria-hidden="true"></span>' +
            '<input type="search" placeholder="搜索作品、笔记、工具..." aria-label="搜索">' +
          '</label>' +
          '<button class="icon-btn" type="button" aria-label="通知">' +
            '<img src="' + ICON + 'i-bell.svg" alt="" aria-hidden="true"></button>' +
          '<span class="avatar" aria-label="兰博">LB</span>' +
        '</div>' +
      '</header>'
    );
  }

  function init() {
    var body = document.body;
    var page = body.getAttribute('data-page') || 'bookmarks';
    var conf = PAGE_MAP[page] || PAGE_MAP.bookmarks;

    var app = document.querySelector('.app');
    if (!app) return;

    var sidebar = buildSidebar(conf.active);
    app.insertBefore(sidebar, app.firstChild);
    initMobileNav(sidebar);

    var main = document.querySelector('.main');
    if (main) main.insertBefore(buildTopbar(conf.crumb), main.firstChild);

    // 让合约/筛选类交互统一可用
    if (window.LamboUI && typeof window.LamboUI.init === 'function') {
      window.LamboUI.init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
