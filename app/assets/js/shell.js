/* ============================================================
   兰博设计摊 · 共用外壳（侧栏 + 顶栏）
   7 页通过 <body data-page="..."> 声明当前页，集中管理高亮
   节点结构与配色取自 Ardot 设计稿
   ============================================================ */
(function () {
  'use strict';

  var ICON = 'assets/icons/';
  var MENU = [
    { key: 'home',    label: '首页',     icon: 'i-home.svg',    href: 'index.html' },
    { key: 'works',   label: '作品集',   icon: 'i-works.svg',   href: 'works.html' },
    { key: 'kb',      label: '知识库',   icon: 'i-kb.svg',      href: 'knowledge.html' },
    { key: 'about',   label: '关于我',   icon: 'i-about.svg',   href: 'about.html' },
    { key: 'contact', label: '联系我们', icon: 'i-contact.svg', href: 'contact.html' }
  ];

  // 各 page 对应的激活菜单 + 面包屑末级
  var PAGE_MAP = {
    home:        { active: 'home',    crumb: '首页' },
    works:       { active: 'works',   crumb: '作品集' },
    'work-detail': { active: 'works', crumb: '作品集' },
    kb:          { active: 'kb',      crumb: '知识库' },
    'kb-detail': { active: 'kb',      crumb: '知识库' },
    about:       { active: 'about',   crumb: '关于我' },
    contact:     { active: 'contact', crumb: '联系我们' }
  };

  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function buildSidebar(active) {
    var navHtml = MENU.map(function (m) {
      var on = m.key === active;
      return '<a class="nav__item' + (on ? ' is-active' : '') + '" href="' + m.href + '"' +
        (on ? ' aria-current="page"' : '') + '>' +
        (on ? '<span class="nav__indicator"></span>' : '') +
        '<span class="nav__icon"><img src="' + ICON + m.icon + '" alt="" aria-hidden="true"></span>' +
        '<span class="nav__label">' + m.label + '</span>' +
        '</a>';
    }).join('');

    return el(
      '<aside class="sidebar" aria-label="主导航">' +
        '<div class="sidebar__logo">' +
          '<span class="logo-mark"><img src="' + ICON + 'logo.svg" alt="兰博设计摊 Logo"></span>' +
          '<span class="brand"><span class="brand__name">兰博设计摊</span>' +
          '<span class="brand__sub">LAMBO\'S DESIGN</span></span>' +
        '</div>' +
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
    var page = body.getAttribute('data-page') || 'home';
    var conf = PAGE_MAP[page] || PAGE_MAP.home;

    var app = document.querySelector('.app');
    if (!app) return;

    app.insertBefore(buildSidebar(conf.active), app.firstChild);

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
