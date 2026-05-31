const introScreen = document.getElementById("introScreen");
const heartShell = document.getElementById("heartShell");
const introKicker = document.getElementById("introKicker");
const introTitle = document.getElementById("introTitle");
const pageShell = document.getElementById("pageShell");
const proposalCard = document.getElementById("proposalCard");
const introParticles = document.getElementById("introParticles");
const stars = document.getElementById("stars");
const floatingHearts = document.getElementById("floatingHearts");
const petals = document.getElementById("petals");
const buttonRow = document.querySelector(".button-row");
const typingLine = document.getElementById("typingLine");
const maybeBtn = document.getElementById("maybeBtn");
const yesBtn = document.getElementById("yesBtn");
const escapeNote = document.getElementById("escapeNote");
const celebrationOverlay = document.getElementById("celebrationOverlay");
const gallerySection = document.getElementById("gallerySection");
const musicHint = document.getElementById("musicHint");
const memorySlides = [...document.querySelectorAll(".memory-slide")];
const fxCanvas = document.getElementById("fx-canvas");

const romanticLines = [
  "Every day, every moment...",
  "I started liking you more.",
  "And now I think my heart has made its choice.",
];

const escapeMessages = [
  "Escape is impossible now.",
  "Nope. That button already knows the right answer.",
  "The shy button panicked and ran toward romance.",
  "This little love story refuses to let the answer hide.",
];

let runawayEnabled = false;
let slideIndex = 0;
let currentTypingTimeout;
let currentSlideInterval;
let heartsBurstCount = 0;
let maybeFloating = false;
let maybePosition = { x: 0, y: 0 };
let lastPointer = null;
let maybeEscapeInterval = null;
let lastMaybeMoveAt = 0;

class RomanticAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.padTimer = null;
    this.isStarted = false;
    this.isCelebration = false;
  }

  async start() {
    if (this.isStarted) {
      if (this.context?.state === "suspended") {
        await this.context.resume();
      }
      return true;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return false;
    }

    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0.035;
    this.master.connect(this.context.destination);
    this.isStarted = true;
    this.playPadLoop();
    return this.context.state === "running";
  }

  async ensure() {
    const started = await this.start();
    if (!started && this.context?.state === "suspended") {
      await this.context.resume();
    }
    return this.context?.state === "running";
  }

  playTone(frequency, start, duration, type = "sine", gainValue = 0.045) {
    if (!this.context || !this.master) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainValue, start + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  playPadLoop() {
    if (!this.context) {
      return;
    }

    const chords = [
      [261.63, 329.63, 392.0],
      [220.0, 293.66, 369.99],
      [246.94, 311.13, 392.0],
      [196.0, 293.66, 392.0],
    ];

    let chordIndex = 0;

    const schedule = () => {
      if (!this.context) {
        return;
      }

      const start = this.context.currentTime + 0.05;
      const chord = chords[chordIndex % chords.length];
      chord.forEach((note, index) => {
        this.playTone(
          note,
          start + index * 0.06,
          3.2,
          "triangle",
          this.isCelebration ? 0.055 : 0.04,
        );
      });
      chordIndex += 1;
    };

    schedule();
    this.padTimer = window.setInterval(schedule, 3000);
  }

  playHeartbeat() {
    if (!this.context || !this.master) {
      return;
    }

    const start = this.context.currentTime + 0.02;
    [0, 0.22].forEach((offset, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(index === 0 ? 85 : 65, start + offset);
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.linearRampToValueAtTime(0.09, start + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.22);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + 0.24);
    });
  }

  elevateCelebration() {
    if (!this.master || !this.context) {
      return;
    }

    this.isCelebration = true;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.linearRampToValueAtTime(0.06, this.context.currentTime + 1.1);
    [523.25, 659.25, 783.99].forEach((note, index) => {
      this.playTone(note, this.context.currentTime + index * 0.12, 2, "sawtooth", 0.035);
    });
  }
}

