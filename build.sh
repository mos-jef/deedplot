#!/bin/bash
# DeedPlot Build Script
# Concatenates all source files into a single index.html for deployment
# Usage: ./build.sh
#   Output: index.html (ready for GitHub Pages)

set -e
OUT="index.html"

# JS load order matters — state and helpers first, then features, then init last
JS_FILES=(
  "src/js/state.js"
  "src/js/helpers.js"
  "src/js/math.js"
  "src/js/tracts.js"
  "src/js/bgimage.js"
  "src/js/canvas.js"
  "src/js/drawing.js"
  "src/js/shapes.js"
  "src/js/smartplot.js"
  "src/js/mabf-export.js"
  "src/js/mabf-import.js"
  "src/js/interaction.js"
  "src/js/settings.js"
)

echo "Building DeedPlot → $OUT"

# Header
cat > "$OUT" <<'HEADER'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DeedPlot — Metes &amp; Bounds Parcel Plotter</title>
    <style>
HEADER

# CSS
cat src/css/deedplot.css >> "$OUT"

# Close style, open body
cat >> "$OUT" <<'MID'
    </style>
  </head>
MID

# HTML body
cat src/body.html >> "$OUT"

# Script block
echo "    <script>" >> "$OUT"

for js in "${JS_FILES[@]}"; do
  if [ -f "$js" ]; then
    echo "" >> "$OUT"
    echo "      // ── $(basename "$js" .js) ──" >> "$OUT"
    # Re-indent to match original 6-space indent
    sed 's/^/      /' "$js" >> "$OUT"
    echo "" >> "$OUT"
  else
    echo "WARNING: $js not found!" >&2
  fi
done

# Close script and html
cat >> "$OUT" <<'FOOTER'
    </script>
  </body>
</html>
FOOTER

LINES=$(wc -l < "$OUT")
SIZE=$(wc -c < "$OUT" | xargs)
echo "Done! $OUT: $LINES lines, $SIZE bytes"
