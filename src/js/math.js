// ═══════════════ MATH ═══════════════
function makeToRad(q, d, m, s, dir) {
  return function () {
    const dd = d + m / 60 + s / 3600;
    if (q === "N" && dir === "E") return ((90 - dd) * Math.PI) / 180;
    if (q === "N" && dir === "W") return ((90 + dd) * Math.PI) / 180;
    if (q === "S" && dir === "E") return ((270 + dd) * Math.PI) / 180;
    if (q === "S" && dir === "W") return ((270 - dd) * Math.PI) / 180;
    return 0;
  };
}

function parseDistance(text) {
  // Match distance with units — supports all common survey measurements
  // Handles fractions like "6.48 1/2"
  const dm = text.match(
    /(?:a\s+distance\s+of\s+)?(\d[\d,]*(?:\.\d+)?)\s*(?:(\d+)\s*\/\s*(\d+))?\s*(feet|foot|ft|chains?|ch|links?|lks?|rods?|rd|perch(?:es)?|poles?|varas?|meters?|m|yards?|yd|')?/i,
  );
  if (!dm) return null;
  let val = parseFloat(dm[1].replace(/,/g, ""));
  if (dm[2] && dm[3]) val += parseInt(dm[2]) / parseInt(dm[3]);
  const unit = (dm[4] || "ft").toLowerCase();
  if (unit.startsWith("chain") || unit === "ch") val *= 66;
  else if (unit.startsWith("link") || unit === "lks" || unit === "lk")
    val *= 0.66;
  else if (unit.startsWith("rod") || unit === "rd") val *= 16.5;
  else if (unit.startsWith("perch")) val *= 16.5;
  else if (unit.startsWith("pole")) val *= 16.5;
  else if (unit.startsWith("vara")) val *= 2.778;
  else if (unit.startsWith("meter") || unit === "m") val *= 3.28084;
  else if (unit.startsWith("yard") || unit === "yd") val *= 3;
  return val;
}

function parseBearing(text) {
  let t = text
    .replace(/North/gi, "N")
    .replace(/South/gi, "S")
    .replace(/East/gi, "E")
    .replace(/West/gi, "W")
    .replace(/[''′]/g, "'")
    .replace(/[""″]/g, '"')
    .replace(/[°˚]/g, "°")
    .replace(/Due\s+/gi, "");

  let quad,
    deg,
    min = 0,
    sec = 0,
    dir,
    afterBearing;

  // Pattern 1: Full DMS — N 89°56'00" E or S 04°59'30" W
  let m = t.match(
    /([NS])\s*(\d+)[°]\s*(\d+)[':]\s*([\d.]+)["']?\s*([EW])/,
  );
  if (m) {
    quad = m[1];
    deg = +m[2];
    min = +m[3];
    sec = +m[4];
    dir = m[5];
    afterBearing = t.slice(t.indexOf(m[0]) + m[0].length);
  }

  // Pattern 2: Degrees + minutes, no seconds — N 0° 19' E
  if (!m) {
    m = t.match(/([NS])\s*(\d+)[°]\s*(\d+)[':]\s*([EW])/);
    if (m) {
      quad = m[1];
      deg = +m[2];
      min = +m[3];
      sec = 0;
      dir = m[4];
      afterBearing = t.slice(t.indexOf(m[0]) + m[0].length);
    }
  }

  // Pattern 3: Degrees only — S 28° W or South 28° West
  if (!m) {
    m = t.match(/([NS])\s*(\d+)[°]\s*([EW])/);
    if (m) {
      quad = m[1];
      deg = +m[2];
      min = 0;
      sec = 0;
      dir = m[3];
      afterBearing = t.slice(t.indexOf(m[0]) + m[0].length);
    }
  }

  // Pattern 4: Cardinal only — "North" "East" "South" "West" (no angle)
  if (!m) {
    m = t.match(/^\s*([NSEW])\s+([\d,]+)/);
    if (m) {
      const cardinal = m[1];
      if (cardinal === "N") {
        quad = "N";
        deg = 0;
        dir = "E";
      } else if (cardinal === "S") {
        quad = "S";
        deg = 0;
        dir = "E";
      } else if (cardinal === "E") {
        quad = "N";
        deg = 90;
        dir = "E";
      } else if (cardinal === "W") {
        quad = "N";
        deg = 90;
        dir = "W";
      }
      min = 0;
      sec = 0;
      afterBearing = t.slice(t.indexOf(m[0]) + m[1].length);
    }
  }

  // Pattern 5: "with the same" or "with said road" + cardinal — contextual direction
  // e.g. "with the same West 10.32 chains"
  if (!m) {
    m = t.match(
      /(?:with\s+(?:the\s+)?(?:same|said)\s+\w*\s*)([NSEW])\s+([\d,]+)/i,
    );
    if (m) {
      const cardinal = m[1].toUpperCase();
      if (cardinal === "N") {
        quad = "N";
        deg = 0;
        dir = "E";
      } else if (cardinal === "S") {
        quad = "S";
        deg = 0;
        dir = "E";
      } else if (cardinal === "E") {
        quad = "N";
        deg = 90;
        dir = "E";
      } else if (cardinal === "W") {
        quad = "N";
        deg = 90;
        dir = "W";
      }
      min = 0;
      sec = 0;
      afterBearing = t.slice(t.indexOf(m[0]) + m[1].length);
    }
  }

  if (!afterBearing && afterBearing !== "") return null;

  const dist = parseDistance(afterBearing);
  if (!dist || isNaN(dist)) return null;

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

function parseDescription(text) {
  const flat = text.replace(/\n/g, " ").replace(/\s+/g, " ");
  const segments = flat.split(/[Tt]hence\s+/);
  const calls = [];
  for (const seg of segments) {
    // Try curve first: look for radius + delta + chord bearing + chord length
    const curve = parseCurveCall(seg);
    if (curve) {
      calls.push(curve);
      continue;
    }
    const line = parseBearing(seg);
    if (line) calls.push(line);
  }
  return calls;
}

function parseCurveCall(text) {
  let t = text
    .replace(/North/gi, "N")
    .replace(/South/gi, "S")
    .replace(/East/gi, "E")
    .replace(/West/gi, "W")
    .replace(/[''′]/g, "'")
    .replace(/[""″]/g, '"')
    .replace(/[°˚]/g, "°");

  // Must have "curve" keyword
  if (!/curv/i.test(t)) return null;

  // Direction: right or left
  let curveDir = "R";
  if (/(?:to\s+the\s+)?left/i.test(t)) curveDir = "L";

  // Radius — multiple patterns: "radius of 629.50 feet", "radius=100", "R=552.00 feet", "R 552.00"
  let radius = null;
  let rm = t.match(
    /(?:radius|R)\s*(?:of\s*|=\s*|:\s*)(\d[\d,]*(?:\.\d+)?)\s*(?:feet|foot|ft|')?/i,
  );
  if (rm) radius = parseFloat(rm[1].replace(/,/g, ""));
  if (!radius) return null;

  // Delta / central angle — "central angle of 03°58'47"", "Δ=89°36'27"", "delta=45°"
  let delta = null;
  let dm = t.match(
    /(?:central\s+angle|delta|Δ)\s*(?:of\s*|=\s*|:\s*)?(\d+)[°]\s*(\d+)?[':]\s*([\d.]+)?/i,
  );
  if (dm)
    delta =
      parseInt(dm[1]) +
      (parseInt(dm[2]) || 0) / 60 +
      (parseFloat(dm[3]) || 0) / 3600;
  if (!delta) {
    dm = t.match(
      /(?:central\s+angle|delta|Δ)\s*(?:of\s*|=\s*)?(\d+(?:\.\d+)?)\s*°/i,
    );
    if (dm) delta = parseFloat(dm[1]);
  }

  // Chord bearing — multiple patterns:
  // "chord bearing of S 41°32'38" E"
  // "chord=777.97 feet bearing S 41°32'38" E"
  // "bearing S 41°32'38" E"
  let chordBearing = null;
  // Pattern 1: "chord bearing of/= ..."
  let cbm = t.match(
    /chord\s+bearing\s*(?:of\s*|=\s*)?([NS])\s*(\d+)[°]?\s*(\d+)?[':.]?\s*([\d.]+)?["']?\s*([EW])/i,
  );
  if (!cbm) {
    // Pattern 2: "bearing S XX°XX'XX" E" anywhere in text
    cbm = t.match(
      /bearing\s+([NS])\s*(\d+)[°]?\s*(\d+)?[':.]?\s*([\d.]+)?["']?\s*([EW])/i,
    );
  }
  if (cbm) {
    chordBearing = {
      quad: cbm[1],
      deg: parseInt(cbm[2]),
      min: parseInt(cbm[3]) || 0,
      sec: parseFloat(cbm[4]) || 0,
      dir: cbm[5],
    };
  }

  // Chord length — "chord=777.97 feet", "chord distance of 43.72 feet", "chord of X feet"
  let chordLen = null;
  let clm = t.match(
    /chord\s*(?:distance|length|dist\.?)?\s*(?:of\s*|=\s*)?(\d[\d,]*(?:\.\d+)?)\s*(?:feet|foot|ft|')?/i,
  );
  if (clm) chordLen = parseFloat(clm[1].replace(/,/g, ""));
  if (!chordLen) {
    clm = t.match(
      /chord\s+of\s+(\d[\d,]*(?:\.\d+)?)\s*(?:feet|foot|ft|')?/i,
    );
    if (clm) chordLen = parseFloat(clm[1].replace(/,/g, ""));
  }

  // Arc length (optional) — "863.30 feet" before the parentheses, or "arc length of X"
  let arcLen = null;
  let alm = t.match(
    /arc\s*(?:length|distance)?\s*(?:of\s*|=\s*)?(\d[\d,]*(?:\.\d+)?)\s*(?:feet|foot|ft|')?/i,
  );
  if (alm) arcLen = parseFloat(alm[1].replace(/,/g, ""));

  // If we have chord bearing + chord length, we can plot
  if (!chordBearing) return null;
  if (!chordLen) {
    if (radius && delta) {
      chordLen = 2 * radius * Math.sin((delta * Math.PI) / 180 / 2);
    } else return null;
  }
  if (!delta && radius && chordLen) {
    delta =
      (2 * Math.asin(Math.min(1, chordLen / (2 * radius))) * 180) /
      Math.PI;
  }

  const q = chordBearing.quad,
    d = chordBearing.deg,
    mi = chordBearing.min,
    s = chordBearing.sec,
    dir = chordBearing.dir;
  const bearingStr = `${q} ${String(d).padStart(2, "0")}°${String(mi).padStart(2, "0")}'${s.toFixed(2).padStart(5, "0")}" ${dir}`;

  return {
    quad: q,
    deg: d,
    min: mi,
    sec: s,
    dir,
    dist: chordLen,
    bearingStr: `↶ ${bearingStr} (R=${radius.toFixed(1)}')`,
    isCurve: true,
    radius,
    delta,
    curveDir,
    arcLen: arcLen || null,
    labelOffset: null,
    labelRotation: 0,
    toRad: makeToRad(q, d, mi, s, dir),
  };
}

function callsToCoords(calls, sx = 0, sy = 0) {
  const pts = [{ x: sx, y: sy }];
  let x = sx,
    y = sy;
  // callPtRanges[i] = {start, end} indices into pts for call i
  const callPtRanges = [];
  for (let ci = 0; ci < calls.length; ci++) {
    const c = calls[ci];
    const startIdx = pts.length - 1;
    if (c.isCurve && c.radius && c.delta) {
      const chordBearing = c.toRad();
      const chordDist = c.dist;
      const R = c.radius;
      const deltaRad = (c.delta * Math.PI) / 180;
      const arcDir = c.curveDir || "R";

      // Endpoint of chord
      const endX = x + chordDist * Math.cos(chordBearing);
      const endY = y + chordDist * Math.sin(chordBearing);

      // Midpoint of chord
      const midX = (x + endX) / 2;
      const midY = (y + endY) / 2;

      // Distance from chord midpoint to circle center
      // Using: d = sqrt(R^2 - (chord/2)^2)
      const halfChord = chordDist / 2;
      const d = Math.sqrt(Math.max(0, R * R - halfChord * halfChord));

      // Perpendicular to chord direction
      // Chord angle in screen coords
      const chordAngle = Math.atan2(endY - y, endX - x);

      // For curve RIGHT: center is to the right of travel direction (perpendicular CW)
      // For curve LEFT: center is to the left of travel direction (perpendicular CCW)
      const perpAngle =
        arcDir === "R"
          ? chordAngle - Math.PI / 2
          : chordAngle + Math.PI / 2;

      // Circle center
      const cx2 = midX + d * Math.cos(perpAngle);
      const cy2 = midY + d * Math.sin(perpAngle);

      // Start angle (from center to start point)
      const startAngle = Math.atan2(y - cy2, x - cx2);

      // For curve RIGHT, we sweep clockwise (negative in standard math coords)
      // For curve LEFT, we sweep counter-clockwise (positive)
      // But our coordinate system has Y-up, so:
      // RIGHT = clockwise when looking at map = negative angle change
      // LEFT = counter-clockwise when looking at map = positive angle change
      const sweepSign = arcDir === "R" ? -1 : 1;

      const numSegs = Math.max(
        12,
        Math.round((Math.abs(deltaRad) * R) / 15),
      );
      for (let s = 1; s <= numSegs; s++) {
        const frac = s / numSegs;
        const a = startAngle + sweepSign * deltaRad * frac;
        pts.push({ x: cx2 + R * Math.cos(a), y: cy2 + R * Math.sin(a) });
      }
      const lastPt = pts[pts.length - 1];
      x = lastPt.x;
      y = lastPt.y;
    } else {
      const a = c.toRad();
      x += c.dist * Math.cos(a);
      y += c.dist * Math.sin(a);
      pts.push({ x, y });
    }
    callPtRanges.push({ start: startIdx, end: pts.length - 1 });
  }
  // Store ranges on each call for label positioning
  for (let ci = 0; ci < calls.length; ci++) {
    calls[ci]._ptRange = callPtRanges[ci];
  }
  return pts;
}
function computeArea(pts) {
  let a = 0;
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a) / 2 / 43560;
}
function centroid(pts) {
  const n = pts.length - 1;
  let cx = 0,
    cy = 0;
  for (let i = 0; i < n; i++) {
    cx += pts[i].x;
    cy += pts[i].y;
  }
  return { x: cx / n, y: cy / n };
}
function closureError(pts) {
  const s = pts[0],
    e = pts[pts.length - 1];
  return Math.sqrt((e.x - s.x) ** 2 + (e.y - s.y) ** 2);
}

