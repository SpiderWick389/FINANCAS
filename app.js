const STORAGE_KEY = "financeiro-casal:v3";
const PROMPT_KEY = "financeiro-casal:last-question";
const THEME_KEY = "financeiro-casal:theme";

const firebaseConfig = window.FINANCEIRO_FIREBASE_CONFIG || {};
const familyId = window.FINANCEIRO_FAMILY_ID || "casal-principal";

const state = {
  settings: {
    monthlyIncome: 0,
    currentBalance: 0,
  },
  entries: [],
  wishlist: [],
};

const cloud = {
  enabled: false,
  ready: false,
  db: null,
  settingsRef: null,
  entriesRef: null,
  wishlistRef: null,
  unsubscribers: [],
};

const els = {
  storageStatus: document.querySelector("#storageStatus"),
  themeToggle: document.querySelector("#themeToggle"),
  heroBalanceAmount: document.querySelector("#heroBalanceAmount"),
  heroMonthChip: document.querySelector("#heroMonthChip"),
  heroPendingCount: document.querySelector("#heroPendingCount"),
  heroBalanceMeta: document.querySelector("#heroBalanceMeta"),
  overviewDonut: document.querySelector("#overviewDonut"),
  overviewCenterAmount: document.querySelector("#overviewCenterAmount"),
  overviewCenterLabel: document.querySelector("#overviewCenterLabel"),
  upcomingList: document.querySelector("#upcomingList"),
  dailyQuestion: document.querySelector("#dailyQuestion"),
  answerYesButton: document.querySelector("#answerYesButton"),
  answerNoButton: document.querySelector("#answerNoButton"),
  newBillButton: document.querySelector("#newBillButton"),
  clearDataButton: document.querySelector("#clearDataButton"),
  settingsForm: document.querySelector("#settingsForm"),
  monthlyIncomeInput: document.querySelector("#monthlyIncomeInput"),
  currentBalanceInput: document.querySelector("#currentBalanceInput"),
  incomeTotal: document.querySelector("#incomeTotal"),
  paidTotal: document.querySelector("#paidTotal"),
  pendingTotal: document.querySelector("#pendingTotal"),
  freeBalanceTotal: document.querySelector("#freeBalanceTotal"),
  freeBalanceHint: document.querySelector("#freeBalanceHint"),
  entryForm: document.querySelector("#entryForm"),
  kindInput: document.querySelector("#kindInput"),
  personInput: document.querySelector("#personInput"),
  descriptionInput: document.querySelector("#descriptionInput"),
  amountInput: document.querySelector("#amountInput"),
  dateInput: document.querySelector("#dateInput"),
  paymentModeInput: document.querySelector("#paymentModeInput"),
  installmentsInput: document.querySelector("#installmentsInput"),
  categoryInput: document.querySelector("#categoryInput"),
  paidNowInput: document.querySelector("#paidNowInput"),
  riskForm: document.querySelector("#riskForm"),
  riskDescriptionInput: document.querySelector("#riskDescriptionInput"),
  riskAmountInput: document.querySelector("#riskAmountInput"),
  riskInstallmentsInput: document.querySelector("#riskInstallmentsInput"),
  riskStartMonthInput: document.querySelector("#riskStartMonthInput"),
  riskResult: document.querySelector("#riskResult"),
  monthFilter: document.querySelector("#monthFilter"),
  monthlyChart: document.querySelector("#monthlyChart"),
  monthEntriesList: document.querySelector("#monthEntriesList"),
  projectionList: document.querySelector("#projectionList"),
  historyList: document.querySelector("#historyList"),
  wishlistForm: document.querySelector("#wishlistForm"),
  wishlistTitleInput: document.querySelector("#wishlistTitleInput"),
  wishlistAmountInput: document.querySelector("#wishlistAmountInput"),
  wishlistPriorityInput: document.querySelector("#wishlistPriorityInput"),
  wishlistList: document.querySelector("#wishlistList"),
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
});

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthKey() {
  return todayKey().slice(0, 7);
}

function parseMoney(value) {
  return Number(String(value || "0").replace(",", ".")) || 0;
}

function money(value) {
  return currency.format(Number(value) || 0);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMonthKey(dateString) {
  return String(dateString || todayKey()).slice(0, 7);
}

function addMonths(dateString, months) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day || 1));
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function monthKeysFrom(baseMonth, count) {
  const [year, month] = baseMonth.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1, 1));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(base);
    date.setUTCMonth(base.getUTCMonth() + index);
    return date.toISOString().slice(0, 7);
  });
}

