// ═══════════════ TRACTS ═══════════════
const defColors = [
  "#CDDC39",
  "#EF9A9A",
  "#81D4FA",
  "#A5D6A7",
  "#FFE082",
  "#CE93D8",
  "#80CBC4",
];
function createTract(calls, name, pobX = 0, pobY = 0) {
  return {
    name: name || "",
    parcelId: "",
    calls,
    coords: callsToCoords(calls, pobX, pobY),
    pobX,
    pobY,
    tractRotation: 0,
    fillColor: defColors[tracts.length % defColors.length],
    alpha: 0.65,
    strokeColor: "#000000",
    strokeWidth: 3,
    fontSize: 12,
    labelColor: "#000000",
    labelBg: "#ffffff",
    labelBgAlpha: 0.85,
    showLabelBg: false,
    nameColor: "#000000",
    nameSize: 12,
    nameBg: "#ffffff",
    nameBgAlpha: 0,
    nameShowBg: false,
    nameOffset: null,
    nameRotation: 0,
    pidColor: "#000000",
    pidSize: 17,
    pidBg: "#ffffff",
    pidBgAlpha: 0.8,
    pidShowBg: false,
    pidOffset: null,
    pidRotation: 0,
    leaderColor: "#000000",
    shapes: [], // Array to store drawn shapes
    leaderWidth: 1,
    leaderEnd: "diamond",
    leaderAlpha: 0.5,
    leaderLines: true,
    showBearings: true,
    showDistances: true,
    numberCalls: false,
    hatching: false,
    isException: false,
    legendTextColor: "#000000", // NEW: color for this tract in legend
  };
}

function parseDeed() {
  const text = $("deedInput").value.trim();
  if (!text) {
    showToast("Paste a description");
    return;
  }
  saveUndo();

  // Split into segments by "Tract I:", "Tract II:", "EXCEPTING", "PARCEL 1:", etc.
  const segments = [];
  const splitRe =
    /(?:^|\n)\s*(?:Tract\s+[IVX\d]+[:\.]?|PARCEL\s+\d+[:\.]?|EXCEPT(?:ING)?\s*(?:THEREFROM)?[:\s])/gi;
  let lastIdx = 0,
    match;
  const markers = [];
  const re2 = new RegExp(splitRe.source, "gi");
  while ((match = re2.exec(text)) !== null) {
    markers.push({
      idx: match.index,
      label: match[0].trim().replace(/[:\.]$/, ""),
    });
  }

  if (markers.length > 0) {
    // Text before first marker might have calls too
    if (markers[0].idx > 50) {
      const pre = text.slice(0, markers[0].idx);
      const calls = parseDescription(pre);
      if (calls.length)
        segments.push({ name: "Main Tract", calls, isExc: false });
    }
    for (let i = 0; i < markers.length; i++) {
      const start = markers[i].idx;
      const end =
        i + 1 < markers.length ? markers[i + 1].idx : text.length;
      const chunk = text.slice(start, end);
      const calls = parseDescription(chunk);
      const isExc = /except/i.test(markers[i].label);
      const name =
        markers[i].label.replace(/^[\s:]+|[\s:]+$/g, "") ||
        "Tract " + (i + 1);
      if (calls.length) segments.push({ name, calls, isExc });
    }
  } else {
    // No tract markers — try EXCEPTING split
    const excIdx = text.search(/EXCEPT(?:ING)?/i);
    if (excIdx > 0) {
      const mc = parseDescription(text.slice(0, excIdx)),
        ec = parseDescription(text.slice(excIdx));
      if (mc.length)
        segments.push({ name: "Main Tract", calls: mc, isExc: false });
      if (ec.length)
        segments.push({ name: "Exception", calls: ec, isExc: true });
    } else {
      const calls = parseDescription(text);
      if (calls.length)
        segments.push({ name: "Tract 1", calls, isExc: false });
    }
  }

  if (!segments.length) {
    showToast("No calls found. Check format.");
    return;
  }

  for (const seg of segments) {
    const t = createTract(seg.calls, seg.name);
    if (seg.isExc) {
      t.fillColor = "#FF8A65";
      t.isException = true;
      t.hatching = true;
    }
    tracts.push(t);
  }

  updateTractList();
  if (tracts.length > 0) selectTract(tracts.length - 1);
  fitToView();
  setTimeout(fitToView, 100);
  showToast(`Plotted ${segments.length} tract(s)`);
}