class Fireworks {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.animationFrame = null;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.canvas.height = window.innerHeight * window.devicePixelRatio;
    this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  burst(x, y, colorSet) {
    for (let index = 0; index < 44; index += 1) {
      const angle = (Math.PI * 2 * index) / 44;
      const speed = 2 + Math.random() * 4.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 70 + Math.random() * 24,
        alpha: 1,
        size: 1.8 + Math.random() * 2.8,
        color: colorSet[Math.floor(Math.random() * colorSet.length)],
      });
    }

    if (!this.animationFrame) {
      this.animate();
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    this.particles = this.particles.filter((particle) => particle.life > 0);

    this.particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.03;
      particle.life -= 1;
      particle.alpha = particle.life / 94;

      this.ctx.globalAlpha = Math.max(particle.alpha, 0);
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.globalAlpha = 1;

    if (this.particles.length) {
      this.animationFrame = requestAnimationFrame(() => this.animate());
    } else {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }
}

const audio = new RomanticAudio();
const fireworks = new Fireworks(fxCanvas);

function createParticles(container, count, className, config) {
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < count; index += 1) {
    const element = document.createElement("span");
    element.className = className;
    element.style.left = `${Math.random() * 100}%`;
    element.style.top = `${Math.random() * 100}%`;
    element.style.animationDuration = `${config.minDuration + Math.random() * config.durationSpread}s`;
    element.style.animationDelay = `${-Math.random() * config.maxDelay}s`;

    if (config.sizeRange) {
      const size = config.sizeRange[0] + Math.random() * config.sizeRange[1];
      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
    }

    if (config.opacityRange) {
      element.style.opacity = `${config.opacityRange[0] + Math.random() * config.opacityRange[1]}`;
    }

    fragment.appendChild(element);
  }

  container.appendChild(fragment);
}

function typeRomanticText(lines, element, lineIndex = 0, charIndex = 0) {
  const currentLine = lines[lineIndex];

  if (!currentLine) {
    return;
  }

  const visibleLines = lines.slice(0, lineIndex);
  visibleLines.push(currentLine.slice(0, charIndex));
  element.textContent = visibleLines.join("\n");

  if (charIndex < currentLine.length) {
    currentTypingTimeout = window.setTimeout(
      () => typeRomanticText(lines, element, lineIndex, charIndex + 1),
      55,
    );
    return;
  }

  if (lineIndex < lines.length - 1) {
    currentTypingTimeout = window.setTimeout(
      () => typeRomanticText(lines, element, lineIndex + 1, 0),
      480,
    );
  }
}

function activateSlideshow() {
  currentSlideInterval = window.setInterval(() => {
    memorySlides[slideIndex].classList.remove("active");
    slideIndex = (slideIndex + 1) % memorySlides.length;
    memorySlides[slideIndex].classList.add("active");
  }, 3200);
}

