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
  ],
  prayerModeEnabled: true,
  asarTime: "16:45",
  maghribTime: "18:35",
  prayerDurationMin: 15
};

const INTERVENTION_COOLDOWN_MS = 2 * 60 * 1000;
const PASSIVE_INTERVENTION_COOLDOWN_MS = 45 * 1000;
const OVERRIDE_SNOOZE_MS = 15 * 60 * 1000;
const DOMAIN_OVERRIDE_STORE_KEY = "domainIntentOverrides";
const PRAYER_RUNTIME_STORE_KEY = "prayerRuntime";
const PRAYER_ALARM_NAME = "dw-prayer-minute-check";

const lastInterventionByTab = new Map();
const snoozeUntilByTab = new Map();
let focusSprintUntil = 0;

const CRITICAL_DOMAIN_SUFFIXES = [
  "accounts.google.com",
  "pay.google.com",
  "paypal.com",
  "stripe.com",
  "chase.com",
  "bankofamerica.com"
];

const VIDEO_INTENT_DOMAINS = [
  "youtube.com",
  "m.youtube.com"
];

const AI_INTENT_DOMAINS = [
  "chatgpt.com",
  "chat.openai.com",
  "aistudio.google.com",
  "gemini.google.com",
  "claude.ai",
  "copilot.microsoft.com"
];

const STUDY_KEYWORDS = [
  "study",
  "lecture",
  "tutorial",
  "course",
  "assignment",
  "homework",
  "exam",
  "interview prep",
  "coding",
  "programming",
  "python",
  "javascript",
  "math",
  "physics",
  "chemistry",
  "biology",
  "research",
  "paper",
  "documentation",
  "api reference",
  "notes",
  "class"
];

const DISTRACTION_KEYWORDS = [
  "shorts",
  "reel",
  "meme",
  "compilation",
  "prank",
  "reaction",
  "asmr",
  "vlog",
  "highlights",
  "gaming stream",
  "funny",
  "drama",
  "gossip",
  "celebrity",
  "music video"
];

const PRAYER_ENTRIES = [
  { key: "asar", label: "Asar", settingKey: "asarTime" },
  { key: "maghrib", label: "Maghrib", settingKey: "maghribTime" }
];

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

function isCriticalDomain(domain) {
  const normalized = normalizeDomain(domain);
  return CRITICAL_DOMAIN_SUFFIXES.some((suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`));
}

function matchesIntentDomain(domain, candidates) {
  const normalized = normalizeDomain(domain);
  return candidates.some((suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`));
}

