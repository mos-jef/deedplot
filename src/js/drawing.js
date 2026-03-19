// ═══════════════ DRAWING ═══════════════
function redraw(transparent) {
  if (!ctx) return;
  const c = $("canvasContainer"),
    W = c.clientWidth,
    H = c.clientHeight;
  if (transparent) {
    ctx.clearRect(0, 0, W, H);
  } else {
    ctx.fillStyle = $("mapBg").value;
    ctx.fillRect(0, 0, W, H);
  }
  if (!transparent && bgS.img && bgS.show) {
    const s = w2s(bgS.wx, bgS.wy),
      iw = bgS.img.width * bgS.scale,
      ih = bgS.img.height * bgS.scale;
    ctx.save();
    ctx.globalAlpha = bgS.alpha;
    ctx.translate(s.x, s.y);
    ctx.rotate(((bgS.rotation + (bgS.rotFine || 0)) * Math.PI) / 180);
    ctx.drawImage(
      bgS.img,
      (-iw * cam.zoom) / 2,
      (-ih * cam.zoom) / 2,
      iw * cam.zoom,
      ih * cam.zoom,
    );
    ctx.restore();
  }
  if (!transparent && $("mapShowGrid").checked) drawGrid(W, H);
  for (let i = 0; i < tracts.length; i++)
    drawTract(tracts[i], i === activeTractIdx);
  drawShapes(); // ADDED THIS LINE
  drawAnnotations();
  const mc = $("mapTextColor").value;
  if ($("mapShowNorth").checked) drawNorthArrow(W, H, mc);
  if ($("mapShowScale").checked) drawScaleBar(W, H, mc);
  if ($("mapShowLegend").checked && tracts.length) drawLegend(W, H);
  drawTitle(W, mc);
  $("statusZoom").textContent = `Zoom: ${Math.round(cam.zoom * 100)}%`;
}

function drawGrid(W, H) {
  let sp = 100;
  while (sp * cam.zoom < 40) sp *= 2;
  while (sp * cam.zoom > 200) sp /= 2;
  const tl = s2w(0, 0),
    br = s2w(W, H);
  ctx.strokeStyle = $("mapGrid").value;
  ctx.lineWidth = 0.5;
  for (
    let x = Math.floor(Math.min(tl.x, br.x) / sp) * sp;
    x <= Math.ceil(Math.max(tl.x, br.x) / sp) * sp;
    x += sp
  ) {
    const s = w2s(x, 0);
    ctx.beginPath();
    ctx.moveTo(s.x, 0);
    ctx.lineTo(s.x, H);
    ctx.stroke();
  }
  for (
    let y = Math.floor(Math.min(tl.y, br.y) / sp) * sp;
    y <= Math.ceil(Math.max(tl.y, br.y) / sp) * sp;
    y += sp
  ) {
    const s = w2s(0, y);
    ctx.beginPath();
    ctx.moveTo(0, s.y);
    ctx.lineTo(W, s.y);
    ctx.stroke();
  }
}

function drawEndpoint(x, y, shape, sz, color, angle) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(x, y, sz, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === "diamond") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
    ctx.restore();
  } else if (shape === "triangle") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(sz, 0);
    ctx.lineTo(-sz, -sz);
    ctx.lineTo(-sz, sz);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (shape === "triangle-rev") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-sz, 0);
    ctx.lineTo(sz, -sz);
    ctx.lineTo(sz, sz);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (shape === "arrow") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(sz + 2, 0);
    ctx.lineTo(-sz, -sz);
    ctx.moveTo(sz + 2, 0);
    ctx.lineTo(-sz, sz);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