function monthsBackFrom(baseMonth, count) {
  const [year, month] = baseMonth.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1, 1));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(base);
    date.setUTCMonth(base.getUTCMonth() - (count - 1 - index));
    return date.toISOString().slice(0, 7);
  });
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function daysUntil(dateString) {
  const today = new Date(`${todayKey()}T00:00:00Z`);
  const target = new Date(`${dateString}T00:00:00Z`);
  return Math.round((target - today) / 86400000);
}

function dueLabel(dateString) {
  const days = daysUntil(dateString);
  if (days < 0) return `${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"} atrasado`;
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanha";
  return `${days} dias restantes`;
}

function applyTheme(theme) {
  const selected = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = selected;
  localStorage.setItem(THEME_KEY, selected);
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

function setStorageStatus(text, mode = "") {
  els.storageStatus.textContent = text;
  els.storageStatus.className = `storage-status ${mode}`.trim();
}

function hasFirebaseConfig() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

function loadLocalSnapshot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.settings = {
      monthlyIncome: Number(parsed.settings?.monthlyIncome) || 0,
      currentBalance: Number(parsed.settings?.currentBalance) || 0,
    };
    state.entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    state.wishlist = Array.isArray(parsed.wishlist) ? parsed.wishlist : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveLocalSnapshot() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      settings: state.settings,
      entries: state.entries,
      wishlist: state.wishlist,
    }),
  );
}

function normalizeEntry(entry) {
  return {
    id: entry.id || makeId(),
    groupId: entry.groupId || entry.id || makeId(),
    kind: entry.kind || "Conta",
    person: entry.person || "Casal",
    description: entry.description || "Sem descricao",
    amount: Number(entry.amount) || 0,
    date: entry.date || todayKey(),
    month: entry.month || getMonthKey(entry.date || todayKey()),
    status: entry.status === "paid" ? "paid" : "pending",
    category: entry.category || "Outro",
    installmentNumber: Number(entry.installmentNumber) || 1,
    installments: Number(entry.installments) || 1,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
  };
}

function normalizeWishlist(item) {
  return {
    id: item.id || makeId(),
    title: item.title || "Item",
    amount: Number(item.amount) || 0,
    priority: item.priority || "Media",
    status: item.status === "bought" ? "bought" : "wish",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  };
}

function setupCloudStorage() {
  if (!hasFirebaseConfig()) {
    setStorageStatus("Banco local");
    return;
  }

  if (!window.firebase?.firestore) {
    setStorageStatus("Banco offline", "error");
    return;
  }

  try {
    const app = window.firebase.apps?.length ? window.firebase.app() : window.firebase.initializeApp(firebaseConfig);
    cloud.db = window.firebase.firestore(app);
    cloud.enabled = true;
    cloud.settingsRef = cloud.db.collection("families").doc(familyId).collection("meta").doc("settings");
    cloud.entriesRef = cloud.db.collection("families").doc(familyId).collection("entries");
    cloud.wishlistRef = cloud.db.collection("families").doc(familyId).collection("wishlist");

    setStorageStatus("Conectando banco...");

    cloud.unsubscribers.push(
      cloud.settingsRef.onSnapshot(
        (snapshot) => {
          const data = snapshot.data();
          if (data) {
            state.settings = {
              monthlyIncome: Number(data.monthlyIncome) || 0,
              currentBalance: Number(data.currentBalance) || 0,
            };
            renderSettingsInputs();
          } else if (state.settings.monthlyIncome || state.settings.currentBalance) {
            cloud.settingsRef.set({ ...state.settings, updatedAt: new Date().toISOString() }, { merge: true });
          }
          cloud.ready = true;
          setStorageStatus("Banco em nuvem", "cloud");
          saveLocalSnapshot();
          render();
        },
        handleCloudError,
      ),
    );

    cloud.unsubscribers.push(
      cloud.entriesRef.onSnapshot(
        (snapshot) => {
          state.entries = snapshot.docs.map((doc) => normalizeEntry({ id: doc.id, ...doc.data() }));
          cloud.ready = true;
          setStorageStatus("Banco em nuvem", "cloud");
          saveLocalSnapshot();
          render();
        },
        handleCloudError,
      ),
    );

    cloud.unsubscribers.push(
      cloud.wishlistRef.onSnapshot(
        (snapshot) => {
          state.wishlist = snapshot.docs.map((doc) => normalizeWishlist({ id: doc.id, ...doc.data() }));
          cloud.ready = true;
          setStorageStatus("Banco em nuvem", "cloud");
          saveLocalSnapshot();
          render();
        },
        handleCloudError,
      ),
    );
  } catch (error) {
    console.error(error);
    setStorageStatus("Banco com erro", "error");
  }
}

