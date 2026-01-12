// ==========================
// GLOBAL LANGUAGE (single source of truth)
// ==========================
const LANG =
  localStorage.getItem("preferredLang") ||
  (navigator.language.startsWith("fr") ? "fr" : "uk");

document.documentElement.setAttribute("data-lang", LANG);

// ==========================
// SCROLL REVEAL
// ==========================
// ==========================
// SCROLL REVEAL (fix: reveal also on first load)
// ==========================
const reveals = document.querySelectorAll(".reveal");

function revealInViewOnLoad() {
  // Force a first-pass reveal for elements already in the viewport on initial load
  reveals.forEach((el) => {
    const rect = el.getBoundingClientRect();
    // Equivalent to threshold ~0.15 with a simple heuristic:
    // if the element starts before 85% of viewport height, reveal it.
    if (rect.top < window.innerHeight * 0.85) {
      el.classList.add("visible");
    }
  });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        // Optional: stop observing once revealed (slightly more performant)
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

reveals.forEach((el) => revealObserver.observe(el));

// Ensure reveal triggers even without any scroll (fix for some pages/browsers)
window.addEventListener("load", revealInViewOnLoad);

// ==========================
// ACTIVE NAV LINK
// ==========================
const currentPath = window.location.pathname.split("/").pop();
const navLinks = document.querySelectorAll("nav a");

navLinks.forEach(link => {
  if (link.getAttribute("href") === currentPath) {
    link.classList.add("active");
  }
});
// ==========================
// FOOTER UTILITIES
// ==========================
const COPY_FEEDBACK = {
  fr: "Copié ✓",
  uk: "Copied ✓"
};
// 1) Auto year
const yearEl = document.getElementById("footerYear");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// 2) Copy email (supports multiple buttons)
document.querySelectorAll("[data-copy-email]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const email = btn.getAttribute("data-copy-email");
    if (!email) return;

    try {
      await navigator.clipboard.writeText(email);
      const originalText = btn.textContent;
      btn.textContent = COPY_FEEDBACK[LANG] || "Copied ✓";

      setTimeout(() => (btn.textContent = originalText), 1200);
    } catch (e) {
      // Fallback simple si clipboard indisponible
      window.location.href = `mailto:${email}`;
    }
  });
});

// 3) Back to top
const backToTop = document.getElementById("backToTop");
if (backToTop) {
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ==========================
// INFINITE CAROUSEL WITH MOMENTUM
// ==========================
const track = document.getElementById("carouselTrack");

if (track) {
    // --------------------------
  // Prevent native browser drag (images/links)
  // --------------------------
  track.querySelectorAll("img, a").forEach(el => {
    el.setAttribute("draggable", "false");
  });

  track.addEventListener("dragstart", (e) => {
    e.preventDefault();
  });

  let isDown = false;
  let startX = 0;
  let velocity = 0;
  let lastX = 0;
  let rafId = null;

let totalWidth = 0;
let halfWidth = 0;

function updateWidths() {
  totalWidth = track.scrollWidth;
  halfWidth = totalWidth / 2;
}

// Attend que toutes les images du track aient une taille réelle
async function waitForImages() {
  const imgs = Array.from(track.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true }); // on n'embloque pas si une image fail
      });
    })
  );
}

async function initCarouselMetrics() {
  await waitForImages();
  updateWidths();
  track.scrollLeft = halfWidth; // centre une fois que les largeurs sont correctes
  startAutoplay();              // ✅ démarre seulement quand les widths sont fiables
}


// Init
initCarouselMetrics();

// Si le layout change (resize, fonts, etc.)
window.addEventListener("resize", () => {
  updateWidths();
});


  // --------------------------
  // Helpers
  // --------------------------
  let isNormalizing = false;

function normalizeScroll() {
  if (isNormalizing) return;
  if (!totalWidth || !halfWidth) return;

  isNormalizing = true;

  // si on dépasse les bornes, on “wrap”
  if (track.scrollLeft <= 0) {
    track.scrollLeft += halfWidth;
  } else if (track.scrollLeft >= totalWidth - halfWidth) {
    track.scrollLeft -= halfWidth;
  }

  isNormalizing = false;
}


  function applyMomentum() {
    if (Math.abs(velocity) < 0.1) {
      velocity = 0;
      return;
    }

    track.scrollLeft -= velocity;
    velocity *= 0.95; // friction (plus petit = plus long)
    normalizeScroll();

    rafId = requestAnimationFrame(applyMomentum);
  }

  // --------------------------
  // Mouse events
  // --------------------------
  track.addEventListener("mousedown", (e) => {
    isDown = true;
    stopAutoplay(); // ✅ stop uniquement pendant drag

    didDrag = false;
    downX = e.pageX;
    downY = e.pageY;

    startX = e.pageX;
    lastX = startX;
    velocity = 0;
    cancelAnimationFrame(rafId);
  });



  window.addEventListener("mouseup", () => {
    if (!isDown) return;
    isDown = false;
    applyMomentum();
    startAutoplay(); // ✅ reprend après drag
  });


  track.addEventListener("mouseleave", () => {
    if (!isDown) return;
    isDown = false;
    applyMomentum();
    startAutoplay(); // ✅ reprend si on lâche hors du track
  });
