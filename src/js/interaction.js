// ═══════════════ INTERACTION ═══════════════
function setupInteraction() {
  const container = $("canvasContainer");
  let dragStartPos = null; // track initial mouse pos for drag threshold
  let annoMouseDownIdx = -1; // track if mousedown was on an annotation
  let annoHasDragged = false;
  container.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect(),
      sx = e.clientX - rect.left,
      sy = e.clientY - rect.top;

    // Dismiss delete CTA on any mousedown
    hideAnnoDeleteCta();

    // Handle shape drawing mode
    if (currentDrawMode) {
      drawStart = { x: sx, y: sy };
      container.style.cursor = "crosshair";
      e.preventDefault();
      return;
    }

    // Check annotations first (highest priority for click interaction)
    const annoIdx = hitTestAnno(sx, sy);
    if (annoIdx >= 0) {
      annoMouseDownIdx = annoIdx;
      annoHasDragged = false;
      dragStartPos = { x: sx, y: sy };
      const a = annotations[annoIdx];
      const s = w2s(a.wx, a.wy);
      dragTarget = { type: "anno", idx: annoIdx };
      dragOffset = { x: sx - s.x, y: sy - s.y };
      e.preventDefault();
      return;
    }
    annoMouseDownIdx = -1;

    const hit = hitTest(sx, sy);
    if (hit) {
      saveUndo();
      dragTarget = hit;
      dragStartPos = { x: sx, y: sy };
      if (hit.type === "label") {
        const p = getLabelPos(tracts[hit.tractIdx], hit.callIdx);
        dragOffset = { x: sx - p.x, y: sy - p.y };
      } else if (hit.type === "tname") {
        const p = getNamePos(tracts[hit.tractIdx]);
        dragOffset = { x: sx - p.x, y: sy - p.y };
      } else if (hit.type === "tpid") {
        const p = getPidPos(tracts[hit.tractIdx]);
        dragOffset = { x: sx - p.x, y: sy - p.y };
      } else if (hit.type === "bg") {
        const s = w2s(bgS.wx, bgS.wy);
        dragOffset = { x: sx - s.x, y: sy - s.y };
      } else if (hit.type === "legend") {
        const lp = getLegendPos(
          $("canvasContainer").clientWidth,
          $("canvasContainer").clientHeight,
        );
        dragOffset = { x: sx - lp.x, y: sy - lp.y };
      } else if (hit.type === "tract") {
        const wc = s2w(sx, sy);
        dragOffset = {
          x: wc.x - tracts[hit.tractIdx].pobX,
          y: wc.y - tracts[hit.tractIdx].pobY,
        };
        selectTract(hit.tractIdx);
      }
      container.style.cursor = "move";
      e.preventDefault();
      return;
    }
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    container.style.cursor = "grabbing";
  });
  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect(),
      sx = e.clientX - rect.left,
      sy = e.clientY - rect.top;
    const w = s2w(sx, sy);
    $("statusCoords").textContent =
      `X: ${w.x.toFixed(1)}  Y: ${w.y.toFixed(1)}`;

    // Handle shape drawing preview
    if (currentDrawMode && drawStart) {
      redraw();
      drawShape(
        currentDrawMode,
        drawStart,
        { x: sx, y: sy },
        $("shapeColor").value || "#000000",
        parseInt($("shapeWidth").value) || 2,
      );
      return;
    }

    if (dragTarget) {
      // Drag threshold: don't move until mouse has moved at least 3px from mousedown point
      if (dragStartPos) {
        const dx = sx - dragStartPos.x,
          dy = sy - dragStartPos.y;
        if (Math.sqrt(dx * dx + dy * dy) < 3) return; // below threshold, don't move yet
        dragStartPos = null; // threshold exceeded, allow drag from now on
        if (dragTarget.type === "anno") annoHasDragged = true;
      }
      const tx = sx - dragOffset.x,
        ty = sy - dragOffset.y;
      if (dragTarget.type === "legend") {
        // Legend position is now stored as top-left corner in screen coords
        legendPos = { sx: tx, sy: ty };
      } else if (dragTarget.type === "anno") {
        container.style.cursor = "move";
        const wc = s2w(tx, ty);
        annotations[dragTarget.idx].wx = wc.x;
        annotations[dragTarget.idx].wy = wc.y;
      } else {
        const wc = s2w(tx, ty);
        if (dragTarget.type === "label") {
          tracts[dragTarget.tractIdx].calls[dragTarget.callIdx].labelOffset = {
            wx: wc.x,
            wy: wc.y,
          };
        } else if (dragTarget.type === "tname") {
          tracts[dragTarget.tractIdx].nameOffset = { wx: wc.x, wy: wc.y };
        } else if (dragTarget.type === "tpid") {
          tracts[dragTarget.tractIdx].pidOffset = { wx: wc.x, wy: wc.y };
        } else if (dragTarget.type === "bg") {
          bgS.wx = wc.x;
          bgS.wy = wc.y;
        } else if (dragTarget.type === "tract") {
          const t = tracts[dragTarget.tractIdx];
          const wNow = s2w(sx, sy);
          t.pobX = wNow.x - dragOffset.x;
          t.pobY = wNow.y - dragOffset.y;
          recomputeRotatedCoords(t);
          if (dragTarget.tractIdx === activeTractIdx) {
            $("propPobX").value = t.pobX.toFixed(2);
            $("propPobY").value = t.pobY.toFixed(2);
          }
        }
      }
      redraw();
      return;
    }
    if (!isDragging) {
      container.style.cursor = hitTest(sx, sy) ? "move" : "grab";
      return;
    }
    cam.x -= (e.clientX - dragStart.x) / cam.zoom;
    cam.y += (e.clientY - dragStart.y) / cam.zoom;
    dragStart = { x: e.clientX, y: e.clientY };
    redraw();
  });
  window.addEventListener("mouseup", () => {
    // Handle shape drawing completion

    if (currentDrawMode && drawStart) {
      const rect = canvas.getBoundingClientRect(),
        sx = event.clientX - rect.left,
        sy = event.clientY - rect.top;

      // Convert SCREEN coordinates to WORLD coordinates for both start and end
      const startWorld = s2w(drawStart.x, drawStart.y);
      const endWorld = s2w(sx, sy);

      // Store shape in current tract
      const t = tracts[activeTractIdx];
      if (t) {
        if (!t.shapes) t.shapes = [];
        t.shapes.push({
          type: currentDrawMode,
          startX: startWorld.x,
          startY: startWorld.y,
          endX: endWorld.x,
          endY: endWorld.y,
          color: $("shapeColor").value || "#000000",
          width: parseInt($("shapeWidth").value) || 2,
        });
        saveUndo();
      }

      drawStart = null;
      currentDrawMode = null;
      updateDrawModeButtons();
      redraw();
      return;
    }

    // Annotation drag cleanup (delete is now on right-click)
    annoMouseDownIdx = -1;
    annoHasDragged = false;

    isDragging = false;
    dragTarget = null;
    dragStartPos = null;
    $("canvasContainer").style.cursor = "grab";
  });

  // Right-click on canvas — annotations and shapes
  container.addEventListener("contextmenu", (e) => {
    const rect = canvas.getBoundingClientRect(),
      sx = e.clientX - rect.left,
      sy = e.clientY - rect.top;

    // Check annotations first
    const annoIdx = hitTestAnno(sx, sy);
    if (annoIdx >= 0) {
      e.preventDefault();
      annoDeleteTargetIdx = annoIdx;
      showAnnoDeleteCta(annotations[annoIdx]);
      return;
    }

    const hit = hitTest(sx, sy);
    if (hit && hit.type === "shape") {
      e.preventDefault();
      const menu = document.createElement("div");
      menu.style.cssText = `
        position: fixed;
        top: ${e.clientY}px;
        left: ${e.clientX}px;
        background: var(--dp-bg);
        border: 1px solid var(--dp-border-lt);
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 10000;
        padding: 4px 0;
      `;
      if (hit.type === "shape") {
        const ti = hit.tractIdx,
          si = hit.shapeIdx;
        const currentColor = tracts[ti].shapes[si].color || "#000000";
        const currentWidth = tracts[ti].shapes[si].width || 2;
        menu.innerHTML = `
          <div style="padding:6px 12px;display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dp-text)">
            <label style="font-size:9px;color:var(--dp-text2)">Color</label>
            <input type="color" value="${currentColor}" style="width:22px;height:18px;border:1px solid var(--dp-border-lt);border-radius:2px;padding:0;cursor:pointer" onchange="event.stopPropagation();saveUndo();tracts[${ti}].shapes[${si}].color=this.value;redraw()">
            <label style="font-size:9px;color:var(--dp-text2)">Width</label>
            <select style="width:40px;font-size:9px;background:var(--dp-field);color:var(--dp-text);border:1px solid var(--dp-border-lt);border-radius:2px;padding:1px;cursor:pointer" onchange="event.stopPropagation();saveUndo();tracts[${ti}].shapes[${si}].width=parseInt(this.value);redraw()">
              <option value="1" ${currentWidth === 1 ? "selected" : ""}>1px</option>
              <option value="2" ${currentWidth === 2 ? "selected" : ""}>2px</option>
              <option value="3" ${currentWidth === 3 ? "selected" : ""}>3px</option>
              <option value="4" ${currentWidth === 4 ? "selected" : ""}>4px</option>
              <option value="5" ${currentWidth === 5 ? "selected" : ""}>5px</option>
            </select>
          </div>
          <div style="padding:6px 12px;cursor:pointer;color:#ef4444;font-size:11px" onmousedown="event.stopPropagation();saveUndo();tracts[${ti}].shapes.splice(${si},1);redraw();document.body.removeChild(this.closest('.ctx-menu'))">
            Delete this shape
          </div>
        `;
        menu.classList.add("ctx-menu");
      }
      document.body.appendChild(menu);
      setTimeout(() => {
        const closeMenu = () => {
          if (menu.parentElement) document.body.removeChild(menu);
          document.removeEventListener("click", closeMenu);
        };
        document.addEventListener("click", closeMenu);
      }, 0);
    }
  });

  container.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect(),
        sx = e.clientX - rect.left,
        sy = e.clientY - rect.top;
      const hit = hitTest(sx, sy);
      // Shift+scroll on tract = rotate tract
      if (e.shiftKey && hit && hit.type === "tract") {
        saveUndo();
        const d = e.deltaY > 0 ? -1 : 1;
        const t = tracts[hit.tractIdx];
        t.tractRotation = (t.tractRotation || 0) + d;
        recomputeRotatedCoords(t);
        if (hit.tractIdx === activeTractIdx) {
          $("propTractRot").value = t.tractRotation;
          $("propTractRotVal").value = t.tractRotation;
        }
        redraw();
        return;
      }
      // Plain scroll on label/tname/tpid = rotate that element
      if (
        !e.shiftKey &&
        hit &&
        (hit.type === "label" || hit.type === "tname" || hit.type === "tpid")
      ) {
        saveUndo();
        const d = e.deltaY > 0 ? -3 : 3;
        if (hit.type === "label")
          tracts[hit.tractIdx].calls[hit.callIdx].labelRotation =
            (tracts[hit.tractIdx].calls[hit.callIdx].labelRotation || 0) + d;
        else if (hit.type === "tname")
          tracts[hit.tractIdx].nameRotation =
            (tracts[hit.tractIdx].nameRotation || 0) + d;
        else if (hit.type === "tpid")
          tracts[hit.tractIdx].pidRotation =
            (tracts[hit.tractIdx].pidRotation || 0) + d;
        redraw();
        return;
      }
      // Otherwise = zoom
      const f = e.deltaY > 0 ? 0.9 : 1.1,
        before = s2w(sx, sy);
      cam.zoom *= f;
      cam.zoom = Math.max(0.01, Math.min(10, cam.zoom));
      const after = s2w(sx, sy);
      cam.x -= after.x - before.x;
      cam.y -= after.y - before.y;
      redraw();
    },
    { passive: false },
  );

  container.addEventListener("dblclick", (e) => {
    const rect = canvas.getBoundingClientRect(),
      sx = e.clientX - rect.left,
      sy = e.clientY - rect.top;
    const hit = hitTest(sx, sy);
    if (!hit) return;
    saveUndo();
    if (hit.type === "label") {
      tracts[hit.tractIdx].calls[hit.callIdx].labelOffset = null;
      tracts[hit.tractIdx].calls[hit.callIdx].labelRotation = 0;
    } else if (hit.type === "tname") {
      tracts[hit.tractIdx].nameOffset = null;
      tracts[hit.tractIdx].nameRotation = 0;
    } else if (hit.type === "tpid") {
      tracts[hit.tractIdx].pidOffset = null;
      tracts[hit.tractIdx].pidRotation = 0;
    } else if (hit.type === "legend") {
      legendPos = { sx: null, sy: null };
    } else if (hit.type === "tract") {
      tracts[hit.tractIdx].tractRotation = 0;
      recomputeRotatedCoords(tracts[hit.tractIdx]);
      if (hit.tractIdx === activeTractIdx) {
        $("propTractRot").value = 0;
        $("propTractRotVal").value = 0;
      }
    }
    redraw();
    showToast("Reset");
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "z") {
      e.preventDefault();
      doUndo();
    }
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      parseDeed();
    }
  });
}
