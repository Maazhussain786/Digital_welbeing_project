const OVERLAY_ID = "dw-intervention-overlay";
const REMINDER_ID = "dw-reminder-banner";

let usageInterval = null;

function currentDomain() {
  return window.location.hostname || "unknown";
}

function removeElement(id) {
  const el = document.getElementById(id);
  if (el) {
    el.remove();
  }
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
    removeElement(OVERLAY_ID);
  });

  card.appendChild(button);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
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

  const intervention = message.intervention || { mode: "none" };
  if (intervention.mode === "remind") {
    showReminder();
    return;
  }
  if (intervention.mode === "delay") {
    showDelay(Math.max(3, Number(intervention.seconds || 5)));
    return;
  }
  if (intervention.mode === "block") {
    showBlock();
  }
});

startTracking();