// Cancel link click if user dragged
  track.addEventListener("click", (e) => {
    if (!didDrag) return;

    const link = e.target.closest("a.carousel-item");
    if (link) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
  // For click vs drag distinction
  const DRAG_THRESHOLD = 6; // px
  let didDrag = false;
  let downX = 0;
  let downY = 0;

  track.addEventListener("mousemove", (e) => {
    if (!isDown) return;

    e.preventDefault();

    // detect drag (vs click)
    const movedX = Math.abs(e.pageX - downX);
    const movedY = Math.abs(e.pageY - downY);
    if (movedX > DRAG_THRESHOLD || movedY > DRAG_THRESHOLD) {
      didDrag = true;
    }

    const x = e.pageX;
    const dx = x - lastX;

    track.scrollLeft -= dx;
    velocity = dx; // stocke la vitesse instantanée
    lastX = x;

    normalizeScroll();
  });


  // --------------------------
  // Touch (mobile / trackpad)
  // --------------------------
  track.addEventListener("scroll", normalizeScroll);

// --------------------------
// Arrow buttons
// --------------------------
document.querySelector(".carousel-btn.left")?.addEventListener("click", () => {
  stopAutoplay();
  clearTimeout(autoplayResumeTimeout);

  velocity = 25;
  applyMomentum();

  // Reprendre autoplay après 2s si aucune interaction
  autoplayResumeTimeout = setTimeout(() => {
    startAutoplay();
  }, 2000);
});

document.querySelector(".carousel-btn.right")?.addEventListener("click", () => {
  stopAutoplay();
  clearTimeout(autoplayResumeTimeout);

  velocity = -25;
  applyMomentum();

  // Reprendre autoplay après 2s si aucune interaction
  autoplayResumeTimeout = setTimeout(() => {
    startAutoplay();
  }, 2000);
});



// --------------------------
// AUTOPLAY (smooth + 1s delay, progressive start except first load)
// --------------------------
let autoplayId = null;
let autoplayTimeout = null;
let autoplayResumeTimeout = null;


const AUTOPLAY_SPEED = 3;        // vitesse cible
const AUTOPLAY_DELAY = 2000;     // 1 seconde avant reprise
const RAMP_DURATION = 500;       // durée montée progressive (ms)

let currentSpeed = AUTOPLAY_SPEED;
let rampStart = 0;
let firstAutoplay = true;        // ✅ first start = no progressive

function autoplayStep(ts) {
  // Progressive ramp only after the first autoplay
  if (!firstAutoplay) {
    if (!rampStart) rampStart = ts;
    const t = Math.min(1, (ts - rampStart) / RAMP_DURATION);
    const eased = t * t * t * t; // ease-in
    currentSpeed = AUTOPLAY_SPEED * eased;
  } else {
    currentSpeed = AUTOPLAY_SPEED; // direct speed on first start
  }

  if (!isDown) {
    track.scrollLeft += currentSpeed;
    normalizeScroll();
  }

  autoplayId = requestAnimationFrame(autoplayStep);
}

function startAutoplay() {
  if (autoplayId) return;

  clearTimeout(autoplayTimeout);

  const delay = firstAutoplay ? 0 : AUTOPLAY_DELAY;

  autoplayTimeout = setTimeout(() => {
    // On first load: start directly (no delay, no ramp)
    if (firstAutoplay) {
      rampStart = 0;
      currentSpeed = AUTOPLAY_SPEED;
    } else {
      // On subsequent restarts: progressive
      currentSpeed = 0;
      rampStart = 0;
    }

    autoplayId = requestAnimationFrame(autoplayStep);

    // After first start, enable progressive for next restarts
    firstAutoplay = false;
  }, delay);
}


function stopAutoplay() {
  if (!autoplayId) return;
  cancelAnimationFrame(autoplayId);
  autoplayId = null;
  currentSpeed = 0;
  rampStart = 0;
}


}
(function () {

  function isOnCorrectLanguagePage(lang) {
    const path = window.location.pathname;
    const isFrPage = path.includes(".fr.html");

    return (lang === "fr" && isFrPage) || (lang === "uk" && !isFrPage);
  }

  const langSwitch = document.getElementById("langSwitch");
  if (!langSwitch) return;

    const currentPath = window.location.pathname;
    const isFrenchPage = LANG === "fr";


  // Update flag icon
  const flagImg = langSwitch.querySelector("img");
  flagImg.src = isFrenchPage
    ? "assets/icons/gb.svg"
    : "assets/icons/fr.svg";

  // Click = manual toggle
  langSwitch.addEventListener("click", () => {
    const newLang = isFrenchPage ? "uk" : "fr";
    localStorage.setItem("preferredLang", newLang);
 
    redirectToLanguage(newLang);
  });
// Sync mobile language switch with main one
const mobileLang = document.getElementById("mobileLangSwitch");
const mainLang = document.getElementById("langSwitch");
// Sync mobile flag icon with main flag icon
if (mobileLang && mainLang) {
  const mobileImg = mobileLang.querySelector("img");
  const mainImg = mainLang.querySelector("img");
  if (mobileImg && mainImg) mobileImg.src = mainImg.src;
}

if (mobileLang && mainLang){
  mobileLang.addEventListener("click", () => {
    mainLang.click();
  });
}

  if (!localStorage.getItem("preferredLang")) {
    localStorage.setItem("preferredLang", LANG);

    // 🔒 redirection UNIQUEMENT si on est sur la mauvaise version
    if (!isOnCorrectLanguagePage(LANG)) {
      redirectToLanguage(LANG);
    }
  }


  function redirectToLanguage(lang) {
    if (isOnCorrectLanguagePage(lang)) return; // 🛑 garde anti-boucle

  const path = window.location.pathname;


    // Sépare dossier + fichier, et gère le cas "/" (home)
    const endsWithSlash = path.endsWith("/");
    const dir = endsWithSlash ? path : path.slice(0, path.lastIndexOf("/") + 1);
    const file = endsWithSlash ? "index.html" : path.split("/").pop();

    let newFile;

    if (lang === "fr") {
      // index.html -> index.fr.html, resume.html -> resume.fr.html, etc.
      newFile = file.endsWith(".fr.html") ? file : file.replace(".html", ".fr.html");
    } else {
      // index.fr.html -> index.html, resume.fr.html -> resume.html, etc.
      newFile = file.replace(".fr.html", ".html");
    }

    window.location.href = dir + newFile;
  } 

})();

const PAGE = window.location.pathname.split("/").pop();
const IS_HOME =
  PAGE === "" ||
  PAGE === "index.html" ||
  PAGE === "index.fr.html";
const IS_SIMPLE = 
  PAGE === "contact.html" ||
  PAGE === "contact.fr.html" ||
  PAGE === "skills.html" ||
  PAGE === "skills.fr.html" ||
  PAGE === "resume.html" ||
  PAGE === "resume.fr.html" ||
  PAGE === "projects.html" ||
  PAGE === "projects.fr.html";
const IS_HEAVY = 
  PAGE === "project-alfred.html" ||
  PAGE === "project-alfred.fr.html" ||
  PAGE === "project-AIS.html" ||
  PAGE === "project-AIS.fr.html" ||
  PAGE === "project-embroidery.html" ||
  PAGE === "project-embroidery.fr.html";
// ==========================
// LOADER LANGUAGE TEXT
// ==========================
const LOADER_TEXT = {
  fr: "Chargement en cours",
  uk: "Loading"
};

const loaderTextEl = document.querySelector("#loader-text");
if (loaderTextEl) {
  loaderTextEl.textContent = LOADER_TEXT[LANG];
}

// ==========================
// PAGE LOADER — WHITE + FADE (min 1s)
// ==========================
window.addEventListener("load", () => {
  const loader = document.getElementById("page-loader");
  if (!loader) return;

  const MIN_SHOW_MS = IS_HOME ? 2200 : IS_SIMPLE ? 1000 : IS_HEAVY ? 2200 : 1;


  const MAX_WAIT_MS = 2500;  // safety fallback (avoid blocking too long)

  const start = performance.now();
  let done = false;

  const hideLoader = () => {
    if (done) return;
    done = true;
    loader.classList.add("hidden");
  };

  const tryHide = () => {
    const elapsed = performance.now() - start;
    const remaining = Math.max(0, MIN_SHOW_MS - elapsed);

    // Wait two frames so layout (carousel widths) is stable
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(hideLoader, remaining);
      });
    });
  };

  // Page fully loaded (including images)
  tryHide();

  // Safety: never block longer than MAX_WAIT_MS
  setTimeout(hideLoader, MAX_WAIT_MS);
});

