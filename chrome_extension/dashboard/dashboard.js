function toMinutes(seconds) {
  return Math.round((seconds || 0) / 60);
}

function normalizeDomainEntries(domains) {
  return Object.entries(domains || {}).map(([domain, value]) => {
    if (typeof value === "number") {
      return { domain, seconds: value, productive: false };
    }

    return {
      domain,
      seconds: Number(value?.seconds || 0),
      productive: Boolean(value?.productive)
    };
  });
}

function render(summary) {
  const usage = summary?.usage || { totalSeconds: 0, productiveSeconds: 0, unproductiveSeconds: 0, domains: {} };
  const productiveSeconds = Number(usage.productiveSeconds || 0);
  const unproductiveSeconds = Number(usage.unproductiveSeconds || 0);

  document.getElementById("dateLabel").textContent = `Date: ${summary?.day || "today"}`;
  document.getElementById("totalTime").textContent = `${toMinutes(usage.totalSeconds)} min`;
  document.getElementById("productiveTime").textContent = `${toMinutes(productiveSeconds)} min`;
  document.getElementById("unproductiveTime").textContent = `${toMinutes(unproductiveSeconds)} min`;

  const rows = normalizeDomainEntries(usage.domains).sort((a, b) => b.seconds - a.seconds);
  const tbody = document.getElementById("domainTableBody");
  tbody.innerHTML = "";

  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='3'>No usage tracked yet.</td>";
    tbody.appendChild(tr);
    return;
  }

  rows.forEach((entry) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${entry.domain}</td><td>${entry.productive ? "productive" : "unproductive"}</td><td>${toMinutes(entry.seconds)}</td>`;
    tbody.appendChild(tr);
  });
}

function renderInterventions(payload) {
  const entries = payload?.entries || [];
  const tbody = document.getElementById("interventionTableBody");
  tbody.innerHTML = "";

  if (!entries.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='4'>No interventions triggered today.</td>";
    tbody.appendChild(tr);
    return;
  }

  entries
    .slice()
    .reverse()
    .slice(0, 40)
    .forEach((item) => {
      const tr = document.createElement("tr");
      const time = new Date(item.at).toLocaleTimeString();
      tr.innerHTML = `<td>${time}</td><td>${item.domain}</td><td>${item.mode}</td><td>${item.reason}</td>`;
      tbody.appendChild(tr);
    });
}

chrome.runtime.sendMessage({ type: "GET_USAGE_SUMMARY" }, (summary) => {
  render(summary || {});
});

chrome.runtime.sendMessage({ type: "GET_INTERVENTION_LOG" }, (payload) => {
  renderInterventions(payload || {});
});
