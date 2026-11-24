/* ============================================================
   兰博设计摊 · 比例换算工具
   视觉严格按 Ardot 设计稿 75:127（双输入框 + 常用比例 chips，无结果面板）
   换算逻辑参考 Lambo-Toolkit：宽高联动，编辑一边自动算另一边并回填
   ============================================================ */
(function () {
  'use strict';

  var wEl = document.getElementById('rcW');
  var hEl = document.getElementById('rcH');
  if (!wEl || !hEl) return;

  var chips = Array.prototype.slice.call(document.querySelectorAll('#rcChips .rc-chip'));

  // 当前选中比例：默认 16:9（设计稿默认高亮，预填 1920×1080）
  var ratio = { w: 16, h: 9 };
  // 当前编辑目标：width / height，决定换算时保持哪一边不变
  var editTarget = 'width';

  function positiveInt(v) {
    var n = parseInt(v, 10);
    return (!isNaN(n) && n >= 1) ? n : null;
  }

  function highlight(a, b) {
    chips.forEach(function (c) {
      c.classList.toggle('is-active', Number(c.dataset.w) === a && Number(c.dataset.h) === b);
    });
  }

  // 实时换算：保持正在编辑的一边，按当前比例计算另一边并回填
  function calc() {
    var a = ratio.w, b = ratio.h;
    var val;
    if (editTarget === 'width') {
      val = positiveInt(wEl.value);
      if (val !== null) hEl.value = Math.round(val * b / a);
    } else {
      val = positiveInt(hEl.value);
      if (val !== null) wEl.value = Math.round(val * a / b);
    }
    highlight(a, b);
  }

  // 聚焦决定编辑目标（与参考实现一致）
  wEl.addEventListener('focus', function () { editTarget = 'width'; });
  hEl.addEventListener('focus', function () { editTarget = 'height'; });
  wEl.addEventListener('input', calc);
  hEl.addEventListener('input', calc);

  // 点击比例：切换比例并基于当前编辑目标重算
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      ratio = { w: Number(chip.dataset.w), h: Number(chip.dataset.h) };
      calc();
    });
  });

  // 初始按设计稿 16:9 高亮（1920×1080 已匹配，不改写数值）
  highlight(ratio.w, ratio.h);
})();
