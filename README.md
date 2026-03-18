# DeedPlot — Metes & Bounds Parcel Plotter

Browser-based tool for plotting legal land descriptions. Parses metes & bounds calls, renders parcels on canvas, and exports to `.mabf` (Sandy Knoll Metes & Bounds Pro) format.

## Project Structure

```
DeedPlot/
├── index.html              ← Built output (deploy this to GitHub Pages)
├── build.sh                ← Build script: concatenates src → index.html
├── dev.html                ← Dev mode: loads modules separately (use with Live Server)
├── .gitignore
├── README.md
└── src/
    ├── body.html           ← App layout / HTML structure
    ├── css/
    │   └── deedplot.css    ← All styles
    └── js/
        ├── state.js        ← Global state, $() helper, undo system
        ├── helpers.js      ← roundRect, getBounds, hexToRgb, fitToView, export, toast
        ├── math.js         ← Bearing math, distance parsing, coordinate computation
        ├── tracts.js       ← Tract/layer creation, UI list, property panels, call schedule
        ├── bgimage.js      ← Background image load/clear/toggle UI
        ├── canvas.js       ← Canvas init, resize, coordinate transforms, hit testing
        ├── drawing.js      ← redraw(), drawTract(), drawGrid(), drawLegend(), etc.
        ├── shapes.js       ← Shape drawing primitives (rect, circle, line, arrow)
        ├── smartplot.js    ← AI Smart Plot (Claude Haiku via Cloudflare Worker)
        ├── mabf-export.js  ← Export to .mabf format
        ├── mabf-import.js  ← Import from .mabf format
        ├── interaction.js  ← Mouse/keyboard event handlers, drag, zoom, draw mode
        └── settings.js     ← LocalStorage persistence, UI helpers, init/boot
```

## Workflows

### Development
1. Open `dev.html` in a browser with a local server (e.g., VS Code Live Server)
2. Edit any file in `src/` — each module is self-contained
3. Refresh to see changes

### Build & Deploy
```bash
./build.sh                              # Concatenates src → index.html
git add -A && git commit -m "message"   # Commit
git push                                # Deploy via GitHub Pages
```

### Module Load Order
The build script and dev.html both load JS in this order (dependencies flow downward):

1. **state.js** — `$()`, all global variables, undo
2. **helpers.js** — utility functions used everywhere
3. **math.js** — bearing/distance parsing, coordinate math
4. **tracts.js** — tract creation, UI management
5. **bgimage.js** — background image handling
6. **canvas.js** — canvas setup, coordinate transforms, hit testing
7. **drawing.js** — all rendering (redraw, drawTract, grid, legend, etc.)
8. **shapes.js** — shape drawing primitives
9. **smartplot.js** — AI integration
10. **mabf-export.js** — .mabf export
11. **mabf-import.js** — .mabf import
12. **interaction.js** — all mouse/keyboard event wiring
13. **settings.js** — persistence, UI helpers, DOMContentLoaded init

### Adding a New Feature
1. Create `src/js/featurename.js`
2. Add it to the `JS_FILES` array in `build.sh` (before `settings.js`)
3. Add it to the `scripts` array in `dev.html` (before `settings.js`)
4. Run `./build.sh` to rebuild

## Design Tokens
- Background: `#2C2C2C`
- Fields: `#383838`
- Borders: `#6B5B5B`
- Text: `#EBE3D4`
- Icons: `#DEA582`
- Primary button: `#F4D10B`
- AI button: `#7FF40B`
- Font: SF Pro system stack