function drawTract(tract, isActive) {
  const pts = tract.coords;
  if (pts.length < 2) return;
  const sp = pts.map((p) => w2s(p.x, p.y));

  // Drop shadow if enabled
  if (
    tract.dropShadow &&
    (tract.dropShadow.blur > 0 ||
      tract.dropShadow.x !== 0 ||
      tract.dropShadow.y !== 0)
  ) {
    ctx.save();
    // Set shadow properties BEFORE any drawing
    ctx.shadowColor = tract.dropShadow.color || "#000000";
    ctx.shadowBlur = tract.dropShadow.blur || 0;
    ctx.shadowOffsetX = tract.dropShadow.x || 0;
    ctx.shadowOffsetY = tract.dropShadow.y || 0;
    ctx.globalAlpha = tract.dropShadow.alpha || 0.3;
    // Draw the filled shape
    ctx.beginPath();
    sp.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
    );
    ctx.closePath();
    ctx.fillStyle = tract.fillColor;
    ctx.fill();
    ctx.restore();
    // IMPORTANT: Reset shadow after drawing
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Fill
  ctx.beginPath();
  sp.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.globalAlpha = tract.alpha;
  ctx.fillStyle = tract.fillColor;
  ctx.fill();
  ctx.globalAlpha = 1;
  // Hatching
  if (tract.hatching) {
    ctx.save();
    ctx.beginPath();
    sp.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
    );
    ctx.closePath();
    ctx.clip();
    const b = getBounds(sp);
    ctx.strokeStyle = "rgba(0,0,0,.3)";
    ctx.lineWidth = 1;
    for (let d = b.minX - b.h; d < b.maxX + b.h; d += 12) {
      ctx.beginPath();
      ctx.moveTo(d, b.minY);
      ctx.lineTo(d + b.h, b.maxY);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Stroke
  if (tract.strokeWidth > 0) {
    ctx.beginPath();
    sp.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
    );
    ctx.closePath();
    ctx.strokeStyle = tract.strokeColor;
    ctx.lineWidth = isActive ? tract.strokeWidth + 1 : tract.strokeWidth;
    ctx.stroke();
  }
  // Call labels
  const fs = tract.fontSize * Math.min(1, cam.zoom * 2.5);
  for (let i = 0; i < tract.calls.length; i++) {
    const call = tract.calls[i];
    let lines = [];
    if (tract.numberCalls) lines.push(`(${i + 1})`);
    if (tract.showBearings) lines.push(call.bearingStr);
    if (tract.showDistances) lines.push(`${call.dist.toFixed(2)}'`);
    if (!lines.length) continue;
    const pos = getLabelPos(tract, i);
    // Get start/end screen points for this call
    const r = call._ptRange || { start: i, end: i + 1 };
    const sp0 = w2s(pts[r.start].x, pts[r.start].y);
    const sp1 = w2s(pts[r.end].x, pts[r.end].y);
    // Always anchor leader line to line midpoint (not vertex)
    const mx = (sp0.x + sp1.x) / 2,
      my = (sp0.y + sp1.y) / 2;
    const dx2 = sp1.x - sp0.x,
      dy2 = sp1.y - sp0.y,
      ll = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    const lw = lines.reduce((m, l) => Math.max(m, l.length * fs * 0.55), 0);
    const hasM = !!call.labelOffset,
      autoL = tract.leaderLines && (ll < lw * 1.2 || ll < 60);
    if (hasM || autoL) {
      const lc = hexToRgb(tract.leaderColor);
      ctx.strokeStyle = `rgba(${lc.r},${lc.g},${lc.b},${tract.leaderAlpha})`;
      ctx.lineWidth = tract.leaderWidth;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      const ec = `rgba(${lc.r},${lc.g},${lc.b},${tract.leaderAlpha})`;
      drawEndpoint(
        mx,
        my,
        tract.leaderEnd,
        3.5,
        ec,
        Math.atan2(pos.y - my, pos.x - mx),
      );
    }
    let ta = ((call.labelRotation || 0) * Math.PI) / 180;
    if (!hasM && !autoL) {
      ta = Math.atan2(dy2, dx2) + ((call.labelRotation || 0) * Math.PI) / 180;
      if (ta > Math.PI / 2) ta -= Math.PI;
      if (ta < -Math.PI / 2) ta += Math.PI;
    }
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(ta);
    const lh = fs * 1.3,
      th = lines.length * lh;
    ctx.font = `500 ${fs}px 'JetBrains Mono',monospace`;
    const mw = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0),
      pad = 4;
    if (tract.showLabelBg) {
      const bg = hexToRgb(tract.labelBg);
      ctx.fillStyle = `rgba(${bg.r},${bg.g},${bg.b},${tract.labelBgAlpha})`;
      roundRect(
        ctx,
        -mw / 2 - pad,
        -th / 2 - pad,
        mw + pad * 2,
        th + pad * 2,
        3,
      );
      ctx.fill();
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, li) => {
      const ly = -th / 2 + lh * (li + 0.5);
      if (li === 0 && tract.numberCalls) {
        ctx.fillStyle = "#4a7cff";
        ctx.font = `700 ${fs}px 'JetBrains Mono',monospace`;
      } else {
        ctx.fillStyle = tract.labelColor;
        ctx.font = `500 ${fs}px 'JetBrains Mono',monospace`;
      }
      ctx.fillText(line, 0, ly);
    });
    ctx.restore();
  }
  // Corner markers
  // Corner markers — only at call start/end points, not arc intermediates
  if (callPointStyle.show && callPointStyle.radius > 0) {
    const endpointIndices = new Set([0]);
    for (const c of tract.calls) {
      if (c._ptRange) endpointIndices.add(c._ptRange.end);
      else endpointIndices.add(endpointIndices.size);
    }
    // Fallback: if no _ptRange data, draw at original point indices
    if (!tract.calls[0] || !tract.calls[0]._ptRange) {
      for (let i = 0; i < pts.length - 1; i++) endpointIndices.add(i);
    }
    for (const i of endpointIndices) {
      if (i >= sp.length) continue;
      ctx.beginPath();
      ctx.arc(sp[i].x, sp[i].y, callPointStyle.radius, 0, Math.PI * 2);
      ctx.fillStyle = callPointStyle.color;
      ctx.fill();
      if (tract.strokeWidth > 0) {
        ctx.strokeStyle = tract.strokeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }
  // Parcel ID
  if (tract.parcelId) {
    const pp = getPidPos(tract),
      idFs = tract.pidSize * Math.min(1, cam.zoom * 2.5);
    ctx.save();
    ctx.translate(pp.x, pp.y);
    ctx.rotate(((tract.pidRotation || 0) * Math.PI) / 180);
    ctx.font = `700 ${idFs}px 'JetBrains Mono',monospace`;
    const tw = ctx.measureText(tract.parcelId).width;
    if (tract.pidShowBg) {
      const bg = hexToRgb(tract.pidBg);
      ctx.fillStyle = `rgba(${bg.r},${bg.g},${bg.b},${tract.pidBgAlpha})`;
      roundRect(ctx, -tw / 2 - 10, -idFs / 2 - 6, tw + 20, idFs + 12, 6);
      ctx.fill();
    }
    ctx.fillStyle = tract.pidColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tract.parcelId, 0, 0);
    ctx.restore();
  }
  // Tract name
  const np = getNamePos(tract),
    nFs = tract.nameSize * Math.min(1, cam.zoom * 2.5);
  ctx.save();
  ctx.translate(np.x, np.y);
  ctx.rotate(((tract.nameRotation || 0) * Math.PI) / 180);
  ctx.font = `600 ${nFs}px Inter,sans-serif`;
  if (tract.nameShowBg) {
    const tw2 = ctx.measureText(tract.name).width;
    const bg = hexToRgb(tract.nameBg);
    ctx.fillStyle = `rgba(${bg.r},${bg.g},${bg.b},${tract.nameBgAlpha})`;
    roundRect(ctx, -tw2 / 2 - 8, -nFs / 2 - 4, tw2 + 16, nFs + 8, 4);
    ctx.fill();
  }
  ctx.fillStyle = tract.nameColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(tract.name, 0, 0);
  ctx.restore();
}

