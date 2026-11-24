/* ============================================================
   图片编辑工具页 · 本地上传预览 / 画布缩放 / 裁剪工具
   所有处理在浏览器本地完成，不上传任何图片
   ============================================================ */
(function () {
  'use strict';

  var content = document.getElementById('ieContent');
  var stage = document.getElementById('ieStage');
  if (!content || !stage) return;

  var fileInput = document.getElementById('ieFile');
  var image = document.getElementById('ieImage');
  var badge = document.getElementById('ieBadge');
  var sizeEl = document.getElementById('ieSize');
  var kicker = document.getElementById('ieKicker');
  var noteText = document.getElementById('ieNoteText');
  var tools = Array.prototype.slice.call(document.querySelectorAll('.ie-mini-btn'));
  var toolItems = Array.prototype.slice.call(document.querySelectorAll('.ie-tool'));
  var exportBtn = document.getElementById('ieExport');

  var scale = 1;
  var MIN = 0.3;
  var MAX = 3;
  var STEP = 0.1;

  function hasImage() { return stage.classList.contains('has-image'); }

  function applyScale() { image.style.transform = 'scale(' + scale + ')'; }
  function setScale(next) {
    scale = Math.max(MIN, Math.min(MAX, Math.round(next * 10) / 10));
    applyScale();
  }
  function updateButtons() {
    var ready = hasImage();
    tools.forEach(function (btn) {
      btn.disabled = !ready && btn.getAttribute('data-act') !== 'reset';
    });
    if (exportBtn) exportBtn.disabled = !ready;
  }

  // ---------- 上传 ----------
  var cropPhoto = document.getElementById('ieCropPhoto');
  var cropImage = document.getElementById('ieCropImage');
  var rotatePhoto = document.getElementById('ieRotatePhoto');
  var rotateImage = document.getElementById('ieRotateImage');

  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast('请选择图片文件'); return; }
    var reader = new FileReader();
    reader.onload = function (e) {
      var data = e.target.result;
      var probe = new Image();
      probe.onload = function () { adoptWorkingImage(data, probe.naturalWidth, probe.naturalHeight); };
      probe.onerror = function () { adoptWorkingImage(data, 640, 400); };
      probe.src = data;
    };
    reader.readAsDataURL(file);
  }

  stage.addEventListener('click', function (e) {
    if (e.target.closest('.ie-canvas__image')) return;
    fileInput.click();
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) loadFile(fileInput.files[0]);
    fileInput.value = '';
  });
  ['dragenter', 'dragover'].forEach(function (evt) {
    stage.addEventListener(evt, function (e) { e.preventDefault(); stage.classList.add('is-over'); });
  });
  ['dragleave', 'drop'].forEach(function (evt) {
    stage.addEventListener(evt, function (e) { e.preventDefault(); stage.classList.remove('is-over'); });
  });
  stage.addEventListener('drop', function (e) {
    var dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) loadFile(dt.files[0]);
  });

  tools.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var act = btn.getAttribute('data-act');
      if (act === 'zoom-out') setScale(scale - STEP);
      else if (act === 'zoom-in') setScale(scale + STEP);
      else if (act === 'fit') setScale(1);
      else if (act === 'reset') clearWorkingImage();
    });
  });

  // ---------- 视图切换 ----------
  var VIEW_COPY = {
    list: {
      kicker: 'TOOLBOX / IMAGE EDITOR',
      note: '使用说明：所有图片处理均在浏览器本地完成，不会上传或存储任何图片；导出时可选择目标格式与画质。'
    },
    crop: {
      kicker: 'IMAGE EDITOR / CROP',
      note: '使用说明：拖拽裁剪框四角可调整选区，锁定比例后宽高将等比联动；点击「应用裁剪」完成操作，所有处理均在本地完成。'
    },
    rotate: {
      kicker: 'IMAGE EDITOR / ROTATE',
      note: '使用说明：输入角度或拖动滑条调整旋转，左旋 / 右旋按 90° 步进，镜像翻转可叠加；点击「应用旋转」完成操作，所有处理均在本地完成。'
    },
    compress: {
      kicker: 'IMAGE EDITOR / COMPRESS',
      note: '使用说明：调整图片质量与输出尺寸，左侧会实时预览压缩效果与体积变化；点击「开始压缩」完成操作，所有处理均在本地完成。'
    }
  };

  function switchView(name) {
    content.setAttribute('data-view', name);
    kicker.textContent = VIEW_COPY[name].kicker;
    noteText.textContent = VIEW_COPY[name].note;
    if (name === 'crop') syncCropToInputs();
    if (name === 'rotate') renderRotate();
    if (name === 'compress') renderCompressPreview();
  }

  toolItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var tool = item.getAttribute('data-tool');
      if (tool === '裁剪') switchView('crop');
      else if (tool === '旋转翻转') switchView('rotate');
      else if (tool === '图片压缩') switchView('compress');
      else if (!hasImage()) toast('请先上传一张图片');
      else toast('「' + tool + '」即将上线');
    });
  });
  document.getElementById('ieCropBack').addEventListener('click', function () { switchView('list'); });
  document.getElementById('ieRotateBack').addEventListener('click', function () { switchView('list'); });
  document.getElementById('ieCompressBack').addEventListener('click', function () { switchView('list'); });

  // ---------- 裁剪框逻辑 ----------
  var photoW = 640, photoH = 400; // 当前预览容器显示尺寸
  var srcW = 640, srcH = 400; // 当前工作图片尺寸（像素）
  var workingSrc = ''; // 全工具共享的当前工作图片
  var crop = { x: 60, y: 54, w: 520, h: 292 };
  var activeRatio = 16 / 9;
  var box = document.getElementById('ieCropBox');
  var masks = {
    top: document.querySelector('.ie-crop-mask--top'),
    bottom: document.querySelector('.ie-crop-mask--bottom'),
    left: document.querySelector('.ie-crop-mask--left'),
    right: document.querySelector('.ie-crop-mask--right')
  };
  var wInput = document.getElementById('ieCropW');
  var hInput = document.getElementById('ieCropH');
  var lockInput = document.getElementById('ieCropLock');

  function pct(v, base) { return (v / base * 100) + '%'; }
  function renderCrop() {
    box.style.left = pct(crop.x, photoW);
    box.style.top = pct(crop.y, photoH);
    box.style.width = pct(crop.w, photoW);
    box.style.height = pct(crop.h, photoH);
    masks.top.style.cssText = 'left:0;top:0;width:100%;height:' + pct(crop.y, photoH);
    masks.bottom.style.cssText = 'left:0;top:' + pct(crop.y + crop.h, photoH) + ';width:100%;height:' + pct(photoH - crop.y - crop.h, photoH);
    masks.left.style.cssText = 'left:0;top:' + pct(crop.y, photoH) + ';width:' + pct(crop.x, photoW) + ';height:' + pct(crop.h, photoH);
    masks.right.style.cssText = 'left:' + pct(crop.x + crop.w, photoW) + ';top:' + pct(crop.y, photoH) + ';width:' + pct(photoW - crop.x - crop.w, photoW) + ';height:' + pct(crop.h, photoH);
  }
  function clampCrop() {
    crop.w = Math.max(40, Math.min(crop.w, photoW - crop.x));
    crop.h = Math.max(40, Math.min(crop.h, photoH - crop.y));
    crop.x = Math.max(0, Math.min(crop.x, photoW - crop.w));
    crop.y = Math.max(0, Math.min(crop.y, photoH - crop.h));
  }
  // 把 640×400 显示坐标换算成原图像素写回输入框
  function syncCropToInputs() {
    wInput.value = Math.round(crop.w / photoW * srcW);
    hInput.value = Math.round(crop.h / photoH * srcH);
  }
  // 预览容器按当前工作图片宽高比等比适配（保留设计稿画布上限）
  function fitOnePhoto(el, boxW, boxH, w, h) {
    var s = Math.min(boxW / w, boxH / h);
    var dw = Math.max(1, Math.round(w * s));
    var dh = Math.max(1, Math.round(h * s));
    el.style.width = dw + 'px';
    el.style.height = 'auto';
    el.style.aspectRatio = dw + ' / ' + dh;
    return { w: dw, h: dh };
  }
  function fitPhotoContainers(w, h) {
    var dim = fitOnePhoto(cropPhoto, 640, 400, w, h);
    fitOnePhoto(rotatePhoto, 600, 360, w, h);
    // 裁剪框按比例映射到新容器，保留选区相对位置
    crop.x = crop.x / photoW * dim.w;
    crop.y = crop.y / photoH * dim.h;
    crop.w = crop.w / photoW * dim.w;
    crop.h = crop.h / photoH * dim.h;
    photoW = dim.w; photoH = dim.h;
    clampCrop();
  }

  // 统一写入当前工作图片：上传与任意工具应用后都走这里，保证编辑链路连续
  function adoptWorkingImage(src, w, h) {
    workingSrc = src;
    srcW = w; srcH = h;
    image.src = src;
    cropImage.src = src;
    rotateImage.src = src;
    cropPhoto.classList.add('has-image');
    rotatePhoto.classList.add('has-image');
    stage.classList.add('has-image');
    badge.textContent = '已上传';
    badge.classList.add('is-ready');
    sizeEl.textContent = w + ' × ' + h + ' px';
    fitPhotoContainers(w, h);
    scale = 1; applyScale();
    resetTransform();
    resetRotate();
    renderCrop();
    syncCropToInputs();
    syncCompressToWorking();
    updateButtons();
  }

  function clearWorkingImage() {
    workingSrc = '';
    srcW = 640; srcH = 400;
    image.removeAttribute('src');
    cropImage.removeAttribute('src');
    rotateImage.removeAttribute('src');
    cropPhoto.classList.remove('has-image');
    rotatePhoto.classList.remove('has-image');
    stage.classList.remove('has-image');
    badge.textContent = '等待上传';
    badge.classList.remove('is-ready');
    sizeEl.textContent = '1920 × 1080 px';
    crop = { x: 60, y: 54, w: 520, h: 292 };
    photoW = 640; photoH = 400;
    [cropPhoto, rotatePhoto].forEach(function (el) {
      el.style.width = ''; el.style.height = ''; el.style.aspectRatio = '';
    });
    scale = 1; applyScale();
    resetTransform();
    resetRotate();
    renderCrop();
    syncCropToInputs();
    clearCompress();
    updateButtons();
  }

  // 四角拖拽 + 框体移动
  var dragging = null;
  function startDrag(e, mode) {
    e.preventDefault();
    e.stopPropagation();
    var rect = document.getElementById('ieCropStage').getBoundingClientRect();
    var photoRect = cropPhoto.getBoundingClientRect();
    dragging = {
      mode: mode,
      sx: e.clientX, sy: e.clientY,
      ox: crop.x, oy: crop.y, ow: crop.w, oh: crop.h,
      kx: photoW / photoRect.width, ky: photoH / photoRect.height
    };
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
  }
  function onDrag(e) {
    if (!dragging) return;
    var dx = (e.clientX - dragging.sx) * dragging.kx;
    var dy = (e.clientY - dragging.sy) * dragging.ky;
    var m = dragging.mode;
    if (m === 'move') {
      crop.x = dragging.ox + dx; crop.y = dragging.oy + dy;
    } else {
      var x1 = dragging.ox, y1 = dragging.oy, x2 = dragging.ox + dragging.ow, y2 = dragging.oy + dragging.oh;
      if (m.indexOf('w') >= 0) x1 = dragging.ox + dx;
      if (m.indexOf('e') >= 0) x2 = dragging.ox + dragging.ow + dx;
      if (m.indexOf('n') >= 0) y1 = dragging.oy + dy;
      if (m.indexOf('s') >= 0) y2 = dragging.oy + dragging.oh + dy;
      crop.x = Math.min(x1, x2 - 40); crop.w = Math.abs(x2 - x1);
      crop.y = Math.min(y1, y2 - 40); crop.h = Math.abs(y2 - y1);
      if (lockInput.checked && activeRatio) {
        crop.h = crop.w / activeRatio;
        if (crop.y + crop.h > photoH) { crop.h = photoH - crop.y; crop.w = crop.h * activeRatio; }
      }
    }
    clampCrop();
    renderCrop();
    syncCropToInputs();
  }
  function endDrag() {
    dragging = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
  }
  box.addEventListener('mousedown', function (e) {
    if (e.target.classList.contains('ie-crop-handle')) return;
    startDrag(e, 'move');
  });
  Array.prototype.slice.call(box.querySelectorAll('.ie-crop-handle')).forEach(function (h) {
    h.addEventListener('mousedown', function (e) { startDrag(e, h.getAttribute('data-h')); });
  });

  // 比例 chips
  document.getElementById('ieCropChips').addEventListener('click', function (e) {
    var chip = e.target.closest('.ie-crop-chip');
    if (!chip) return;
    Array.prototype.slice.call(this.querySelectorAll('.ie-crop-chip')).forEach(function (c) { c.classList.remove('is-active'); });
    chip.classList.add('is-active');
    var r = chip.getAttribute('data-ratio');
    if (r === 'free') { activeRatio = 0; lockInput.checked = false; return; }
    if (r === 'origin') { activeRatio = srcW / srcH; }
    else {
      var parts = r.split(':');
      activeRatio = parseInt(parts[0], 10) / parseInt(parts[1], 10);
    }
    lockInput.checked = true;
    // 以当前中心重设裁剪框尺寸
    var cx = crop.x + crop.w / 2, cy = crop.y + crop.h / 2;
    var w = Math.min(photoW * 0.8125, photoW - 20);
    var h = w / activeRatio;
    if (h > photoH - 20) { h = photoH - 20; w = h * activeRatio; }
    crop.w = w; crop.h = h;
    crop.x = cx - w / 2; crop.y = cy - h / 2;
    clampCrop(); renderCrop(); syncCropToInputs();
  });

  // 尺寸输入联动
  function onSizeInput(which) {
    var v = parseInt(which === 'w' ? wInput.value : hInput.value, 10);
    if (!v || v < 1) return;
    var px = which === 'w' ? v / srcW * photoW : v / srcH * photoH;
    if (lockInput.checked && activeRatio) {
      if (which === 'w') { crop.w = px; crop.h = px / activeRatio; }
      else { crop.h = px; crop.w = px * activeRatio; }
    } else {
      if (which === 'w') crop.w = px; else crop.h = px;
    }
    clampCrop(); renderCrop();
    if (which === 'w' && lockInput.checked && activeRatio) hInput.value = Math.round(crop.h / photoH * srcH);
    if (which === 'h' && lockInput.checked && activeRatio) wInput.value = Math.round(crop.w / photoW * srcW);
  }
  wInput.addEventListener('input', function () { onSizeInput('w'); });
  hInput.addEventListener('input', function () { onSizeInput('h'); });

  // 旋转翻转（作用于示例/已上传图片）
  var rot = 0, flipH = false, flipV = false;
  function resetTransform() { rot = 0; flipH = flipV = false; cropImage.style.transform = ''; }
  function applyTransform() {
    cropImage.style.transform = 'rotate(' + rot + 'deg) scaleX(' + (flipH ? -1 : 1) + ') scaleY(' + (flipV ? -1 : 1) + ')';
  }
  document.querySelector('.ie-crop-rotate').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var a = btn.getAttribute('data-rot');
    if (a === 'left') rot -= 90;
    else if (a === 'right') rot += 90;
    else if (a === 'hflip') flipH = !flipH;
    else if (a === 'vflip') flipV = !flipV;
    if (!cropPhoto.classList.contains('has-image')) { toast('上传图片后可查看旋转效果'); return; }
    applyTransform();
  });

  // 应用裁剪：本地生成裁剪结果并回到工具列表
  document.getElementById('ieCropApply').addEventListener('click', function () {
    if (!workingSrc || !cropImage.naturalWidth) { toast('请先上传一张图片'); return; }
    var sx = crop.x / photoW * cropImage.naturalWidth;
    var sy = crop.y / photoH * cropImage.naturalHeight;
    var sw = crop.w / photoW * cropImage.naturalWidth;
    var sh = crop.h / photoH * cropImage.naturalHeight;
    var canvas = document.createElement('canvas');
    canvas.width = Math.round(sw); canvas.height = Math.round(sh);
    var ctx = canvas.getContext('2d');
    ctx.drawImage(cropImage, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    var result = canvas.toDataURL('image/png');
    adoptWorkingImage(result, canvas.width, canvas.height);
    switchView('list');
    toast('裁剪已应用');
  });

  renderCrop();
  updateButtons();

  // ---------- 旋转翻转逻辑 ----------
  var rotateAngle = 0, rotateFlipH = false, rotateFlipV = false;
  var angleInput = document.getElementById('ieRotateAngle');
  var angleSlider = document.getElementById('ieRotateSlider');
  var rotateBadge = document.getElementById('ieRotateBadge');
  var tickButtons = Array.prototype.slice.call(document.querySelectorAll('#ieRotateTicks button'));
  var flipButtons = Array.prototype.slice.call(document.querySelectorAll('.ie-rotate-flips button'));

  function renderRotate() {
    rotateAngle = Math.max(0, Math.min(360, Math.round(rotateAngle)));
    angleInput.value = rotateAngle;
    angleSlider.value = rotateAngle;
    angleSlider.style.setProperty('--fill', (rotateAngle / 360 * 100) + '%');
    rotateBadge.textContent = '旋转 ' + rotateAngle + '°';
    rotatePhoto.style.transform = 'rotate(' + rotateAngle + 'deg) scaleX(' + (rotateFlipH ? -1 : 1) + ') scaleY(' + (rotateFlipV ? -1 : 1) + ')';
    tickButtons.forEach(function (b) {
      b.classList.toggle('is-active', parseInt(b.getAttribute('data-angle'), 10) === rotateAngle);
    });
    flipButtons.forEach(function (b) {
      var on = b.getAttribute('data-flip') === 'h' ? rotateFlipH : rotateFlipV;
      b.classList.toggle('is-active', on);
    });
  }
  function setAngle(v) { rotateAngle = v; renderRotate(); }
  function resetRotate() {
    rotateAngle = 0; rotateFlipH = false; rotateFlipV = false;
    renderRotate();
  }

  angleInput.addEventListener('input', function () {
    var v = parseInt(angleInput.value, 10);
    if (!isNaN(v)) setAngle(v);
  });
  angleInput.addEventListener('blur', function () { angleInput.value = rotateAngle; });
  angleSlider.addEventListener('input', function () { setAngle(parseInt(angleSlider.value, 10)); });
  document.getElementById('ieRotateTicks').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) setAngle(parseInt(b.getAttribute('data-angle'), 10));
  });
  document.querySelector('.ie-rotate-quick').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var next = rotateAngle + (b.getAttribute('data-rot') === 'left' ? -90 : 90);
    setAngle((next + 360) % 360);
  });
  document.querySelector('.ie-rotate-flips').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.getAttribute('data-flip') === 'h') rotateFlipH = !rotateFlipH;
    else rotateFlipV = !rotateFlipV;
    renderRotate();
  });
  document.getElementById('ieRotateReset').addEventListener('click', function () {
    resetRotate();
    toast('旋转已重置');
  });
  document.getElementById('ieRotateApply').addEventListener('click', function () {
    if (!workingSrc || !rotateImage.naturalWidth) { toast('请先上传一张图片'); return; }
    var w = rotateImage.naturalWidth, h = rotateImage.naturalHeight;
    var rad = rotateAngle * Math.PI / 180;
    var cw = Math.round(Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad)));
    var ch = Math.round(Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad)));
    var canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    var ctx = canvas.getContext('2d');
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate(rad);
    ctx.scale(rotateFlipH ? -1 : 1, rotateFlipV ? -1 : 1);
    ctx.drawImage(rotateImage, -w / 2, -h / 2, w, h);
    var result = canvas.toDataURL('image/png');
    adoptWorkingImage(result, cw, ch);
    switchView('list');
    toast('旋转已应用');
  });

  renderRotate();

  // ---------- 图片压缩逻辑 ----------
  var qualitySlider = document.getElementById('ieQualitySlider');
  var qualityValue = document.getElementById('ieQualityValue');
  var compW = document.getElementById('ieCompressW');
  var compH = document.getElementById('ieCompressH');
  var beforePhoto = document.getElementById('ieBeforePhoto');
  var beforeImage = document.getElementById('ieBeforeImage');
  var beforeSize = document.getElementById('ieBeforeSize');
  var afterPhoto = document.getElementById('ieAfterPhoto');
  var afterImage = document.getElementById('ieAfterImage');
  var afterSize = document.getElementById('ieAfterSize');
  var originalSizeEl = document.getElementById('ieOriginalSize');
  var estimatedSizeEl = document.getElementById('ieEstimatedSize');
  var compressBadge = document.getElementById('ieCompressBadge');
  var previewCache = ''; // 当前预览所用的压缩结果

  // dataURL → 近似字节数（base64 每 4 字符 = 3 字节）
  function dataUrlBytes(url) {
    if (!url || url.indexOf(',') < 0) return 0;
    var b64 = url.slice(url.indexOf(',') + 1);
    return Math.floor(b64.length * 3 / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
  }
  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }
  function compressAt(q, w, h) {
    if (!workingSrc || !cropImage.naturalWidth) return '';
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(cropImage, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', q / 100);
  }
  function renderCompressPreview() {
    qualityValue.textContent = qualitySlider.value + '%';
    qualitySlider.style.setProperty('--fill', qualitySlider.value + '%');
    if (!workingSrc) { clearCompress(); return; }
    beforeImage.src = workingSrc;
    beforePhoto.classList.add('has-image');
    var origBytes = dataUrlBytes(workingSrc);
    var w = Math.max(1, parseInt(compW.value, 10) || 1);
    var h = Math.max(1, parseInt(compH.value, 10) || 1);
    var out = compressAt(parseInt(qualitySlider.value, 10), w, h);
    previewCache = out;
    var outBytes = dataUrlBytes(out);
    afterImage.src = out;
    afterPhoto.classList.add('has-image');
    beforeSize.textContent = fmtSize(origBytes);
    afterSize.textContent = fmtSize(outBytes);
    originalSizeEl.textContent = '原始 ' + fmtSize(origBytes);
    estimatedSizeEl.textContent = '≈ ' + fmtSize(outBytes);
    var saved = origBytes ? Math.round((1 - outBytes / origBytes) * 100) : 0;
    compressBadge.textContent = '预计节省 ' + Math.max(0, saved) + '%';
  }
  function clearCompress() {
    previewCache = '';
    beforeImage.removeAttribute('src'); afterImage.removeAttribute('src');
    beforePhoto.classList.remove('has-image'); afterPhoto.classList.remove('has-image');
    // 未上传时保留设计稿示例数值，上传后由真实数据覆盖
    beforeSize.textContent = '2.4 MB'; afterSize.textContent = '0.9 MB';
    originalSizeEl.textContent = '原始 2.4 MB'; estimatedSizeEl.textContent = '≈ 0.9 MB';
    compressBadge.textContent = '预计节省 62%';
  }
  function syncCompressToWorking() {
    compW.value = srcW;
    compH.value = srcH;
    qualitySlider.value = 75;
    renderCompressPreview();
  }

  qualitySlider.addEventListener('input', renderCompressPreview);
  compW.addEventListener('input', function () {
    var v = parseInt(compW.value, 10);
    if (v > 0 && srcW) compH.value = Math.max(1, Math.round(v * srcH / srcW));
    renderCompressPreview();
  });
  compH.addEventListener('input', function () {
    var v = parseInt(compH.value, 10);
    if (v > 0 && srcH) compW.value = Math.max(1, Math.round(v * srcW / srcH));
    renderCompressPreview();
  });
  document.getElementById('ieCompressApply').addEventListener('click', function () {
    if (!workingSrc || !previewCache) { toast('请先上传一张图片'); return; }
    var w = Math.max(1, parseInt(compW.value, 10) || 1);
    var h = Math.max(1, parseInt(compH.value, 10) || 1);
    adoptWorkingImage(previewCache, w, h);
    switchView('list');
    toast('压缩已应用');
  });

  // ---------- 导出图片 ----------
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      if (!workingSrc) { toast('请先上传一张图片'); return; }
      var ext = workingSrc.slice(0, 30).indexOf('data:image/jpeg') >= 0 ? 'jpg' : 'png';
      var a = document.createElement('a');
      a.href = workingSrc;
      a.download = 'rambo-image-' + Date.now() + '.' + ext;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('图片已导出');
    });
  }

  // ---------- toast ----------
  var toastTimer;
  function toast(msg) {
    var el = document.querySelector('.ie-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'ie-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2200);
  }
})();
