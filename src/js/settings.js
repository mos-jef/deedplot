// ═══════════════ SETTINGS PERSISTENCE ═══════════════
function toggleSaveSettings(on) {
  localStorage.setItem("deedplot_save_settings", on ? "1" : "0");
  if (on) saveMapSettings();
}

function saveMapSettings() {
  if (localStorage.getItem("deedplot_save_settings") !== "1") return;
  const settings = {
    mapBg: $("mapBg").value,
    mapGrid: $("mapGrid").value,
    mapTextColor: $("mapTextColor").value,
    subColor: $("subColor").value,
    subAlpha: $("subAlpha").value,
    mapShowGrid: $("mapShowGrid").checked,
    mapShowNorth: $("mapShowNorth").checked,
    mapShowScale: $("mapShowScale").checked,
    mapShowLegend: $("mapShowLegend").checked,
    legendBgColor: $("legendBgColor").value,
    legendDropShadow: $("legendDropShadow").checked,
  };
  localStorage.setItem("deedplot_map_settings", JSON.stringify(settings));
}

function loadMapSettings() {
  const on = localStorage.getItem("deedplot_save_settings") === "1";
  $("mapSaveSettings").checked = on;
  if (!on) return;
  try {
    const s = JSON.parse(localStorage.getItem("deedplot_map_settings"));
    if (!s) return;
    if (s.mapBg) $("mapBg").value = s.mapBg;
    if (s.mapGrid) $("mapGrid").value = s.mapGrid;
    if (s.mapTextColor) $("mapTextColor").value = s.mapTextColor;
    if (s.subColor) $("subColor").value = s.subColor;
    if (s.subAlpha) $("subAlpha").value = s.subAlpha;
    if (s.mapShowGrid !== undefined)
      $("mapShowGrid").checked = s.mapShowGrid;
    if (s.mapShowNorth !== undefined)
      $("mapShowNorth").checked = s.mapShowNorth;
    if (s.mapShowScale !== undefined)
      $("mapShowScale").checked = s.mapShowScale;
    if (s.mapShowLegend !== undefined)
      $("mapShowLegend").checked = s.mapShowLegend;
    if (s.legendBgColor) $("legendBgColor").value = s.legendBgColor;
    if (s.legendDropShadow !== undefined)
      $("legendDropShadow").checked = s.legendDropShadow;
    // Update legend style after loading
    updateLegendStyle();
  } catch (ex) {}
}

// Hook map settings controls to auto-save on change
function hookSettingsSave() {
  for (const id of [
    "mapBg",
    "mapGrid",
    "mapTextColor",
    "subColor",
    "subAlpha",
    "legendBgColor",
  ]) {
    const el = $(id);
    if (el) el.addEventListener("input", saveMapSettings);
  }
  for (const id of [
    "mapShowGrid",
    "mapShowNorth",
    "mapShowScale",
    "mapShowLegend",
    "legendDropShadow",
  ]) {
    const el = $(id);
    if (el) el.addEventListener("change", saveMapSettings);
  }
}

// ═══════════════ UI HELPERS ═══════════════
function switchRightPanel() {
  const layP = $("rpLayerProps");
  // Map Properties now lives in left sidebar, always visible
  // Only show/hide Layer Properties
  if (activeTractIdx >= 0 && tracts.length) {
    layP.style.display = "block";
  } else {
    layP.style.display = "none";
  }
}

function toggleExportMenu() {
  const dd = $("exportMenu");
  dd.classList.toggle("show");
  // Close on outside click
  if (dd.classList.contains("show")) {
    setTimeout(() => {
      const closer = (e) => {
        if (!dd.contains(e.target) && e.target.id !== "exportMenuBtn") {
          dd.classList.remove("show");
          document.removeEventListener("click", closer);
        }
      };
      document.addEventListener("click", closer);
    }, 0);
  }
}

function addEmptyLayer() {
  saveUndo();
  const t = createTract([], "");
  tracts.push(t);
  selectTract(tracts.length - 1);
  showToast("Empty layer added");
}

// ═══════════════ INIT ═══════════════
window.addEventListener("DOMContentLoaded", () => {
  initCanvas();
  loadMapSettings();
  hookSettingsSave();
  initAnnotations();
  initDsModal();
  initImageModal();
  setupInteraction();
  switchRightPanel();
  updateImgSettingsBtn();
  redraw();
  setTimeout(() => {
    resizeCanvas();
    redraw();
  }, 100);
  setTimeout(() => {
    resizeCanvas();
    redraw();
  }, 500);
});
window.addEventListener("load", () => {
  resizeCanvas();
  redraw();
});