// ==========================
// PRUSA LOADER ANIMATION (X+Z) — robust init
// ==========================
(() => {
  let rafId = null;
  let started = false;

  function initPrusaLoader() {
    if (started) return; // évite double init si le script est chargé 2 fois
    const svg = document.querySelector('#prusa-loader');
    if (!svg) return;

    const xAxis = svg.querySelector('#x-axis');
    const zAxis = svg.querySelector('#z-axis');
    const printRect =
      svg.querySelector('#print_mask') ||
      svg.querySelector('#print-clip-rect');
    if (!xAxis || !zAxis || !printRect) return;


    const maskEl = svg.querySelector('#mask0_2_2'); // adapte l’ID si différent dans ton SVG


    started = true;

    // Réglages
    const cycleMs = IS_HOME ? 2600 : IS_SIMPLE ? 1400 : IS_HEAVY ? 2600 : 400;

    const xAmp = 10;
    const zAmp = 70;
    const jitterAmp = 5;

    const baseY = parseFloat(printRect.getAttribute('y'));
    const baseH = parseFloat(printRect.getAttribute('height'));
    const maxH  = 70;

    const start = performance.now();

    function easeInOut(t){
      return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
    }

    function noise(t){
      const a = Math.sin(2*Math.PI*(t*3.0 + 0.12));
      const b = Math.sin(2*Math.PI*(t*7.0 + 0.37));
      return (a*0.6 + b*0.4);
    }

    function animate(now){
      const elapsed = (now - start) % cycleMs;
      const t = elapsed / cycleMs;

      const zT = easeInOut(t);
      const z = -zAmp * zT;

      const base = Math.sin(2*Math.PI*(t*1.35));
      const x = base * xAmp + noise(t) * jitterAmp;

      // Z porte le chariot + la tête (CSS transform, plus fiable avec exports Figma)
      zAxis.style.transform = `translate(0px, ${z.toFixed(2)}px)`;

      // X coulisse dans Z (CSS transform)
      xAxis.style.transform = `translate(${x.toFixed(2)}px, 0px)`


      // Reveal synchronisé avec Z
      const h = baseH + (maxH - baseH) * zT;
      const y = baseY - (h - baseH);
      printRect.setAttribute('height', h.toFixed(2));
      printRect.setAttribute('y', y.toFixed(2));

      rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);
  }

  // Lance même si DOMContentLoaded est déjà passé
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPrusaLoader, { once: true });
  } else {
    initPrusaLoader();
  }
})();

