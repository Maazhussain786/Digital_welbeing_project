const DEFAULT_SETTINGS = {
  enabled: true,
  softLimitMin: 45,
  hardLimitMin: 120,
  strictness: "balanced",
  enableGrayFilter: true,
  enableSlowMode: true,
  enableShutterMode: true,
  enableReminders: true,
  productiveDomains: [
    "github.com",
    "docs.google.com",
    "notion.so",
    "stackoverflow.com",
    "wikipedia.org",
    "developer.chrome.com"
  ]
};

const INTERVENTION_COOLDOWN_MS = 2 * 60 * 1000;
const PASSIVE_INTERVENTION_COOLDOWN_MS = 45 * 1000;
const lastInterventionByTab = new Map();

function normalizeDomain(domain) {
  return (domain || "unknown").toLowerCase().replace(/^www\./, "");
}

function parseDomainList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeDomain(String(item))).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => normalizeDomain(item.trim()))
      .filter(Boolean);
  }

  return [...DEFAULT_SETTINGS.productiveDomains];
}

function strictnessFactor(strictness) {
  if (strictness === "strict") {
    return 0.75;
  }
  if (strictness === "relaxed") {
    return 1.25;
  }
  return 1.0;
}

function isProductiveDomain(domain, settings) {
  const normalized = normalizeDomain(domain);
  const productiveDomains = parseDomainList(settings.productiveDomains);
  return productiveDomains.some((allowed) => normalized === allowed || normalized.endsWith(`.${allowed}`));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function getSettings() {
  const { wellbeingSettings } = await chrome.storage.local.get("wellbeingSettings");
  const merged = { ...DEFAULT_SETTINGS, ...(wellbeingSettings || {}) };
  merged.productiveDomains = parseDomainList(merged.productiveDomains);
  return merged;
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

async function getInterventionLog() {
  const { interventionLogByDate } = await chrome.storage.local.get("interventionLogByDate");
  return interventionLogByDate || {};
}

async function setInterventionLog(interventionLogByDate) {
  await chrome.storage.local.set({ interventionLogByDate });
}

function shouldIntervene(tabId, mode) {
  if (!tabId && tabId !== 0) {
    return false;
  }

  const now = Date.now();
  const last = lastInterventionByTab.get(tabId) || 0;
  const cooldown = mode === "gray" || mode === "slow" ? PASSIVE_INTERVENTION_COOLDOWN_MS : INTERVENTION_COOLDOWN_MS;
  if (now - last < cooldown) {
    return false;
  }

  lastInterventionByTab.set(tabId, now);
  return true;
}

function evaluateIntervention(unproductiveSecondsToday, domainSecondsToday, settings, domainIsProductive) {
  if (!settings.enabled) {
    return { mode: "none" };
  }

  if (domainIsProductive) {
    return { mode: "none", reason: "productive-domain" };
  }

  const factor = strictnessFactor(settings.strictness);
  const soft = settings.softLimitMin * factor;
  const hard = settings.hardLimitMin * factor;

  const totalMin = unproductiveSecondsToday / 60;
  const domainMin = domainSecondsToday / 60;

  if (totalMin >= hard + 20) {
    return { mode: "block", reason: "hard-limit-plus" };
  }

  if (totalMin >= hard) {
    if (settings.enableShutterMode) {
      return { mode: "shutter", reason: "hard-limit", holdSeconds: 12 };
    }
    return { mode: "block", reason: "hard-limit" };
  }

  if (totalMin >= soft + 25) {
    return {
      mode: "delay",
      seconds: 12,
      reason: "very-high-usage",
      grayLevel: settings.enableGrayFilter ? 0.95 : 0,
      slowDelayMs: settings.enableSlowMode ? 1600 : 0
    };
  }

  if (totalMin >= soft + 12) {
    return {
      mode: settings.enableSlowMode ? "slow" : "delay",
      seconds: settings.enableSlowMode ? 0 : 6,
      reason: "high-usage",
      grayLevel: settings.enableGrayFilter ? 0.8 : 0,
      slowDelayMs: settings.enableSlowMode ? 1000 : 0
    };
  }

  if (totalMin >= soft) {
    if (settings.enableGrayFilter) {
      return { mode: "gray", reason: "soft-limit", grayLevel: 0.65 };
    }
    if (settings.enableReminders) {
      return { mode: "remind", reason: "soft-limit" };
    }
  }

  if (domainMin >= 10 && totalMin >= soft * 0.5 && settings.enableReminders) {
    return { mode: "remind", reason: "domain-focus" };
  }

  return { mode: "none" };
}

async function updateUsage(domain, seconds, domainIsProductive) {
  const day = todayKey();
  const usageByDate = await getUsageStore();
  usageByDate[day] = usageByDate[day] || {
    totalSeconds: 0,
    productiveSeconds: 0,
    unproductiveSeconds: 0,
    domains: {}
  };

  const dayUsage = usageByDate[day];
  dayUsage.productiveSeconds = dayUsage.productiveSeconds || 0;
  dayUsage.unproductiveSeconds = dayUsage.unproductiveSeconds || 0;
  dayUsage.totalSeconds += seconds;

  if (domainIsProductive) {
    dayUsage.productiveSeconds += seconds;
  } else {
    dayUsage.unproductiveSeconds += seconds;
  }

  const existing = dayUsage.domains[domain];
  if (typeof existing === "number") {
    dayUsage.domains[domain] = {
      seconds: existing + seconds,
      productive: domainIsProductive
    };
  } else {
    const domainUsage = existing || { seconds: 0, productive: domainIsProductive };
    domainUsage.seconds += seconds;
    domainUsage.productive = domainIsProductive;
    dayUsage.domains[domain] = domainUsage;
  }

  await setUsageStore(usageByDate);
  return dayUsage;
}

async function appendInterventionEvent(domain, intervention) {
  if (!intervention || intervention.mode === "none") {
    return;
  }

  const day = todayKey();
  const interventionLogByDate = await getInterventionLog();
  interventionLogByDate[day] = interventionLogByDate[day] || [];

  interventionLogByDate[day].push({
    at: new Date().toISOString(),
    domain,
    mode: intervention.mode,
    reason: intervention.reason || "unspecified"
  });

  if (interventionLogByDate[day].length > 200) {
    interventionLogByDate[day] = interventionLogByDate[day].slice(-200);
  }

  await setInterventionLog(interventionLogByDate);
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await setSettings(settings);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "USAGE_TICK") {
      const domain = normalizeDomain(message.domain || "unknown");
      const seconds = Math.max(1, Number(message.seconds || 5));

      const settings = await getSettings();
      const domainIsProductive = isProductiveDomain(domain, settings);
      const usage = await updateUsage(domain, seconds, domainIsProductive);

      const domainSecondsToday = usage.domains[domain]?.seconds || 0;
      const intervention = evaluateIntervention(
        usage.unproductiveSeconds || 0,
        domainSecondsToday,
        settings,
        domainIsProductive
      );

      if (sender.tab?.id !== undefined && intervention.mode !== "none" && shouldIntervene(sender.tab.id, intervention.mode)) {
        await appendInterventionEvent(domain, intervention);
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "APPLY_INTERVENTION",
          intervention
        });
      }

      sendResponse({ ok: true, usage, intervention, domainIsProductive });
      return;
    }

    if (message?.type === "GET_USAGE_SUMMARY") {
      const day = todayKey();
      const usageByDate = await getUsageStore();
      sendResponse({ ok: true, day, usage: usageByDate[day] || { totalSeconds: 0, domains: {} } });
      return;
    }

    if (message?.type === "GET_INTERVENTION_LOG") {
      const day = todayKey();
      const interventionLogByDate = await getInterventionLog();
      sendResponse({ ok: true, day, entries: interventionLogByDate[day] || [] });
      return;
    }

    if (message?.type === "RESET_TODAY") {
      const day = todayKey();
      const usageByDate = await getUsageStore();
      const interventionLogByDate = await getInterventionLog();

      delete usageByDate[day];
      delete interventionLogByDate[day];

      await setUsageStore(usageByDate);
      await setInterventionLog(interventionLogByDate);
      sendResponse({ ok: true });
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
        hardLimitMin: Math.max(10, Number(message.settings?.hardLimitMin || DEFAULT_SETTINGS.hardLimitMin)),
        strictness: ["balanced", "strict", "relaxed"].includes(message.settings?.strictness)
          ? message.settings.strictness
          : DEFAULT_SETTINGS.strictness,
        enableGrayFilter: message.settings?.enableGrayFilter ?? DEFAULT_SETTINGS.enableGrayFilter,
        enableSlowMode: message.settings?.enableSlowMode ?? DEFAULT_SETTINGS.enableSlowMode,
        enableShutterMode: message.settings?.enableShutterMode ?? DEFAULT_SETTINGS.enableShutterMode,
        enableReminders: message.settings?.enableReminders ?? DEFAULT_SETTINGS.enableReminders,
        productiveDomains: parseDomainList(message.settings?.productiveDomains)
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
