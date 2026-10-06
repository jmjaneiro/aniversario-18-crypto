/**
 * CHAPTER 18 • GOLDEN EDITION
 * Interactive Engine: 3D Coin Tilt, Particle System, Web Audio Chimes, Confetti & QR Tag
 */

document.addEventListener('DOMContentLoaded', () => {
  initParticleBackground();
  initCoin3DTilt();
  initAudioSystem();
  initCelebrationFlow();
  initQrModal();
});

/* ==========================================================================
   1. AMBIENT GOLDEN PARTICLE CANVAS
   ========================================================================== */
function initParticleBackground() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particleCount = Math.min(50, Math.floor(width / 25));
  const particles = [];

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.size = Math.random() * 2.2 + 0.6;
      this.speedY = Math.random() * 0.4 + 0.15;
      this.speedX = (Math.random() - 0.5) * 0.25;
      this.opacity = Math.random() * 0.6 + 0.2;
      this.pulseSpeed = Math.random() * 0.02 + 0.008;
      this.pulse = Math.random() * Math.PI;
    }

    update() {
      this.y -= this.speedY;
      this.x += this.speedX;
      this.pulse += this.pulseSpeed;

      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset();
      }
    }

    draw() {
      const alpha = this.opacity * (0.6 + 0.4 * Math.sin(this.pulse));
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 225, 120, ${alpha})`;
      ctx.shadowColor = 'rgba(212, 175, 55, 0.8)';
      ctx.shadowBlur = this.size * 3;
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let p of particles) {
      p.update();
      p.draw();
    }
    requestAnimationFrame(animate);
  }

  animate();
}

/* ==========================================================================
   2. 3D INTERACTIVE BITCOIN TILT & FLIP
   ========================================================================== */
function initCoin3DTilt() {
  const container = document.getElementById('coinTiltContainer');
  const card = document.getElementById('coinCard');
  const coin3D = card?.querySelector('.coin-3d');
  const glares = document.querySelectorAll('.coin-shine-glare');

  if (!card || !container || !coin3D) return;

  let isFlipped = false;
  let isHovered = false;

  // Toggle flip on clicking/tapping the card itself
  card.addEventListener('click', () => {
    isFlipped = !isFlipped;
    coin3D.classList.toggle('flipped', isFlipped);
    playCrystalChime(isFlipped ? 660 : 520);
  });

  // Mouse tilt tracking
  container.addEventListener('mousemove', (e) => {
    isHovered = true;
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const maxTilt = 22; // degrees
    const rotateY = (mouseX / (rect.width / 2)) * maxTilt;
    const rotateX = -(mouseY / (rect.height / 2)) * maxTilt;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`;

    // Update glare highlight
    const glareX = 50 + (mouseX / rect.width) * 40;
    const glareY = 50 + (mouseY / rect.height) * 40;
    glares.forEach(glare => {
      glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 60%)`;
    });
  });

  container.addEventListener('mouseleave', () => {
    isHovered = false;
    card.style.transform = `rotateX(0deg) rotateY(0deg) scale(1)`;
    glares.forEach(glare => {
      glare.style.background = `radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 55%)`;
    });
  });

  // Touch device support
  container.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const touchX = touch.clientX - centerX;
      const touchY = touch.clientY - centerY;

      const maxTilt = 18;
      const rotateY = (touchX / (rect.width / 2)) * maxTilt;
      const rotateX = -(touchY / (rect.height / 2)) * maxTilt;

      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    }
  }, { passive: true });

  container.addEventListener('touchend', () => {
    card.style.transform = `rotateX(0deg) rotateY(0deg) scale(1)`;
  });
}

/* ==========================================================================
   3. WEB AUDIO HARMONIC CHIMES (NO EXTERNAL ASSETS NEEDED)
   ========================================================================== */
let audioCtx = null;
let soundEnabled = true;

function initAudioSystem() {
  soundEnabled = true;
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
}

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playCrystalChime(baseFreq = 587.33) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const chords = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2]; // Major harmonic chord

    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);

      // Volume envelope
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.08 / (idx + 1), ctx.currentTime + idx * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.04 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.04);
      osc.stop(ctx.currentTime + idx * 0.04 + 1.25);
    });
  } catch (err) {
    console.debug('Audio playback skipped:', err);
  }
}

function playCelebrationFanfare() {
  if (!soundEnabled) return;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((note, index) => {
    setTimeout(() => {
      playCrystalChime(note);
    }, index * 120);
  });
}

/* ==========================================================================
   4. CELEBRATION FLOW & GOLDEN CONFETTI EXPLOSION
   ========================================================================== */
function initCelebrationFlow() {
  const celebrateBtn = document.getElementById('celebrateBtn');
  const targetSection = document.getElementById('significado');

  celebrateBtn?.addEventListener('click', () => {
    // 1. Play grand crystal chime
    playCelebrationFanfare();

    // 2. Trigger golden confetti
    triggerGoldenConfetti();

    // 3. Smooth scroll down to the manifesto after a tiny beat
    setTimeout(() => {
      targetSection?.scrollIntoView({ behavior: 'smooth' });
    }, 450);
  });
}

function triggerGoldenConfetti() {
  const confettiCanvas = document.createElement('canvas');
  confettiCanvas.style.position = 'fixed';
  confettiCanvas.style.inset = '0';
  confettiCanvas.style.width = '100vw';
  confettiCanvas.style.height = '100vh';
  confettiCanvas.style.pointerEvents = 'none';
  confettiCanvas.style.zIndex = '999';
  document.body.appendChild(confettiCanvas);

  const ctx = confettiCanvas.getContext('2d');
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  const colors = ['#FFE885', '#D4AF37', '#FFF5B8', '#FFFFFF', '#E5C158', '#E8B4A2'];
  const confettiPieces = [];
  const count = 120;

  for (let i = 0; i < count; i++) {
    confettiPieces.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 150,
      y: window.innerHeight * 0.45,
      size: Math.random() * 8 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.85) * 16,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
      gravity: 0.35,
      drag: 0.96
    });
  }

  let animationFrame;
  function updateConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = 0;

    confettiPieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.009;

      if (p.opacity > 0 && p.y < window.innerHeight + 50) {
        alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        ctx.restore();
      }
    });

    if (alive > 0) {
      animationFrame = requestAnimationFrame(updateConfetti);
    } else {
      cancelAnimationFrame(animationFrame);
      confettiCanvas.remove();
    }
  }

  updateConfetti();
}

/* ==========================================================================
   5. QR CODE PRINTABLE MODAL & LIVE GENERATOR
   ========================================================================== */
function initQrModal() {
  const modal = document.getElementById('qrModal');
  const openBtn = document.getElementById('openQrModalBtn');
  const closeBtn = document.getElementById('closeQrModalBtn');
  const printBtn = document.getElementById('printCardBtn');
  const downloadBtn = document.getElementById('downloadQrBtn');
  const updateBtn = document.getElementById('updateQrBtn');
  const urlInput = document.getElementById('customUrlInput');
  const qrContainer = document.getElementById('qrCodeContainer');

  if (!modal) return;

  function loadInitialQr() {
    if (qrContainer) {
      qrContainer.innerHTML = `<img src="assets/qr-code.png" alt="QR Code para o Teu Presente" width="180" height="180" id="currentQrImage" onerror="this.src='assets/qr-code.svg'">`;
    }
  }
  loadInitialQr();

  // Open modal
  openBtn?.addEventListener('click', () => {
    modal.hidden = false;
    setTimeout(() => modal.classList.add('active'), 10);
    playCrystalChime(660);
  });

  // Close modal
  function closeModal() {
    modal.classList.remove('active');
    setTimeout(() => (modal.hidden = true), 300);
  }

  closeBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Print button
  printBtn?.addEventListener('click', () => {
    window.print();
  });

  // Download QR code image
  downloadBtn?.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = 'assets/qr-code.png';
    link.download = 'cartao-presente-beatriz-18.png';
    link.click();
  });

  // Update QR Code with custom URL if edited
  updateBtn?.addEventListener('click', () => {
    const url = urlInput?.value?.trim();
    if (!url) return;

    // Use lightweight Google Charts / standard dynamic SVG QR fallback for custom links
    const qrEncodedUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(url)}`;
    
    if (qrContainer) {
      qrContainer.innerHTML = `<img src="${qrEncodedUrl}" alt="QR Code Atualizado" width="170" height="170" id="currentQrImage" onerror="this.src='assets/qr-code.svg'">`;
    }
    playCrystalChime(800);
  });
}