function includesAnyKeyword(text, keywords) {
  const lower = (text || "").toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function inferIntentFromContext(domain, pageUrl, pageTitle) {
  const contextText = `${pageTitle || ""} ${pageUrl || ""}`.toLowerCase();
  const isVideoDomain = matchesIntentDomain(domain, VIDEO_INTENT_DOMAINS);
  const isAiDomain = matchesIntentDomain(domain, AI_INTENT_DOMAINS);

  if (!isVideoDomain && !isAiDomain) {
    return { productive: null, source: "no-intent-domain" };
  }

  if (includesAnyKeyword(contextText, STUDY_KEYWORDS)) {
    return { productive: true, source: "study-keywords" };
  }

  if (includesAnyKeyword(contextText, DISTRACTION_KEYWORDS)) {
    return { productive: false, source: "distraction-keywords" };
  }

  if (isAiDomain) {
    return { productive: true, source: "ai-assist-default" };
  }

  if ((pageUrl || "").toLowerCase().includes("/shorts/")) {
    return { productive: false, source: "youtube-shorts" };
  }

  return { productive: null, source: "insufficient-context" };
}

function isTabSnoozed(tabId) {
  if (tabId === undefined) {
    return false;
  }

  const now = Date.now();
  const snoozeUntil = snoozeUntilByTab.get(tabId) || 0;
  return snoozeUntil > now;
}

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTimeToMinutes(timeValue) {
  const match = String(timeValue || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
}

function minutesNow() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function normalizePrayerRuntime(runtime) {
  const next = runtime || {};
  return {
    active: Boolean(next.active),
    prayerKey: typeof next.prayerKey === "string" ? next.prayerKey : "",
    prayerLabel: typeof next.prayerLabel === "string" ? next.prayerLabel : "",
    until: Number(next.until || 0),
    triggeredByDay: typeof next.triggeredByDay === "object" && next.triggeredByDay ? next.triggeredByDay : {}
  };
}

function buildPrayerIntervention(runtime) {
  const until = Number(runtime?.until || 0);
  return {
    mode: "prayer",
    reason: "namaz-window",
    prayerKey: runtime?.prayerKey || "",
    prayerName: runtime?.prayerLabel || "Prayer",
    until,
    secondsRemaining: Math.max(0, Math.ceil((until - Date.now()) / 1000))
  };
}

async function getSettings() {
  const { wellbeingSettings } = await chrome.storage.local.get("wellbeingSettings");
  const merged = { ...DEFAULT_SETTINGS, ...(wellbeingSettings || {}) };
  merged.productiveDomains = parseDomainList(merged.productiveDomains);
  merged.prayerDurationMin = Math.min(15, Math.max(10, Number(merged.prayerDurationMin || 15)));
  return merged;
}

async function setSettings(settings) {
  await chrome.storage.local.set({ wellbeingSettings: settings });
}

async function getDomainOverrides() {
  const { [DOMAIN_OVERRIDE_STORE_KEY]: domainOverrides } = await chrome.storage.local.get(DOMAIN_OVERRIDE_STORE_KEY);
  return domainOverrides || {};
}

async function setDomainOverrides(domainOverrides) {
  await chrome.storage.local.set({ [DOMAIN_OVERRIDE_STORE_KEY]: domainOverrides });
}

async function getPrayerRuntime() {
  const { [PRAYER_RUNTIME_STORE_KEY]: prayerRuntime } = await chrome.storage.local.get(PRAYER_RUNTIME_STORE_KEY);
  return normalizePrayerRuntime(prayerRuntime);
}

async function setPrayerRuntime(prayerRuntime) {
  await chrome.storage.local.set({ [PRAYER_RUNTIME_STORE_KEY]: normalizePrayerRuntime(prayerRuntime) });
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

async function classifyDomainIntent(domain, settings, context = {}) {
  const normalized = normalizeDomain(domain);
  const overrides = await getDomainOverrides();
  const manual = overrides[normalized];

  if (manual && typeof manual.productive === "boolean") {
    return {
      productive: manual.productive,
      source: "manual-override",
      domain: normalized
    };
  }

  if (isCriticalDomain(normalized)) {
    return {
      productive: true,
      source: "critical-domain",
      domain: normalized
    };
  }

  const inferred = inferIntentFromContext(normalized, context.url, context.title);
  if (typeof inferred.productive === "boolean") {
    return {
      productive: inferred.productive,
      source: inferred.source,
      domain: normalized
    };
  }

  const listBased = isProductiveDomain(normalized, settings);
  return {
    productive: listBased,
    source: listBased ? "productive-list" : "default-unproductive",
    domain: normalized
  };
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
  let soft = settings.softLimitMin * factor;
  let hard = settings.hardLimitMin * factor;

  const inFocusSprint = Date.now() < focusSprintUntil;
  if (inFocusSprint) {
    soft = Math.min(soft, 20);
    hard = Math.min(hard, 35);
  }

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

async function ensurePrayerAlarm() {
  await chrome.alarms.create(PRAYER_ALARM_NAME, { periodInMinutes: 1 });
}

async function broadcastPrayerState(runtime) {
  const intervention = runtime.active ? buildPrayerIntervention(runtime) : { mode: "none", reason: "prayer-ended" };
  const tabs = await chrome.tabs.query({});

  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined) {
        return;
      }

      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "APPLY_INTERVENTION",
          intervention
        });
      } catch (_err) {
        // Ignore tabs without content script context.
      }
    })
  );
}

function hasPrayerTriggered(runtime, day, prayerKey) {
  return Boolean(runtime.triggeredByDay?.[day]?.[prayerKey]);
}

