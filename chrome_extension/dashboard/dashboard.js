function toMinutes(seconds) {
  return Math.round((seconds || 0) / 60);
}

function render(summary) {
  const usage = summary?.usage || { totalSeconds: 0, domains: {} };

  document.getElementById("dateLabel").textContent = `Date: ${summary?.day || "today"}`;
  document.getElementById("totalTime").textContent = `${toMinutes(usage.totalSeconds)} min`;

  const rows = Object.entries(usage.domains).sort((a, b) => b[1] - a[1]);
  const tbody = document.getElementById("domainTableBody");
  tbody.innerHTML = "";

  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td colspan='2'>No usage tracked yet.</td>";
    tbody.appendChild(tr);
    return;
  }

  rows.forEach(([domain, seconds]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${domain}</td><td>${toMinutes(seconds)}</td>`;
    tbody.appendChild(tr);
  });
}

chrome.runtime.sendMessage({ type: "GET_USAGE_SUMMARY" }, (summary) => {
  render(summary || {});
});
