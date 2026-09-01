const data = window.SCHOOLS_FYI_DATA;
const state = { subject:"Math", grade:"6", tab:"curriculum", selected:[] };

const $ = (selector) => document.querySelector(selector);
const providerById = (id) => data.providers.find((provider) => provider.id === id);

function readUrl() {
  const params = new URLSearchParams(location.search);
  state.subject = data.subjects.includes(params.get("subject")) ? params.get("subject") : "Math";
  state.grade = data.grades.includes(params.get("grade")) ? params.get("grade") : "6";
  const requested = (params.get("compare") || "").split(",").filter(providerById).slice(0, 4);
  state.selected = requested.length ? requested : data.providers.filter((p) => p.default).map((p) => p.id);
}

function syncUrl() {
  const params = new URLSearchParams({ subject:state.subject, grade:state.grade, compare:state.selected.join(",") });
  history.replaceState(null, "", `${location.pathname}?${params}${location.hash}`);
}

function initControls() {
  $("#subject-control").innerHTML = data.subjects.map((subject) => `<button type="button" data-subject="${subject}" class="${state.subject === subject ? "active" : ""}">${subject}</button>`).join("");
  $("#grade-control").innerHTML = data.grades.map((grade) => `<option value="${grade}" ${grade === state.grade ? "selected" : ""}>${grade === "JK" || grade === "SK" ? grade : `Grade ${grade}`}</option>`).join("");
  $("#curriculum-count").textContent = data.providers.filter((p) => p.kind === "curriculum").length;
  $("#school-count").textContent = data.providers.filter((p) => p.kind === "school").length;
  $("#provider-count").textContent = data.providers.length;
}

function renderProviders() {
  const query = $("#provider-search").value.toLowerCase();
  const providers = data.providers.filter((p) => p.kind === state.tab && p.name.toLowerCase().includes(query));
  $("#provider-list").innerHTML = providers.map((p) => `<button class="provider-row ${state.selected.includes(p.id) ? "selected" : ""}" data-provider="${p.id}" aria-pressed="${state.selected.includes(p.id)}"><span class="provider-mark ${p.color}">${p.short}</span><span><strong>${p.name}</strong><small>${p.badge} · ${p.range}</small></span><span class="add-mark">${state.selected.includes(p.id) ? "✓" : "+"}</span></button>`).join("") || `<p class="empty">No providers match that search.</p>`;
}

function availability(provider) {
  const numeric = Number(state.grade);
  if (provider.secondaryOnly && (!numeric || numeric < 9)) return "Not typically mapped to this grade";
  if (provider.minimumGrade && (!numeric || numeric < provider.minimumGrade)) return "Not offered at this grade";
  return provider.summary[state.subject];
}

function renderComparison() {
  const gradeLabel = state.grade === "JK" || state.grade === "SK" ? state.grade : `Grade ${state.grade}`;
  $("#comparison-title").textContent = `${state.subject} · ${gradeLabel}`;
  $("#comparison-grid").innerHTML = state.selected.map((id) => {
    const p = providerById(id); const summary = availability(p); const unavailable = summary.startsWith("Not ");
    return `<article class="comparison-card ${unavailable ? "unavailable" : ""}"><header><span class="provider-mark ${p.color}">${p.short}</span><button data-remove="${p.id}" aria-label="Remove ${p.name}">×</button></header><span class="pill ${p.kind}">${p.badge}</span><h3>${p.name}</h3><p class="native-label">${p.native} · ${gradeLabel}</p><p class="card-summary">${summary}</p><footer><span>${unavailable ? "—" : "Published overview"}</span><a href="${p.url}" target="_blank" rel="noreferrer">View source ↗</a></footer></article>`;
  }).join("") + (state.selected.length < 4 ? `<button class="add-card" id="add-provider"><span>＋</span>Add another provider<small>Up to ${4-state.selected.length} more</small></button>` : "");
}

function render() { syncUrl(); renderProviders(); renderComparison(); }

document.addEventListener("click", (event) => {
  const subject = event.target.closest("[data-subject]");
  if (subject) { state.subject = subject.dataset.subject; initControls(); render(); }
  const tab = event.target.closest("[data-tab]");
  if (tab) { state.tab = tab.dataset.tab; document.querySelectorAll("[data-tab]").forEach((el) => el.setAttribute("aria-selected", el === tab)); renderProviders(); }
  const provider = event.target.closest("[data-provider]");
  if (provider) { const id = provider.dataset.provider; state.selected = state.selected.includes(id) ? state.selected.filter((item) => item !== id) : state.selected.length < 4 ? [...state.selected,id] : state.selected; render(); }
  const remove = event.target.closest("[data-remove]");
  if (remove) { state.selected = state.selected.filter((id) => id !== remove.dataset.remove); render(); }
  if (event.target.closest("#add-provider")) { state.tab = "school"; $("#provider-search").focus(); document.querySelectorAll("[data-tab]").forEach((el) => el.setAttribute("aria-selected", el.dataset.tab === state.tab)); renderProviders(); }
  if (event.target.closest("#clear-button")) { state.selected = data.providers.filter((p) => p.default).map((p) => p.id); render(); }
  if (event.target.closest("#copy-link")) { navigator.clipboard?.writeText(location.href); $("#copy-link").textContent = "Copied!"; setTimeout(() => $("#copy-link").textContent = "Copy view link", 1200); }
});

$("#grade-control").addEventListener("change", (event) => { state.grade = event.target.value; render(); });
$("#provider-search").addEventListener("input", renderProviders);
readUrl(); initControls(); render();
