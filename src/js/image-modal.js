// ═══════════════ IMAGE MODAL ═══════════════

function initImageModal() {
  const overlay = document.createElement("div");
  overlay.className = "img-overlay";
  overlay.id = "imgOverlay";
  overlay.innerHTML = `
    <div class="img-modal" id="imgModal">
      <div class="img-modal-header" id="imgHeader">
        <div class="spacer"></div>
        <span class="title">Image</span>
        <button class="img-close-btn" id="imgCloseBtn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round">
            <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="img-modal-divider"></div>
      <div class="img-modal-body">
        <div>
          <div style="font-size:11px;color:#EBE3D4;margin-bottom:3px;">IMG</div>
          <div class="img-row">
            <div class="img-thumb" id="imgmThumb"></div>
            <span class="img-name" id="imgmName">No image</span>
            <input class="img-opacity-val" id="imgmOpVal" value="40%">
            <button class="img-icon-btn eye-btn" id="imgmEyeBtn" title="Toggle visibility">
              <svg width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button class="img-icon-btn" id="imgmDelBtn" title="Remove image">
              <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round">
                <line x1="4" y1="12" x2="20" y2="12"/>
              </svg>
            </button>
            <button class="img-icon-btn" id="imgmAddBtn" title="Add / change image">
              <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round">
                <line x1="4" y1="12" x2="20" y2="12"/>
                <line x1="12" y1="4" x2="12" y2="20"/>
              </svg>
            </button>
            <input type="file" id="imgmFileInput" class="img-hidden-input" accept="image/*">
          </div>
        </div>
        <div class="img-slider-group">
          <span class="img-slider-label">Scale</span>
          <div class="img-slider-row">
            <input type="range" id="imgmScaleSlider" min="1" max="2000" value="100" step="1">
            <input class="img-slider-val" id="imgmScaleVal" value="100%">
          </div>
        </div>
        <div class="img-slider-group">
          <span class="img-slider-label">Rotation</span>
          <div class="img-slider-row">
            <input type="range" id="imgmRotSlider" min="-180" max="180" value="0" step="1">
            <input class="img-slider-val" id="imgmRotVal" value="0°">
          </div>
        </div>
        <div class="img-slider-group">
          <span class="img-slider-label">Fine Rotation</span>
          <div class="img-slider-row">
            <input type="range" id="imgmFineSlider" min="-200" max="200" value="0" step="1">
            <input class="img-slider-val" id="imgmFineVal" value="0.0°">
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  $("imgCloseBtn").addEventListener("click", closeImageModal);
  $("imgmEyeBtn").addEventListener("click", imgmToggleVis);
  $("imgmDelBtn").addEventListener("click", imgmRemove);
  $("imgmAddBtn").addEventListener("click", function() { $("imgmFileInput").click(); });
  $("imgmFileInput").addEventListener("change", function() { imgmLoadFile(this); });

  $("imgmScaleSlider").addEventListener("input", function() { imgmSlider("scale", this); });
  $("imgmRotSlider").addEventListener("input", function() { imgmSlider("rot", this); });
  $("imgmFineSlider").addEventListener("input", function() { imgmSlider("fine", this); });

  $("imgmScaleVal").addEventListener("change", function() { imgmManual("scale", this.value); });
  $("imgmRotVal").addEventListener("change", function() { imgmManual("rot", this.value); });
  $("imgmFineVal").addEventListener("change", function() { imgmManual("fine", this.value); });
  $("imgmOpVal").addEventListener("change", function() { imgmManual("op", this.value); });

  for (const id of ["imgmScaleVal","imgmRotVal","imgmFineVal","imgmOpVal"]) {
    $(id).addEventListener("keydown", function(e) { if (e.key === "Enter") this.blur(); });
  }

  // Draggable
  let dragging = false, dOff = { x: 0, y: 0 };
  const modal = $("imgModal"), header = $("imgHeader");
  header.addEventListener("mousedown", function(e) {
    if (e.target.closest(".img-close-btn")) return;
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

function openImageModal() {
  if (!bgS.img) { showToast("Load an image first"); return; }
  $("imgOverlay").classList.add("show");
  const m = $("imgModal");
  m.style.left = (window.innerWidth - m.offsetWidth) / 2 + "px";
  m.style.top = (window.innerHeight - m.offsetHeight) / 2 + "px";
  syncImageModal();
}

function closeImageModal() {
  $("imgOverlay").classList.remove("show");
}

function syncImageModal() {
  const s = $("imgmScaleSlider"), sc = Math.round(bgS.scale * 100);
  s.value = sc; $("imgmScaleVal").value = sc + "%"; imgmFill(s);

  const r = $("imgmRotSlider");
  r.value = bgS.rotation; $("imgmRotVal").value = bgS.rotation + "°"; imgmFill(r);

  const f = $("imgmFineSlider"), fv = Math.round((bgS.rotFine || 0) * 10);
  f.value = fv; $("imgmFineVal").value = (bgS.rotFine || 0).toFixed(1) + "°"; imgmFill(f);

  $("imgmOpVal").value = Math.round(bgS.alpha * 100) + "%";

  $("imgmEyeBtn").classList.toggle("off", !bgS.show);

  if (bgS.img) {
    $("imgmThumb").style.backgroundImage = "url(" + bgS.img.src + ")";
    $("imgmThumb").classList.add("has-img");
    $("imgmName").textContent = "Image";
  } else {
    $("imgmThumb").style.backgroundImage = "";
    $("imgmThumb").classList.remove("has-img");
    $("imgmName").textContent = "No image";
  }
}

function imgmFill(slider) {
  const min = parseFloat(slider.min), max = parseFloat(slider.max);
  const pct = ((parseFloat(slider.value) - min) / (max - min)) * 100;
  slider.style.setProperty("--pct", pct + "%");
}

function imgmSlider(prop, slider) {
  const v = parseInt(slider.value);
  if (prop === "scale") { bgS.scale = v / 100; $("imgmScaleVal").value = v + "%"; }
  else if (prop === "rot") { bgS.rotation = v; $("imgmRotVal").value = v + "°"; }
  else if (prop === "fine") { bgS.rotFine = v / 10; $("imgmFineVal").value = (v / 10).toFixed(1) + "°"; }
  imgmFill(slider);
  redraw();
}

function imgmManual(prop, raw) {
  const n = parseFloat(raw.replace(/[^0-9.\-]/g, ""));
  if (isNaN(n)) return;
  if (prop === "scale") {
    const c = Math.max(1, Math.min(2000, Math.round(n)));
    bgS.scale = c / 100;
    $("imgmScaleSlider").value = c; $("imgmScaleVal").value = c + "%";
    imgmFill($("imgmScaleSlider"));
  } else if (prop === "rot") {
    const c = Math.max(-180, Math.min(180, Math.round(n)));
    bgS.rotation = c;
    $("imgmRotSlider").value = c; $("imgmRotVal").value = c + "°";
    imgmFill($("imgmRotSlider"));
  } else if (prop === "fine") {
    const sv = Math.max(-200, Math.min(200, Math.round(n * 10)));
    bgS.rotFine = sv / 10;
    $("imgmFineSlider").value = sv; $("imgmFineVal").value = (sv / 10).toFixed(1) + "°";
    imgmFill($("imgmFineSlider"));
  } else if (prop === "op") {
    const c = Math.max(0, Math.min(100, Math.round(n)));
    bgS.alpha = c / 100;
    $("imgmOpVal").value = c + "%";
  }
  redraw();
}

function imgmToggleVis() {
  bgS.show = !bgS.show;
  $("imgmEyeBtn").classList.toggle("off", !bgS.show);
  $("bgShow").checked = bgS.show;
  redraw();
}

function imgmRemove() {
  clearBgImage();
  updateImgSettingsBtn();
  syncImageModal();
  closeImageModal();
}

function imgmLoadFile(input) {
  const f = input.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      bgS.img = img;
      bgS.wx = cam.x;
      bgS.wy = cam.y;
      bgS.show = true;
      $("bgShow").checked = true;
      updateImgSettingsBtn();
      syncImageModal();
      redraw();
      showToast("Image loaded");
    };
    img.src = e.target.result;
  };
  r.readAsDataURL(f);
  input.value = "";
}

function updateImgSettingsBtn() {
  const btn = $("imgSettingsBtn");
  const hint = $("imgSettingsHint");
  if (btn) {
    btn.style.display = bgS.img ? "block" : "none";
  }
  if (hint) {
    hint.style.display = bgS.img ? "none" : "block";
  }
}
