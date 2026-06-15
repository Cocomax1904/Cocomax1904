/* ==============================================
   ANIMATIONS.JS — Canvas + Typewriter + Effects
   ============================================== */

// ==============================================
// CANVAS PARTICLE NETWORK (Hero section)
// ==============================================
(function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles, animId;

  const CONFIG = {
    count: 80,
    maxDist: 120,
    speed: 0.4,
    radius: 1.5,
    color: '0, 212, 255',
    colorAlt: '139, 92, 246',
    mouseRadius: 150,
    mouseForce: 0.04,
  };

  let mouse = { x: -9999, y: -9999 };

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = canvas.width = rect.width;
    H = canvas.height = rect.height;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createParticles() {
    particles = Array.from({ length: CONFIG.count }, () => ({
      x: rand(0, W),
      y: rand(0, H),
      vx: rand(-CONFIG.speed, CONFIG.speed),
      vy: rand(-CONFIG.speed, CONFIG.speed),
      r: rand(0.8, CONFIG.radius),
      hue: Math.random() > 0.5 ? CONFIG.color : CONFIG.colorAlt,
      alpha: rand(0.3, 0.8),
    }));
  }

  function drawParticle(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.hue}, ${p.alpha})`;
    ctx.fill();
  }

  function drawLine(p1, p2, dist) {
    const alpha = (1 - dist / CONFIG.maxDist) * 0.25;
    const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
    gradient.addColorStop(0, `rgba(${p1.hue}, ${alpha})`);
    gradient.addColorStop(1, `rgba(${p2.hue}, ${alpha})`);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  function update() {
    particles.forEach(p => {
      // Mouse repulsion
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.mouseRadius && dist > 0) {
        const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius;
        p.vx += (dx / dist) * force * CONFIG.mouseForce;
        p.vy += (dy / dist) * force * CONFIG.mouseForce;
      }

      // Speed cap
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > CONFIG.speed * 2) {
        p.vx = (p.vx / speed) * CONFIG.speed * 2;
        p.vy = (p.vy / speed) * CONFIG.speed * 2;
      }

      // Friction
      p.vx *= 0.99;
      p.vy *= 0.99;

      p.x += p.vx;
      p.y += p.vy;

      // Bounce off edges
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      p.x = Math.max(0, Math.min(W, p.x));
      p.y = Math.max(0, Math.min(H, p.y));
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.maxDist) {
          drawLine(particles[i], particles[j], dist);
        }
      }
    }

    // Draw particles
    particles.forEach(drawParticle);
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  function init() {
    resize();
    createParticles();
    loop();
  }

  // Track mouse
  const hero = canvas.parentElement;
  hero.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  hero.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  window.addEventListener('resize', () => {
    resize();
    createParticles();
  });

  // Start after loader hides (avoid wasted computation)
  const loader = document.getElementById('page-loader');
  if (loader) {
    const obs = new MutationObserver(() => {
      if (loader.classList.contains('hidden')) {
        init();
        obs.disconnect();
      }
    });
    obs.observe(loader, { attributes: true, attributeFilter: ['class'] });
    // Fallback
    setTimeout(init, 3000);
  } else {
    init();
  }
})();

// ==============================================
// TYPEWRITER EFFECT (Hero h1)
// ==============================================
(function initTypewriter() {
  const el = document.getElementById('typewriter-target');
  if (!el) return;

  const text = el.dataset.text || el.textContent.trim();
  el.textContent = '';

  // Create cursor
  const cursor = document.createElement('span');
  cursor.className = 'typewriter-cursor';
  el.parentElement.appendChild(cursor);

  let i = 0;
  const speed = 40; // ms per char
  const startDelay = 800; // wait for loader

  function type() {
    if (i < text.length) {
      el.textContent += text[i];
      i++;
      setTimeout(type, speed + Math.random() * 20);
    } else {
      // Remove cursor after done (optional - keep for effect)
      setTimeout(() => {
        cursor.style.animation = 'blink 1s step-end infinite';
      }, 500);
    }
  }

  setTimeout(type, startDelay);
})();

// ==============================================
// TILT 3D EFFECT on project tiles
// ==============================================
(function initTilt() {
  const tiles = document.querySelectorAll('.project-tile-link');
  if (!tiles.length) return;

  const MAX_TILT = 6; // degrees

  tiles.forEach(tile => {
    tile.addEventListener('mousemove', e => {
      const rect = tile.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);

      const rotateX = -dy * MAX_TILT;
      const rotateY = dx * MAX_TILT;

      const media = tile.querySelector('.project-media--tile');
      if (media) {
        media.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      }
    });

    tile.addEventListener('mouseleave', () => {
      const media = tile.querySelector('.project-media--tile');
      if (media) {
        media.style.transform = '';
      }
    });
  });
})();

// ==============================================
// ANIMATED COUNTER (for numbers/stats)
// ==============================================
function animateCounter(el) {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const duration = 1500;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    el.textContent = (Number.isInteger(target) ? Math.round(value) : value.toFixed(1)) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// Trigger counters on reveal
const counterEls = document.querySelectorAll('[data-count]');
if (counterEls.length) {
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counterEls.forEach(el => counterObserver.observe(el));
}

// ==============================================
// SCROLL PROGRESS BAR
// ==============================================
(function initScrollProgress() {
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  bar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    height: 2px;
    width: 0%;
    background: linear-gradient(90deg, #00d4ff, #8b5cf6, #f472b6);
    z-index: 9999;
    transition: width 0.1s linear;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
  `;
  document.body.appendChild(bar);

  window.addEventListener('scroll', () => {
    const scrollTop = document.documentElement.scrollTop;
    const docH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    bar.style.width = (scrollTop / docH * 100) + '%';
  }, { passive: true });
})();

