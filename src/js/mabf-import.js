// ═══════════════ MABF IMPORT ═══════════════
function importMABF(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const text = e.target.result;
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        showToast("Invalid MABF file");
        return;
      }
      const version = lines[0].trim();
      const xmlStr = lines.slice(1).join("");
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlStr, "text/xml");
      if (doc.querySelector("parsererror")) {
        showToast("Failed to parse MABF XML");
        return;
      }

      const layers = doc.querySelectorAll("Layer");
      if (!layers.length) {
        showToast("No layers found in MABF");
        return;
      }

      saveUndo();
      let imported = 0;

      for (const layer of layers) {
        // Parse calls from <Calls><Line> elements
        const lineEls = layer.querySelectorAll("Calls > Line");
        const calls = [];
        for (const lineEl of lineEls) {
          const callStr = lineEl.textContent.trim();
          if (!callStr) continue;
          const parsed = parseSKCall(callStr);
          if (parsed) calls.push(parsed);
        }

        // Get layer name (base64 encoded in <Caption>)
        let layerName = "";
        const captionEl = layer.querySelector("Caption");
        if (captionEl && captionEl.textContent) {
          try {
            layerName = decodeURIComponent(
              escape(atob(captionEl.textContent)),
            );
          } catch (ex) {
            layerName = captionEl.textContent;
          }
        }

        // Get offsets
        const xOff =
          parseFloat(layer.querySelector("xOffset")?.textContent) || 0;
        const yOff =
          parseFloat(layer.querySelector("yOffset")?.textContent) || 0;
        const pobY = -yOff; // Sandy Knoll inverts Y axis

        // Get colors
        let fillColor = "#CDDC39";
        const fillColorEl = layer.querySelector("FillColor");
        if (fillColorEl) {
          fillColor = skColorToHex(fillColorEl.textContent);
        }
        let strokeColor = "#000000";
        const lineColorEl = layer.querySelector("LineColor");
        if (lineColorEl) {
          strokeColor = skColorToHex(lineColorEl.textContent);
        }

        // Get visibility/lock
        const visible =
          layer.querySelector("Visible")?.textContent !== "0";
        const locked = layer.querySelector("Locked")?.textContent === "1";

        // Fill style
        const fillStyle =
          parseInt(layer.querySelector("FillStyle")?.textContent) || 0;
        const hasFill = layer.querySelector("Fill")?.textContent !== "0";

        if (!calls.length) continue;

        const t = createTract(calls, layerName, xOff, pobY);
        t.fillColor = fillColor;
        t.strokeColor = strokeColor;
        t.visible = visible;
        t.locked = locked;
        t.hatching = fillStyle >= 4;
        if (hasFill) t.alpha = 0.65;

        // Line width
        const lw = parseInt(
          layer.querySelector("LineWidth")?.textContent,
        );
        if (!isNaN(lw)) t.strokeWidth = Math.max(1, lw);

        tracts.push(t);
        imported++;
      }

      if (!imported) {
        showToast("No plottable layers found");
        return;
      }
      updateTractList();
      selectTract(tracts.length - 1);
      fitToView();
      setTimeout(fitToView, 100);
      showToast(`Imported ${imported} layer(s) from MABF`);
    } catch (err) {
      console.error("MABF import error:", err);
      showToast("Error reading MABF: " + err.message);
    }
  };
  reader.readAsText(file);
  input.value = ""; // Reset so same file can be re-imported
}

// Parse a Sandy Knoll call string like "S 86:26:13 W 12.32" into a call object
function parseSKCall(str) {
  str = str.trim();
  // Pattern: QUAD DEG:MIN:SEC DIR DIST  or  QUAD DEG:MIN DIR DIST  or  QUAD DEG DIR DIST
  const m = str.match(
    /^([NS])\s+(\d+)(?::(\d+))?(?::(\d+(?:\.\d+)?))?\s+([EW])\s+([\d.]+)/,
  );
  if (!m) return null;
  const quad = m[1],
    deg = parseInt(m[2]),
    min = parseInt(m[3]) || 0,
    sec = parseFloat(m[4]) || 0,
    dir = m[5],
    dist = parseFloat(m[6]);
  if (isNaN(dist) || dist <= 0) return null;
  return {
    quad,
    deg,
    min,
    sec,
    dir,
    dist,
    bearingStr: `${quad} ${String(deg).padStart(2, "0")}°${String(min).padStart(2, "0")}'${sec.toFixed(2).padStart(5, "0")}" ${dir}`,
    labelOffset: null,
    labelRotation: 0,
    toRad: makeToRad(quad, deg, min, sec, dir),
  };
}

// Convert Sandy Knoll BGR integer color to hex "#RRGGBB"
function skColorToHex(val) {
  const n = parseInt(val);
  if (isNaN(n)) return "#000000";
  const b = (n >> 16) & 0xff,
    g = (n >> 8) & 0xff,
    r = n & 0xff;
  return (
    "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")
  );
}

