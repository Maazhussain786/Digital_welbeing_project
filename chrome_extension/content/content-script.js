const OVERLAY_ID = "dw-intervention-overlay";
const REMINDER_ID = "dw-reminder-banner";

let usageInterval = null;
let replayingClick = false;
let prayerCountdownInterval = null;
let lastPrayerAudioKey = "";
let prayerMediaGuardEnabled = false;

const effects = {
  grayLevel: 0,
  slowDelayMs: 0,
  lockActive: false
};

function currentDomain() {
  return window.location.hostname || "unknown";
}

function removeElement(id) {
  const el = document.getElementById(id);
  if (el) {
    el.remove();
  }

  if (id === OVERLAY_ID && prayerCountdownInterval) {
    clearInterval(prayerCountdownInterval);
    prayerCountdownInterval = null;
  }
}

function forEachMediaElement(handler) {
  const nodes = document.querySelectorAll("video, audio");
  nodes.forEach((node) => {
    try {
      handler(node);
    } catch (_err) {
      // Ignore per-element errors.
    }
  });
}

function pauseAllMedia() {
  forEachMediaElement((media) => {
    media.pause();
    media.muted = true;
  });
}

function restoreMediaAfterPrayer() {
  forEachMediaElement((media) => {
    media.muted = false;
  });
}

function setPrayerMediaGuard(enabled) {
  prayerMediaGuardEnabled = Boolean(enabled);
  if (!prayerMediaGuardEnabled) {
    restoreMediaAfterPrayer();
  }
}

function applyVisualEffects() {
  const gray = Math.max(0, Math.min(1, Number(effects.grayLevel || 0)));
  const filter = gray > 0 ? `grayscale(${gray}) saturate(${Math.max(0.3, 1 - gray * 0.5)})` : "none";

  document.documentElement.style.transition = "filter 0.25s ease";
  document.documentElement.style.filter = filter;
}

function setPassiveEffects(nextGrayLevel, nextSlowDelayMs) {
  effects.grayLevel = Math.max(0, Number(nextGrayLevel || 0));
  effects.slowDelayMs = Math.max(0, Number(nextSlowDelayMs || 0));
  applyVisualEffects();
}

function clearPassiveEffects() {
  setPassiveEffects(0, 0);
}

function showReminder() {
  removeElement(REMINDER_ID);

  const banner = document.createElement("div");
  banner.id = REMINDER_ID;
  banner.textContent = "Quick check-in: do you still want to be on this page?";
  banner.style.cssText = "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:12px 16px;background:#111;color:#fff;border-radius:10px;font:600 13px/1.4 Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25);";

  document.body.appendChild(banner);
  setTimeout(() => removeElement(REMINDER_ID), 4500);
}

function showDelay(seconds) {
  if (prayerCountdownInterval) {
    clearInterval(prayerCountdownInterval);
    prayerCountdownInterval = null;
  }
  removeElement(OVERLAY_ID);

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;";

  const card = document.createElement("div");
  card.style.cssText = "width:min(90vw,420px);padding:24px;border-radius:14px;background:#fff;color:#111;text-align:center;font-family:Arial,sans-serif;";
  const title = document.createElement("h2");
  title.textContent = "Mindful pause";
  title.style.margin = "0 0 10px";
  const body = document.createElement("p");
  body.textContent = `Take ${seconds} seconds before continuing.`;
  body.style.margin = "0 0 14px";
  const timer = document.createElement("div");
  timer.style.cssText = "font-size:24px;font-weight:700;";

  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(timer);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  let remaining = seconds;
  timer.textContent = String(remaining);

  const t = setInterval(() => {
    remaining -= 1;
    timer.textContent = String(Math.max(remaining, 0));
    if (remaining <= 0) {
      clearInterval(t);
      removeElement(OVERLAY_ID);
    }
  }, 1000);
}