// Draw persistent shapes for active tract
function drawShapes() {
  const t = tracts[activeTractIdx];
  if (!t || !t.shapes || !t.shapes.length) return;
  for (const shape of t.shapes) {
    // Convert world coordinates back to screen coordinates for rendering
    const startScreen = w2s(shape.startX, shape.startY);
    const endScreen = w2s(shape.endX, shape.endY);
    drawShape(shape.type, startScreen, endScreen, shape.color, shape.width);
  }
}

function drawNorthArrow(W, H, color) {
  ctx.save();
  ctx.translate(W - 50, 80);
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.lineTo(8, 5);
  ctx.lineTo(-8, 5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = "700 14px 'JetBrains Mono',monospace";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("N", 0, 10);
  ctx.restore();
}

function drawScaleBar(W, H, color) {
  let bf = 100;
  for (const o of [50, 100, 200, 500, 1000, 2000, 5000])
    if (o * cam.zoom > 60 && o * cam.zoom < 200) {
      bf = o;
      break;
    }
  const bp = bf * cam.zoom,
    x = W - 50 - bp,
    y = H - 30;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + bp, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x, y + 6);
  ctx.moveTo(x + bp, y - 6);
  ctx.lineTo(x + bp, y + 6);
  ctx.stroke();
  ctx.font = "600 11px 'JetBrains Mono',monospace";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(`${bf} ft`, x + bp / 2, y - 10);
  ctx.globalAlpha = 1;
}

