function toMinutes(seconds) {
  return Math.round((seconds || 0) / 60);
}

function normalizeDomainEntries(domains) {
  return Object.entries(domains || {}).map(([domain, value]) => {
    if (typeof value === "number") {
      return { domain, seconds: Number(value || 0), productive: false };
    }

    return {
      domain,
      seconds: Number(value?.seconds || 0),
      productive: Boolean(value?.productive)
    };
  });
}

function setStatus(text, isError = false) {
  const el = document.getElementById("status");
  el.textContent = text;
  el.style.color = isError ? "#b91c1c" : "#334155";
}

function sendRuntimeMessage(message, errorText, onOk) {
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      setStatus(`Background error: ${chrome.runtime.lastError.message}`, true);
      return;
    }

    if (!response?.ok) {
      setStatus(errorText, true);
      return;
    }

    onOk(response);
  });
}

function renderUsage(summary) {
  const usage = summary?.usage || { totalSeconds: 0, domains: {} };
  document.getElementById("dayLabel").textContent = `Date: ${summary?.day || "today"}`;
  document.getElementById("totalTime").textContent = `${toMinutes(usage.totalSeconds)} min`;

  const top = normalizeDomainEntries(usage.domains)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 6);

  const ul = document.getElementById("topDomains");
  ul.innerHTML = "";

  if (!top.length) {
    const li = document.createElement("li");
    li.textContent = "No tracked browsing yet";
    ul.appendChild(li);
    return;
  }

  top.forEach((entry) => {
    const li = document.createElement("li");
    const label = entry.productive ? "productive" : "unproductive";
    li.textContent = `${entry.domain} - ${toMinutes(entry.seconds)} min (${label})`;
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
  sendRuntimeMessage({ type: "GET_USAGE_SUMMARY" }, "Failed to load usage.", (summary) => {
    renderUsage(summary);
  });

  sendRuntimeMessage({ type: "GET_SETTINGS" }, "Failed to load settings.", (res) => {
    renderSettings(res.settings);
  });

  sendRuntimeMessage({ type: "GET_FOCUS_STATE" }, "Failed to load focus sprint state.", (res) => {
    const el = document.getElementById("focusSprintStatus");
    if (!res.inFocusSprint) {
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

  sendRuntimeMessage({ type: "SAVE_SETTINGS", settings: payload }, "Could not save settings.", () => {
    setStatus("Settings saved.");
    refresh();
  });
});

document.getElementById("openDashboardBtn").addEventListener("click", () => {
  const dashboardUrl = chrome.runtime.getURL("dashboard/dashboard.html");
  chrome.tabs.create({ url: dashboardUrl });
});

document.getElementById("startSprintBtn").addEventListener("click", () => {
  sendRuntimeMessage({ type: "START_FOCUS_SPRINT", minutes: 25 }, "Could not start focus sprint.", () => {
    setStatus("Focus sprint started.");
    refresh();
  });
});

document.getElementById("cancelSprintBtn").addEventListener("click", () => {
  sendRuntimeMessage({ type: "CANCEL_FOCUS_SPRINT" }, "Could not cancel focus sprint.", () => {
    setStatus("Focus sprint cancelled.");
    refresh();
  });
});

document.getElementById("resetTodayBtn").addEventListener("click", () => {
  sendRuntimeMessage({ type: "RESET_TODAY" }, "Failed to reset today data.", () => {
    setStatus("Today data reset.");
    refresh();
  });
});

refresh();
