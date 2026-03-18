// ═══════════════ MABF EXPORT (Sandy Knoll Metes & Bounds) ═══════════════
function exportMABF() {
  if (!tracts.length) {
    showToast("No tracts to export");
    return;
  }

  // Helper: base64 encode a string (browser-native)
  const b64 = (s) => btoa(unescape(encodeURIComponent(s)));

  // Helper: generate 32-char uppercase hex UID
  const uid = () => {
    let h = "";
    for (let i = 0; i < 32; i++)
      h += "0123456789ABCDEF"[Math.floor(Math.random() * 16)];
    return h;
  };

  // Helper: convert DeedPlot hex color "#RRGGBB" to Sandy Knoll BGR integer hex "BBGGRR" (no #)
  const colorToSK = (hex) => {
    const r = hex.slice(1, 3),
      g = hex.slice(3, 5),
      b = hex.slice(5, 7);
    return (
      parseInt(b, 16) * 65536 +
      parseInt(g, 16) * 256 +
      parseInt(r, 16)
    )
      .toString(16)
      .toUpperCase();
  };

  // Format a call as Sandy Knoll expects: "N DD:MM:SS E distance"
  // Sandy Knoll uses colon-delimited DMS. For zero min/sec it can omit them: "N 90 E 100"
  const formatSKCall = (c) => {
    const secRound = Math.round(c.sec);
    const secVal = secRound >= 60 ? 0 : secRound;
    const minVal = secRound >= 60 ? c.min + 1 : c.min;
    const minFinal = minVal >= 60 ? 0 : minVal;
    const degFinal = minVal >= 60 ? c.deg + 1 : c.deg;
    if (minFinal === 0 && secVal === 0) {
      // Cardinal or clean degrees: "S 0 E 21.78" or "N 90 E 100"
      return `${c.quad} ${degFinal} ${c.dir} ${c.dist.toFixed(2)}`;
    }
    if (secVal === 0) {
      return `${c.quad} ${degFinal}:${String(minFinal).padStart(2, "0")} ${c.dir} ${c.dist.toFixed(2)}`;
    }
    return `${c.quad} ${degFinal}:${String(minFinal).padStart(2, "0")}:${String(secVal).padStart(2, "0")} ${c.dir} ${c.dist.toFixed(2)}`;
  };

  // Build XML as a string (no DOM needed — just concatenation matching Sandy Knoll's exact format)
  let xml = "<Plot>";

  // --- Display section ---
  const title = ($("mapTitle") || {}).value || "Parcel Map";
  xml += "<Display>";
  xml += `<Caption>${b64(title)}</Caption>`;
  xml += "<Scale>100000</Scale>";
  xml += "<Show>0</Show><ShowWhat>0</ShowWhat>";
  xml +=
    "<ShowScale>0</ShowScale><ShowBorder>0</ShowBorder><ShowScalePos>3</ShowScalePos>";
  xml +=
    "<ShowNorthArrow>0</ShowNorthArrow><ShowNorthArrowPos>3</ShowNorthArrowPos>";
  xml +=
    "<PinPOB>5</PinPOB><AreaDecPoints>2</AreaDecPoints><ScaleUnitType>0</ScaleUnitType>";
  xml +=
    "<Watermark><WatermarkShow>0</WatermarkShow><WatermarkShow></WatermarkShow></Watermark>";
  xml += "<DrawingCentric>1</DrawingCentric>";
  xml += "<PaperWidth>468</PaperWidth><PaperHeight>648</PaperHeight>";
  xml += "<HD>-1</HD>";
  xml +=
    "<DrawingOriginLat></DrawingOriginLat><DrawingOriginLong></DrawingOriginLong>";
  xml += "</Display>";

  // Helper: font block XML generator (must be defined before the loop for full-function access)
  const fontBlock = (name, size, color, bold) =>
    `<FontBold>${bold ? 1 : 0}</FontBold><FontColor>${color}</FontColor><FontName>${name}</FontName><FontSize>${size}</FontSize><FontItalic>0</FontItalic><FontUnderline>0</FontUnderline>`;

  // --- Layers ---
  xml += "<Layers>";
  for (let i = 0; i < tracts.length; i++) {
    const t = tracts[i];
    xml += "<Layer>";

    // Calls
    xml += "<Calls>";
    for (const c of t.calls) {
      const callStr = formatSKCall(c);
      xml += `<Line>${callStr}</Line>`;
      xml += "<Visible>1</Visible>";
      xml += "<CallExtData>";
      xml += `<SelectedUnit>0</SelectedUnit>`;
      xml += `<EnteredLength>${c.dist.toFixed(2)}</EnteredLength>`;
      xml += "<EnteredCurveData></EnteredCurveData>";
      xml += "<HasExtendedCallData>1</HasExtendedCallData>";
      xml += "<CallLabel></CallLabel>";
      xml += `<CallTextAsEntered>${b64(callStr)}</CallTextAsEntered>`;
      xml += "<CallLineColor>0</CallLineColor>";
      xml += "<CallHasLineColor>0</CallHasLineColor>";
      xml += "<HiddenLine>0</HiddenLine>";
      xml += "<HiddenCaption>0</HiddenCaption>";
      xml += "<CallNote></CallNote>";
      xml += "</CallExtData>";
    }
    xml += "</Calls>";

    // Layer properties
    xml += "<AutoComplete>0</AutoComplete>";
    xml += "<ShowLength>0</ShowLength><ShowLengthAs>0</ShowLengthAs>";
    xml += "<ShowCalls>0</ShowCalls>";
    xml += "<Fill>1</Fill>";
    xml += `<FillColor>${colorToSK(t.fillColor)}</FillColor>`;
    xml += "<ShowEndPoints>1</ShowEndPoints>";
    xml += "<ShowFloatCalls>0</ShowFloatCalls>";
    xml += "<ShowFloatCallsTop>0</ShowFloatCallsTop>";
    xml += "<ShowFloatCallsLeft>0</ShowFloatCallsLeft>";

    // Offsets — Sandy Knoll uses these to position layers relative to drawing origin
    xml += `<xOffset>${t.pobX.toFixed(4)}</xOffset>`;
    xml += `<yOffset>${(-t.pobY).toFixed(4)}</yOffset>`;

    // Layer name (base64 encoded)
    const layerName = t.name || `Layer ${i}`;
    xml += `<Caption>${b64(layerName)}</Caption>`;
    xml += "<ShowCaption>0</ShowCaption>";
    xml += "<Visible>1</Visible>";
    xml += "<Locked>0</Locked>";
    xml += `<FillStyle>${t.hatching ? 4 : 0}</FillStyle>`;
    xml += "<RealX>0</RealX><RealY>0</RealY>";
    xml += "<RealLat>0.</RealLat><RealLong>0.</RealLong>";
    xml += "<MiscLatLongPoints></MiscLatLongPoints>";
    xml += "<ShowPointAngles>0</ShowPointAngles>";
    xml += "<MiscLatLongLines></MiscLatLongLines>";
    xml += "<ShowEndPointNumber>0</ShowEndPointNumber>";
    xml += "<ShowEndPointXY>0</ShowEndPointXY>";
    xml += "<UseEncodedLayerNames>1</UseEncodedLayerNames>";
    xml += "<WaypointsVisible>1</WaypointsVisible>";
    xml += "<TracksVisible>1</TracksVisible>";
    xml += "<EndPointColor>C0C0C0</EndPointColor>";
    xml += "<LineMode>1</LineMode>";
    xml += `<LineWidth>${Math.max(1, Math.round(t.strokeWidth))}</LineWidth>`;
    xml += "<LineAsScale>1</LineAsScale>";
    xml += `<LineColor>${colorToSK(t.strokeColor)}</LineColor>`;
    xml += "<LineFillTransparency>66</LineFillTransparency>";
    xml += "<LineFillUseGradient>0</LineFillUseGradient>";
    xml += "<XYWaypoints></XYWaypoints>";
    xml += "<ShowCallsType>0</ShowCallsType>";
    xml += "<FloatingCallListShaded>1</FloatingCallListShaded>";
    xml += "<FloatingCallListUnitType>0</FloatingCallListUnitType>";

    // Fonts — use reasonable defaults
    xml += "<LayerFonts>";
    xml += `<ShowLengthsFont>${fontBlock("Arial", 12, "19C819", 1)}</ShowLengthsFont>`;
    xml += `<ShowCallsFont>${fontBlock("Arial", 12, "0", 1)}</ShowCallsFont>`;
    xml += `<ShowCaptionFont>${fontBlock("Arial", 12, "0", 1)}</ShowCaptionFont>`;
    xml += `<ShowAreaFont>${fontBlock("Arial", 12, "0", 1)}</ShowAreaFont>`;
    xml += `<ShowPerimeterFont>${fontBlock("Arial", 18, "0", 1)}</ShowPerimeterFont>`;
    xml += "</LayerFonts>";

    xml += "<ShowEndPointLatLong>0</ShowEndPointLatLong>";
    xml += "<ShowEndPointLatLongDMS>0</ShowEndPointLatLongDMS>";
    xml += "<ShowEndPointLatLongLines>0</ShowEndPointLatLongLines>";
    xml += "<ShowEndPointAngleLines>0</ShowEndPointAngleLines>";
    xml += "<LineDashLength>4</LineDashLength>";
    xml += "<ShowLengthInLine>0</ShowLengthInLine>";
    xml += "<ShowCallsInLine>0</ShowCallsInLine>";
    xml += "<LineDashStyle>9</LineDashStyle>";
    xml += "<XYPointsVisible>1</XYPointsVisible>";
    xml += "<ShowEndpointArcs>0</ShowEndpointArcs>";
    xml += "<EndpointsSweepArcsColor>0</EndpointsSweepArcsColor>";
    xml += "<ShowEndpointArcsRadius>20</ShowEndpointArcsRadius>";
    xml +=
      "<FloatingCallListShadedUseFillColor>0</FloatingCallListShadedUseFillColor>";
    xml +=
      "<FloatingCallListShowLayerName>0</FloatingCallListShowLayerName>";
    xml += "<ShowLastEndPoint>0</ShowLastEndPoint>";

    xml += "<EndpointFloatingList>";
    xml += "<ShowEndpointList>0</ShowEndpointList>";
    xml += "<EndpointListLayerName>0</EndpointListLayerName>";
    xml += "<EndpointListXY>0</EndpointListXY>";
    xml += "<EndpointListLatLong>0</EndpointListLatLong>";
    xml += "<EndpointListAngles>0</EndpointListAngles>";
    xml += "<ShowFloatEndPointsTop>4</ShowFloatEndPointsTop>";
    xml += "<ShowFloatEndPointsLeft>11</ShowFloatEndPointsLeft>";
    xml += "</EndpointFloatingList>";

    xml += "<ShowLayerArea>0</ShowLayerArea>";
    xml += "<ShowLayerAreaType>0</ShowLayerAreaType>";
    xml += "<ShowEndPointsXYUnit>0</ShowEndPointsXYUnit>";
    xml += "<ShowLayerCaptionRotation>0</ShowLayerCaptionRotation>";

    xml += `<FloatingCallListFont>${fontBlock("Arial", 12, "0", 1)}</FloatingCallListFont>`;
    xml += "<FloatingCallListForceUnit>0</FloatingCallListForceUnit>";
    xml +=
      "<FloatingCallListHandleInvisible>0</FloatingCallListHandleInvisible>";
    xml +=
      "<FloatingEndpointListLatLongDecDMS>0</FloatingEndpointListLatLongDecDMS>";
    xml += "<FloatingCallListColumnCount>0</FloatingCallListColumnCount>";
    xml +=
      "<FloatingCallListShowCallNumber>0</FloatingCallListShowCallNumber>";

    xml += "<FloatingLayerInfoList><FloatingInfo>";
    xml += "<X>5</X><Y>5</Y>";
    xml += "<ShowAcres>0</ShowAcres><ShowArea>0</ShowArea>";
    xml +=
      "<ShowClosingCall>0</ShowClosingCall><ShowClosingError>0</ShowClosingError>";
    xml += "<ShowName>0</ShowName><ShowPerimeter>0</ShowPerimeter>";
    xml += "<Visible>0</Visible><ShowXYOffset>0</ShowXYOffset>";
    xml += "<Shaded>0</Shaded><ShadedUseFill>0</ShadedUseFill>";
    xml += "</FloatingInfo></FloatingLayerInfoList>";

    xml += "<FloatingCallCallLabels>0</FloatingCallCallLabels>";
    xml += "<EndpointGraphicStlye>0</EndpointGraphicStlye>";
    xml += "<KMLExportRotation>0</KMLExportRotation>";
    xml += "<ShowEndPointXYDecPoints>0</ShowEndPointXYDecPoints>";
    xml +=
      "<ShowEndPointFloatListXYDecPoints>0</ShowEndPointFloatListXYDecPoints>";
    xml +=
      "<EndPointFloatListUseFillColor>0</EndPointFloatListUseFillColor>";

    // Attributes — 10 empty slots as Sandy Knoll expects
    xml += "<Attributes><DrawingAttribs>";
    for (let a = 0; a < 10; a++)
      xml += "<LayerAttrib><Type>0</Type><Name/><Value/></LayerAttrib>";
    xml += "</DrawingAttribs></Attributes>";

    xml += "<FloatingLayerAttributesList><FloatingInfo>";
    xml += "<X>5</X><Y>5</Y>";
    xml += "<ShowAcres>0</ShowAcres><ShowArea>0</ShowArea>";
    xml +=
      "<ShowClosingCall>0</ShowClosingCall><ShowClosingError>0</ShowClosingError>";
    xml += "<ShowName>0</ShowName><ShowPerimeter>0</ShowPerimeter>";
    xml += "<Visible>0</Visible><ShowXYOffset>0</ShowXYOffset>";
    xml += "<Shaded>0</Shaded><ShadedUseFill>0</ShadedUseFill>";
    xml += "</FloatingInfo></FloatingLayerAttributesList>";

    xml += "<ShowLayerPerimeter>0</ShowLayerPerimeter>";
    xml += "<IsGridLayer>0</IsGridLayer>";
    xml += "<EndpointListCalls>0</EndpointListCalls>";
    xml += "<FirstAreaCall>0</FirstAreaCall>";
    xml += `<UID>${uid()}</UID>`;
    xml += "<ChildUID></ChildUID>";
    xml += "<LayerTextBlocks></LayerTextBlocks>";
    xml += `<ShowEndPointTextualFont>${fontBlock("Arial", 12, "0", 0)}</ShowEndPointTextualFont>`;

    xml += "</Layer>";
  }
  xml += "</Layers>";

  // --- Labels ---
  xml += "<Labels></Labels>";

  // --- Background ---
  xml += "<Background>";
  xml += "<Picture>nil</Picture><Transparency>0</Transparency>";
  xml += "<AutoFit>1</AutoFit><PinHere>0</PinHere>";
  xml += "<Scale1Mile>0</Scale1Mile><Lock2Layer>-1</Lock2Layer>";
  xml += "<Visible>0</Visible><Scale4Mile>0</Scale4Mile>";
  xml += "<UseScale>0</UseScale>";
  xml +=
    "<ScaleCustomX>5280</ScaleCustomX><ScaleCustomY>5280</ScaleCustomY>";
  xml += "<ShowGrid>0</ShowGrid>";
  xml += "<DragOffsetX>0</DragOffsetX><DragOffsetY>0</DragOffsetY>";
  xml += "</Background>";

  // --- Title Block ---
  xml += "<TitleBlock>";
  xml += "<ShowMe>1</ShowMe>";
  xml += "<Text1></Text1><Text2></Text2><Text3></Text3>";
  xml += "<Text4></Text4><Text5></Text5><Text6></Text6>";
  xml += "<Location>0</Location>";
  xml += "<Text7></Text7>";
  xml += `<Text8>${b64("%d")}</Text8>`;
  xml += "<Style>3</Style><Style3TextColor>3</Style3TextColor>";
  xml += "<HideFileName>1</HideFileName><MeterArea>0</MeterArea>";
  xml += "<IncludeCallNumber>0</IncludeCallNumber>";
  xml += "<HideUnits>0</HideUnits><ShowLayers>0</ShowLayers>";
  xml += "</TitleBlock>";

  // --- Window ---
  xml += "<Window><Width>1200</Width><Height>800</Height></Window>";

  // --- Misc ---
  xml += "<Misc>";
  xml += "<LabelsVisible>1</LabelsVisible>";
  xml += `<LabelsFont>${fontBlock("Arial", 12, "0", 1)}</LabelsFont>`;
  xml += "<OffsetAsFeet>1</OffsetAsFeet>";
  xml += "<LastCurrentLayer>0</LastCurrentLayer>";
  xml += "<ShowNorthArrowStyle>0</ShowNorthArrowStyle>";
  xml += "<Attributes><DrawingAttribs>";
  for (let a = 0; a < 10; a++)
    xml += "<LayerAttrib><Type>0</Type><Name/><Value/></LayerAttrib>";
  xml += "</DrawingAttribs></Attributes>";
  xml += "<OriginTRS></OriginTRS>";
  xml += "</Misc>";

  // --- Section Finder (37 empty sections in Township0) ---
  xml += "<SectionFinder><Townships><Township0><Sections>";
  for (let s = 0; s <= 36; s++)
    xml += `<Section${s}><Aliquots></Aliquots></Section${s}>`;
  xml += "</Sections><Township></Township><Range></Range>";
  xml += "<ShowSection>0</ShowSection><ShowGridType>0</ShowGridType>";
  xml +=
    "<RangeIndex>5</RangeIndex><ShowDirection>0</ShowDirection><ShowArea>0</ShowArea>";
  xml += "</Township0></Townships></SectionFinder>";

  // --- Remaining boilerplate ---
  xml += "<FloatingTextBlocks></FloatingTextBlocks>";
  xml += "<CreatedWithVersion>642</CreatedWithVersion>";
  xml += "<Snapshots></Snapshots>";
  xml += "<Tabs></Tabs>";
  xml += "<FloatingPictures></FloatingPictures>";
  xml +=
    "<PrinterResponse><PrintType>0</PrintType><YOffset>0</YOffset><XOffset>0</XOffset><Scale>-1</Scale></PrinterResponse>";
  xml +=
    "<DrawingLegend><Visible>0</Visible><Top>4</Top><Left>11</Left><Items></Items></DrawingLegend>";
  xml += "</Plot>";

  // Build final file: version number + CRLF + XML (single line, no whitespace)
  const fileContent = "5\r\n" + xml + "\r\n";

  // Generate filename from map title
  const safeName = (($("mapTitle") || {}).value || "DeedPlot_Export")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .replace(/\s+/g, "_");

  // Trigger download
  const blob = new Blob([fileContent], {
    type: "application/octet-stream",
  });
  const link = document.createElement("a");
  link.download = safeName + ".mabf";
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(
    `Exported ${tracts.length} tract(s) as .mabf for Sandy Knoll!`,
  );
}
function togglePanel(h) {
  h.classList.toggle("collapsed");
  h.nextElementSibling.classList.toggle("collapsed");
}