function handleCloudError(error) {
  console.error(error);
  cloud.enabled = false;
  cloud.ready = false;
  setStorageStatus("Banco com erro", "error");
}

async function saveSettings() {
  saveLocalSnapshot();
  if (!cloud.enabled) return;
  await cloud.settingsRef.set({ ...state.settings, updatedAt: new Date().toISOString() }, { merge: true });
}

async function addEntries(entries) {
  state.entries.push(...entries);
  saveLocalSnapshot();
  render();

  if (!cloud.enabled) return;
  await Promise.all(entries.map((entry) => cloud.entriesRef.doc(entry.id).set(entry)));
}

async function updateEntry(entry) {
  entry.updatedAt = new Date().toISOString();
  saveLocalSnapshot();
  render();

  if (!cloud.enabled) return;
  await cloud.entriesRef.doc(entry.id).set(entry, { merge: true });
}

async function removeEntry(id) {
  state.entries = state.entries.filter((entry) => entry.id !== id);
  saveLocalSnapshot();
  render();

  if (!cloud.enabled) return;
  await cloud.entriesRef.doc(id).delete();
}

async function addWishlistItem(item) {
  state.wishlist.push(item);
  saveLocalSnapshot();
  render();

  if (!cloud.enabled) return;
  await cloud.wishlistRef.doc(item.id).set(item);
}

async function updateWishlistItem(item) {
  item.updatedAt = new Date().toISOString();
  saveLocalSnapshot();
  render();

  if (!cloud.enabled) return;
  await cloud.wishlistRef.doc(item.id).set(item, { merge: true });
}

async function removeWishlistItem(id) {
  state.wishlist = state.wishlist.filter((wish) => wish.id !== id);
  saveLocalSnapshot();
  render();

  if (!cloud.enabled) return;
  await cloud.wishlistRef.doc(id).delete();
}

async function clearAllData() {
  const entriesToDelete = [...state.entries];
  const wishlistToDelete = [...state.wishlist];

  state.settings = { monthlyIncome: 0, currentBalance: 0 };
  state.entries = [];
  state.wishlist = [];
  saveLocalSnapshot();
  renderSettingsInputs();
  render();

  if (!cloud.enabled) return;
  await Promise.all([
    cloud.settingsRef.set({ ...state.settings, updatedAt: new Date().toISOString() }, { merge: true }),
    ...entriesToDelete.map((entry) => cloud.entriesRef.doc(entry.id).delete()),
    ...wishlistToDelete.map((item) => cloud.wishlistRef.doc(item.id).delete()),
  ]);
}

function entriesForMonth(monthKey) {
  return state.entries.filter((entry) => entry.month === monthKey);
}

function totalsFor(entries) {
  return entries.reduce(
    (acc, entry) => {
      acc.total += entry.amount;
      if (entry.status === "paid") acc.paid += entry.amount;
      if (entry.status !== "paid") acc.pending += entry.amount;
      return acc;
    },
    { total: 0, paid: 0, pending: 0 },
  );
}

function renderSummary() {
  const monthEntries = entriesForMonth(els.monthFilter.value);
  const totals = totalsFor(monthEntries);
  const free = state.settings.monthlyIncome - totals.total;
  const projectedBalance = state.settings.currentBalance + free;
  const pendingCount = monthEntries.filter((entry) => entry.status !== "paid").length;

  els.incomeTotal.textContent = money(state.settings.monthlyIncome);
  els.paidTotal.textContent = money(totals.paid);
  els.pendingTotal.textContent = money(totals.pending);
  els.freeBalanceTotal.textContent = money(free);
  els.freeBalanceTotal.style.color = free < 0 ? "var(--danger)" : "var(--ok)";
  els.freeBalanceHint.textContent = free < 0 ? "Mes ficou acima da renda" : "Renda menos compromissos do mes";

  els.heroBalanceAmount.textContent = money(projectedBalance);
  els.heroMonthChip.textContent = monthLabel(els.monthFilter.value);
  els.heroPendingCount.textContent = `${pendingCount} pendente${pendingCount === 1 ? "" : "s"}`;
  els.heroBalanceMeta.textContent =
    free < 0
      ? `Atencao: o mes esta ${money(Math.abs(free))} acima da renda configurada.`
      : `Depois das contas do mes, a sobra prevista e ${money(free)}.`;

  els.overviewCenterAmount.textContent = money(free);
  els.overviewCenterLabel.textContent = free < 0 ? "acima da renda" : "livre no mes";
  renderOverviewDonut(totals, free);
}