function isDesktopRunaway() {
  return runawayEnabled && window.innerWidth >= 640;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function stopMaybeEscapeLoop() {
  if (!maybeEscapeInterval) {
    return;
  }

  window.clearInterval(maybeEscapeInterval);
  maybeEscapeInterval = null;
}

function syncMaybeButtonLayout() {
  stopMaybeEscapeLoop();
  maybeFloating = false;
  maybePosition = { x: 0, y: 0 };
  maybeBtn.style.position = "";
  maybeBtn.style.left = "";
  maybeBtn.style.top = "";
  maybeBtn.style.zIndex = "";
  maybeBtn.style.transform = "";
  maybeBtn.style.background = "";
}

function getButtonRowMetrics() {
  const bounds = buttonRow.getBoundingClientRect();
  const buttonWidth = maybeBtn.offsetWidth;
  const buttonHeight = maybeBtn.offsetHeight;

  return {
    bounds,
    buttonWidth,
    buttonHeight,
    minX: 0,
    maxX: Math.max(0, bounds.width - buttonWidth),
    minY: 0,
    maxY: Math.max(0, bounds.height - buttonHeight),
  };
}

function ensureMaybeButtonFloating() {
  if (!isDesktopRunaway() || maybeFloating) {
    return;
  }

  const rowBounds = buttonRow.getBoundingClientRect();
  const buttonBounds = maybeBtn.getBoundingClientRect();

  maybePosition = {
    x: buttonBounds.left - rowBounds.left,
    y: buttonBounds.top - rowBounds.top,
  };

  maybeFloating = true;
  maybeBtn.style.position = "absolute";
  maybeBtn.style.left = `${maybePosition.x}px`;
  maybeBtn.style.top = `${maybePosition.y}px`;
  maybeBtn.style.zIndex = "2";
  maybeBtn.style.background = "rgba(255, 104, 154, 0.22)";
}

function getMaybeCenter() {
  if (!maybeFloating) {
    const bounds = maybeBtn.getBoundingClientRect();
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
  }

  const { bounds, buttonWidth, buttonHeight } = getButtonRowMetrics();
  return {
    x: bounds.left + maybePosition.x + buttonWidth / 2,
    y: bounds.top + maybePosition.y + buttonHeight / 2,
  };
}

function isPointerInsideProposalCard(pointerX, pointerY) {
  const bounds = proposalCard.getBoundingClientRect();
  return (
    pointerX >= bounds.left &&
    pointerX <= bounds.right &&
    pointerY >= bounds.top &&
    pointerY <= bounds.bottom
  );
}

function isOverYesButton(candidateX, candidateY, buttonWidth, buttonHeight, bounds) {
  const yesBounds = yesBtn.getBoundingClientRect();
  const padding = 18;
  const yesBox = {
    left: yesBounds.left - bounds.left - padding,
    right: yesBounds.right - bounds.left + padding,
    top: yesBounds.top - bounds.top - padding,
    bottom: yesBounds.bottom - bounds.top + padding,
  };

  return !(
    candidateX + buttonWidth < yesBox.left ||
    candidateX > yesBox.right ||
    candidateY + buttonHeight < yesBox.top ||
    candidateY > yesBox.bottom
  );
}

function chooseRunawayPosition(pointerX, pointerY) {
  const { bounds, buttonWidth, buttonHeight, minX, maxX, minY, maxY } = getButtonRowMetrics();
  const pointerLocalX = pointerX - bounds.left;
  const pointerLocalY = pointerY - bounds.top;
  const currentCenterX = maybePosition.x + buttonWidth / 2;
  const currentCenterY = maybePosition.y + buttonHeight / 2;
  const deltaX = currentCenterX - pointerLocalX;
  const deltaY = currentCenterY - pointerLocalY;
  const distance = Math.hypot(deltaX, deltaY) || 1;
  const baseAngle = Math.atan2(deltaY, deltaX);

  let bestCandidate = null;

  for (let attempt = 0; attempt < 14; attempt += 1) {
    const angle = baseAngle + (Math.random() - 0.5) * 2.6;
    const travel = 78 + Math.random() * 72 + Math.max(0, 170 - distance) * 0.45;
    const candidateX = clamp(maybePosition.x + Math.cos(angle) * travel, minX, maxX);
    const candidateY = clamp(maybePosition.y + Math.sin(angle) * travel, minY, maxY);

    if (isOverYesButton(candidateX, candidateY, buttonWidth, buttonHeight, bounds)) {
      continue;
    }

    const moveDistance = Math.hypot(candidateX - maybePosition.x, candidateY - maybePosition.y);
    const candidateCenterX = bounds.left + candidateX + buttonWidth / 2;
    const candidateCenterY = bounds.top + candidateY + buttonHeight / 2;
    const pointerDistance = Math.hypot(candidateCenterX - pointerX, candidateCenterY - pointerY);
    const score = pointerDistance + moveDistance * 0.35 + Math.random() * 20;

    if (!bestCandidate || score > bestCandidate.score) {
      bestCandidate = { x: candidateX, y: candidateY, score };
    }
  }

  if (bestCandidate) {
    return bestCandidate;
  }

  for (let attempt = 0; attempt < 18; attempt += 1) {
    const randomX = minX + Math.random() * (maxX - minX || 1);
    const randomY = minY + Math.random() * (maxY - minY || 1);

    if (!isOverYesButton(randomX, randomY, buttonWidth, buttonHeight, bounds)) {
      return { x: randomX, y: randomY };
    }
  }

  return { x: minX, y: minY };
}

function updateEscapeNote() {
  heartsBurstCount += 1;
  escapeNote.textContent = escapeMessages[heartsBurstCount % escapeMessages.length];
}

function moveMaybeButton(pointerX = lastPointer?.x, pointerY = lastPointer?.y) {
  if (!isDesktopRunaway() || pointerX == null || pointerY == null) {
    return;
  }

  ensureMaybeButtonFloating();

  const now = Date.now();
  if (now - lastMaybeMoveAt < 80) {
    return;
  }

  const { bounds, buttonWidth, buttonHeight } = getButtonRowMetrics();
  const nextPosition = chooseRunawayPosition(pointerX, pointerY);
  const tilt = (-8 + Math.random() * 16).toFixed(2);
  const scale = (1.02 + Math.random() * 0.08).toFixed(2);

  maybePosition = { x: nextPosition.x, y: nextPosition.y };
  maybeBtn.style.left = `${maybePosition.x}px`;
  maybeBtn.style.top = `${maybePosition.y}px`;
  maybeBtn.style.transform = `rotate(${tilt}deg) scale(${scale})`;
  maybeBtn.style.background = "rgba(255, 104, 154, 0.22)";
  lastMaybeMoveAt = now;

  updateEscapeNote();
  spawnHeartBurst(
    bounds.left + maybePosition.x + buttonWidth / 2,
    bounds.top + maybePosition.y + buttonHeight / 2,
  );
  spawnHeartExplosion(
    bounds.left + maybePosition.x + buttonWidth / 2,
    bounds.top + maybePosition.y + buttonHeight / 2,
  );
}

function isCursorThreatening(pointerX, pointerY) {
  if (!isDesktopRunaway() || !isPointerInsideProposalCard(pointerX, pointerY)) {
    return false;
  }

  const maybeCenter = getMaybeCenter();
  return Math.hypot(maybeCenter.x - pointerX, maybeCenter.y - pointerY) < 170;
}

function startMaybeEscapeLoop() {
  if (maybeEscapeInterval) {
    return;
  }

  maybeEscapeInterval = window.setInterval(() => {
    if (!lastPointer || !isCursorThreatening(lastPointer.x, lastPointer.y)) {
      stopMaybeEscapeLoop();
      return;
    }

    moveMaybeButton(lastPointer.x, lastPointer.y);
  }, 120);
}

function handlePointerPressure(event) {
  if (!isDesktopRunaway()) {
    return;
  }

  lastPointer = { x: event.clientX, y: event.clientY };

  if (!isCursorThreatening(event.clientX, event.clientY)) {
    if (!isPointerInsideProposalCard(event.clientX, event.clientY)) {
      stopMaybeEscapeLoop();
    }
    return;
  }

  moveMaybeButton(event.clientX, event.clientY);
  startMaybeEscapeLoop();
}

function spawnHeartBurst(x, y) {
  const colorSet = ["#ff7ea8", "#ffd4e5", "#ff4d6d", "#ffc0d6"];
  fireworks.burst(x, y, colorSet);
}

function spawnHeartExplosion(x, y) {
  const heartCount = 16;

  for (let index = 0; index < heartCount; index += 1) {
    const heart = document.createElement("span");
    const angle = (Math.PI * 2 * index) / heartCount + (Math.random() - 0.5) * 0.28;
    const distance = 90 + Math.random() * 160;
    const driftX = Math.cos(angle) * distance;
    const driftY = Math.sin(angle) * distance;
    const size = 6 + Math.random() * 7;

    heart.className = "burst-heart";
    heart.style.left = `${x}px`;
    heart.style.top = `${y}px`;
    heart.style.setProperty("--dx", `${driftX.toFixed(1)}px`);
    heart.style.setProperty("--dy", `${driftY.toFixed(1)}px`);
    heart.style.setProperty("--spin", `${(-32 + Math.random() * 64).toFixed(1)}deg`);
    heart.style.setProperty("--burst-size", `${size.toFixed(1)}px`);
    heart.style.setProperty("--burst-scale", `${(0.85 + Math.random() * 0.5).toFixed(2)}`);
    heart.style.setProperty("--burst-duration", `${(1.25 + Math.random() * 0.6).toFixed(2)}s`);

    document.body.appendChild(heart);
    window.setTimeout(() => heart.remove(), 2200);
  }
}

function celebrateYes() {
  celebrationOverlay.classList.remove("hidden");
  gallerySection.scrollIntoView({ behavior: "smooth", block: "start" });
  audio.elevateCelebration();

  const bursts = [
    [window.innerWidth * 0.25, window.innerHeight * 0.3],
    [window.innerWidth * 0.5, window.innerHeight * 0.2],
    [window.innerWidth * 0.75, window.innerHeight * 0.34],
  ];

  bursts.forEach((point, index) => {
    window.setTimeout(() => {
      fireworks.burst(point[0], point[1], ["#ffd4e5", "#ff7ea8", "#ffffff", "#ff4d6d"]);
    }, index * 240);
  });

  for (let index = 0; index < 18; index += 1) {
    window.setTimeout(() => {
      const rose = document.createElement("span");
      rose.className = "petal";
      rose.style.left = `${Math.random() * 100}%`;
      rose.style.top = "-10%";
      rose.style.width = `${16 + Math.random() * 10}px`;
      rose.style.height = `${24 + Math.random() * 14}px`;
      rose.style.animationDuration = `${5 + Math.random() * 3}s`;
      petals.appendChild(rose);

      window.setTimeout(() => rose.remove(), 8000);
    }, index * 150);
  }

  window.setTimeout(() => {
    celebrationOverlay.classList.add("hidden");
  }, 5200);
}

async function setupAudio() {
  const running = await audio.ensure();

  if (!running) {
    musicHint.hidden = false;

    const unlock = async () => {
      const unlocked = await audio.ensure();
      if (unlocked) {
        musicHint.hidden = true;
        document.removeEventListener("pointerdown", unlock);
      }
    };

    document.addEventListener("pointerdown", unlock);
  }
}

function startOpeningSequence() {
  createParticles(introParticles, 28, "particle", {
    minDuration: 3,
    durationSpread: 4,
    maxDelay: 4,
    sizeRange: [3, 6],
    opacityRange: [0.3, 0.6],
  });

  createParticles(stars, 90, "star", {
    minDuration: 2,
    durationSpread: 4,
    maxDelay: 6,
    sizeRange: [1, 2.3],
    opacityRange: [0.3, 0.5],
  });

  createParticles(floatingHearts, 24, "float-heart", {
    minDuration: 10,
    durationSpread: 9,
    maxDelay: 10,
  });

  createParticles(petals, 18, "petal", {
    minDuration: 8,
    durationSpread: 8,
    maxDelay: 8,
  });

  window.setTimeout(() => {
    audio.playHeartbeat();
    heartShell.classList.add("visible");
  }, 2000);

  window.setTimeout(() => {
    introKicker.classList.add("visible");
  }, 3300);

  window.setTimeout(() => {
    introTitle.classList.add("visible");
  }, 4200);

  window.setTimeout(() => {
    introScreen.style.transition = "opacity 1.5s ease";
    introScreen.style.opacity = "0";
  }, 6200);

  window.setTimeout(() => {
    introScreen.classList.add("hidden");
    pageShell.classList.remove("hidden");
    runawayEnabled = true;
    typeRomanticText(romanticLines, typingLine);
    activateSlideshow();
  }, 7400);
}

maybeBtn.addEventListener("mouseenter", (event) => {
  lastPointer = { x: event.clientX, y: event.clientY };
  moveMaybeButton(event.clientX, event.clientY);
  startMaybeEscapeLoop();
});

maybeBtn.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  lastPointer = { x: event.clientX, y: event.clientY };
  moveMaybeButton(event.clientX, event.clientY);
  startMaybeEscapeLoop();
});

maybeBtn.addEventListener("focus", () => {
  const bounds = maybeBtn.getBoundingClientRect();
  moveMaybeButton(bounds.left - 120, bounds.top + bounds.height / 2);
});

yesBtn.addEventListener("click", () => {
  celebrateYes();
});

document.addEventListener("pointermove", handlePointerPressure);

proposalCard.addEventListener("pointerleave", () => {
  lastPointer = null;
  stopMaybeEscapeLoop();
});

window.addEventListener("resize", syncMaybeButtonLayout);

window.addEventListener("beforeunload", () => {
  window.clearTimeout(currentTypingTimeout);
  window.clearInterval(currentSlideInterval);
  stopMaybeEscapeLoop();
});

setupAudio();
startOpeningSequence();
