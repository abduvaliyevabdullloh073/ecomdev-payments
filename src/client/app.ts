import {
  apiErrorKeys,
  formatCalendarDate,
  formatNumber,
  isLanguage,
  isMessageKey,
  languageStorageKey,
  locales,
  resolveLanguage,
  translate,
} from "../shared/i18n.js";
import type {
  Language,
  MessageKey,
  TranslationParams,
} from "../shared/i18n.js";

interface Student {
  id: number;
  name: string;
  phone: string;
  group: string;
  monthlyFee: number;
}
interface Payment {
  id: number;
  studentId: number;
  studentName: string;
  group: string;
  amount: number;
  date: string;
  createdAt: string;
}
interface Debtor {
  studentId: number;
  name: string;
  phone: string;
  group: string;
  monthlyFee: number;
  paid: number;
  debt: number;
}
interface Summary {
  month: string;
  studentCount: number;
  debtorCount: number;
  expected: number;
  collected: number;
  applied: number;
  outstanding: number;
  surplus: number;
}
type Tab = "debtors" | "students" | "payments";

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing interface element: ${id}`);
  return element as T;
};
const t = (key: MessageKey, params: TranslationParams = {}) =>
  translate(language, key, params);
const money = (value: number) => formatNumber(language, value);
const esc = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const icon = (name: string) =>
  `<svg aria-hidden="true"><use href="/assets/icons.svg#${name}"></use></svg>`;
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
const normalize = (value: string) =>
  value
    .toLocaleLowerCase(locales[language])
    .normalize("NFD")
    .replace(/[\u0300-\u036f'‘’ʻʼ`]/g, "");
const monthPattern = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/;
const initialParams = new URLSearchParams(location.search);
const initialTab = initialParams.get("tab");
let language = resolveLanguage(initialParams.get("lang"), readStoredLanguage());
const state: {
  students: Student[];
  payments: Payment[];
  debtors: Debtor[];
  summary: Summary | undefined;
  month: string;
  today: string;
  tab: Tab;
  ready: boolean;
} = {
  students: [],
  payments: [],
  debtors: [],
  summary: undefined,
  month: "",
  today: "",
  tab:
    initialTab === "students" || initialTab === "payments"
      ? initialTab
      : "debtors",
  ready: false,
};
let requestVersion = 0;
let historyVersion = 0;
let editingStudent: number | undefined;
let deletingStudent: number | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let lastLoadError: unknown;
let initializationFailed = false;
let historyData: Payment[] | undefined;
let historyError: unknown;
let toastSource: { key: MessageKey; params: TranslationParams } | undefined;
const formErrors = new Map<string, unknown>();

interface ApiFailure {
  code?: string;
  message?: string;
  messageKey?: string;
  details?: { field: string; message: string; messageKey?: string }[];
}
class ApiError extends Error {
  constructor(
    readonly failure: ApiFailure,
    readonly status: number,
  ) {
    super(failure.message);
  }
}
function readStoredLanguage(): unknown {
  try {
    return localStorage.getItem(languageStorageKey);
  } catch {
    return null;
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
      "Accept-Language": language,
    },
  });
  if (response.status === 204) return undefined as T;
  const body = (await response.json()) as T & { error?: ApiFailure };
  if (!response.ok) {
    throw new ApiError(body.error ?? {}, response.status);
  }
  return body;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const labels: Record<string, string> = {
      name: t("fullName"),
      phone: t("phoneNumber"),
      group: t("group"),
      monthlyFee: t("monthlyFee"),
      studentId: t("student"),
      amount: t("amount"),
      date: t("paymentDate"),
      month: t("reportMonth"),
    };
    const details = error.failure.details
      ?.map((item) => {
        const message = isMessageKey(item.messageKey)
          ? t(item.messageKey)
          : item.message;
        return item.field
          ? `${labels[item.field] ?? item.field}: ${message}`
          : message;
      })
      .join(" ");
    if (details) return details;
    const key = isMessageKey(error.failure.messageKey)
      ? error.failure.messageKey
      : apiErrorKeys[error.failure.code ?? ""];
    return isMessageKey(key)
      ? t(key)
      : error.failure.message || t("requestFailed", { status: error.status });
  }
  if (error instanceof Error && error.name === "TimeoutError")
    return t("timeout");
  if (error instanceof TypeError) return t("networkError");
  return error instanceof Error ? error.message : t("unknownError");
}

