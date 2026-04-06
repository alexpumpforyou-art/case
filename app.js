(() => {
  "use strict";

  // =========================
  // DOM
  // =========================
  const html = document.documentElement;
  const body = document.body;

  const loader = document.getElementById("loader");
  const loaderBar = document.getElementById("loader-bar");
  const loaderPercent = document.getElementById("loader-percent");

  const sequenceCanvas = document.getElementById("sequence-canvas");
  const sequenceCtx = sequenceCanvas?.getContext("2d", { alpha: false });

  const videoSequenceSection = document.getElementById("video-sequence");
  const scrollSections = [...document.querySelectorAll(".scroll-section")];
  const statNumbers = [...document.querySelectorAll(".stat-number")];

  const marquee = document.querySelector(".marquee-text");
  const revealEls = [...document.querySelectorAll(".reveal")];

  const casesSection = document.getElementById("cases");
  const casesTrack = document.getElementById("cases-track");

  const leadForm = document.getElementById("lead-form");

  // =========================
  // CONFIG
  // =========================
  const CONFIG = {
    frameCount: 120,
    firstBatch: 14,
    framePath: (i) => `frames/frame_${String(i).padStart(4, "0")}.webp`,

    desktopBreakpoint: 992,
    loaderForceHideMs: 5000,

    marqueeSpeed: 0.22,

    videoHeightDesktop: 560,
    videoHeightMobile: 500,

    sectionFadeWindowDesktop: 0.18,
    sectionFadeWindowMobile: 0.22,

    sectionMoveXDesktop: 70,
    sectionMoveYDesktop: 36,
    sectionMoveYMobile: 24,

    canvasScaleDesktop: 1.03,
    canvasScaleMobile: 1.14,

    statsTriggerDesktop: 0.5,
    statsTriggerMobile: 0.46,

    casesIntroDesktop: 180,
    casesIntroMobile: 60,
    casesOutroDesktop: 0,
    casesOutroMobile: 250,
  };

  // =========================
  // STATE
  // =========================
  const state = {
    frames: [],
    currentFrame: 0,
    rafDrawPending: false,
    scrollTicking: false,
    loaderHidden: false,
    statsAnimated: false,
    isMobile: window.innerWidth < CONFIG.desktopBreakpoint,
  };

  // =========================
  // HELPERS
  // =========================
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function updateModeFlags() {
    state.isMobile = window.innerWidth < CONFIG.desktopBreakpoint;
    body.classList.toggle("is-mobile", state.isMobile);
    body.classList.toggle("is-desktop", !state.isMobile);
  }

  function setViewportVars() {
    const vh = window.innerHeight;
    html.style.setProperty("--app-vh", `${vh * 0.01}px`);
  }

  function hideLoader() {
    if (state.loaderHidden || !loader) return;
    state.loaderHidden = true;
    loader.classList.add("hidden");
  }

  function updateLoader(loaded) {
    if (!loaderBar || !loaderPercent) return;

    const percent = clamp(
      Math.round((loaded / CONFIG.firstBatch) * 100),
      0,
      100
    );

    loaderBar.style.width = `${percent}%`;
    loaderPercent.textContent = `${percent}%`;
  }

  // =========================
  // CANVAS
  // =========================
  function resizeCanvas() {
    if (!sequenceCanvas || !sequenceCtx) return;

    const rect = sequenceCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    sequenceCanvas.width = Math.round(rect.width * dpr);
    sequenceCanvas.height = Math.round(rect.height * dpr);

    sequenceCtx.setTransform(1, 0, 0, 1, 0, 0);
    sequenceCtx.scale(dpr, dpr);

    drawFrame(state.currentFrame);
  }

  function drawFrame(index) {
    if (!sequenceCanvas || !sequenceCtx) return;

    const img = state.frames[index];
    const rect = sequenceCanvas.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;

    sequenceCtx.clearRect(0, 0, cw, ch);

    if (!img || !img.complete) {
      drawFallback(cw, ch);
      return;
    }

    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    const scale = state.isMobile
      ? CONFIG.canvasScaleMobile
      : CONFIG.canvasScaleDesktop;

    const ratio = Math.max(cw / iw, ch / ih) * scale;
    const dw = iw * ratio;
    const dh = ih * ratio;

    let dx = (cw - dw) / 2;
    let dy = (ch - dh) / 2;

    if (state.isMobile) {
      dx -= cw * 0.015;
      dy -= ch * 0.04;
    } else {
      dy -= ch * 0.015;
    }

    sequenceCtx.drawImage(img, dx, dy, dw, dh);
  }

  function requestDraw(index) {
    state.currentFrame = index;

    if (state.rafDrawPending) return;
    state.rafDrawPending = true;

    requestAnimationFrame(() => {
      drawFrame(state.currentFrame);
      state.rafDrawPending = false;
    });
  }

  function drawFallback(cw, ch) {
    const gradient = sequenceCtx.createLinearGradient(0, 0, cw, ch);
    gradient.addColorStop(0, "#f8fbff");
    gradient.addColorStop(1, "#e2e8f0");

    sequenceCtx.fillStyle = gradient;
    sequenceCtx.fillRect(0, 0, cw, ch);

    const centerX = cw / 2;
    const centerY = ch / 2;

    sequenceCtx.save();
    sequenceCtx.translate(centerX, centerY);

    const time = state.currentFrame / CONFIG.frameCount;

    for (let i = 0; i < 5; i++) {
      const radius = 90 + i * 55 + time * 30;
      sequenceCtx.beginPath();
      sequenceCtx.arc(
        Math.sin(time * Math.PI * 2 + i * 0.7) * 18,
        Math.cos(time * Math.PI * 2 + i * 0.7) * 18,
        radius,
        0,
        Math.PI * 2
      );
      sequenceCtx.strokeStyle = `rgba(37,99,235,${0.09 - i * 0.014})`;
      sequenceCtx.lineWidth = 1.5;
      sequenceCtx.stroke();
    }

    sequenceCtx.beginPath();
    sequenceCtx.moveTo(-80, -120);
    sequenceCtx.bezierCurveTo(-130, -20, -100, 80, -40, 130);
    sequenceCtx.bezierCurveTo(-10, 150, 10, 150, 40, 130);
    sequenceCtx.bezierCurveTo(100, 80, 130, -20, 80, -120);
    sequenceCtx.bezierCurveTo(55, -165, -55, -165, -80, -120);
    sequenceCtx.closePath();

    sequenceCtx.fillStyle = "rgba(255,255,255,0.82)";
    sequenceCtx.fill();
    sequenceCtx.strokeStyle = "rgba(15,23,42,0.06)";
    sequenceCtx.lineWidth = 2;
    sequenceCtx.stroke();

    sequenceCtx.restore();
  }

  // =========================
  // PRELOAD
  // =========================
  async function preloadFrames() {
    if (!sequenceCanvas) {
      hideLoader();
      return;
    }

    return new Promise((resolve) => {
      let loaded = 0;

      for (let i = 1; i <= CONFIG.frameCount; i++) {
        const img = new Image();

        img.onload = () => {
          state.frames[i - 1] = img;
          loaded++;
          updateLoader(loaded);

          if (!state.loaderHidden && loaded >= CONFIG.firstBatch) {
            hideLoader();
            drawFrame(0);
          }

          if (loaded === CONFIG.frameCount) resolve();
        };

        img.onerror = () => {
          loaded++;
          updateLoader(loaded);

          if (!state.loaderHidden && loaded >= CONFIG.firstBatch) {
            hideLoader();
          }

          if (loaded === CONFIG.frameCount) resolve();
        };

        img.src = CONFIG.framePath(i);
      }
    });
  }

  // =========================
  // REVEAL
  // =========================
  function initReveal() {
    if (!revealEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.12 }
    );

    revealEls.forEach((el) => observer.observe(el));
  }

  // =========================
  // VIDEO CHAPTER
  // =========================
  function measureVideoSequence() {
    if (!videoSequenceSection) return;

    const chapters = scrollSections.length || 4;
    const baseVH = state.isMobile
      ? CONFIG.videoHeightMobile
      : CONFIG.videoHeightDesktop;

    const extraPerChapter = state.isMobile ? 92 : 112;
    const totalVH = baseVH + (chapters - 1) * extraPerChapter;

    videoSequenceSection.style.height = `${totalVH}vh`;
  }

  function getSectionProgress(section) {
    const rect = section.getBoundingClientRect();
    const total = Math.max(1, section.offsetHeight - window.innerHeight);
    const scrolled = clamp(-rect.top, 0, total);
    return scrolled / total;
  }

  function updateVideoSequence() {
    if (!videoSequenceSection) return;

    const progress = getSectionProgress(videoSequenceSection);
    const frameIndex = Math.floor(progress * (CONFIG.frameCount - 1));

    requestDraw(frameIndex);
    updateOverlaySections(progress);

    const statsTrigger = state.isMobile
      ? CONFIG.statsTriggerMobile
      : CONFIG.statsTriggerDesktop;

    if (!state.statsAnimated && progress >= statsTrigger) {
      state.statsAnimated = true;
      animateStats();
    }
  }

  function updateOverlaySections(progress) {
    scrollSections.forEach((section) => {
      const enter = parseFloat(section.dataset.enter || "0");
      const leave = parseFloat(section.dataset.leave || "1");
      const animation = section.dataset.animation || "fade-up";
      const inner = section.querySelector(".section-inner");

      if (!inner) return;

      const range = Math.max(0.001, leave - enter);
      const local = clamp((progress - enter) / range, 0, 1);
      const isActive = progress >= enter && progress <= leave;

      const fadeWindow = state.isMobile
        ? CONFIG.sectionFadeWindowMobile
        : CONFIG.sectionFadeWindowDesktop;

      let opacity = 0;
      let moveX = 0;
      let moveY = state.isMobile
        ? CONFIG.sectionMoveYMobile
        : CONFIG.sectionMoveYDesktop;
      let scale = state.isMobile ? 0.992 : 0.985;

      if (isActive) {
        const fadeIn = clamp(local / fadeWindow, 0, 1);
        const fadeOut = clamp((1 - local) / fadeWindow, 0, 1);
        opacity = Math.min(fadeIn, fadeOut);

        if (animation === "slide-left") {
          moveX = state.isMobile ? 0 : lerp(-CONFIG.sectionMoveXDesktop, 0, opacity);
          moveY = lerp(state.isMobile ? 18 : 14, 0, opacity);
        } else if (animation === "slide-right") {
          moveX = state.isMobile ? 0 : lerp(CONFIG.sectionMoveXDesktop, 0, opacity);
          moveY = lerp(state.isMobile ? 18 : 14, 0, opacity);
        } else if (animation === "stagger-up") {
          moveY = lerp(state.isMobile ? 26 : 42, 0, opacity);
        }

        scale = lerp(state.isMobile ? 0.992 : 0.985, 1, opacity);
      }

      section.style.opacity = opacity.toFixed(3);
      section.classList.toggle("is-active", opacity > 0.02);

      inner.style.opacity = opacity.toFixed(3);
      inner.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(${scale})`;
    });
  }

  // =========================
  // STATS
  // =========================
  function animateStats() {
    statNumbers.forEach((el) => {
      const target = parseInt(el.dataset.value || "0", 10);
      const duration = 1600;
      const start = performance.now();

      function tick(now) {
        const progress = clamp((now - start) / duration, 0, 1);
        const eased = easeOutCubic(progress);
        el.textContent = Math.round(target * eased);

        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    });
  }

  // =========================
  // MARQUEE
  // =========================
  function updateMarquee() {
    if (!marquee) return;
    const y = window.scrollY || window.pageYOffset || 0;
    marquee.style.transform = `translateX(${-((y * CONFIG.marqueeSpeed) % 700)}px)`;
  }

  // =========================
  // CASES
  // =========================
  function measureCases() {
    if (!casesSection || !casesTrack) return;

    if (state.isMobile) {
      casesSection.style.height = ''; 
      casesTrack.style.transform = '';
      return;
    }

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const isMobile = state.isMobile;

    const cards = [...casesTrack.querySelectorAll(".case-card")];
    const lastCard = cards[cards.length - 1];
    if (!lastCard) return;

    const trackStyle = window.getComputedStyle(casesTrack);
    const paddingLeft = parseFloat(trackStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(trackStyle.paddingRight) || 0;

    const lastCardLeft = lastCard.offsetLeft;
    const lastCardWidth = lastCard.offsetWidth;

    // Финальная точка:
    // последняя карточка должна полностью помещаться в viewport
    let horizontalDistance = Math.max(
      0,
      lastCardLeft + lastCardWidth - (viewportW - paddingRight)
    );

    const intro = CONFIG.casesIntroDesktop;
    const outro = CONFIG.casesOutroDesktop;

    // Без лишнего хвоста -> без пустого белого экрана после 005
    const totalHeight = viewportH + intro + horizontalDistance + outro;

    casesSection.style.height = `${Math.ceil(totalHeight)}px`;
    casesSection.dataset.horizontalDistance = String(horizontalDistance);
    casesSection.dataset.intro = String(intro);
  }

  function updateCases() {
    if (!casesSection || !casesTrack) return;

    if (state.isMobile) {
      casesTrack.style.transform = '';
      return;
    }

    const rect = casesSection.getBoundingClientRect();
    const horizontalDistance = parseFloat(casesSection.dataset.horizontalDistance || "0");
    const intro = parseFloat(casesSection.dataset.intro || "0");

    const raw = clamp(-rect.top - intro, 0, horizontalDistance);
    const progress = horizontalDistance > 0 ? raw / horizontalDistance : 0;

    const eased = easeOutCubic(progress) * horizontalDistance;

    casesTrack.style.transform = `translate3d(${-eased}px, 0, 0)`;
  }

  // =========================
  // FORM
  // =========================
  function initForm() {
    if (!leadForm) return;

    leadForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const formData = new FormData(leadForm);
      const name = (formData.get("name") || "").toString().trim();
      const phone = (formData.get("phone") || "").toString().trim();

      if (!name || !phone) {
        alert("Пожалуйста, заполните все поля.");
        return;
      }

      alert("Заявка отправлена. Здесь можно подключить Telegram / CRM / n8n.");
      leadForm.reset();
    });
  }

  // =========================
  // LOOP
  // =========================
  function render() {
    updateVideoSequence();
    updateMarquee();
    updateCases();
  }

  function onScroll() {
    if (state.scrollTicking) return;

    state.scrollTicking = true;
    requestAnimationFrame(() => {
      render();
      state.scrollTicking = false;
    });
  }

  function onResize() {
    updateModeFlags();
    setViewportVars();
    measureVideoSequence();
    measureCases();
    resizeCanvas();
    render();
  }

// =========================
// INIT
// =========================
async function init() {
  updateModeFlags();
  setViewportVars();

  measureVideoSequence();
  measureCases();
  resizeCanvas();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);

  // После полной загрузки страницы ещё раз пересчитываем геометрию
  window.addEventListener("load", () => {
    measureVideoSequence();
    measureCases();
    resizeCanvas();
    render();
  });

  // После загрузки шрифтов тоже пересчитываем,
  // потому что ширина карточек / текста может поменяться
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      measureVideoSequence();
      measureCases();
      resizeCanvas();
      render();
    });
  }

  const forceHideTimeout = setTimeout(hideLoader, CONFIG.loaderForceHideMs);

  await preloadFrames();

  if (!state.loaderHidden) hideLoader();
  clearTimeout(forceHideTimeout);

  initReveal();
  initForm();

  // Финальный пересчёт после прелоада
  measureVideoSequence();
  measureCases();
  resizeCanvas();

  render();
  drawFrame(0);
}

init();
})();