// ==========================
// BURGER MENU (mobile)
// ==========================
function initBurgerMenu() {
  const btn = document.getElementById("burgerBtn");
  const menu = document.getElementById("mobileMenu");
  const backdrop = document.getElementById("menuBackdrop");
  const closeBtn = document.getElementById("mobileMenuClose");

  if (!btn || !menu || !backdrop) return;

    const openMenu = () => {
      menu.hidden = false;
      backdrop.hidden = false;

      // Force l'état fermé au moment où l'élément apparaît
      menu.classList.remove("is-open");

      // ✅ Ajoute la classe au prochain frame => transition slide-in visible
      requestAnimationFrame(() => {
        menu.classList.add("is-open");
      });

      document.body.classList.add("no-scroll");
      btn.setAttribute("aria-expanded", "true");
    };


    const closeMenu = () => {
      // ✅ enlève l’état ouvert (slide out)
      menu.classList.remove("is-open");

      // laisse le temps à l’animation avant de cacher
      setTimeout(() => {
        menu.hidden = true;
        backdrop.hidden = true;
      }, 350);

      document.body.classList.remove("no-scroll");
      btn.setAttribute("aria-expanded", "false");
    };


  btn.addEventListener("click", () => {
    const isOpen = btn.getAttribute("aria-expanded") === "true";
    if (isOpen) closeMenu();
    else openMenu();
  });

  backdrop.addEventListener("click", closeMenu);
  closeBtn?.addEventListener("click", closeMenu);

  // Close on ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Close when clicking a link
  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", closeMenu);
  });

  // If user rotates / resizes to desktop, close menu
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1100) closeMenu();
  });
}

initBurgerMenu();