function markPrayerTriggered(runtime, day, prayerKey) {
  runtime.triggeredByDay[day] = runtime.triggeredByDay[day] || {};
  runtime.triggeredByDay[day][prayerKey] = true;

  const onlyToday = {};
  onlyToday[day] = runtime.triggeredByDay[day];
  runtime.triggeredByDay = onlyToday;
}

async function activatePrayerLock(runtime, prayer, settings) {
  const now = Date.now();
  const durationMin = Math.min(15, Math.max(10, Number(settings.prayerDurationMin || 15)));
  const day = todayKey();

  runtime.active = true;
  runtime.prayerKey = prayer.key;
  runtime.prayerLabel = prayer.label;
  runtime.until = now + durationMin * 60 * 1000;
  markPrayerTriggered(runtime, day, prayer.key);

  await setPrayerRuntime(runtime);
  await broadcastPrayerState(runtime);
}

async function evaluatePrayerSchedule(settings) {
  const runtime = await getPrayerRuntime();
  const nowTs = Date.now();

  if (runtime.active && runtime.until <= nowTs) {
    runtime.active = false;
    runtime.prayerKey = "";
    runtime.prayerLabel = "";
    runtime.until = 0;
    await setPrayerRuntime(runtime);
    await broadcastPrayerState(runtime);
  }

  if (!settings.prayerModeEnabled) {
    return runtime;
  }

  if (runtime.active && runtime.until > nowTs) {
    return runtime;
  }

  const nowMinutes = minutesNow();
  const day = todayKey();

  for (const prayer of PRAYER_ENTRIES) {
    const scheduled = parseTimeToMinutes(settings[prayer.settingKey]);
    if (scheduled === null) {
      continue;
    }

    const inTriggerWindow = nowMinutes >= scheduled && nowMinutes <= scheduled + 1;
    if (!inTriggerWindow) {
      continue;
    }

    if (hasPrayerTriggered(runtime, day, prayer.key)) {
      continue;
    }

    await activatePrayerLock(runtime, prayer, settings);
    return runtime;
  }

  return runtime;
}

