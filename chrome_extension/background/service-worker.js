const DEFAULT_SETTINGS = {
  enabled: true,
  softLimitMin: 45,
  hardLimitMin: 120
};

const INTERVENTION_COOLDOWN_MS = 5 * 60 * 1000;
const lastInterventionByTab = new Map();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function getSettings() {
  const { wellbeingSettings } = await chrome.storage.local.get("wellbeingSettings");
  return { ...DEFAULT_SETTINGS, ...(wellbeingSettings || {}) };
}

async function setSettings(settings) {
  await chrome.storage.local.set({ wellbeingSettings: settings });
}

async function getUsageStore() {
  const { usageByDate } = await chrome.storage.local.get("usageByDate");
  return usageByDate || {};
}

async function setUsageStore(usageByDate) {
  await chrome.storage.local.set({ usageByDate });
}

function shouldIntervene(tabId) {
  if (!tabId && tabId !== 0) {
    return false;
  }

  const now = Date.now();
  const last = lastInterventionByTab.get(tabId) || 0;
  if (now - last < INTERVENTION_COOLDOWN_MS) {
    return false;
  }

  lastInterventionByTab.set(tabId, now);
  return true;
}

function evaluateIntervention(totalSecondsToday, domainSecondsToday, settings) {
  if (!settings.enabled) {
    return { mode: "none" };
  }

  const totalMin = totalSecondsToday / 60;
  const domainMin = domainSecondsToday / 60;

  if (totalMin >= settings.hardLimitMin) {
    return { mode: "block", reason: "hard-limit" };
  }
  if (totalMin >= settings.softLimitMin + 30) {
    return { mode: "delay", seconds: 15, reason: "very-high-usage" };
  }
  if (totalMin >= settings.softLimitMin + 15) {
    return { mode: "delay", seconds: 10, reason: "high-usage" };
  }
  if (totalMin >= settings.softLimitMin) {
    return { mode: "delay", seconds: 5, reason: "soft-limit" };
  }
  if (domainMin >= 15 && totalMin >= settings.softLimitMin * 0.6) {
    return { mode: "remind", reason: "domain-focus" };
  }

  return { mode: "none" };
}

async function updateUsage(domain, seconds) {
  const day = todayKey();
  const usageByDate = await getUsageStore();
  usageByDate[day] = usageByDate[day] || { totalSeconds: 0, domains: {} };

  const dayUsage = usageByDate[day];
  dayUsage.totalSeconds += seconds;
  dayUsage.domains[domain] = (dayUsage.domains[domain] || 0) + seconds;

  await setUsageStore(usageByDate);
  return dayUsage;
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await setSettings(settings);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "USAGE_TICK") {
      const domain = message.domain || "unknown";
      const seconds = Math.max(1, Number(message.seconds || 5));

      const settings = await getSettings();
      const usage = await updateUsage(domain, seconds);
      const intervention = evaluateIntervention(
        usage.totalSeconds,
        usage.domains[domain] || 0,
        settings
      );

      if (sender.tab?.id !== undefined && intervention.mode !== "none" && shouldIntervene(sender.tab.id)) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "APPLY_INTERVENTION",
          intervention
        });
      }

      sendResponse({ ok: true, usage, intervention });
      return;
    }

    if (message?.type === "GET_USAGE_SUMMARY") {
      const day = todayKey();
      const usageByDate = await getUsageStore();
      sendResponse({ ok: true, day, usage: usageByDate[day] || { totalSeconds: 0, domains: {} } });
      return;
    }

    if (message?.type === "GET_SETTINGS") {
      const settings = await getSettings();
      sendResponse({ ok: true, settings });
      return;
    }

    if (message?.type === "SAVE_SETTINGS") {
      const next = {
        enabled: Boolean(message.settings?.enabled),
        softLimitMin: Math.max(5, Number(message.settings?.softLimitMin || DEFAULT_SETTINGS.softLimitMin)),
        hardLimitMin: Math.max(10, Number(message.settings?.hardLimitMin || DEFAULT_SETTINGS.hardLimitMin))
      };
      await setSettings(next);
      sendResponse({ ok: true, settings: next });
      return;
    }

    if (message?.type === "USER_OVERRIDE") {
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "unknown-message" });
  })();

  return true;
});