// ==============================================
// HERO PILL BUTTONS — stagger on load
// ==============================================
(function initPillStagger() {
  const pills = document.querySelectorAll('.hero-pill');
  if (!pills.length) return;

  pills.forEach((pill, i) => {
    pill.style.opacity = '0';
    pill.style.transform = 'translateY(20px)';
    pill.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

    setTimeout(() => {
      pill.style.opacity = '1';
      pill.style.transform = 'translateY(0)';
    }, 1200 + i * 120);
  });
})();

// ==============================================
// NAV — Add glassy active underline glow
// ==============================================
(function enhanceNav() {
  const links = document.querySelectorAll('.header nav a');
  links.forEach(link => {
    link.addEventListener('mouseenter', () => {
      link.style.textShadow = '0 0 20px rgba(0, 212, 255, 0.4)';
    });
    link.addEventListener('mouseleave', () => {
      if (!link.classList.contains('active')) {
        link.style.textShadow = '';
      }
    });
  });

  const activeLink = document.querySelector('.header nav a.active');
  if (activeLink) {
    activeLink.style.textShadow = '0 0 20px rgba(0, 212, 255, 0.3)';
  }
})();

// ==============================================
// CAROUSEL ITEMS — fade in on load
// ==============================================
(function initCarouselFade() {
  const items = document.querySelectorAll('.carousel-item');
  if (!items.length) return;

  items.forEach((item, i) => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
    item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    setTimeout(() => {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    }, 600 + (i % 6) * 100);
  });
})();

// ==============================================
// MAGNETIC BUTTONS — subtle pull effect on CTAs
// ==============================================
(function initMagneticButtons() {
  const btns = document.querySelectorAll('.btn-primary, .btn-secondary, .footer-copy');
  const STRENGTH = 0.25;

  btns.forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * STRENGTH;
      const dy = (e.clientY - cy) * STRENGTH;
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
      btn.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      setTimeout(() => {
        btn.style.transition = '';
      }, 400);
    });
  });
})();

// ==============================================
// REVEAL — Enhanced with stagger for .reveal-stagger
// ==============================================
(function initRevealStagger() {
  const staggerEls = document.querySelectorAll('.reveal-stagger');
  if (!staggerEls.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  staggerEls.forEach(el => observer.observe(el));
})();

// ==============================================
// CURSOR GLOW (subtle trailing glow)
// ==============================================
(function initCursorGlow() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip on touch

  const glow = document.createElement('div');
  glow.id = 'cursor-glow';
  glow.style.cssText = `
    position: fixed;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0, 212, 255, 0.06) 0%, transparent 70%);
    pointer-events: none;
    z-index: 1;
    transform: translate(-50%, -50%);
    transition: left 0.12s ease, top 0.12s ease;
    mix-blend-mode: screen;
  `;
  document.body.appendChild(glow);

  window.addEventListener('mousemove', e => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  }, { passive: true });
})();

// ==============================================
// BACKGROUND BLOBS — inject decorative blobs
// ==============================================
(function initBgBlobs() {
  // Only on home page (canvas already handles hero)
  const blob1 = document.createElement('div');
  blob1.className = 'bg-blob bg-blob-1';
  const blob2 = document.createElement('div');
  blob2.className = 'bg-blob bg-blob-2';
  document.body.appendChild(blob1);
  document.body.appendChild(blob2);
})();
