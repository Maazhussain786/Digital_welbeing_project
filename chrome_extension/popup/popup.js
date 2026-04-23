function toMinutes(seconds) {
  return Math.round((seconds || 0) / 60);
}

function setStatus(text, isError = false) {
  const el = document.getElementById("status");
  el.textContent = text;
  el.style.color = isError ? "#b91c1c" : "#334155";
}

function renderUsage(summary) {
  const usage = summary?.usage || { totalSeconds: 0, domains: {} };
  document.getElementById("dayLabel").textContent = `Date: ${summary?.day || "today"}`;
  document.getElementById("totalTime").textContent = `${toMinutes(usage.totalSeconds)} min`;

  const top = Object.entries(usage.domains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const ul = document.getElementById("topDomains");
  ul.innerHTML = "";

  if (!top.length) {
    const li = document.createElement("li");
    li.textContent = "No tracked browsing yet";
    ul.appendChild(li);
    return;
  }

  top.forEach(([domain, seconds]) => {
    const li = document.createElement("li");
    li.textContent = `${domain} - ${toMinutes(seconds)} min`;
    ul.appendChild(li);
  });
}

function renderSettings(settings) {
  document.getElementById("enabled").checked = Boolean(settings.enabled);
  document.getElementById("soft").value = Number(settings.softLimitMin || 45);
  document.getElementById("hard").value = Number(settings.hardLimitMin || 120);
  document.getElementById("strictness").value = settings.strictness || "balanced";
  document.getElementById("enableReminders").checked = settings.enableReminders !== false;
  document.getElementById("enableGrayFilter").checked = settings.enableGrayFilter !== false;
  document.getElementById("enableSlowMode").checked = settings.enableSlowMode !== false;
  document.getElementById("enableShutterMode").checked = settings.enableShutterMode !== false;
  document.getElementById("productiveDomains").value = (settings.productiveDomains || []).join(", ");
}

async function refresh() {
  chrome.runtime.sendMessage({ type: "GET_USAGE_SUMMARY" }, (summary) => {
    if (!summary?.ok) {
      setStatus("Failed to load usage.", true);
      return;
    }
    renderUsage(summary);
  });

  chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (res) => {
    if (!res?.ok) {
      setStatus("Failed to load settings.", true);
      return;
    }
    renderSettings(res.settings);
  });

  chrome.runtime.sendMessage({ type: "GET_FOCUS_STATE" }, (res) => {
    const el = document.getElementById("focusSprintStatus");
    if (!res?.ok || !res.inFocusSprint) {
      el.textContent = "Focus sprint is off.";
      return;
    }

    const until = new Date(res.focusSprintUntil).toLocaleTimeString();
    el.textContent = `Focus sprint active until ${until}`;
  });
}

document.getElementById("saveBtn").addEventListener("click", () => {
  const payload = {
    enabled: document.getElementById("enabled").checked,
    softLimitMin: Number(document.getElementById("soft").value || 45),
    hardLimitMin: Number(document.getElementById("hard").value || 120),
    strictness: document.getElementById("strictness").value,
    enableReminders: document.getElementById("enableReminders").checked,
    enableGrayFilter: document.getElementById("enableGrayFilter").checked,
    enableSlowMode: document.getElementById("enableSlowMode").checked,
    enableShutterMode: document.getElementById("enableShutterMode").checked,
    productiveDomains: document.getElementById("productiveDomains").value
  };

  chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings: payload }, (res) => {
    if (!res?.ok) {
      setStatus("Could not save settings.", true);
      return;
    }
    setStatus("Settings saved.");
    refresh();
  });
});

document.getElementById("openDashboardBtn").addEventListener("click", () => {
  const dashboardUrl = chrome.runtime.getURL("dashboard/dashboard.html");
  chrome.tabs.create({ url: dashboardUrl });
});

document.getElementById("startSprintBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "START_FOCUS_SPRINT", minutes: 25 }, (res) => {
    if (!res?.ok) {
      setStatus("Could not start focus sprint.", true);
      return;
    }
    setStatus("Focus sprint started.");
    refresh();
  });
});

document.getElementById("cancelSprintBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CANCEL_FOCUS_SPRINT" }, (res) => {
    if (!res?.ok) {
      setStatus("Could not cancel focus sprint.", true);
      return;
    }
    setStatus("Focus sprint cancelled.");
    refresh();
  });
});

document.getElementById("resetTodayBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "RESET_TODAY" }, (res) => {
    if (!res?.ok) {
      setStatus("Failed to reset today data.", true);
      return;
    }
    setStatus("Today data reset.");
    refresh();
  });
});

refresh();