function renderOverviewDonut(totals, free) {
  const base = Math.max(state.settings.monthlyIncome, totals.total, 1);
  const paid = Math.min((totals.paid / base) * 100, 100);
  const pending = Math.min((totals.pending / base) * 100, 100 - paid);
  const available = Math.max(100 - paid - pending, 0);
  const paidEnd = paid;
  const pendingEnd = paid + pending;
  const availableEnd = paid + pending + available;
  const gradient =
    totals.total === 0 && state.settings.monthlyIncome === 0
      ? "conic-gradient(var(--accent-4) 0 100%)"
      : `conic-gradient(var(--ok) 0 ${paidEnd}%, var(--danger) ${paidEnd}% ${pendingEnd}%, var(--accent) ${pendingEnd}% ${availableEnd}%, var(--accent-4) ${availableEnd}% 100%)`;

  els.overviewDonut.innerHTML = `
    <div class="donut-ring" style="background: ${gradient}"></div>
    <div class="donut-hole"></div>
  `;
}

function renderMonthlyChart() {
  const months = monthsBackFrom(els.monthFilter.value, 6);
  const dataset = months.map((month) => {
    const totals = totalsFor(entriesForMonth(month));
    return { month, ...totals };
  });
  const max = Math.max(...dataset.map((item) => item.total), 1);

  els.monthlyChart.innerHTML = dataset
    .map((item) => {
      const paidHeight = Math.max(0, (item.paid / max) * 180);
      const pendingHeight = Math.max(0, (item.pending / max) * 180);
      const paidStyle = item.paid > 0 ? `height:${Math.max(3, paidHeight)}px` : "height:0";
      const pendingStyle = item.pending > 0 ? `height:${Math.max(3, pendingHeight)}px` : "height:0";

      return `
        <div class="chart-month" title="${monthLabel(item.month)}: pagas ${money(item.paid)}, pendentes ${money(item.pending)}">
          <div class="chart-stack">
            <div class="chart-segment pending" style="${pendingStyle}"></div>
            <div class="chart-segment paid" style="${paidStyle}"></div>
          </div>
          <div class="chart-label">${monthLabel(item.month)}</div>
          <div class="chart-value">${money(item.total)}</div>
        </div>
      `;
    })
    .join("");
}

function entrySubtitle(entry) {
  const installment = entry.installments > 1 ? ` - ${entry.installmentNumber}/${entry.installments}` : "";
  return `${entry.kind} - ${entry.person} - ${entry.category}${installment}`;
}

function renderAccountItem(entry, compact = false) {
  const statusLabel = entry.status === "paid" ? "Paga" : "Pendente";
  const date = dateFormatter.format(new Date(`${entry.date}T00:00:00Z`));
  return `
    <article class="account-card">
      <div class="account-top">
        <div class="account-main">
          <strong>${escapeHtml(entry.description)}</strong>
          <span>${entrySubtitle(entry)}</span>
        </div>
        <strong class="account-amount">${money(entry.amount)}</strong>
      </div>
      <div class="account-meta">
        <span>${date}</span>
        <span class="pill ${entry.status === "paid" ? "paid" : "pending"}">${statusLabel}</span>
        ${compact ? `<span class="pill neutral">${monthLabel(entry.month)}</span>` : ""}
      </div>
      <div class="entry-actions">
        <button class="small-button" type="button" data-toggle-paid="${entry.id}">
          ${entry.status === "paid" ? "Marcar pendente" : "Marcar paga"}
        </button>
        <button class="small-button danger" type="button" data-delete-entry="${entry.id}">Excluir</button>
      </div>
    </article>
  `;
}