function isPrayerActive(runtime) {
  return Boolean(runtime?.active) && Number(runtime?.until || 0) > Date.now();
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await setSettings(settings);
  await ensurePrayerAlarm();
  await evaluatePrayerSchedule(settings);
});

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  await ensurePrayerAlarm();
  await evaluatePrayerSchedule(settings);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name !== PRAYER_ALARM_NAME) {
    return;
  }

  (async () => {
    const settings = await getSettings();
    await evaluatePrayerSchedule(settings);
  })();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "USAGE_TICK") {
      const domain = normalizeDomain(message.domain || "unknown");
      const seconds = Math.max(1, Number(message.seconds || 5));

      const settings = await getSettings();
      const prayerRuntime = await evaluatePrayerSchedule(settings);

      if (isPrayerActive(prayerRuntime)) {
        const prayerIntervention = buildPrayerIntervention(prayerRuntime);

        if (sender.tab?.id !== undefined) {
          try {
            await chrome.tabs.sendMessage(sender.tab.id, {
              type: "APPLY_INTERVENTION",
              intervention: prayerIntervention
            });
          } catch (_err) {
            // Ignore tab race errors.
          }
        }

        const day = todayKey();
        const usageByDate = await getUsageStore();
        const usage = usageByDate[day] || { totalSeconds: 0, productiveSeconds: 0, unproductiveSeconds: 0, domains: {} };

        sendResponse({
          ok: true,
          usage,
          intervention: prayerIntervention,
          domainIsProductive: true,
          classificationSource: "prayer-mode"
        });
        return;
      }

      const intent = await classifyDomainIntent(domain, settings, {
        url: message.url || "",
        title: message.title || ""
      });

      const usage = await updateUsage(domain, seconds, intent.productive);
      const domainSecondsToday = usage.domains[domain]?.seconds || 0;
      let intervention = evaluateIntervention(
        usage.unproductiveSeconds || 0,
        domainSecondsToday,
        settings,
        intent.productive
      );

      if (isTabSnoozed(sender.tab?.id)) {
        intervention = { mode: "none", reason: "tab-snoozed" };
      }

      if (sender.tab?.id !== undefined && intervention.mode !== "none" && shouldIntervene(sender.tab.id, intervention.mode)) {
        await appendInterventionEvent(domain, intervention);
        await chrome.tabs.sendMessage(sender.tab.id, {
          type: "APPLY_INTERVENTION",
          intervention
        });
      }

      sendResponse({
        ok: true,
        usage,
        intervention,
        domainIsProductive: intent.productive,
        classificationSource: intent.source
      });
      return;
    }

    if (message?.type === "CLASSIFY_CONTEXT") {
      const domain = normalizeDomain(message.domain || "unknown");
      const settings = await getSettings();
      const intent = await classifyDomainIntent(domain, settings, {
        url: message.url || "",
        title: message.title || ""
      });
      sendResponse({ ok: true, ...intent });
      return;
    }

    if (message?.type === "SET_DOMAIN_OVERRIDE" || message?.type === "SET_DOMAIN_INTENT") {
      const domain = normalizeDomain(message.domain || "unknown");
      const productive = Boolean(message.productive);
      const domainOverrides = await getDomainOverrides();
      domainOverrides[domain] = {
        productive,
        updatedAt: new Date().toISOString()
      };
      await setDomainOverrides(domainOverrides);
      sendResponse({ ok: true, domain, productive });
      return;
    }

    if (message?.type === "CLEAR_DOMAIN_OVERRIDE" || message?.type === "CLEAR_DOMAIN_INTENT") {
      const domain = normalizeDomain(message.domain || "unknown");
      const domainOverrides = await getDomainOverrides();
      delete domainOverrides[domain];
      await setDomainOverrides(domainOverrides);
      sendResponse({ ok: true, domain });
      return;
    }

    if (message?.type === "GET_DOMAIN_OVERRIDE" || message?.type === "GET_DOMAIN_INTENT") {
      const domain = normalizeDomain(message.domain || "unknown");
      const domainOverrides = await getDomainOverrides();
      sendResponse({ ok: true, domain, override: domainOverrides[domain] || null });
      return;
    }

    if (message?.type === "GET_PRAYER_STATE") {
      const settings = await getSettings();
      const runtime = await evaluatePrayerSchedule(settings);
      sendResponse({
        ok: true,
        active: isPrayerActive(runtime),
        prayerKey: runtime.prayerKey || "",
        prayerName: runtime.prayerLabel || "",
        until: Number(runtime.until || 0),
        asarTime: settings.asarTime,
        maghribTime: settings.maghribTime,
        durationMin: settings.prayerDurationMin
      });
      return;
    }

    if (message?.type === "GET_FOCUS_STATE") {
      sendResponse({ ok: true, focusSprintUntil, inFocusSprint: Date.now() < focusSprintUntil });
      return;
    }

    if (message?.type === "START_FOCUS_SPRINT") {
      const minutes = Math.max(5, Number(message.minutes || 25));
      focusSprintUntil = Date.now() + minutes * 60 * 1000;
      sendResponse({ ok: true, focusSprintUntil, inFocusSprint: true });
      return;
    }

    if (message?.type === "CANCEL_FOCUS_SPRINT") {
      focusSprintUntil = 0;
      sendResponse({ ok: true, focusSprintUntil, inFocusSprint: false });
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
      const current = await getSettings();
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
        productiveDomains: parseDomainList(message.settings?.productiveDomains),
        prayerModeEnabled: message.settings?.prayerModeEnabled ?? current.prayerModeEnabled,
        asarTime: message.settings?.asarTime ?? current.asarTime,
        maghribTime: message.settings?.maghribTime ?? current.maghribTime,
        prayerDurationMin: Math.min(15, Math.max(10, Number(message.settings?.prayerDurationMin || current.prayerDurationMin || 15)))
      };
      await setSettings(next);
      sendResponse({ ok: true, settings: next });
      return;
    }

    if (message?.type === "USER_OVERRIDE") {
      if (sender.tab?.id !== undefined) {
        snoozeUntilByTab.set(sender.tab.id, Date.now() + OVERRIDE_SNOOZE_MS);
      }
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "unknown-message" });
  })().catch((error) => {
    sendResponse({ ok: false, error: error?.message || "internal-error" });
  });

  return true;
});
