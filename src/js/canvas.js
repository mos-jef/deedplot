// ═══════════════ CANVAS ═══════════════
function initCanvas() {
  canvas = $("mapCanvas");
  ctx = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}
function resizeCanvas() {
  const c = $("canvasContainer"),
    w = c.clientWidth || 800,
    h = c.clientHeight || 600,
    d = window.devicePixelRatio || 1;
  canvas.width = w * d;
  canvas.height = h * d;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(d, 0, 0, d, 0, 0);
  redraw();
}
function w2s(wx, wy) {
  const c = $("canvasContainer");
  return {
    x: c.clientWidth / 2 + (wx - cam.x) * cam.zoom,
    y: c.clientHeight / 2 - (wy - cam.y) * cam.zoom,
  };
}
function s2w(sx, sy) {
  const c = $("canvasContainer");
  return {
    x: cam.x + (sx - c.clientWidth / 2) / cam.zoom,
    y: cam.y - (sy - c.clientHeight / 2) / cam.zoom,
  };
}

// ═══════════════ HIT TEST ═══════════════
function getLabelPos(tract, ci) {
  const pts = tract.coords,
    call = tract.calls[ci];
  // For curves, use the midpoint of the arc segment, not just start/end
  let p1, p2;
  if (call._ptRange) {
    const r = call._ptRange;
    const midIdx = Math.floor((r.start + r.end) / 2);
    p1 = w2s(pts[r.start].x, pts[r.start].y);
    p2 = w2s(pts[r.end].x, pts[r.end].y);
    // Use the actual arc midpoint for label anchor
    const mp = w2s(pts[midIdx].x, pts[midIdx].y);
    const mx = mp.x,
      my = mp.y;
    if (call.labelOffset) {
      const s = w2s(call.labelOffset.wx, call.labelOffset.wy);
      return { x: s.x, y: s.y, ax: mx, ay: my };
    }
    const dx = p2.x - p1.x,
      dy = p2.y - p1.y,
      ang = Math.atan2(dy, dx),
      px = -Math.sin(ang),
      py = Math.cos(ang);
    const ll = Math.sqrt(dx * dx + dy * dy),
      fs = tract.fontSize * Math.min(1, cam.zoom * 2.5);
    let lines = [];
    if (tract.numberCalls) lines.push("x");
    if (tract.showBearings) lines.push(call.bearingStr);
    if (tract.showDistances) lines.push("x");
    const lw = lines.reduce((m, l) => Math.max(m, l.length * fs * 0.55), 0);
    const ul = tract.leaderLines && (ll < lw * 1.2 || ll < 60),
      off = ul ? Math.max(60, ll * 0.8) : 18;
    return { x: mx + px * off, y: my + py * off, ax: mx, ay: my };
  }
  // Straight line — use _ptRange if available, fallback to sequential index
  const r2 = call._ptRange || { start: ci, end: ci + 1 };
  p1 = w2s(pts[r2.start].x, pts[r2.start].y);
  p2 = w2s(pts[r2.end].x, pts[r2.end].y);
  const mx = (p1.x + p2.x) / 2,
    my = (p1.y + p2.y) / 2;
  if (call.labelOffset) {
    const s = w2s(call.labelOffset.wx, call.labelOffset.wy);
    return { x: s.x, y: s.y, ax: mx, ay: my };
  }
  const dx = p2.x - p1.x,
    dy = p2.y - p1.y,
    ang = Math.atan2(dy, dx),
    px = -Math.sin(ang),
    py = Math.cos(ang);
  const ll = Math.sqrt(dx * dx + dy * dy),
    fs = tract.fontSize * Math.min(1, cam.zoom * 2.5);
  let lines = [];
  if (tract.numberCalls) lines.push("x");
  if (tract.showBearings) lines.push(call.bearingStr);
  if (tract.showDistances) lines.push("x");
  const lw = lines.reduce((m, l) => Math.max(m, l.length * fs * 0.55), 0);
  const ul = tract.leaderLines && (ll < lw * 1.2 || ll < 60),
    off = ul ? Math.max(60, ll * 0.8) : 18;
  return { x: mx + px * off, y: my + py * off, ax: mx, ay: my };
}
function getNamePos(t) {
  if (t.nameOffset) {
    const s = w2s(t.nameOffset.wx, t.nameOffset.wy);
    return s;
  }
  const c = centroid(t.coords),
    s = w2s(c.x, c.y);
  return { x: s.x, y: s.y + (t.parcelId ? t.pidSize * 2 : 0) };
}
function getPidPos(t) {
  if (t.pidOffset) {
    const s = w2s(t.pidOffset.wx, t.pidOffset.wy);
    return s;
  }
  return w2s(centroid(t.coords).x, centroid(t.coords).y);
}
function getLegendPos(W, H) {
  if (legendPos.sx !== null) return { x: legendPos.sx, y: legendPos.sy };
  // Default: bottom-left with proper spacing
  const dim = getLegendDims();
  return { x: 20, y: H - dim.h - 20 }; // Leaves 20px padding from bottom
}