function clearTracts() {
  saveUndo();
  tracts = [];
  activeTractIdx = -1;
  annotations = [];
  legendPos = { sx: null, sy: null };
  updateTractList();
  updateCallSchedule();
  $("deedInput").value = "";
  switchRightPanel();
  redraw();
}
function selectTract(i) {
  activeTractIdx = i;
  updateTractList();
  updateProps();
  updateCallSchedule();
  syncLegalBox();
  switchRightPanel();
  redraw();
}

function syncLegalBox() {
  if (activeTractIdx < 0) return;
  const t = tracts[activeTractIdx];
  if (!t || !t.calls.length) return;
  const lines = t.calls.map((c, idx) => {
    if (c.isCurve) {
      return `thence Curve ${c.curveDir === "L" ? "Left" : "Right"}, R=${c.radius.toFixed(2)}', Δ=${c.delta.toFixed(4)}°, Chord: ${c.quad} ${c.deg}°${String(c.min).padStart(2, "0")}'${c.sec % 1 === 0 ? String(Math.round(c.sec)).padStart(2, "0") : c.sec.toFixed(2)}" ${c.dir}, ${c.dist.toFixed(2)}'`;
    }
    return `thence ${c.bearingStr}  ${c.dist.toFixed(2)}'`;
  });
  $("deedInput").value = lines.join("\n");
}

function updateProp(key, val) {
  if (activeTractIdx < 0) return;
  saveUndo();
  tracts[activeTractIdx][key] = val;
  if (key === "fontSize") $("fontSizeVal").textContent = val;
  if (key === "strokeWidth") $("strokeWVal").textContent = val;
  if (key === "nameSize") $("nameSizeVal").textContent = val;
  if (key === "pidSize") $("pidSizeVal").textContent = val;
  updateTractList();
  redraw();
}

function updatePOB() {
  if (activeTractIdx < 0) return;
  saveUndo();
  const t = tracts[activeTractIdx];
  t.pobX = parseFloat($("propPobX").value) || 0;
  t.pobY = parseFloat($("propPobY").value) || 0;
  recomputeRotatedCoords(t);
  updateTractList();
  redraw();
}

function updateTractRotation(deg) {
  if (activeTractIdx < 0) return;
  saveUndo();
  const t = tracts[activeTractIdx];
  t.tractRotation = deg;
  $("propTractRot").value = deg;
  $("propTractRotVal").value = deg;
  recomputeRotatedCoords(t);
  updateTractList();
  redraw();
}

function recomputeRotatedCoords(t) {
  // Compute base coords from calls + POB
  const base = callsToCoords(t.calls, t.pobX, t.pobY);
  if (!t.tractRotation) {
    t.coords = base;
    return;
  }
  // Rotate around centroid of base
  const n = base.length - 1;
  let cx = 0,
    cy = 0;
  for (let i = 0; i < n; i++) {
    cx += base[i].x;
    cy += base[i].y;
  }
  cx /= n;
  cy /= n;
  const rad = (t.tractRotation * Math.PI) / 180;
  const cosR = Math.cos(rad),
    sinR = Math.sin(rad);
  t.coords = base.map((p) => {
    const dx = p.x - cx,
      dy = p.y - cy;
    return {
      x: cx + dx * cosR - dy * sinR,
      y: cy + dx * sinR + dy * cosR,
    };
  });
}

function updateProps() {
  if (activeTractIdx < 0) return;
  const t = tracts[activeTractIdx];
  $("propName").value = t.name;
  $("propParcelId").value = t.parcelId;
  $("propPobX").value = t.pobX || 0;
  $("propPobY").value = t.pobY || 0;
  $("propTractRot").value = t.tractRotation || 0;
  $("propTractRotVal").value = t.tractRotation || 0;
  $("propFill").value = t.fillColor;
  $("propAlpha").value = Math.round(t.alpha * 100);
  $("propStroke").value = t.strokeColor;
  $("propStrokeW").value = t.strokeWidth;
  $("strokeWVal").textContent = t.strokeWidth;
  $("propNameColor").value = t.nameColor;
  $("propNameSize").value = t.nameSize;
  $("nameSizeVal").textContent = t.nameSize;
  $("propNameBg").value = t.nameBg;
  $("propNameBgA").value = Math.round(t.nameBgAlpha * 100);
  $("propNameShowBg").checked = t.nameShowBg;
  $("propPidColor").value = t.pidColor;
  $("propPidSize").value = t.pidSize;
  $("pidSizeVal").textContent = t.pidSize;
  $("propPidBg").value = t.pidBg;
  $("propPidBgA").value = Math.round(t.pidBgAlpha * 100);
  $("propPidShowBg").checked = t.pidShowBg;
  $("propFontSize").value = t.fontSize;
  $("fontSizeVal").textContent = t.fontSize;
  $("propLabelColor").value = t.labelColor;
  $("propLabelBg").value = t.labelBg;
  $("propLabelBgA").value = Math.round(t.labelBgAlpha * 100);
  $("propShowLabelBg").checked = t.showLabelBg;
  $("propLeaderColor").value = t.leaderColor;
  $("propLeaderW").value = t.leaderWidth;
  $("propLeaderEnd").value = t.leaderEnd;
  $("propLeaderA").value = Math.round(t.leaderAlpha * 100);
  $("propLeaderLines").checked = t.leaderLines;
  $("propShowBearings").checked = t.showBearings;
  $("propShowDistances").checked = t.showDistances;
  $("propNumberCalls").checked = t.numberCalls;
  $("propHatch").checked = t.hatching;
  $("propLegendTextColor").value = t.legendTextColor || "#000000";

  // Update drop shadow modal if visible
  if ($("dsOverlay") && $("dsOverlay").classList.contains("show")) {
    syncDsModal();
  }
}