function renderToast(): void {
  if (!toastSource) return;
  const params: Record<string, string | number> = {
    ...toastSource.params,
    currency: t("currency"),
  };
  if (typeof params["amount"] === "number")
    params["amount"] = money(params["amount"]);
  $("toast").textContent = t(toastSource.key, params);
}
function toast(
  key: MessageKey,
  params: TranslationParams = {},
  isError = false,
): void {
  const element = $("toast");
  toastSource = { key, params };
  renderToast();
  element.classList.toggle("error-toast", isError);
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    element.hidden = true;
  }, 4500);
}

function renderLoading(): void {
  $("table-content").innerHTML =
    `<div class="loading-state"><span class="loader"></span>${esc(t("loadingData"))}</div>`;
  for (const id of [
    "stat-collected",
    "stat-expected",
    "stat-debt",
    "stat-students",
  ])
    $(id).textContent = "—";
  $("stat-debt-caption").textContent = t("loading");
  $("stat-students-caption").textContent = t("loading");
  $("collection-percent").textContent = "—";
  $("ring-fill").setAttribute("stroke-dasharray", "0 100");
  $("legend-applied").textContent = "—";
  $("legend-outstanding").textContent = "—";
  $("collection-note").textContent = t("loading");
  $("result-count").textContent = t("loading");
  $("recent-payments").innerHTML =
    `<p class="aside-empty">${esc(t("loadingPayments"))}</p>`;
}
function renderLoadFailure(): void {
  $("load-error-text").textContent = errorMessage(lastLoadError);
  $("load-error").hidden = false;
  $("table-content").innerHTML =
    `<div class="empty-state">${icon("info")}<h3>${esc(t(initializationFailed ? "noConnection" : "dataFailed"))}</h3><p>${esc(t(initializationFailed ? "startServer" : "connectionHelp"))}</p></div>`;
  $("result-count").textContent = t("loadingFailed");
  $("recent-payments").innerHTML =
    `<p class="aside-empty">${esc(t("recentFailed"))}</p>`;
  $("collection-note").textContent = t("reportRetry");
}

function persistView(): void {
  const params = new URLSearchParams({
    month: state.month,
    tab: state.tab,
    lang: language,
  });
  history.replaceState(null, "", `/?${params}`);
}

async function loadData(): Promise<void> {
  const version = ++requestVersion;
  const month = state.month;
  state.ready = false;
  lastLoadError = undefined;
  $("table-content").setAttribute("aria-busy", "true");
  renderLoading();
  $("load-error").hidden = true;
  $("add-payment").setAttribute("disabled", "");
  try {
    const [students, debtors, payments, summary] = await Promise.all([
      api<{ students: Student[] }>("/students"),
      api<{ debtors: Debtor[] }>(`/debtors?month=${month}`),
      api<{ payments: Payment[] }>(`/payments?month=${month}`),
      api<Summary>(`/summary?month=${month}`),
    ]);
    if (version !== requestVersion) return;
    state.students = students.students;
    state.debtors = debtors.debtors;
    state.payments = payments.payments;
    state.summary = summary;
    state.ready = true;
    renderGroups();
    renderSummary();
    renderTable();
    renderRecentPayments();
  } catch (error) {
    if (version !== requestVersion) return;
    lastLoadError = error;
    renderLoadFailure();
  } finally {
    if (version === requestVersion) {
      $("table-content").setAttribute("aria-busy", "false");
      $("add-payment").removeAttribute("disabled");
    }
  }
}

function renderGroups(): void {
  const select = $<HTMLSelectElement>("group-filter");
  const selected = select.value;
  const groups = [
    ...new Set(state.students.map((student) => student.group)),
  ].sort((a, b) => a.localeCompare(b, locales[language]));
  select.innerHTML = `<option value="">${esc(t("allGroups"))}</option>${groups.map((group) => `<option value="${esc(group)}">${esc(group)}</option>`).join("")}`;
  select.value = groups.includes(selected) ? selected : "";
}