// ═══════════════ SHAPE DRAWING & NEW FEATURES ═══════════════
function toggleDrawMode(mode) {
  if (currentDrawMode === mode) {
    currentDrawMode = null;
    updateDrawModeButtons();
    return;
  }
  currentDrawMode = mode;
  updateDrawModeButtons();
  showToast(`Draw mode: ${mode}`);
}

function updateDrawModeButtons() {
  const buttons = {
    rect: "drawRectBtn",
    circle: "drawCircleBtn",
    line: "drawLineBtn",
    arrow: "drawArrowBtn",
    dashedLine: "drawDashedBtn",
  };
  for (const [mode, btnId] of Object.entries(buttons)) {
    const btn = $(btnId);
    if (btn) {
      if (currentDrawMode === mode) {
        btn.classList.add("on");
      } else {
        btn.classList.remove("on");
      }
    }
  }
}

function updateLegendStyle() {
  legendStyle.bgColor = $("legendBgColor").value;
  legendStyle.dropShadow = $("legendDropShadow").checked;
}

function hitTest(sx, sy) {
  // Legend
  if ($("mapShowLegend").checked && tracts.length) {
    const c = $("canvasContainer"),
      lp = getLegendPos(c.clientWidth, c.clientHeight);
    const lw = getLegendDims();
    if (sx >= lp.x && sx <= lp.x + lw.w && sy >= lp.y - lw.h && sy <= lp.y)
      return { type: "legend" };
  }
  for (let ti = tracts.length - 1; ti >= 0; ti--) {
    const t = tracts[ti];
    const np = getNamePos(t);
    if (Math.abs(sx - np.x) < 60 && Math.abs(sy - np.y) < 16)
      return { type: "tname", tractIdx: ti };
    if (t.parcelId) {
      const pp = getPidPos(t);
      if (Math.abs(sx - pp.x) < 60 && Math.abs(sy - pp.y) < 16)
        return { type: "tpid", tractIdx: ti };
    }
    for (let ci = 0; ci < t.calls.length; ci++) {
      const p = getLabelPos(t, ci);
      if (Math.abs(sx - p.x) < 50 && Math.abs(sy - p.y) < 30)
        return { type: "label", tractIdx: ti, callIdx: ci };
    }
  }
  if (bgS.img && bgS.show) {
    const bs = w2s(bgS.wx, bgS.wy),
      bw = bgS.img.width * bgS.scale * cam.zoom,
      bh = bgS.img.height * bgS.scale * cam.zoom;
    if (Math.abs(sx - bs.x) < bw / 2 && Math.abs(sy - bs.y) < bh / 2)
      return { type: "bg" };
  }
  // Shape hit testing - check all tracts' shapes
  for (let ti = tracts.length - 1; ti >= 0; ti--) {
    const t = tracts[ti];
    if (!t.shapes || !t.shapes.length) continue;
    for (let si = t.shapes.length - 1; si >= 0; si--) {
      const shape = t.shapes[si];
      const s1 = w2s(shape.startX, shape.startY);
      const s2 = w2s(shape.endX, shape.endY);
      const minX = Math.min(s1.x, s2.x) - 6;
      const maxX = Math.max(s1.x, s2.x) + 6;
      const minY = Math.min(s1.y, s2.y) - 6;
      const maxY = Math.max(s1.y, s2.y) + 6;
      if (
        shape.type === "line" ||
        shape.type === "arrow" ||
        shape.type === "dashedLine"
      ) {
        // Check distance to line segment
        const dx = s2.x - s1.x,
          dy = s2.y - s1.y;
        const len2 = dx * dx + dy * dy;
        if (len2 > 0) {
          const t2 = Math.max(
            0,
            Math.min(1, ((sx - s1.x) * dx + (sy - s1.y) * dy) / len2),
          );
          const px = s1.x + t2 * dx,
            py = s1.y + t2 * dy;
          const dist = Math.sqrt((sx - px) * (sx - px) + (sy - py) * (sy - py));
          if (dist < 8) return { type: "shape", tractIdx: ti, shapeIdx: si };
        }
      } else if (shape.type === "circle") {
        const r = Math.sqrt((s2.x - s1.x) ** 2 + (s2.y - s1.y) ** 2);
        const dist = Math.sqrt((sx - s1.x) ** 2 + (sy - s1.y) ** 2);
        if (Math.abs(dist - r) < 8)
          return { type: "shape", tractIdx: ti, shapeIdx: si };
      } else {
        // rect - check if near edges
        if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
          const nearLeft = Math.abs(sx - Math.min(s1.x, s2.x)) < 8;
          const nearRight = Math.abs(sx - Math.max(s1.x, s2.x)) < 8;
          const nearTop = Math.abs(sy - Math.min(s1.y, s2.y)) < 8;
          const nearBot = Math.abs(sy - Math.max(s1.y, s2.y)) < 8;
          if (nearLeft || nearRight || nearTop || nearBot)
            return { type: "shape", tractIdx: ti, shapeIdx: si };
        }
      }
    }
  }
  // Tract polygon drag (lowest priority — only if clicking inside the fill)
  for (let ti = tracts.length - 1; ti >= 0; ti--) {
    const pts = tracts[ti].coords.map((p) => w2s(p.x, p.y));
    if (pointInPoly(sx, sy, pts)) return { type: "tract", tractIdx: ti };
  }
  return null;
}
