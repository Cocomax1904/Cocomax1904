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
// COPY EMAIL (Footer)
// ==========================
const copyBtn = document.querySelector("[data-copy-email]");

if (copyBtn) {
  copyBtn.addEventListener("click", async () => {
    const email = copyBtn.getAttribute("data-copy-email");

    try {
      await navigator.clipboard.writeText(email);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = "Copié ✓";
      setTimeout(() => (copyBtn.textContent = originalText), 1200);
    } catch (e) {
      // Fallback simple si clipboard indisponible
      window.location.href = `mailto:${email}`;
    }
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

  const totalWidth = track.scrollWidth;
  const halfWidth = totalWidth / 2;

  // Start centered
  track.scrollLeft = halfWidth;

  // --------------------------
  // Helpers
  // --------------------------
  function normalizeScroll() {
    // vers la gauche
    if (track.scrollLeft <= 0) {
      track.scrollLeft += halfWidth;
    }
    // vers la droite
    else if (track.scrollLeft >= totalWidth - halfWidth) {
      track.scrollLeft -= halfWidth;
    }
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

// Démarre l'autoplay au chargement (direct la première fois)
startAutoplay();

}
(function () {
  const langSwitch = document.getElementById("langSwitch");
  if (!langSwitch) return;

  const currentPath = window.location.pathname;
  const isFrenchPage = currentPath.includes(".fr.html");

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

  // Auto language detection (only if no manual choice)
  if (!localStorage.getItem("preferredLang")) {
    const browserLang = navigator.language || navigator.userLanguage;

    if (browserLang.startsWith("fr") && !isFrenchPage) {
      redirectToLanguage("fr");
    }
  }

  function redirectToLanguage(lang) {
    let newPath;

    if (lang === "fr") {
      newPath = currentPath.replace(".html", ".fr.html");
    } else {
      newPath = currentPath.replace(".fr.html", ".html");
    }

    window.location.replace(newPath);
  }
})();
