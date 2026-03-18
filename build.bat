@echo off
REM DeedPlot Build Script (Windows)
REM Concatenates all source files into a single index.html for deployment
REM Usage: build.bat

setlocal enabledelayedexpansion
set OUT=index.html

echo Building DeedPlot → %OUT%

REM Header
(
echo ^<!doctype html^>
echo ^<html lang="en"^>
echo   ^<head^>
echo     ^<meta charset="UTF-8" /^>
echo     ^<meta name="viewport" content="width=device-width, initial-scale=1.0" /^>
echo     ^<title^>DeedPlot — Metes ^&amp; Bounds Parcel Plotter^</title^>
echo     ^<style^>
) > %OUT%

REM CSS
type src\css\deedplot.css >> %OUT%

REM Close style
(
echo     ^</style^>
echo   ^</head^>
) >> %OUT%

REM HTML body
type src\body.html >> %OUT%

REM Script block
echo     ^<script^> >> %OUT%

REM JS files in load order
for %%F in (
  src\js\state.js
  src\js\helpers.js
  src\js\math.js
  src\js\tracts.js
  src\js\bgimage.js
  src\js\canvas.js
  src\js\drawing.js
  src\js\shapes.js
  src\js\smartplot.js
  src\js\mabf-export.js
  src\js\mabf-import.js
  src\js\interaction.js
  src\js\settings.js
) do (
  echo. >> %OUT%
  type %%F >> %OUT%
  echo. >> %OUT%
)

REM Close script and html
(
echo     ^</script^>
echo   ^</body^>
echo ^</html^>
) >> %OUT%

echo Done! Built %OUT%
