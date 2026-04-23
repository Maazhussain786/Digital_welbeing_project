const OVERLAY_ID = "dw-intervention-overlay";
const REMINDER_ID = "dw-reminder-banner";

let usageInterval = null;
let replayingClick = false;

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
  }
}

function sendUsageTick() {
  if (document.hidden) {
    return;
  }

  chrome.runtime.sendMessage({
    type: "USAGE_TICK",
    domain: currentDomain(),
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
  if (message?.type !== "APPLY_INTERVENTION") {
    return;
  }

  handleIntervention(message.intervention || { mode: "none" });
});

installSlowdownInterceptor();
startTracking();
