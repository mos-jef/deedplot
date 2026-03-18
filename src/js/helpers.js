// ═══════════════ HELPERS ═══════════════
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}
function getBounds(pts) {
  let a = Infinity,
    b = -Infinity,
    c = Infinity,
    d = -Infinity;
  for (const p of pts) {
    a = Math.min(a, p.x);
    b = Math.max(b, p.x);
    c = Math.min(c, p.y);
    d = Math.max(d, p.y);
  }
  return { minX: a, maxX: b, minY: c, maxY: d, w: b - a, h: d - c };
}
function hexToRgb(h) {
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}
function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x,
      yi = pts[i].y,
      xj = pts[j].x,
      yj = pts[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}
function fitToView() {
  if (!tracts.length) {
    redraw();
    return;
  }
  let ap = [];
  for (const t of tracts) ap.push(...t.coords);
  if (!ap.length) {
    redraw();
    return;
  }
  const b = getBounds(ap),
    c = $("canvasContainer"),
    W = c.clientWidth || 800,
    H = c.clientHeight || 600;
  cam.zoom = Math.min((W * 0.7) / (b.w || 1), (H * 0.7) / (b.h || 1));
  cam.x = (b.minX + b.maxX) / 2;
  cam.y = (b.minY + b.maxY) / 2;
  redraw();
}

function exportPNG(transparent) {
  if (transparent) {
    // Re-render without bg/grid, capture transparent
    const c = $("canvasContainer"),
      W = c.clientWidth,
      H = c.clientHeight;
    const tmpCanvas = document.createElement("canvas");
    const dpr = window.devicePixelRatio || 1;
    tmpCanvas.width = W * dpr;
    tmpCanvas.height = H * dpr;
    const origCtx = ctx;
    const origCanvas = canvas;
    ctx = tmpCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas = tmpCanvas;
    redraw(true);
    const link = document.createElement("a");
    link.download = "parcel_map_transparent.png";
    link.href = tmpCanvas.toDataURL("image/png");
    link.click();
    ctx = origCtx;
    canvas = origCanvas;
    redraw();
    showToast("Transparent PNG exported!");
  } else {
    const link = document.createElement("a");
    link.download = "parcel_map.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("PNG exported!");
  }
}

function showToast(m) {
  const t = $("toast");
  t.textContent = m;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}