function showShutter(holdSeconds = 12) {
  if (prayerCountdownInterval) {
    clearInterval(prayerCountdownInterval);
    prayerCountdownInterval = null;
  }
  removeElement(OVERLAY_ID);
  effects.lockActive = true;

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(2,6,23,.95);display:flex;align-items:center;justify-content:center;";

  const card = document.createElement("div");
  card.style.cssText = "width:min(92vw,460px);padding:26px;border-radius:16px;background:#111827;color:#e2e8f0;font-family:Arial,sans-serif;text-align:center;";

  const title = document.createElement("h2");
  title.textContent = "Shutter mode";
  title.style.margin = "0 0 8px";

  const body = document.createElement("p");
  body.textContent = "This site is in a high-friction state. Hold the button to continue with intention.";
  body.style.margin = "0 0 14px";

  const progressTrack = document.createElement("div");
  progressTrack.style.cssText = "height:10px;background:#334155;border-radius:999px;overflow:hidden;margin-bottom:12px;";
  const progressBar = document.createElement("div");
  progressBar.style.cssText = "height:100%;width:0;background:linear-gradient(90deg,#22c55e,#86efac);";
  progressTrack.appendChild(progressBar);

  const holdButton = document.createElement("button");
  holdButton.textContent = "Hold to continue";
  holdButton.style.cssText = "border:0;border-radius:10px;padding:11px 16px;font-weight:700;cursor:pointer;background:#e2e8f0;color:#0f172a;";

  const hint = document.createElement("div");
  hint.textContent = `Hold for ${holdSeconds}s`;
  hint.style.cssText = "margin-top:10px;color:#93c5fd;font-size:13px;";

  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(progressTrack);
  card.appendChild(holdButton);
  card.appendChild(hint);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const totalMs = Math.max(3, Number(holdSeconds || 12)) * 1000;
  let holdMs = 0;
  let timer = null;

  const stopHold = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const startHold = () => {
    if (timer) {
      return;
    }

    timer = setInterval(() => {
      holdMs += 100;
      const pct = Math.min(100, (holdMs / totalMs) * 100);
      progressBar.style.width = `${pct}%`;
      hint.textContent = `Hold progress: ${Math.round(pct)}%`;

      if (holdMs >= totalMs) {
        stopHold();
        effects.lockActive = false;
        removeElement(OVERLAY_ID);
        chrome.runtime.sendMessage({ type: "USER_OVERRIDE", reason: "shutter-hold-complete" });
      }
    }, 100);
  };

  const resetHold = () => {
    stopHold();
    holdMs = 0;
    progressBar.style.width = "0";
    hint.textContent = `Hold for ${holdSeconds}s`;
  };

  holdButton.addEventListener("mousedown", startHold);
  holdButton.addEventListener("touchstart", startHold, { passive: true });

  holdButton.addEventListener("mouseup", resetHold);
  holdButton.addEventListener("mouseleave", resetHold);
  holdButton.addEventListener("touchend", resetHold);
}

function showBlock() {
  if (prayerCountdownInterval) {
    clearInterval(prayerCountdownInterval);
    prayerCountdownInterval = null;
  }
  removeElement(OVERLAY_ID);

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(14,19,29,.96);display:flex;align-items:center;justify-content:center;";

  const card = document.createElement("div");
  card.style.cssText = "width:min(92vw,460px);padding:26px;border-radius:16px;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif;text-align:center;";
  card.innerHTML = "<h2 style='margin:0 0 8px;'>Break time</h2><p style='margin:0 0 16px;'>You hit your hard limit for today. Take a short break and come back with intention.</p>";

  const button = document.createElement("button");
  button.textContent = "Continue for 1 minute";
  button.style.cssText = "border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;background:#111;color:#fff;";
  button.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "USER_OVERRIDE", reason: "manual-continue" });
    effects.lockActive = false;
    removeElement(OVERLAY_ID);
  });

  card.appendChild(button);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function playAzanCue() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    const ctx = new AudioCtx();
    const notes = [294, 330, 392, 440, 392, 330, 294, 330, 392];
    let when = ctx.currentTime + 0.1;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = index % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, when);

      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(0.07, when + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(when);
      osc.stop(when + 0.45);
      when += 0.22;
    });
  } catch (_err) {
    // No-op if audio playback fails.
  }
}

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function showPrayerLock(prayerName, untilMs) {
  setPrayerMediaGuard(true);
  pauseAllMedia();
  removeElement(OVERLAY_ID);
  effects.lockActive = true;

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(7,12,21,.97);display:flex;align-items:center;justify-content:center;";

  const card = document.createElement("div");
  card.style.cssText = "width:min(92vw,470px);padding:28px;border-radius:16px;background:#0f172a;color:#e2e8f0;font-family:Arial,sans-serif;text-align:center;box-shadow:0 22px 40px rgba(0,0,0,.4);";

  const title = document.createElement("h2");
  title.textContent = `${prayerName || "Prayer"} time`;
  title.style.margin = "0 0 10px";

  const body = document.createElement("p");
  body.textContent = "Pause everything, perform your Namaz, and come back with a clear mind.";
  body.style.cssText = "margin:0 0 12px;color:#cbd5e1;";

  const timer = document.createElement("div");
  timer.style.cssText = "font-size:32px;font-weight:800;letter-spacing:0.05em;color:#93c5fd;";
  timer.textContent = formatRemaining(Number(untilMs || Date.now()));

  const note = document.createElement("div");
  note.style.cssText = "margin-top:8px;font-size:12px;color:#94a3b8;";
  note.textContent = "Asar and Maghrib lock window is active.";

  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(timer);
  card.appendChild(note);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const prayerAudioKey = `${prayerName || "Prayer"}-${untilMs || 0}`;
  if (prayerAudioKey !== lastPrayerAudioKey) {
    playAzanCue();
    lastPrayerAudioKey = prayerAudioKey;
  }

  prayerCountdownInterval = setInterval(() => {
    pauseAllMedia();
    const remainingMs = Number(untilMs || 0) - Date.now();
    timer.textContent = formatRemaining(remainingMs);

    if (remainingMs <= 0) {
      clearInterval(prayerCountdownInterval);
      prayerCountdownInterval = null;
      effects.lockActive = false;
      setPrayerMediaGuard(false);
      removeElement(OVERLAY_ID);
    }
  }, 1000);
}

