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
  "src/js/annotations.js"
  "src/js/dropshadow-modal.js"
  "src/js/image-modal.js"
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
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;400;600;700;900&family=JetBrains+Mono:wght@400;700&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Oswald:wght@400;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Raleway:wght@100;400;600;700;900&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@400;600;700;900&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=Fira+Code:wght@400;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Roboto+Slab:wght@100;400;700;900&display=swap" rel="stylesheet">
    <style>
HEADER

# CSS
cat src/css/deedplot.css >> "$OUT"
cat src/css/annotations.css >> "$OUT"
cat src/css/dropshadow-modal.css >> "$OUT"
cat src/css/image-modal.css >> "$OUT"

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
