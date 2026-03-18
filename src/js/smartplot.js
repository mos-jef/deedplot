// ═══════════════ AI SMART PLOT ═══════════════
async function aiSmartPlot() {
  const text = $("deedInput").value.trim();
  if (!text) {
    showToast("Paste a description first");
    return;
  }

  const endpoint = ($("aiEndpoint").value || "").trim();
  if (!endpoint) {
    showToast("Set your AI endpoint URL first");
    $("aiEndpoint").focus();
    return;
  }

  // UI feedback
  const btn = $("aiPlotBtn");
  const origText = btn.textContent;
  btn.textContent = "⏳ Analyzing...";
  btn.disabled = true;
  btn.style.opacity = "0.6";
  $("aiWarnings").style.display = "none";

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!resp.ok) {
      const err = await resp
        .json()
        .catch(() => ({ error: "Network error" }));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }

    const data = await resp.json();

    if (!data.tracts || !data.tracts.length) {
      showToast("AI found no plottable calls");
      return;
    }

    // Show warnings if any
    if (data.warnings && data.warnings.length) {
      const wEl = $("aiWarnings");
      wEl.innerHTML =
        '<strong style="color:#f0a030">⚠ AI Warnings:</strong><br>' +
        data.warnings.map((w) => "• " + w).join("<br>");
      wEl.style.display = "block";
    }

    // Convert AI response into DeedPlot tracts
    saveUndo();

    for (const aiTract of data.tracts) {
      const calls = aiTract.calls.map((c) => {
        const quad = c.quad,
          deg = c.deg,
          min = c.min,
          sec = Math.round(c.sec * 100) / 100,
          dir = c.dir,
          dist = c.dist;
        const bearingStr = `${quad} ${String(deg).padStart(2, "0")}°${String(min).padStart(2, "0")}'${sec.toFixed(2).padStart(5, "0")}" ${dir}`;
        const call = {
          quad,
          deg,
          min,
          sec,
          dir,
          dist,
          bearingStr: c.isCurve
            ? `↶ ${bearingStr} (R=${(c.radius || 0).toFixed(1)}')`
            : bearingStr,
          labelOffset: null,
          labelRotation: 0,
          toRad: makeToRad(quad, deg, min, sec, dir),
        };
        if (c.isCurve) {
          call.isCurve = true;
          call.radius = c.radius || 0;
          call.delta = c.delta || 0;
          call.curveDir = c.curveDir || "R";
        }
        return call;
      });

      if (!calls.length) continue;

      const t = createTract(calls, aiTract.name || "");
      if (aiTract.isException) {
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

    const totalCalls = data.tracts.reduce(
      (s, t) => s + t.calls.length,
      0,
    );
    showToast(
      `AI plotted ${data.tracts.length} tract(s), ${totalCalls} calls`,
    );
  } catch (err) {
    console.error("AI Smart Plot error:", err);
    showToast("AI error: " + err.message);
  } finally {
    btn.textContent = origText;
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

// Load saved AI endpoint on startup
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("deedplot_ai_url");
  if (saved && $("aiEndpoint")) $("aiEndpoint").value = saved;
});