function renderMonthEntries() {
  const entries = entriesForMonth(els.monthFilter.value).sort((a, b) => a.date.localeCompare(b.date));
  if (!entries.length) {
    els.monthEntriesList.innerHTML = '<p class="empty-state">Nenhuma conta registrada neste mes.</p>';
    return;
  }

  els.monthEntriesList.innerHTML = entries.map((entry) => renderAccountItem(entry)).join("");
}

function renderHistory() {
  const entries = [...state.entries].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 18);
  if (!entries.length) {
    els.historyList.innerHTML = '<p class="empty-state">O historico aparece assim que voces registrarem contas, compras ou Pix.</p>';
    return;
  }

  els.historyList.innerHTML = entries
    .map((entry) => {
      const date = dateFormatter.format(new Date(`${entry.date}T00:00:00Z`));
      const sign = entry.status === "paid" ? "-" : "";
      return `
        <article class="history-item">
          <span class="history-avatar">${escapeHtml(entry.kind.slice(0, 1))}</span>
          <div class="history-main">
            <div class="history-copy">
              <strong>${escapeHtml(entry.description)}</strong>
              <span>${date} - ${entrySubtitle(entry)}</span>
            </div>
            <span class="history-amount">${sign}${money(entry.amount)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderUpcomingList() {
  const entries = [...state.entries]
    .filter((entry) => entry.status !== "paid")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 2);

  if (!entries.length) {
    els.upcomingList.innerHTML = '<p class="empty-state">Nenhuma conta pendente agora.</p>';
    return;
  }

  els.upcomingList.innerHTML = entries
    .map((entry, index) => `
      <article class="payment-card ${index === 0 ? "featured" : ""}">
        <div class="payment-head">
          <span class="payment-badge">${escapeHtml(entry.kind.slice(0, 1))}</span>
          <span class="payment-menu">...</span>
        </div>
        <div>
          <h3>${escapeHtml(entry.description)}</h3>
          <div class="payment-price">${money(entry.amount)}<span>${entry.installments > 1 ? `/${entry.installments}x` : ""}</span></div>
        </div>
        <span class="payment-foot">${dueLabel(entry.date)}</span>
      </article>
    `)
    .join("");
}

function renderProjection() {
  const months = monthKeysFrom(els.monthFilter.value, 6);
  let runningBalance = state.settings.currentBalance;

  els.projectionList.innerHTML = months
    .map((month) => {
      const totals = totalsFor(entriesForMonth(month));
      runningBalance += state.settings.monthlyIncome - totals.total;
      const commitment = state.settings.monthlyIncome > 0 ? totals.total / state.settings.monthlyIncome : 0;
      const level = runningBalance < 0 ? "danger" : commitment >= 0.75 ? "warning" : "";

      return `
        <div class="projection-item ${level}">
          <div class="projection-row">
            <strong>${monthLabel(month)}</strong>
            <strong>${money(runningBalance)}</strong>
          </div>
          <div class="projection-row">
            <span>Compromissos: ${money(totals.total)}</span>
            <span>${state.settings.monthlyIncome > 0 ? Math.round(commitment * 100) : 0}% da renda</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderWishlist() {
  const items = [...state.wishlist].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  if (!items.length) {
    els.wishlistList.innerHTML = '<p class="empty-state">Coloque aqui compras que voces querem fazer antes de assumir a parcela.</p>';
    return;
  }

  els.wishlistList.innerHTML = items
    .map((item) => {
      const status = item.status === "bought" ? "Comprado" : "Desejo";
      return `
        <article class="wishlist-item">
          <div class="wishlist-row">
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <span>Prioridade ${escapeHtml(item.priority)} - ${status}</span>
            </div>
            <strong>${money(item.amount)}</strong>
          </div>
          <div class="entry-actions">
            <button class="small-button" type="button" data-prefill-wishlist="${item.id}">Simular/registrar</button>
            <button class="small-button" type="button" data-toggle-wishlist="${item.id}">
              ${item.status === "bought" ? "Voltar para desejo" : "Marcar comprado"}
            </button>
            <button class="small-button danger" type="button" data-delete-wishlist="${item.id}">Excluir</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSettingsInputs() {
  els.monthlyIncomeInput.value = state.settings.monthlyIncome || "";
  els.currentBalanceInput.value = state.settings.currentBalance || "";
}

function render() {
  renderSummary();
  renderMonthlyChart();
  renderMonthEntries();
  renderUpcomingList();
  renderProjection();
  renderHistory();
  renderWishlist();
}

function createEntriesFromForm() {
  const total = parseMoney(els.amountInput.value);
  const installments = els.paymentModeInput.value === "installments" ? Math.max(1, Number(els.installmentsInput.value) || 1) : 1;
  const unit = Math.floor((total / installments) * 100) / 100;
  const groupId = makeId();
  const now = new Date().toISOString();

  return Array.from({ length: installments }, (_, index) => {
    const amount = index === installments - 1 ? Math.round((total - unit * index) * 100) / 100 : unit;
    const date = addMonths(els.dateInput.value, index);
    return normalizeEntry({
      id: makeId(),
      groupId,
      kind: els.kindInput.value,
      person: els.personInput.value,
      description: els.descriptionInput.value.trim(),
      amount,
      date,
      month: getMonthKey(date),
      status: els.paidNowInput.checked && index === 0 ? "paid" : "pending",
      category: els.categoryInput.value,
      installmentNumber: index + 1,
      installments,
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function handleEntrySubmit(event) {
  event.preventDefault();
  const total = parseMoney(els.amountInput.value);
  if (total <= 0) {
    els.amountInput.focus();
    return;
  }

  const entries = createEntriesFromForm();
  els.entryForm.reset();
  els.installmentsInput.value = "1";
  els.dateInput.value = todayKey();
  await addEntries(entries);
}

async function handleSettingsSubmit(event) {
  event.preventDefault();
  state.settings.monthlyIncome = parseMoney(els.monthlyIncomeInput.value);
  state.settings.currentBalance = parseMoney(els.currentBalanceInput.value);
  render();
  await saveSettings();
}

function riskClassFrom(level) {
  if (level === "Alto") return "risk-high";
  if (level === "Medio") return "risk-medium";
  return "risk-low";
}

function analyzeRisk(event) {
  event.preventDefault();
  const total = parseMoney(els.riskAmountInput.value);
  const installments = Math.max(1, Number(els.riskInstallmentsInput.value) || 1);
  const installmentAmount = Math.round((total / installments) * 100) / 100;
  const income = state.settings.monthlyIncome;

  if (total <= 0) return;

  if (income <= 0) {
    els.riskResult.className = "risk-result risk-box risk-medium";
    els.riskResult.innerHTML = `
      <strong>Precisa configurar a renda mensal</strong>
      <span>Sem renda mensal cadastrada, a analise nao consegue dizer se a parcela vai apertar voces.</span>
    `;
    return;
  }

  const months = monthKeysFrom(els.riskStartMonthInput.value, Math.max(6, installments));
  let worstRemaining = Infinity;
  let worstCommitment = 0;
  let worstMonth = months[0];
  const rows = months.map((month, index) => {
    const currentExpenses = totalsFor(entriesForMonth(month)).total;
    const simulatedExpense = index < installments ? installmentAmount : 0;
    const totalExpenses = currentExpenses + simulatedExpense;
    const remaining = income - totalExpenses;
    const commitment = totalExpenses / income;

    if (remaining < worstRemaining) {
      worstRemaining = remaining;
      worstCommitment = commitment;
      worstMonth = month;
    }

    return { month, totalExpenses, remaining, commitment, simulatedExpense };
  });

  let level = "Baixo";
  if (worstRemaining < 0 || worstCommitment >= 0.9) level = "Alto";
  else if (worstCommitment >= 0.7 || worstRemaining <= income * 0.15) level = "Medio";

  const description = els.riskDescriptionInput.value.trim() || "Nova compra";
  const recommendation =
    level === "Alto"
      ? "Essa compra pode prejudicar o caixa. Melhor reduzir o valor, aumentar parcelas, adiar ou quitar outra conta antes."
      : level === "Medio"
        ? "Essa compra cabe, mas deixa pouco respiro. Vale confirmar vencimentos e manter reserva para imprevistos."
        : "A compra parece caber no fluxo atual, considerando as contas ja registradas.";

  els.riskResult.className = `risk-result risk-box ${riskClassFrom(level)}`;
  els.riskResult.innerHTML = `
    <strong>Risco ${level}</strong>
    <span>${escapeHtml(description)} adicionaria ${money(installmentAmount)} por mes durante ${installments} ${installments === 1 ? "mes" : "meses"}.</span>
    <span>Maior aperto previsto em ${monthLabel(worstMonth)}, com sobra de ${money(worstRemaining)}.</span>
    <span>${recommendation}</span>
    <div class="risk-months">
      ${rows
        .slice(0, 6)
        .map(
          (row) => `
            <div>
              <span>${monthLabel(row.month)}</span>
              <strong>${money(row.remaining)} livre</strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

async function toggleEntryStatus(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  entry.status = entry.status === "paid" ? "pending" : "paid";
  await updateEntry(entry);
}

async function handleWishlistSubmit(event) {
  event.preventDefault();
  const title = els.wishlistTitleInput.value.trim();
  if (!title) return;

  const now = new Date().toISOString();
  const item = normalizeWishlist({
    id: makeId(),
    title,
    amount: parseMoney(els.wishlistAmountInput.value),
    priority: els.wishlistPriorityInput.value,
    status: "wish",
    createdAt: now,
    updatedAt: now,
  });

  els.wishlistForm.reset();
  els.wishlistPriorityInput.value = "Media";
  await addWishlistItem(item);
}

async function toggleWishlist(id) {
  const item = state.wishlist.find((wish) => wish.id === id);
  if (!item) return;
  item.status = item.status === "bought" ? "wish" : "bought";
  await updateWishlistItem(item);
}

function prefillWishlist(id) {
  const item = state.wishlist.find((wish) => wish.id === id);
  if (!item) return;
  els.kindInput.value = "Compra";
  els.descriptionInput.value = item.title;
  els.amountInput.value = item.amount || "";
  els.paymentModeInput.value = "installments";
  els.installmentsInput.value = "1";
  els.categoryInput.value = "Pessoal";
  scrollToEntryForm();
}

function hideDailyQuestionForToday() {
  localStorage.setItem(PROMPT_KEY, todayKey());
  els.dailyQuestion.hidden = true;
}

async function clearData() {
  const confirmed = confirm("Apagar todos os dados salvos no financeiro?");
  if (!confirmed) return;
  await clearAllData();
}

function scrollToEntryForm() {
  els.descriptionInput.focus();
  window.scrollTo({ top: els.entryForm.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
}

async function handleListClick(event) {
  const toggleId = event.target.dataset.togglePaid;
  const deleteId = event.target.dataset.deleteEntry;
  const wishToggleId = event.target.dataset.toggleWishlist;
  const wishDeleteId = event.target.dataset.deleteWishlist;
  const wishPrefillId = event.target.dataset.prefillWishlist;

  if (toggleId) await toggleEntryStatus(toggleId);
  if (deleteId) await removeEntry(deleteId);
  if (wishToggleId) await toggleWishlist(wishToggleId);
  if (wishDeleteId) await removeWishlistItem(wishDeleteId);
  if (wishPrefillId) prefillWishlist(wishPrefillId);
}

function bindEvents() {
  els.settingsForm.addEventListener("submit", handleSettingsSubmit);
  els.entryForm.addEventListener("submit", handleEntrySubmit);
  els.riskForm.addEventListener("submit", analyzeRisk);
  els.wishlistForm.addEventListener("submit", handleWishlistSubmit);
  els.monthFilter.addEventListener("input", render);
  els.monthFilter.addEventListener("change", render);

  els.paymentModeInput.addEventListener("change", () => {
    if (els.paymentModeInput.value === "cash") els.installmentsInput.value = "1";
  });

  els.answerYesButton.addEventListener("click", () => {
    hideDailyQuestionForToday();
    scrollToEntryForm();
  });
  els.answerNoButton.addEventListener("click", hideDailyQuestionForToday);
  els.newBillButton.addEventListener("click", scrollToEntryForm);
  els.clearDataButton.addEventListener("click", clearData);
  els.themeToggle.addEventListener("click", toggleTheme);

  [els.monthEntriesList, els.historyList, els.wishlistList].forEach((list) => {
    list.addEventListener("click", handleListClick);
  });
}

function initPrompt() {
  els.dailyQuestion.hidden = localStorage.getItem(PROMPT_KEY) === todayKey();
}

function init() {
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  loadLocalSnapshot();
  renderSettingsInputs();
  els.monthFilter.value = currentMonthKey();
  els.riskStartMonthInput.value = currentMonthKey();
  els.dateInput.value = todayKey();
  bindEvents();
  initPrompt();
  render();
  setupCloudStorage();
}

init();