function updateTractList() {
  const el = $("tractList");
  if (!tracts.length) {
    el.innerHTML =
      '<div style="color:var(--dp-text3);font-size:10px;padding:8px 0;text-align:center">No layers.</div>';
    return;
  }
  el.innerHTML = tracts
    .map((t, i) => {
      const a = computeArea(t.coords),
        cls = i === activeTractIdx ? "tract-item active" : "tract-item";
      const displayName = t.name || `Layer ${i + 1}`;
      /* ── TRACT ROW LAYOUT ──
         Adjust these values to change spacing:
         - gap:3px        → space between ▲▼ buttons
         - margin-left:8px → space between arrows and tract name  ◄── ADJUST THIS
         - The ✕ is pushed right via margin-left:auto on the wrapper
      */
      return `<div class="${cls}" onclick="selectTract(${i})"><div class="tract-header" style="display:flex;align-items:center;gap:2px"><button class="btn sm" onclick="event.stopPropagation();moveLayer(${i},-1)" title="Move up" style="padding:2px 3px;font-size:8px;flex-shrink:0">▲</button><button class="btn sm" onclick="event.stopPropagation();moveLayer(${i},1)" title="Move down" style="padding:2px 3px;font-size:8px;flex-shrink:0">▼</button><div class="tract-color-dot" style="background:${t.fillColor};margin-left:8px;flex-shrink:0"></div><span class="tract-name" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-left:4px">${displayName}</span><button class="btn sm danger" onclick="event.stopPropagation();saveUndo();tracts.splice(${i},1);if(activeTractIdx>=${i})activeTractIdx=Math.max(0,activeTractIdx-1);if(!tracts.length)activeTractIdx=-1;updateTractList();updateCallSchedule();syncLegalBox();redraw();" style="flex-shrink:0;margin-left:auto">✕</button></div><div class="tract-meta">${t.calls.length} calls · ${a.toFixed(4)} ac · closure ${closureError(t.coords).toFixed(4)}'</div></div>`;
    })
    .join("");
  $("statusTracts").textContent = `Tracts: ${tracts.length}`;
}

function moveLayer(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= tracts.length) return;
  saveUndo();
  [tracts[idx], tracts[newIdx]] = [tracts[newIdx], tracts[idx]];
  if (activeTractIdx === idx) activeTractIdx = newIdx;
  else if (activeTractIdx === newIdx) activeTractIdx = idx;
  updateTractList();
  redraw();
}

function updateCallSchedule() {
  const el = $("callSchedule");
  if (activeTractIdx < 0) {
    el.innerHTML =
      '<div style="color:var(--text-muted);font-size:11px;text-align:center;padding:6px 0">Select a tract.</div>';
    return;
  }
  const t = tracts[activeTractIdx];
  let h =
    '<table class="call-table"><tr><th>#</th><th>Bearing</th><th>Dist</th></tr>';
  t.calls.forEach((c, i) => {
    h += `<tr><td class="call-num">${i + 1}</td><td>${c.bearingStr}</td><td>${c.dist.toFixed(2)}'</td></tr>`;
  });
  h += "</table>";
  const area = computeArea(t.coords),
    ce = closureError(t.coords),
    perim = t.calls.reduce((s, c) => s + c.dist, 0),
    ratio = ce > 0.001 ? `1:${Math.round(perim / ce)}` : "PERFECT";
  h += `<div style="margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-secondary);line-height:1.7">Area: ${area.toFixed(4)} ac (${(area * 43560).toFixed(0)} sf)<br>Perim: ${perim.toFixed(2)}'<br>Closure: ${ce.toFixed(4)}' (${ratio})</div>`;
  el.innerHTML = h;
}


