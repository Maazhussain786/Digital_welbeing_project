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
  el.classList.toggle("error", Boolean(isError));
}

function setFocusPill(active) {
  const pill = document.getElementById("focusPill");
  pill.classList.toggle("on", active);
  pill.classList.toggle("off", !active);
  pill.textContent = active ? "Focus on" : "Focus off";
}

function sendRuntimeMessage(message, errorText, onOk, onError) {
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      setStatus(`Background error: ${chrome.runtime.lastError.message}`, true);
      return;
    }

    if (!response?.ok) {
      if (typeof onError === "function" && onError(response) === true) {
        return;
      }
      const detail = response?.error ? ` (${response.error})` : "";
      setStatus(`${errorText}${detail}`, true);
      return;
    }

    onOk(response);
  });
}

function setIntentButtonsDisabled(disabled) {
  document.getElementById("markStudyBtn").disabled = disabled;
  document.getElementById("markDistractBtn").disabled = disabled;
  document.getElementById("clearIntentBtn").disabled = disabled;
}

let currentTabContext = null;

function sourceLabel(source) {
  const labels = {
    "manual-override": "Manual override",
    "study-keywords": "Study keywords",
    "distraction-keywords": "Distraction keywords",
    "ai-assist-default": "AI assistant default",
    "youtube-shorts": "YouTube Shorts",
    "productive-list": "Productive list",
    "default-unproductive": "Default unproductive",
    "critical-domain": "Critical domain"
  };

  return labels[source] || "Auto classification";
}

function renderIntentBadge(intent) {
  const badge = document.getElementById("currentIntentBadge");
  const source = document.getElementById("intentSource");

  badge.classList.remove("is-productive", "is-unproductive", "is-unknown");

  if (typeof intent?.productive !== "boolean") {
    badge.classList.add("is-unknown");
    badge.textContent = "Unknown";
    source.textContent = "Unable to classify";
    return;
  }

  if (intent.productive) {
    badge.classList.add("is-productive");
    badge.textContent = "Study";
  } else {
    badge.classList.add("is-unproductive");
    badge.textContent = "Distraction";
  }

  source.textContent = sourceLabel(intent.source);
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
    li.textContent = "No tracked browsing yet.";
    ul.appendChild(li);
    return;
  }

  top.forEach((entry) => {
    const li = document.createElement("li");
    const kind = entry.productive ? "study" : "distraction";
    li.textContent = `${entry.domain}  -  ${toMinutes(entry.seconds)} min  -  ${kind}`;
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

function getActiveTabContext(onReady) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      setStatus(`Tab lookup failed: ${chrome.runtime.lastError.message}`, true);
      onReady(null);
      return;
    }

    const tab = tabs?.[0];
    if (!tab?.url) {
      onReady(null);
      return;
    }

    try {
      const parsed = new URL(tab.url);
      onReady({
        domain: parsed.hostname.replace(/^www\./, "").toLowerCase(),
        url: tab.url,
        title: tab.title || ""
      });
    } catch (_err) {
      onReady(null);
    }
  });
}

function refreshTabIntent() {
  getActiveTabContext((context) => {
    currentTabContext = context;
    const domainEl = document.getElementById("currentDomain");

    if (!context) {
      domainEl.textContent = "No active web tab";
      setIntentButtonsDisabled(true);
      renderIntentBadge(null);
      return;
    }

    domainEl.textContent = context.domain;
    setIntentButtonsDisabled(false);

    sendRuntimeMessage(
      {
        type: "CLASSIFY_CONTEXT",
        domain: context.domain,
        url: context.url,
        title: context.title
      },
      "Failed to classify current tab.",
      (intent) => {
        renderIntentBadge(intent);
      }
    );
  });
}

function setManualIntentOverride(productive) {
  if (!currentTabContext?.domain) {
    setStatus("Open a website tab first.", true);
    return;
  }

  if (productive === null) {
    sendRuntimeMessage(
      { type: "CLEAR_DOMAIN_OVERRIDE", domain: currentTabContext.domain },
      "Could not clear tab intent.",
      () => {
        setStatus("Auto intent restored for this domain.");
        refreshTabIntent();
      },
      (response) => {
        if (response?.error === "unknown-message") {
          setStatus("Reload extension once, then try Auto again.", true);
          return true;
        }
        return false;
      }
    );
    return;
  }

  sendRuntimeMessage(
    {
      type: "SET_DOMAIN_OVERRIDE",
      domain: currentTabContext.domain,
      productive
    },
    "Could not set manual tab intent.",
    () => {
      setStatus(productive ? "Marked as study domain." : "Marked as distraction domain.");
      refreshTabIntent();
    },
    (response) => {
      if (response?.error === "unknown-message") {
        setStatus("Reload extension once to use manual intent controls.", true);
        return true;
      }
      return false;
    }
  );
}

function refresh() {
  sendRuntimeMessage({ type: "GET_USAGE_SUMMARY" }, "Failed to load usage.", (summary) => {
    renderUsage(summary);
  });

  sendRuntimeMessage({ type: "GET_SETTINGS" }, "Failed to load settings.", (res) => {
    renderSettings(res.settings);
  });

  sendRuntimeMessage({ type: "GET_FOCUS_STATE" }, "Failed to load focus sprint state.", (res) => {
    const el = document.getElementById("focusSprintStatus");
    setFocusPill(Boolean(res.inFocusSprint));
    if (!res.inFocusSprint) {
      el.textContent = "Focus sprint is off.";
      return;
    }

    const until = new Date(res.focusSprintUntil).toLocaleTimeString();
    el.textContent = `Focus sprint active until ${until}`;
  });

  sendRuntimeMessage({ type: "GET_PRAYER_STATE" }, "Failed to load Namaz mode state.", (res) => {
    const el = document.getElementById("prayerStatus");
    if (!res.active) {
      el.textContent = `Namaz mode: Asar ${res.asarTime}, Maghrib ${res.maghribTime}, ${res.durationMin}m lock.`;
      return;
    }

    const until = new Date(res.until).toLocaleTimeString();
    el.textContent = `${res.prayerName} lock active until ${until}.`;
  });

  refreshTabIntent();
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

document.getElementById("markStudyBtn").addEventListener("click", () => {
  setManualIntentOverride(true);
});

document.getElementById("markDistractBtn").addEventListener("click", () => {
  setManualIntentOverride(false);
});

document.getElementById("clearIntentBtn").addEventListener("click", () => {
  setManualIntentOverride(null);
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