function renderSummary(): void {
  const summary = state.summary!;
  for (const [id, value] of [
    ["stat-collected", summary.collected],
    ["stat-expected", summary.expected],
    ["stat-debt", summary.outstanding],
  ] as const)
    $(id).innerHTML =
      `<span class="stat-number">${money(value)}</span><small>${esc(t("currency"))}</small>`;
  $("stat-students").innerHTML =
    `${money(summary.studentCount)}<small>${esc(t("peopleUnit"))}</small>`;
  $("stat-debt-caption").textContent = t("debtorCaption", {
    count: summary.debtorCount,
  });
  $("stat-students-caption").textContent = t("settledCaption", {
    count: summary.studentCount - summary.debtorCount,
  });
  $("nav-count").textContent = String(summary.debtorCount);
  const percent =
    summary.expected > 0
      ? Math.min(100, Math.round((summary.applied / summary.expected) * 100))
      : 0;
  $("collection-percent").textContent = `${percent}%`;
  $("ring-fill").setAttribute("stroke-dasharray", `${percent} 100`);
  $("legend-applied").textContent =
    `${money(summary.applied)} ${t("currency")}`;
  $("legend-outstanding").textContent =
    `${money(summary.outstanding)} ${t("currency")}`;
  $("collection-note").textContent =
    summary.surplus > 0
      ? t("surplusNote", {
          amount: money(summary.surplus),
          currency: t("currency"),
        })
      : summary.expected === 0
        ? t("noPlan")
        : t("planNote");
}

function studentCell(id: number, name: string, subtitle: string): string {
  return `<div class="student-cell"><span class="avatar student-avatar avatar-${id % 5}">${esc(initials(name))}</span><span><button type="button" class="student-name" data-action="history" data-id="${id}" title="${esc(t("historyFor", { name }))}">${esc(name)}</button><span class="student-subtitle">${esc(subtitle)}</span></span></div>`;
}
const groupCell = (group: string) =>
  `<td class="group-cell" data-label="${esc(t("group"))}"><span class="group-tag">${esc(group)}</span></td>`;
const amountCell = (key: MessageKey, amount: number, classes = "") =>
  `<td data-label="${esc(t(key, { currency: t("currency") }))}" class="amount ${classes}">${money(amount)}</td>`;

function matches(name: string, phone: string, group: string): boolean {
  const search = normalize($<HTMLInputElement>("search").value.trim());
  const filter = $<HTMLSelectElement>("group-filter").value;
  return (
    (!search || normalize(`${name} ${phone} ${group}`).includes(search)) &&
    (!filter || filter === group)
  );
}