function installSlowdownInterceptor() {
  document.addEventListener(
    "click",
    (event) => {
      if (replayingClick || effects.lockActive || effects.slowDelayMs <= 0 || !event.isTrusted) {
        return;
      }

      const target = event.target;
      if (!target || typeof target.dispatchEvent !== "function") {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const delay = effects.slowDelayMs + Math.floor(Math.random() * 350);
      setTimeout(() => {
        replayingClick = true;
        target.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window
          })
        );
        replayingClick = false;
      }, delay);
    },
    true
  );
}

function handleIntervention(intervention) {
  if (!intervention || intervention.mode === "none") {
    clearPassiveEffects();
    effects.lockActive = false;
    setPrayerMediaGuard(false);
    lastPrayerAudioKey = "";
    removeElement(OVERLAY_ID);
    return;
  }

  if (intervention.grayLevel !== undefined || intervention.slowDelayMs !== undefined) {
    setPassiveEffects(intervention.grayLevel || effects.grayLevel, intervention.slowDelayMs || effects.slowDelayMs);
  }

  if (intervention.mode === "remind") {
    showReminder();
    return;
  }

  if (intervention.mode === "gray") {
    setPassiveEffects(intervention.grayLevel || 0.55, 0);
    showReminder();
    return;
  }

  if (intervention.mode === "slow") {
    setPassiveEffects(intervention.grayLevel || 0.7, intervention.slowDelayMs || 900);
    showReminder();
    return;
  }

  if (intervention.mode === "delay") {
    setPassiveEffects(intervention.grayLevel || effects.grayLevel, intervention.slowDelayMs || effects.slowDelayMs);
    showDelay(Math.max(3, Number(intervention.seconds || 5)));
    return;
  }

  if (intervention.mode === "shutter") {
    setPassiveEffects(intervention.grayLevel || 1, intervention.slowDelayMs || 1400);
    showShutter(Math.max(5, Number(intervention.holdSeconds || 12)));
    return;
  }

  if (intervention.mode === "block") {
    setPassiveEffects(1, 1800);
    showBlock();
    return;
  }

  if (intervention.mode === "prayer") {
    setPassiveEffects(1, 1800);
    showPrayerLock(intervention.prayerName || "Prayer", Number(intervention.until || Date.now() + 10 * 60 * 1000));
  }
}

function sendUsageTick() {
  if (document.hidden) {
    return;
  }

  chrome.runtime.sendMessage({
    type: "USAGE_TICK",
    domain: currentDomain(),
    url: window.location.href,
    title: document.title || "",
    seconds: 5,
    timestamp: Date.now()
  }, (response) => {
    if (response?.intervention?.mode) {
      handleIntervention(response.intervention);
    }
  });
}

function startTracking() {
  if (usageInterval) {
    return;
  }
  usageInterval = setInterval(sendUsageTick, 5000);
  sendUsageTick();
}

function stopTracking() {
  if (!usageInterval) {
    return;
  }
  clearInterval(usageInterval);
  usageInterval = null;
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopTracking();
  } else {
    startTracking();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "FORCE_PRAYER_PAUSE") {
    setPrayerMediaGuard(true);
    pauseAllMedia();
    return;
  }

  if (message?.type === "APPLY_INTERVENTION") {
    handleIntervention(message.intervention || { mode: "none" });
  }
});

document.addEventListener("play", (event) => {
  if (!prayerMediaGuardEnabled) {
    return;
  }

  const target = event.target;
  if (target && typeof target.pause === "function") {
    target.pause();
  }
}, true);

installSlowdownInterceptor();
startTracking();