function drawTitle(W, color) {
  const title = $("mapTitle").value,
    sub = $("mapSubtitle").value;
  if (!title && !sub) return;
  let x = 20,
    y = 24;
  if (title) {
    ctx.font = "700 16px Inter,sans-serif";
    ctx.fillStyle = $("titleColor").value || "#000000";
    ctx.globalAlpha = 0.9;
    ctx.textAlign = "left";
    ctx.fillText(title, x, y);
    ctx.globalAlpha = 1;
    y += 20;
  }
  if (sub) {
    ctx.font = "400 12px Inter,sans-serif";
    ctx.fillStyle = $("subColor").value || color;
    ctx.globalAlpha = parseInt($("subAlpha").value) / 100 || 0.5;
    ctx.textAlign = "left";
    ctx.fillText(sub, x, y);
    ctx.globalAlpha = 1;
  }
}

// Legend box
function getLegendDims() {
  if (!tracts.length) return { w: 0, h: 0 };
  const fs = 10,
    lh = 14,
    pad = 12;
  let lines = 0;
  for (const t of tracts) {
    lines += 2;
    lines += t.calls.length;
    lines += 3;
  } // name, separator, calls, stats
  return { w: 280, h: lines * lh + pad * 2 };
}

function drawLegend(W, H) {
  const lp = getLegendPos(W, H),
    dim = getLegendDims();
  const x = lp.x,
    y = lp.y;

  // Box with drop shadow if enabled
  ctx.save();
  if (legendStyle.dropShadow) {
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }
  ctx.fillStyle = legendStyle.bgColor || "rgba(255,255,255,0.95)";
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, dim.w, dim.h, 8);
  ctx.fill();
  ctx.stroke();

  // Content
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let cy = y + 10;
  const lh = 14,
    px = x + 12;
  for (const t of tracts) {
    // Per-tract text color (defaults to black)
    const tColor = t.legendTextColor || "#000000";

    ctx.font = "700 11px 'JetBrains Mono',monospace";
    ctx.fillStyle = tColor;
    ctx.fillText(t.name, px, cy);

    cy += lh;
    const area = computeArea(t.coords),
      ce = closureError(t.coords),
      perim = t.calls.reduce((s, c) => s + c.dist, 0),
      ratio = ce > 0.001 ? `1:${Math.round(perim / ce)}` : "PERFECT";
    ctx.font = "500 10px 'JetBrains Mono',monospace";
    ctx.fillStyle = tColor;
    ctx.fillText(
      `Area: ${area.toFixed(4)} ac  |  Stated: ${t.name.match(/[\d.]+/)?.[0] || "—"} ac`,
      px,
      cy,
    );
    cy += lh;
    ctx.fillStyle = tColor;
    ctx.font = "500 10px 'JetBrains Mono',monospace";
    for (const c of t.calls) {
      ctx.fillText(`${c.bearingStr}  ${c.dist.toFixed(2)} ft`, px, cy);
      cy += lh;
    }
    ctx.fillStyle = tColor;
    ctx.fillText(`Closure: ${ce.toFixed(4)}' (${ratio})`, px, cy);
    cy += lh;
    cy += 4;
  }
  ctx.restore();
}