function renderTable(): void {
  if (!state.ready) return;
  const titles = {
    debtors: t("debtors"),
    students: t("students"),
    payments: t("paymentHistory"),
  };
  const descriptions = {
    debtors: t("debtorsDescription"),
    students: t("studentsDescription"),
    payments: t("paymentsDescription"),
  };
  let rows: string[] = [];
  let headers: string[] = [];
  if (state.tab === "debtors") {
    headers = [
      t("student"),
      t("group"),
      t("monthlyFee"),
      t("paid"),
      t("debt"),
      t("action"),
    ];
    rows = state.debtors
      .filter((row) => matches(row.name, row.phone, row.group))
      .map(
        (row) => `<tr>
      <td>${studentCell(row.studentId, row.name, row.phone)}</td>${groupCell(row.group)}
      ${amountCell("monthlyAmount", row.monthlyFee)}${amountCell("paidAmount", row.paid, "paid-amount")}${amountCell("debtAmount", row.debt, "debt-amount")}
      <td class="actions-cell"><button type="button" class="row-pay" data-action="pay" data-id="${row.studentId}" aria-label="${esc(t("payFor", { name: row.name }))}">${esc(t("rowPayment"))}</button></td></tr>`,
      );
  } else if (state.tab === "students") {
    headers = [
      t("student"),
      t("phone"),
      t("group"),
      t("monthlyFee"),
      t("actions"),
    ];
    rows = state.students
      .filter((row) => matches(row.name, row.phone, row.group))
      .map(
        (row) => `<tr>
      <td>${studentCell(row.id, row.name, t("studentReference", { id: row.id }))}</td><td data-label="${esc(t("phone"))}">${esc(row.phone)}</td>${groupCell(row.group)}${amountCell("monthlyAmount", row.monthlyFee, "fee-cell")}
      <td class="actions-cell"><div class="row-actions"><button type="button" class="icon-button" data-action="pay" data-id="${row.id}" aria-label="${esc(t("payFor", { name: row.name }))}" title="${esc(t("addPayment"))}">${icon("plus")}</button><button type="button" class="icon-button" data-action="edit" data-id="${row.id}" aria-label="${esc(t("editFor", { name: row.name }))}" title="${esc(t("edit"))}">${icon("edit")}</button><button type="button" class="icon-button delete-button" data-action="delete" data-id="${row.id}" aria-label="${esc(t("deleteFor", { name: row.name }))}" title="${esc(t("delete"))}">${icon("trash")}</button></div></td></tr>`,
      );
  } else {
    headers = [
      t("student"),
      t("group"),
      t("sumAmount", { currency: t("currency") }),
      t("date"),
    ];
    rows = state.payments
      .filter((row) =>
        matches(
          row.studentName,
          state.students.find((student) => student.id === row.studentId)
            ?.phone ?? "",
          row.group,
        ),
      )
      .map(
        (row) => `<tr>
      <td>${studentCell(row.studentId, row.studentName, t("paymentReference", { id: row.id }))}</td>${groupCell(row.group)}${amountCell("sumAmount", row.amount, "paid-amount amount-cell")}<td data-label="${esc(t("paymentDate"))}">${formatDate(row.date)}</td></tr>`,
      );
  }
  $("table-title").innerHTML =
    `${titles[state.tab]} <span class="count-badge">${rows.length}</span>`;
  $("table-description").textContent = descriptions[state.tab];
  $("breadcrumb-current").textContent = titles[state.tab];
  $("result-count").textContent = t(
    state.tab === "payments" ? "shownPayments" : "shownStudents",
    { count: rows.length },
  );
  $("table-content").setAttribute("aria-labelledby", `tab-${state.tab}`);
  if (rows.length) {
    $("table-content").innerHTML =
      `<div class="table-wrap"><table class="ledger-table ${state.tab}-table"><caption class="sr-only">${titles[state.tab]}, ${state.month}</caption><thead><tr>${headers.map((header) => `<th scope="col">${header}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  } else {
    const filtered = !!(
      $<HTMLInputElement>("search").value ||
      $<HTMLSelectElement>("group-filter").value
    );
    const emptyTitle = filtered
      ? t("noResults")
      : state.tab === "debtors"
        ? state.students.length
          ? t("noDebt")
          : t("startWithStudent")
        : state.tab === "students"
          ? t("noStudents")
          : t("noMonthPayments");
    const emptyDescription = filtered
      ? t("searchHelp")
      : !state.students.length
        ? t("addFirstStudent")
        : state.tab === "debtors"
          ? t("allPaid")
          : t("addFirstPayment");
    $("table-content").innerHTML =
      `<div class="empty-state">${icon(filtered ? "search" : state.tab === "debtors" && state.students.length ? "check" : "book")}<h3>${emptyTitle}</h3><p>${emptyDescription}</p></div>`;
  }
}

function formatDate(date: string): string {
  return formatCalendarDate(language, date);
}

function renderRecentPayments(): void {
  $("recent-payments").innerHTML = state.payments.length
    ? state.payments
        .slice(0, 4)
        .map(
          (payment) =>
            `<div class="activity-item"><span class="activity-icon">${icon("arrow-down")}</span><div class="activity-info"><strong title="${esc(payment.studentName)}">${esc(payment.studentName)}</strong><span>${formatDate(payment.date)}</span></div><span class="activity-amount">+${money(payment.amount)}</span></div>`,
        )
        .join("")
    : `<p class="aside-empty">${esc(t("noRecent"))}</p>`;
}

function changeTab(tab: Tab, focus = false): void {
  state.tab = tab;
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-tab]",
  )) {
    const active = button.dataset["tab"] === tab;
    button.classList.toggle("active", active);
    if (button.getAttribute("role") === "tab") {
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    } else if (button.classList.contains("nav-link")) {
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
  }
  $<HTMLInputElement>("search").value = "";
  $<HTMLSelectElement>("group-filter").value = "";
  renderTable();
  if (state.month) persistView();
  if (focus) $(`tab-${tab}`).focus();
}

function changeMonth(month: string): void {
  if (!monthPattern.test(month)) return;
  state.month = month;
  $<HTMLInputElement>("month").value = month;
  $<HTMLButtonElement>("previous-month").disabled = month === "1000-01";
  $<HTMLButtonElement>("next-month").disabled = month === "9999-12";
  persistView();
  void loadData();
}

function moveMonth(delta: number): void {
  const [year, month] = state.month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  if (date.getUTCFullYear() < 1000 || date.getUTCFullYear() > 9999) return;
  changeMonth(
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
  );
}

