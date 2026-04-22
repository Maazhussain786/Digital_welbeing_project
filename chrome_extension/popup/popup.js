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
}

document.getElementById("saveBtn").addEventListener("click", () => {
  const payload = {
    enabled: document.getElementById("enabled").checked,
    softLimitMin: Number(document.getElementById("soft").value || 45),
    hardLimitMin: Number(document.getElementById("hard").value || 120)
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

refresh();
