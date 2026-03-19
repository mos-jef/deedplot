// ═══════════════ ANNOTATIONS ═══════════════
// State
let annotations = [];
let annoDeleteTargetIdx = -1;

const ANNO_FONTS = [
  { name: "Inter", family: "'Inter', sans-serif" },
  { name: "Source Sans 3", family: "'Source Sans 3', sans-serif" },
  { name: "Raleway", family: "'Raleway', sans-serif" },
  { name: "Nunito", family: "'Nunito', sans-serif" },
  { name: "Oswald", family: "'Oswald', sans-serif" },
  { name: "Merriweather", family: "'Merriweather', serif" },
  { name: "Playfair Display", family: "'Playfair Display', serif" },
  { name: "Lora", family: "'Lora', serif" },
  { name: "PT Serif", family: "'PT Serif', serif" },
  { name: "Roboto Slab", family: "'Roboto Slab', serif" },
  { name: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
  { name: "Fira Code", family: "'Fira Code', monospace" },
];
const ANNO_WEIGHTS = [
  { label: "Thin", value: 100, style: "normal" },
  { label: "Regular", value: 400, style: "normal" },
  { label: "Semi Bold", value: 600, style: "normal" },
  { label: "Bold", value: 700, style: "normal" },
  { label: "Black", value: 900, style: "normal" },
  { label: "sep" },
  { label: "Italic Thin", value: 100, style: "italic" },
  { label: "Italic Regular", value: 400, style: "italic" },
];
const ANNO_SIZES = [8, 12, 16, 20, 24, 32, 64];

let annoModalState = {
  fontFamily: ANNO_FONTS[0],
  weight: ANNO_WEIGHTS[1],
  size: 24,
  textColor: "#000000",
  textAlpha: 100,
  bgColor: "#0f1117",
  bgAlpha: 80,
  bgEnabled: true,
};

// ═══ INJECT MODAL HTML ═══
function initAnnotations() {
  // Inject the delete CTA into the canvas container
  const container = $("canvasContainer");
  const deleteCta = document.createElement("div");
  deleteCta.className = "anno-delete-cta";
  deleteCta.id = "annoDeleteCta";
  deleteCta.innerHTML = `
    <div class="x-icon">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round">
        <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
      </svg>
    </div>
    <span>Delete?</span>
  `;
  container.appendChild(deleteCta);

  // Inject the modal overlay
  const overlay = document.createElement("div");
  overlay.className = "anno-overlay";
  overlay.id = "annoOverlay";
  overlay.innerHTML = `
    <div class="anno-modal">
      <div class="anno-modal-header">
        <div class="spacer"></div>
        <span class="title">Note</span>
        <button class="anno-close-btn" id="annoCloseBtn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round">
            <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="anno-modal-divider"></div>
      <div class="anno-modal-body">
        <textarea class="anno-textarea" id="annoText" placeholder="Type your annotation..."></textarea>

        <div class="anno-control-row">
          <div class="anno-color-group">
            <label>Text</label>
            <div class="anno-color-control">
              <div class="anno-swatch-area">
                <div class="anno-color-dot" id="annoTextDot" style="background:#000000"></div>
                <span class="anno-color-hex" id="annoTextHex">000000</span>
                <input type="color" id="annoTextPicker" value="#000000">
              </div>
              <button class="anno-opacity-btn" id="annoTextOpBtn">100%</button>
              <div class="anno-opacity-popup" id="annoTextOpPop">
                <input type="range" min="0" max="100" value="100" id="annoTextOpSlider">
                <span id="annoTextOpVal">100%</span>
              </div>
            </div>
          </div>
          <button class="anno-post-btn" id="annoPostBtn">POST</button>
        </div>

        <div class="anno-bg-row">
          <div class="anno-color-group" style="flex:1">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;margin-left:4px;">
              <label style="margin:0">BG</label>
              <label class="anno-bg-toggle" style="margin:0">
                <input type="checkbox" id="annoBgEnabled" checked>
                <span style="font-size:10px;color:#a09888;">show</span>
              </label>
            </div>
            <div class="anno-color-control">
              <div class="anno-swatch-area">
                <div class="anno-color-dot" id="annoBgDot" style="background:#0f1117"></div>
                <span class="anno-color-hex" id="annoBgHex">0F1117</span>
                <input type="color" id="annoBgPicker" value="#0f1117">
              </div>
              <button class="anno-opacity-btn" id="annoBgOpBtn">80%</button>
              <div class="anno-opacity-popup" id="annoBgOpPop">
                <input type="range" min="0" max="100" value="80" id="annoBgOpSlider">
                <span id="annoBgOpVal">80%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="anno-dropdown-wrap" id="annoFontWrap">
          <button class="anno-dropdown-btn" id="annoFontBtn">
            <span id="annoFontLabel">Inter</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="anno-dropdown-menu above" id="annoFontMenu"></div>
        </div>
        <div class="anno-font-row">
          <div class="anno-dropdown-wrap" id="annoWeightWrap">
            <button class="anno-dropdown-btn" id="annoWeightBtn">
              <span id="annoWeightLabel">Regular</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="anno-dropdown-menu above" id="annoWeightMenu"></div>
          </div>
          <div class="anno-dropdown-wrap" id="annoSizeWrap">
            <button class="anno-dropdown-btn" id="annoSizeBtn">
              <span id="annoSizeLabel">24</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="anno-dropdown-menu above" id="annoSizeMenu"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Wire up events
  $("annoCloseBtn").addEventListener("click", closeAnnoModal);
  $("annoPostBtn").addEventListener("click", postAnnotation);
  $("annoBgEnabled").addEventListener("change", (e) => {
    annoModalState.bgEnabled = e.target.checked;
  });

  setupAnnoColor("annoText", "textColor", "textAlpha");
  setupAnnoColor("annoBg", "bgColor", "bgAlpha");
  setupAnnoDropdown(
    "annoFontWrap",
    "annoFontBtn",
    "annoFontMenu",
    ANNO_FONTS,
    (f) => {
      annoModalState.fontFamily = f;
      $("annoFontLabel").textContent = f.name;
      applyAnnoTextareaStyles();
    },
    (el, f) => {
      el.textContent = f.name;
      el.style.fontFamily = f.family;
    },
  );
  setupAnnoDropdown(
    "annoWeightWrap",
    "annoWeightBtn",
    "annoWeightMenu",
    ANNO_WEIGHTS,
    (w) => {
      annoModalState.weight = w;
      $("annoWeightLabel").textContent = w.label;
      applyAnnoTextareaStyles();
    },
    (el, w) => {
      el.textContent = w.label;
      el.style.fontWeight = w.value;
      el.style.fontStyle = w.style;
    },
  );
  setupAnnoDropdown(
    "annoSizeWrap",
    "annoSizeBtn",
    "annoSizeMenu",
    ANNO_SIZES,
    (s) => {
      annoModalState.size = s;
      $("annoSizeLabel").textContent = s;
      applyAnnoTextareaStyles();
    },
    (el, s) => {
      el.textContent = s;
    },
  );

  // Delete CTA — use mousedown so it fires before the document click dismiss
  deleteCta.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (annoDeleteTargetIdx >= 0 && annoDeleteTargetIdx < annotations.length) {
      saveUndo();
      annotations.splice(annoDeleteTargetIdx, 1);
      redraw();
    }
    hideAnnoDeleteCta();
  });

  // Dismiss delete CTA on outside click (mousedown to match)
  document.addEventListener("mousedown", (e) => {
    if (deleteCta.classList.contains("show") && !deleteCta.contains(e.target)) {
      hideAnnoDeleteCta();
    }
  });
}

// ═══ MODAL OPEN / CLOSE ═══
function openAnnoModal() {
  $("annoOverlay").classList.add("show");
  $("annoText").value = "";
  $("annoText").focus();
  applyAnnoTextareaStyles();
}

function closeAnnoModal() {
  $("annoOverlay").classList.remove("show");
  closeAllAnnoDropdowns();
}

function applyAnnoTextareaStyles() {
  const ta = $("annoText");
  ta.style.fontFamily = annoModalState.fontFamily.family;
  ta.style.fontWeight = annoModalState.weight.value;
  ta.style.fontStyle = annoModalState.weight.style;
  ta.style.fontSize = annoModalState.size + "px";
}

// ═══ POST ═══
function postAnnotation() {
  const text = $("annoText").value.trim();
  if (!text) {
    showToast("Type some text first");
    return;
  }

  saveUndo();
  annotations.push({
    text: text,
    wx: cam.x,
    wy: cam.y,
    fontFamilyName: annoModalState.fontFamily.name,
    fontFamilyCSS: annoModalState.fontFamily.family,
    fontWeight: annoModalState.weight.value,
    fontStyle: annoModalState.weight.style,
    size: annoModalState.size,
    textColor: annoModalState.textColor,
    textAlpha: annoModalState.textAlpha,
    bgColor: annoModalState.bgColor,
    bgAlpha: annoModalState.bgAlpha,
    bgEnabled: annoModalState.bgEnabled,
  });
  closeAnnoModal();
  redraw();
  showToast("Note posted");
}

// ═══ DRAW ANNOTATIONS ON CANVAS ═══
function drawAnnotations() {
  for (const a of annotations) {
    const s = w2s(a.wx, a.wy);
    const lines = a.text.split("\n");
    const fontSize = a.size * Math.min(1.5, cam.zoom * 3);
    const lineHeight = fontSize * 1.3;
    const totalHeight = lines.length * lineHeight;

    ctx.save();
    const fontStyleStr =
      (a.fontStyle === "italic" ? "italic " : "") +
      a.fontWeight +
      " " +
      fontSize +
      "px " +
      a.fontFamilyCSS;
    ctx.font = fontStyleStr;

    let maxW = 0;
    for (const ln of lines) {
      const w = ctx.measureText(ln).width;
      if (w > maxW) maxW = w;
    }

    const padX = 8,
      padY = 5;
    const boxW = maxW + padX * 2;
    const boxH = totalHeight + padY * 2;

    // Store screen-space hit area for interaction
    a._sx = s.x;
    a._sy = s.y;
    a._hitW = boxW;
    a._hitH = boxH;

    // BG box
    if (a.bgEnabled) {
      const br = parseInt(a.bgColor.slice(1, 3), 16);
      const bg = parseInt(a.bgColor.slice(3, 5), 16);
      const bb = parseInt(a.bgColor.slice(5, 7), 16);
      ctx.fillStyle =
        "rgba(" + br + "," + bg + "," + bb + "," + a.bgAlpha / 100 + ")";
      roundRect(ctx, s.x - boxW / 2, s.y - boxH / 2, boxW, boxH, 4);
      ctx.fill();
    }

    // Text
    const tr = parseInt(a.textColor.slice(1, 3), 16);
    const tg = parseInt(a.textColor.slice(3, 5), 16);
    const tb = parseInt(a.textColor.slice(5, 7), 16);
    ctx.fillStyle =
      "rgba(" + tr + "," + tg + "," + tb + "," + a.textAlpha / 100 + ")";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const startY = s.y - totalHeight / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], s.x, startY + i * lineHeight);
    }
    ctx.restore();
  }
}

// ═══ HIT TEST ═══
function hitTestAnno(sx, sy) {
  for (let i = annotations.length - 1; i >= 0; i--) {
    const a = annotations[i];
    if (a._sx === undefined) continue;
    const hw = (a._hitW || 60) / 2,
      hh = (a._hitH || 20) / 2;
    if (
      sx >= a._sx - hw &&
      sx <= a._sx + hw &&
      sy >= a._sy - hh &&
      sy <= a._sy + hh
    ) {
      return i;
    }
  }
  return -1;
}

// ═══ DELETE CTA ═══
function showAnnoDeleteCta(anno) {
  const cta = $("annoDeleteCta");
  cta.style.left = anno._sx + "px";
  cta.style.top = anno._sy - (anno._hitH || 20) / 2 + "px";
  cta.classList.add("show");
}

function hideAnnoDeleteCta() {
  $("annoDeleteCta").classList.remove("show");
  annoDeleteTargetIdx = -1;
}

// ═══ COLOR HELPER ═══
function setupAnnoColor(prefix, stateKey, alphaKey) {
  const picker = $(prefix + "Picker");
  const dot = $(prefix + "Dot");
  const hex = $(prefix + "Hex");
  const opBtn = $(prefix + "OpBtn");
  const opPop = $(prefix + "OpPop");
  const opSlider = $(prefix + "OpSlider");
  const opVal = $(prefix + "OpVal");

  picker.addEventListener("input", (e) => {
    annoModalState[stateKey] = e.target.value;
    dot.style.background = e.target.value;
    hex.textContent = e.target.value.slice(1).toUpperCase();
  });
  opBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeAllAnnoDropdowns();
    opPop.classList.toggle("show");
  });
  opSlider.value = annoModalState[alphaKey];
  opVal.textContent = annoModalState[alphaKey] + "%";
  opBtn.textContent = annoModalState[alphaKey] + "%";
  opSlider.addEventListener("input", (e) => {
    annoModalState[alphaKey] = parseInt(e.target.value);
    opBtn.textContent = annoModalState[alphaKey] + "%";
    opVal.textContent = annoModalState[alphaKey] + "%";
  });
}

// ═══ DROPDOWN HELPER ═══
function closeAllAnnoDropdowns() {
  document
    .querySelectorAll(".anno-dropdown-menu")
    .forEach((m) => m.classList.remove("show"));
  document
    .querySelectorAll(".anno-dropdown-btn")
    .forEach((b) => b.classList.remove("open"));
  document
    .querySelectorAll(".anno-opacity-popup")
    .forEach((p) => p.classList.remove("show"));
}

function setupAnnoDropdown(wrapId, btnId, menuId, items, onSelect, renderItem) {
  const btn = $(btnId);
  const menu = $(menuId);
  menu.innerHTML = "";
  items.forEach((item) => {
    if (item.label === "sep" || item === "sep") {
      const sep = document.createElement("div");
      sep.className = "anno-dropdown-sep";
      menu.appendChild(sep);
      return;
    }
    const div = document.createElement("div");
    div.className = "anno-dropdown-item";
    renderItem(div, item);
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      onSelect(item);
      closeAllAnnoDropdowns();
    });
    menu.appendChild(div);
  });
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const wasOpen = menu.classList.contains("show");
    closeAllAnnoDropdowns();
    if (!wasOpen) {
      menu.classList.add("show");
      btn.classList.add("open");
    }
  });
}