function requireData(): boolean {
  if (state.ready) return true;
  toast("loadFirst", {}, true);
  return false;
}

function openPayment(id?: number): void {
  if (!requireData()) return;
  if (!state.students.length) {
    openStudent();
    toast("firstAddStudent");
    return;
  }
  $<HTMLFormElement>("payment-form").reset();
  syncLanguageControls();
  clearFormError("payment-error");
  renderPaymentOptions(id === undefined ? "" : String(id));
  $<HTMLInputElement>("payment-date").value = state.today.startsWith(
    state.month,
  )
    ? state.today
    : `${state.month}-01`;
  if (id !== undefined) fillPaymentAmount(id);
  $<HTMLDialogElement>("payment-dialog").showModal();
}

function renderPaymentOptions(value?: string): void {
  const select = $<HTMLSelectElement>("payment-student");
  const selected = value ?? select.value;
  select.innerHTML =
    `<option value="">${esc(t("selectStudent"))}</option>` +
    [...state.students]
      .sort((a, b) => a.name.localeCompare(b.name, locales[language]))
      .map(
        (student) =>
          `<option value="${student.id}">${esc(student.name)} · ${esc(student.group)}</option>`,
      )
      .join("");
  select.value = selected;
}

function fillPaymentAmount(id: number): void {
  const amount =
    state.debtors.find((row) => row.studentId === id)?.debt ??
    state.students.find((row) => row.id === id)?.monthlyFee;
  $<HTMLInputElement>("payment-amount").value = amount ? String(amount) : "";
}

function openStudent(id?: number): void {
  if (!requireData()) return;
  editingStudent = id;
  $<HTMLFormElement>("student-form").reset();
  syncLanguageControls();
  clearFormError("student-error");
  $("student-dialog-title").textContent =
    id === undefined ? t("addStudent") : t("editStudent");
  if (id !== undefined) {
    const student = state.students.find((row) => row.id === id);
    if (!student) {
      toast("apiStudentNotFound", {}, true);
      return;
    }
    $<HTMLInputElement>("student-name").value = student.name;
    $<HTMLInputElement>("student-phone").value = student.phone;
    $<HTMLInputElement>("student-group").value = student.group;
    $<HTMLInputElement>("student-fee").value = String(student.monthlyFee);
  }
  $<HTMLDialogElement>("student-dialog").showModal();
}

function openDelete(id: number): void {
  const student = state.students.find((row) => row.id === id);
  if (!student) return;
  deletingStudent = id;
  $("delete-name").textContent = student.name;
  clearFormError("delete-error");
  $<HTMLDialogElement>("delete-dialog").showModal();
}

async function openHistory(id: number): Promise<void> {
  const student = state.students.find((row) => row.id === id);
  if (!student) return;
  const version = ++historyVersion;
  $("history-title").textContent = student.name;
  historyData = undefined;
  historyError = undefined;
  renderHistory();
  const dialog = $<HTMLDialogElement>("history-dialog");
  if (!dialog.open) dialog.showModal();
  try {
    const { payments } = await api<{ payments: Payment[] }>(
      `/students/${id}/payments`,
    );
    if (version !== historyVersion || !dialog.open) return;
    historyData = payments;
    renderHistory();
  } catch (error) {
    if (version === historyVersion && dialog.open) {
      historyError = error;
      renderHistory();
    }
  }
}

function renderHistory(): void {
  if (historyError) {
    $("history-content").innerHTML =
      `<div class="form-error">${esc(errorMessage(historyError))}</div>`;
    return;
  }
  if (!historyData) {
    $("history-content").innerHTML =
      `<div class="loading-state"><span class="loader"></span>${esc(t("loading"))}</div>`;
    return;
  }
  const total =
    historyData.reduce(
      (sum, payment) => sum + Math.round(payment.amount * 100),
      0,
    ) / 100;
  $("history-content").innerHTML = historyData.length
    ? `<p class="modal-intro">${esc(t("allMonthHistory", { count: historyData.length }))}</p><ul class="history-list">${historyData.map((payment) => `<li class="history-item"><span>${formatDate(payment.date)} · #${payment.id}</span><strong>${money(payment.amount)} ${esc(t("currency"))}</strong></li>`).join("")}</ul><div class="history-total"><span>${esc(t("totalPaid"))}</span><strong>${money(total)} ${esc(t("currency"))}</strong></div>`
    : `<p class="modal-intro">${esc(t("noStudentPayments"))}</p>`;
}

