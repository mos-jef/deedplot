const $ = (id) => document.getElementById(id);

// ═══════════════ STATE ═══════════════
let tracts = [],
  activeTractIdx = -1;
let cam = { x: 0, y: 0, zoom: 0.25 };
let isDragging = false,
  dragStart = { x: 0, y: 0 };
let canvas, ctx;
let dragTarget = null,
  dragOffset = { x: 0, y: 0 };
let bgS = {
  img: null,
  show: true,
  alpha: 0.4,
  scale: 1,
  rotation: 0,
  rotFine: 0,
  wx: 0,
  wy: 0,
};
let legendPos = { sx: null, sy: null }; // screen coords, null=auto bottom-left
let legendStyle = {
  bgColor: "#ffffff",
  dropShadow: true,
};
let callPointStyle = {
  show: true,
  radius: 4,
  color: "#ffffff",
};
let currentDrawMode = null; // 'rect', 'circle', 'line', 'arrow', 'dashedLine', or null
let drawStart = null; // { x, y } for shape drawing
let dropShadow = {
  x: 2,
  y: 2,
  blur: 4,
  color: "#000000",
  alpha: 0.3,
};

// Undo
let undoStack = [],
  MAX_UNDO = 50;
function saveUndo() {
  const s = {
    tracts: JSON.parse(
      JSON.stringify(tracts, (k, v) =>
        typeof v === "function" ? undefined : v,
      ),
    ),
    activeTractIdx,
    legendPos: { ...legendPos },
  };
  undoStack.push(s);
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}
function doUndo() {
  if (!undoStack.length) {
    showToast("Nothing to undo");
    return;
  }
  const s = undoStack.pop();
  activeTractIdx = s.activeTractIdx;
  legendPos = s.legendPos;
  tracts = s.tracts.map((t) => {
    t.calls = t.calls.map((c) => {
      c.toRad = makeToRad(c.quad, c.deg, c.min, c.sec, c.dir);
      return c;
    });
    recomputeRotatedCoords(t);
    return t;
  });
  updateTractList();
  updateProps();
  updateCallSchedule();
  redraw();
  showToast("Undo");
}
