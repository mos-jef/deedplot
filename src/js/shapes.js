// ═══════════════ SHAPE DRAWING ═══════════════
function drawShape(shape, start, end, color = "#000000", width = 2) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.fillStyle = "transparent";

  if (shape === "rect") {
    const w = end.x - start.x;
    const h = end.y - start.y;
    ctx.strokeRect(start.x, start.y, w, h);
  } else if (shape === "circle") {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    ctx.beginPath();
    ctx.arc(start.x, start.y, r, 0, Math.PI * 2);
    ctx.stroke();
  } else if (shape === "line") {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (shape === "arrow") {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const headlen = 20;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headlen * Math.cos(angle - Math.PI / 6),
      end.y - headlen * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headlen * Math.cos(angle + Math.PI / 6),
      end.y - headlen * Math.sin(angle + Math.PI / 6),
    );
    ctx.stroke();
  } else if (shape === "dashedLine") {
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

