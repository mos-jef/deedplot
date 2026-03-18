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
  redraw();
}
function toggleBgImageUI() {
  if (bgS.img) {
    const pop = $("bgPopover");
    pop.classList.toggle("show");
    if (pop.classList.contains("show")) {
      const btn = $("bgImgBtn");
      const r = btn.getBoundingClientRect();
      pop.style.left = Math.max(10, r.left - 60) + "px";
      pop.style.bottom = (window.innerHeight - r.top + 8) + "px";
      pop.style.top = "auto";
      $("bgAlpha").value = Math.round(bgS.alpha * 100);
      $("bgScale").value = Math.round(bgS.scale * 100);
      $("bgScaleV").textContent = Math.round(bgS.scale * 100) + "%";
      $("bgRot").value = bgS.rotation;
      $("bgRotV").textContent = bgS.rotation + "°";
      $("bgRotFine").value = Math.round((bgS.rotFine || 0) * 10);
      $("bgRotFineV").textContent = (bgS.rotFine || 0).toFixed(1) + "°";
      $("bgShow").checked = bgS.show;
      setTimeout(() => {
        const closer = (e) => {
          if (!pop.contains(e.target) && e.target.id !== "bgImgBtn" && !e.target.closest("#bgImgBtn")) {
            pop.classList.remove("show");
            document.removeEventListener("click", closer);
          }
        };
        document.addEventListener("click", closer);
      }, 0);
    }
  } else {
    $("bgInput").click();
  }
}

