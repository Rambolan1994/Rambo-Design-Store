/* ============================================================
   兰博设计摊 · 字数统计工具
   纯本地计算：中英文字、单词、数字、段落、行数、标点、空格、阅读时间
   ============================================================ */
(function () {
  'use strict';

  var textEl = document.getElementById('wcText');
  if (!textEl) return;

  var MAX = 5000;
  var $ = function (id) { return document.getElementById(id); };

  var out = {
    total: $('sTotal'), chinese: $('sChinese'), words: $('sWords'), numbers: $('sNumbers'),
    paragraphs: $('sParagraphs'), lines: $('sLines'), punct: $('sPunct'),
    spaces: $('sSpaces'), read: $('sRead'), counter: $('wcCounter'), badge: $('wcBadge')
  };

  // 统计口径与设计稿说明条一致：中文单字、英文单词、数字与标点单独统计
  function count(text) {
    var noBreak = text.replace(/\r\n?/g, '\n');
    return {
      total: text.length,
      chinese: (noBreak.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g) || []).length,
      words: (noBreak.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g) || []).length,
      numbers: (noBreak.match(/\d+/g) || []).length,
      paragraphs: noBreak.trim() ? noBreak.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length : 0,
      lines: text ? noBreak.split('\n').length : 0,
      punct: (noBreak.match(/[，。！？、；：“”‘’（）《》〈〉【】…—～·,.!?;:"'()\[\]{}<>~`@#$%^&*+=|\\/]/g) || []).length,
      spaces: (noBreak.match(/[ \t\u3000]/g) || []).length
    };
  }

  function render() {
    var text = textEl.value;
    if (text.length > MAX) {
      text = text.slice(0, MAX);
      textEl.value = text;
    }
    var r = count(text);
    // 状态徽章：有内容=实时输入中（荧光绿），空=等待输入（灰）
    var hasText = text.length > 0;
    out.badge.textContent = hasText ? '实时输入中' : '等待输入';
    out.badge.classList.toggle('is-idle', !hasText);
    out.total.textContent = r.total;
    out.chinese.textContent = r.chinese;
    out.words.textContent = r.words;
    out.numbers.textContent = r.numbers;
    out.paragraphs.textContent = r.paragraphs;
    out.lines.textContent = r.lines + ' 行';
    out.punct.textContent = r.punct;
    out.spaces.textContent = r.spaces;

    // 中文 300 字/分钟、英文 150 词/分钟估算，至少 1 分钟
    var minutes = r.total ? Math.max(1, Math.ceil(r.chinese / 300 + r.words / 150)) : 0;
    out.read.textContent = '约 ' + minutes + ' 分钟';
    out.counter.textContent = text.length + ' / ' + MAX + ' 字符';
  }

  textEl.addEventListener('input', render);

  function copy(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动选择文本'); }
    document.body.removeChild(ta);
  }

  function flash(btn, label, done) {
    var old = label.textContent;
    label.textContent = '已复制';
    btn.classList.add('is-done');
    setTimeout(function () {
      label.textContent = old;
      btn.classList.remove('is-done');
      if (done) done();
    }, 1600);
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'wc-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('is-out'); }, 2200);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2700);
  }

  $('wcClear').addEventListener('click', function () {
    textEl.value = '';
    render();
    textEl.focus();
  });

  $('wcCopy').addEventListener('click', function () {
    var btn = this;
    if (!textEl.value) { toast('暂无可复制的内容'); return; }
    copy(textEl.value, function () { flash(btn, $('wcCopyLabel')); });
  });

  $('wcPaste').addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      toast('浏览器未开放剪贴板读取，请用 Ctrl / Cmd + V 粘贴');
      return;
    }
    navigator.clipboard.readText().then(function (text) {
      if (!text) { toast('剪贴板中没有文本'); return; }
      textEl.value = (textEl.value ? textEl.value + '\n' : '') + text.slice(0, MAX);
      render();
      textEl.focus();
    }, function () {
      toast('粘贴需授权，请用 Ctrl / Cmd + V 粘贴');
    });
  });

  var copyResultBtn = $('wcCopyResult');
  copyResultBtn.addEventListener('click', function () {
    var r = count(textEl.value);
    var result = [
      '总字符数：' + r.total,
      '中文字：' + r.chinese,
      '英文单词：' + r.words,
      '数字：' + r.numbers,
      '段落数：' + r.paragraphs,
      '行数：' + r.lines,
      '标点符号：' + r.punct,
      '空格数：' + r.spaces
    ].join('\n');
    copy(result, function () { flash(copyResultBtn, $('wcCopyResultLabel')); });
  });

  render();
})();