function setBusy(form: HTMLFormElement, busy: boolean): void {
  form.toggleAttribute("data-busy", busy);
  for (const control of form.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLButtonElement
  >("input, select, button"))
    control.disabled = busy;
}
function formError(id: string, error: unknown): void {
  formErrors.set(id, error);
  $(id).textContent = errorMessage(error);
  $(id).hidden = false;
}
function clearFormError(id: string): void {
  formErrors.delete(id);
  $(id).hidden = true;
}

$("payment-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = $<HTMLFormElement>("payment-form");
  if (form.hasAttribute("data-busy") || !form.reportValidity()) return;
  const input = {
    studentId: Number($<HTMLSelectElement>("payment-student").value),
    amount: Number($<HTMLInputElement>("payment-amount").value),
    date: $<HTMLInputElement>("payment-date").value,
  };
  setBusy(form, true);
  clearFormError("payment-error");
  void (async () => {
    try {
      await api("/payments", { method: "POST", body: JSON.stringify(input) });
      $<HTMLDialogElement>("payment-dialog").close();
      toast("paymentSaved", { amount: input.amount });
      await loadData();
    } catch (error) {
      formError("payment-error", error);
    } finally {
      setBusy(form, false);
    }
  })();
});

$("student-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = $<HTMLFormElement>("student-form");
  if (form.hasAttribute("data-busy") || !form.reportValidity()) return;
  const input = {
    name: $<HTMLInputElement>("student-name").value,
    phone: $<HTMLInputElement>("student-phone").value,
    group: $<HTMLInputElement>("student-group").value,
    monthlyFee: Number($<HTMLInputElement>("student-fee").value),
  };
  const id = editingStudent;
  setBusy(form, true);
  clearFormError("student-error");
  void (async () => {
    try {
      await api(id === undefined ? "/students" : `/students/${id}`, {
        method: id === undefined ? "POST" : "PATCH",
        body: JSON.stringify(input),
      });
      $<HTMLDialogElement>("student-dialog").close();
      toast(id === undefined ? "studentAdded" : "studentUpdated");
      await loadData();
    } catch (error) {
      formError("student-error", error);
    } finally {
      setBusy(form, false);
    }
  })();
});

$("delete-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = $<HTMLFormElement>("delete-form");
  if (form.hasAttribute("data-busy") || deletingStudent === undefined) return;
  const id = deletingStudent;
  setBusy(form, true);
  clearFormError("delete-error");
  void (async () => {
    try {
      await api(`/students/${id}`, { method: "DELETE" });
      $<HTMLDialogElement>("delete-dialog").close();
      deletingStudent = undefined;
      toast("studentDeleted");
      await loadData();
    } catch (error) {
      formError("delete-error", error);
    } finally {
      setBusy(form, false);
    }
  })();
});

document.addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>("button");
  if (!button || button.disabled) return;
  if (button.classList.contains("close-dialog")) {
    button.closest("dialog")?.close();
    return;
  }
  const tab = button.dataset["tab"];
  if (tab === "debtors" || tab === "students" || tab === "payments") {
    changeTab(tab);
    return;
  }
  const action = button.dataset["action"];
  if (!action || !requireData()) return;
  const id = Number(button.dataset["id"]);
  if (action === "pay") openPayment(id);
  if (action === "edit") openStudent(id);
  if (action === "delete") openDelete(id);
  if (action === "history") void openHistory(id);
});

document.querySelector(".tab-strip")!.addEventListener("keydown", (event) => {
  const key = (event as KeyboardEvent).key;
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
  event.preventDefault();
  const tabs: Tab[] = ["debtors", "students", "payments"];
  const index =
    key === "Home"
      ? 0
      : key === "End"
        ? 2
        : (tabs.indexOf(state.tab) + (key === "ArrowRight" ? 1 : 2)) % 3;
  changeTab(tabs[index]!, true);
});
for (const dialog of document.querySelectorAll<HTMLDialogElement>("dialog"))
  dialog.addEventListener("cancel", (event) => {
    if (dialog.querySelector("[data-busy]")) event.preventDefault();
  });
