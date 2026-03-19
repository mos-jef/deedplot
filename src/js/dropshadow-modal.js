// ═══════════════ DROP SHADOW MODAL ═══════════════

function initDsModal() {
  // Inject modal overlay
  const overlay = document.createElement("div");
  overlay.className = "ds-overlay";
  overlay.id = "dsOverlay";
  overlay.innerHTML = `
    <div class="ds-modal" id="dsModal">
      <div class="ds-modal-header" id="dsHeader">
        <div class="spacer"></div>
        <span class="title">Drop Shadow</span>
        <button class="ds-close-btn" id="dsCloseBtn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round">
            <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="ds-modal-divider"></div>
      <div class="ds-modal-body">
        <div class="ds-slider-group">
          <span class="ds-slider-label">X</span>
          <div class="ds-slider-row">
            <input type="range" id="dsmXSlider" min="-20" max="20" value="2" step="1">
            <input class="ds-slider-val" id="dsmXVal" value="2">
          </div>
        </div>
        <div class="ds-slider-group">
          <span class="ds-slider-label">Y</span>
          <div class="ds-slider-row">
            <input type="range" id="dsmYSlider" min="-20" max="20" value="2" step="1">
            <input class="ds-slider-val" id="dsmYVal" value="2">
          </div>
        </div>
        <div class="ds-slider-group">
          <span class="ds-slider-label">Blur</span>
          <div class="ds-slider-row">
            <input type="range" id="dsmBlurSlider" min="0" max="30" value="4" step="1">
            <input class="ds-slider-val" id="dsmBlurVal" value="4">
          </div>
        </div>
        <div class="ds-slider-group">
          <span class="ds-slider-label">Opacity</span>
          <div class="ds-slider-row">
            <input type="range" id="dsmOpSlider" min="0" max="100" value="30" step="1">
            <input class="ds-slider-val" id="dsmOpVal" value="30%">
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
          <div style="display:flex;align-items:center;gap:2px;">
            <div style="position:relative;display:flex;align-items:center;background:#383838;border-radius:4px;padding:3px 8px 3px 6px;gap:5px;cursor:pointer;">
              <div id="dsmColorDot" style="width:14px;height:14px;border-radius:50%;border:1px solid #555;background:#000000;flex-shrink:0;"></div>
              <span id="dsmColorHex" style="font-size:12px;font-family:'SF Mono',Menlo,monospace;color:#EBE3D4;">000000</span>
              <input type="color" id="dsmColorPicker" value="#000000" style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;border:none;">
            </div>
          </div>
          <button class="ds-remove-btn" id="dsmRemoveBtn">Remove</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Wire events
  $("dsCloseBtn").addEventListener("click", closeDsModal);
  $("dsmRemoveBtn").addEventListener("click", dsmRemoveShadow);

  $("dsmXSlider").addEventListener("input", function() { dsmUpdateFromSlider("x", this); });
  $("dsmYSlider").addEventListener("input", function() { dsmUpdateFromSlider("y", this); });
  $("dsmBlurSlider").addEventListener("input", function() { dsmUpdateFromSlider("blur", this); });
  $("dsmOpSlider").addEventListener("input", function() { dsmUpdateFromSlider("op", this); });

  $("dsmXVal").addEventListener("change", function() { dsmManual("x", this.value); });
  $("dsmYVal").addEventListener("change", function() { dsmManual("y", this.value); });
  $("dsmBlurVal").addEventListener("change", function() { dsmManual("blur", this.value); });
  $("dsmOpVal").addEventListener("change", function() { dsmManual("op", this.value); });

  // Enter to commit
  for (const id of ["dsmXVal","dsmYVal","dsmBlurVal","dsmOpVal"]) {
    $(id).addEventListener("keydown", function(e) { if (e.key === "Enter") this.blur(); });
  }

  $("dsmColorPicker").addEventListener("input", function() {
    const t = tracts[activeTractIdx];
    if (!t || !t.dropShadow) return;
    t.dropShadow.color = this.value;
    $("dsmColorDot").style.background = this.value;
    $("dsmColorHex").textContent = this.value.slice(1).toUpperCase();
    redraw();
  });

  // Draggable
  let dragging = false, dOff = { x: 0, y: 0 };
  const modal = $("dsModal"), header = $("dsHeader");
  header.addEventListener("mousedown", function(e) {
    if (e.target.closest(".ds-close-btn")) return;
    dragging = true;
    const rect = modal.getBoundingClientRect();
    dOff = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  });
  window.addEventListener("mousemove", function(e) {
    if (!dragging) return;
    let nx = e.clientX - dOff.x, ny = e.clientY - dOff.y;
    nx = Math.max(0, Math.min(window.innerWidth - modal.offsetWidth, nx));
    ny = Math.max(0, Math.min(window.innerHeight - modal.offsetHeight, ny));
    modal.style.left = nx + "px"; modal.style.top = ny + "px";
  });
  window.addEventListener("mouseup", function() { dragging = false; });
}

function openDsModal() {
  const t = tracts[activeTractIdx];
  if (!t) { showToast("Select a layer first"); return; }
  if (!t.dropShadow) {
    t.dropShadow = JSON.parse(JSON.stringify(dropShadow));
  }
  $("dsOverlay").classList.add("show");
  // Center
  const m = $("dsModal");
  m.style.left = (window.innerWidth - m.offsetWidth) / 2 + "px";
  m.style.top = (window.innerHeight - m.offsetHeight) / 2 + "px";
  syncDsModal();
}

function closeDsModal() {
  $("dsOverlay").classList.remove("show");
}

function syncDsModal() {
  const t = tracts[activeTractIdx];
  if (!t || !t.dropShadow) return;
  const ds = t.dropShadow;
  $("dsmXSlider").value = ds.x; $("dsmXVal").value = ds.x;
  $("dsmYSlider").value = ds.y; $("dsmYVal").value = ds.y;
  $("dsmBlurSlider").value = ds.blur; $("dsmBlurVal").value = ds.blur;
  const opPct = Math.round(ds.alpha * 100);
  $("dsmOpSlider").value = opPct; $("dsmOpVal").value = opPct + "%";
  $("dsmColorPicker").value = ds.color;
  $("dsmColorDot").style.background = ds.color;
  $("dsmColorHex").textContent = ds.color.slice(1).toUpperCase();
  dsmFillAll();
}

function dsmFill(slider) {
  const min = parseFloat(slider.min), max = parseFloat(slider.max);
  const pct = ((parseFloat(slider.value) - min) / (max - min)) * 100;
  slider.style.setProperty("--pct", pct + "%");
}
function dsmFillAll() {
  dsmFill($("dsmXSlider")); dsmFill($("dsmYSlider"));
  dsmFill($("dsmBlurSlider")); dsmFill($("dsmOpSlider"));
}

function dsmUpdateFromSlider(prop, slider) {
  const t = tracts[activeTractIdx];
  if (!t || !t.dropShadow) return;
  const v = parseInt(slider.value);
  if (prop === "x") { t.dropShadow.x = v; $("dsmXVal").value = v; }
  else if (prop === "y") { t.dropShadow.y = v; $("dsmYVal").value = v; }
  else if (prop === "blur") { t.dropShadow.blur = v; $("dsmBlurVal").value = v; }
  else if (prop === "op") { t.dropShadow.alpha = v / 100; $("dsmOpVal").value = v + "%"; }
  dsmFill(slider);
  redraw();
}

function dsmManual(prop, raw) {
  const t = tracts[activeTractIdx];
  if (!t || !t.dropShadow) return;
  const n = parseFloat(raw.replace(/[^0-9.\-]/g, ""));
  if (isNaN(n)) return;
  if (prop === "x") {
    const c = Math.max(-20, Math.min(20, Math.round(n)));
    t.dropShadow.x = c; $("dsmXSlider").value = c; $("dsmXVal").value = c;
  } else if (prop === "y") {
    const c = Math.max(-20, Math.min(20, Math.round(n)));
    t.dropShadow.y = c; $("dsmYSlider").value = c; $("dsmYVal").value = c;
  } else if (prop === "blur") {
    const c = Math.max(0, Math.min(30, Math.round(n)));
    t.dropShadow.blur = c; $("dsmBlurSlider").value = c; $("dsmBlurVal").value = c;
  } else if (prop === "op") {
    const c = Math.max(0, Math.min(100, Math.round(n)));
    t.dropShadow.alpha = c / 100; $("dsmOpSlider").value = c; $("dsmOpVal").value = c + "%";
  }
  dsmFillAll();
  redraw();
}

function dsmRemoveShadow() {
  const t = tracts[activeTractIdx];
  if (!t) return;
  saveUndo();
  t.dropShadow = null;
  closeDsModal();
  redraw();
  showToast("Drop shadow removed");
}
