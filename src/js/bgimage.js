// ═══════════════ BG IMAGE ═══════════════
function loadBgImage(input) {
  const f = input.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      bgS.img = img;
      bgS.wx = cam.x;
      bgS.wy = cam.y;
      bgS.show = true;
      $("bgShow").checked = true;
      if (typeof updateImgSettingsBtn === "function") updateImgSettingsBtn();
      redraw();
      showToast("Image loaded");
    };
    img.src = e.target.result;
  };
  r.readAsDataURL(f);
}
function clearBgImage() {
  bgS.img = null;
  $("bgInput").value = "";
  if (typeof updateImgSettingsBtn === "function") updateImgSettingsBtn();
  redraw();
}
function toggleBgImageUI() {
  if (bgS.img) {
    openImageModal();
  } else {
    $("bgInput").click();
  }
}