$("add-payment").addEventListener("click", () => openPayment());
$("add-student").addEventListener("click", () => openStudent());
$("payment-student").addEventListener("change", () =>
  fillPaymentAmount(Number($<HTMLSelectElement>("payment-student").value)),
);
$("search").addEventListener("input", renderTable);
$("group-filter").addEventListener("change", renderTable);
$("previous-month").addEventListener("click", () => moveMonth(-1));
$("next-month").addEventListener("click", () => moveMonth(1));
$("month").addEventListener("change", () => {
  const input = $<HTMLInputElement>("month");
  if (monthPattern.test(input.value)) changeMonth(input.value);
  else {
    input.value = state.month;
    toast("chooseValidMonth", {}, true);
  }
});
$("current-month").addEventListener("click", () =>
  changeMonth(state.today.slice(0, 7)),
);
$("refresh").addEventListener("click", () => {
  if (state.month) void loadData();
  else void initialize();
});
$("retry").addEventListener("click", () => {
  if (state.month) void loadData();
  else void initialize();
});

async function initialize(): Promise<void> {
  initializationFailed = false;
  lastLoadError = undefined;
  $("load-error").hidden = true;
  renderLoading();
  try {
    const config = await api<{ today: string }>("/config");
    state.today = config.today;
    const urlMonth = initialParams.get("month");
    changeTab(state.tab);
    changeMonth(
      urlMonth && monthPattern.test(urlMonth)
        ? urlMonth
        : state.today.slice(0, 7),
    );
  } catch (error) {
    initializationFailed = true;
    lastLoadError = error;
    $("table-content").setAttribute("aria-busy", "false");
    renderLoadFailure();
  }
}

function syncLanguageControls(): void {
  for (const control of document.querySelectorAll<HTMLSelectElement>(
    "[data-language-control]",
  ))
    control.value = language;
}

function applyLanguage(next: Language): void {
  language = next;
  try {
    localStorage.setItem(languageStorageKey, language);
  } catch {
    /* The UI also works with storage disabled. */
  }
  document.documentElement.lang = language;
  document.title = t("pageTitle");
  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = element.dataset["i18n"];
    if (isMessageKey(key)) element.textContent = t(key);
  }
  for (const attribute of ["aria-label", "placeholder", "title", "content"]) {
    for (const element of document.querySelectorAll<HTMLElement>(
      `[data-i18n-${attribute}]`,
    )) {
      const key = element.getAttribute(`data-i18n-${attribute}`);
      if (isMessageKey(key)) element.setAttribute(attribute, t(key));
    }
  }
  syncLanguageControls();
  if (state.month) persistView();
  if (state.ready) {
    renderGroups();
    renderSummary();
    renderTable();
    renderRecentPayments();
  } else if (lastLoadError) renderLoadFailure();
  else renderLoading();
  $("student-dialog-title").textContent = t(
    editingStudent === undefined ? "addStudent" : "editStudent",
  );
  if ($<HTMLDialogElement>("payment-dialog").open) renderPaymentOptions();
  if ($<HTMLDialogElement>("history-dialog").open) renderHistory();
  for (const [id, error] of formErrors)
    if (!$(id).hidden) $(id).textContent = errorMessage(error);
  for (const control of document.querySelectorAll<
    HTMLInputElement | HTMLSelectElement
  >("form input, form select")) {
    if (control.validity.customError) localizeValidity(control);
  }
  renderToast();
}

function localizeValidity(control: HTMLInputElement | HTMLSelectElement): void {
  control.setCustomValidity("");
  const validity = control.validity;
  if (validity.valid) return;
  const key: MessageKey = validity.valueMissing
    ? "validationRequired"
    : validity.rangeUnderflow
      ? "validationMinimum"
      : validity.rangeOverflow
        ? "validationMaximumInput"
        : validity.stepMismatch
          ? "validationDecimals"
          : validity.tooShort || validity.tooLong
            ? "validationLength"
            : "validationValue";
  control.setCustomValidity(
    t(key, {
      min: control.getAttribute("min") ?? "",
      max: control.getAttribute("max") ?? "",
    }),
  );
}
document.addEventListener("change", (event) => {
  const control = event.target;
  if (
    control instanceof HTMLSelectElement &&
    control.hasAttribute("data-language-control") &&
    isLanguage(control.value)
  )
    applyLanguage(control.value);
});
document.addEventListener(
  "invalid",
  (event) => {
    const control = event.target;
    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement
    )
      localizeValidity(control);
  },
  true,
);
document.addEventListener("input", (event) => {
  const control = event.target;
  if (
    control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement
  )
    control.setCustomValidity("");
});

applyLanguage(language);
void initialize();
