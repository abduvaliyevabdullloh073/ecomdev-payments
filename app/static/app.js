const $ = (selector, root = document) => root.querySelector(selector);
const state = {
  students: [],
  report: null,
  tab: "debtors",
  today: "",
  loaded: false,
};
const numberFormat = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});
let loadVersion = 0;
let toastTimer;

function element(tag, className = "", text = undefined) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function money(value) {
  // Conversion is for display only. All calculations happen on the server in integer tiyin.
  return numberFormat.format(Number(value));
}

function showMoney(target, value) {
  target.replaceChildren(
    document.createTextNode(money(value)),
    element("small", "", "сум"),
  );
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "Нет связи с сервером. Обновите данные перед повторной отправкой.",
    );
  }
  if (response.status === 204) return null;
  const body = await response.json();
  if (!response.ok) {
    const labels = {
      name: "Имя",
      phone: "Телефон",
      group: "Группа",
      monthly_fee: "Тариф",
      amount: "Сумма",
      date: "Дата",
    };
    const details = body.errors
      ?.map((item) => {
        const field = item.field.split(".").at(-1);
        return `${labels[field] || field}: ${item.message.replace(/^Value error, /, "")}`;
      })
      .join("\n");
    throw new Error(details || body.detail || "Не удалось выполнить запрос.");
  }
  return body;
}

function toast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  toastTimer = setTimeout(() => {
    $("#toast").hidden = true;
  }, 4500);
}

function setBusy(dialog, busy) {
  dialog.dataset.busy = String(busy);
  dialog.querySelectorAll("button, input, select").forEach((node) => {
    node.disabled = busy;
  });
}

function formError(dialog, message = "") {
  const error = $(".form-error", dialog);
  error.textContent = message;
  error.hidden = !message;
}

function openDialog(id) {
  const dialog = $(id);
  if ($(".form-error", dialog)) formError(dialog);
  dialog.showModal();
  return dialog;
}

function normalizeMoney(input, allowZero = false) {
  const value = input.value.trim().replace(",", ".");
  if (
    !/^\d+(\.\d{1,2})?$/.test(value) ||
    Number(value) > 1000000000 ||
    (allowZero ? Number(value) < 0 : Number(value) <= 0)
  ) {
    input.focus();
    throw new Error(
      `Укажите сумму ${allowZero ? "от 0" : "больше 0"} до 1 000 000 000, не более двух знаков после точки.`,
    );
  }
  return value;
}

async function loadData() {
  const version = ++loadVersion;
  const month = $("#month").value;
  state.loaded = false;
  $("#connection-error").hidden = true;
  $("#loading-state").hidden = false;
  $("#empty-state").hidden = true;
  $("#table-container").replaceChildren();
  $("#refresh").disabled = true;
  $("#new-payment").disabled = true;
  $("#records-panel").setAttribute("aria-busy", "true");
  $("#stats").setAttribute("aria-busy", "true");
  for (const name of ["expected", "paid", "debt", "count"])
    $("#stat-" + name).textContent = "—";
  $("#list-hint").textContent = "Загрузка…";
  try {
    const [students, report] = await Promise.all([
      api("/students"),
      api(`/debtors?month=${encodeURIComponent(month)}`),
    ]);
    if (version !== loadVersion) return;
    state.students = students;
    state.report = report;
    state.loaded = true;
    showMoney($("#stat-expected"), report.total_expected);
    showMoney($("#stat-paid"), report.total_paid);
    showMoney($("#stat-debt"), report.total_debt);
    $("#stat-count").textContent = report.debtor_count;
    $("#stat-students").textContent = `Всего учеников: ${report.student_count}`;
    $("#debtors-count").textContent = report.debtor_count;
    $("#students-count").textContent = students.length;
    $("#nav-count").textContent = students.length;
    $("#new-payment").disabled = students.length === 0;
    $("#updated-at").textContent =
      "Обновлено в " +
      new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tashkent",
      });
    renderRows();
  } catch (error) {
    if (version !== loadVersion) return;
    $("#connection-error").textContent =
      error.message + " Нажмите «Обновить данные».";
    $("#connection-error").hidden = false;
    $("#list-hint").textContent = "Данные недоступны";
    $("#updated-at").textContent = "Не удалось обновить данные";
    $("#stat-students").textContent = "Данные недоступны";
  } finally {
    if (version === loadVersion) {
      $("#loading-state").hidden = true;
      $("#refresh").disabled = false;
      $("#records-panel").setAttribute("aria-busy", "false");
      $("#stats").setAttribute("aria-busy", "false");
    }
  }
}

function setTab(tab) {
  state.tab = tab;
  for (const name of ["debtors", "students"]) {
    const active = tab === name;
    const button = $("#tab-" + name);
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  }
  for (const [id, name] of [
    ["#nav-overview", "debtors"],
    ["#nav-students", "students"],
  ]) {
    $(id).classList.toggle("active", tab === name);
    if (tab === name) $(id).setAttribute("aria-current", "page");
    else $(id).removeAttribute("aria-current");
  }
  $("#records-panel").setAttribute("aria-labelledby", "tab-" + tab);
  renderRows();
}

function action(text, className, handler, label) {
  const button = element("button", "action " + className, text);
  button.type = "button";
  button.addEventListener("click", handler);
  if (label) button.setAttribute("aria-label", label);
  return button;
}

function cell(row, label, text, className = "") {
  const td = element("td", className, text);
  td.dataset.label = label;
  row.append(td);
  return td;
}

function renderRows() {
  if (!state.loaded) return;
  const query = $("#search").value.trim().toLocaleLowerCase("ru-RU");
  const source =
    state.tab === "debtors" ? state.report.debtors : state.students;
  const rows = source.filter((student) =>
    `${student.name} ${student.group} ${student.phone}`
      .toLocaleLowerCase("ru-RU")
      .includes(query),
  );
  $("#list-hint").textContent = `Показано ${rows.length} из ${source.length}`;
  const container = $("#table-container");
  container.replaceChildren();
  $("#empty-state").hidden = rows.length > 0;
  if (!rows.length) {
    const noStudents = !state.students.length;
    $("#empty-symbol").textContent = query ? "⌕" : noStudents ? "+" : "✓";
    $("#empty-title").textContent = query
      ? "Никого не нашли"
      : noStudents
        ? "Начнём с первого ученика"
        : "Должников нет";
    $("#empty-description").textContent = query
      ? "Попробуйте другое имя, группу или телефон."
      : noStudents
        ? "Нажмите «Добавить ученика», укажите его группу и месячный тариф."
        : "За выбранный месяц все ученики оплатили обучение. Можно выдохнуть.";
    return;
  }
  const table = element("table", "data-table");
  const caption = element(
    "caption",
    "",
    state.tab === "debtors"
      ? `Должники за ${state.report.month}`
      : "Все ученики",
  );
  caption.hidden = true;
  const thead = element("thead");
  const headRow = element("tr");
  const headings =
    state.tab === "debtors"
      ? ["УЧЕНИК", "ГРУППА", "ТАРИФ", "ОПЛАЧЕНО", "ОСТАТОК", "ДЕЙСТВИЯ"]
      : ["УЧЕНИК", "ГРУППА", "ТАРИФ В МЕСЯЦ", "ДЕЙСТВИЯ"];
  for (const heading of headings) {
    const th = element("th", "", heading);
    th.scope = "col";
    headRow.append(th);
  }
  thead.append(headRow);
  const tbody = element("tbody");
  for (const student of rows) {
    const id = student.student_id ?? student.id;
    const row = element("tr");
    const identity = cell(row, "Ученик", undefined, "identity");
    const person = element("div", "person");
    const initials = student.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toLocaleUpperCase("ru-RU");
    const avatar = element("span", "avatar", initials);
    avatar.setAttribute("aria-hidden", "true");
    const info = element("div");
    const phone = element("a", "person-phone", student.phone);
    phone.href = "tel:" + student.phone.replace(/[^+0-9]/g, "");
    info.append(element("span", "person-name", student.name), phone);
    person.append(avatar, info);
    identity.append(person);
    cell(row, "Группа").append(element("span", "group-pill", student.group));
    cell(row, "Тариф", money(student.monthly_fee), "money-cell");
    if (state.tab === "debtors") {
      cell(row, "Оплачено", money(student.paid), "money-cell");
      cell(row, "Остаток", money(student.debt), "money-cell debt-amount");
    }
    const actions = element("div", "row-actions");
    actions.append(
      action(
        "Оплатить",
        "pay",
        () => openPayment(id),
        `Внести оплату: ${student.name}`,
      ),
    );
    actions.append(
      action(
        "История",
        "",
        () => openHistory(id),
        `История оплат: ${student.name}`,
      ),
    );
    if (state.tab === "students") {
      actions.append(
        action(
          "Изменить",
          "",
          () => openStudent(id),
          `Изменить: ${student.name}`,
        ),
      );
      actions.append(
        action(
          "Удалить",
          "delete",
          () => openDelete(id),
          `Удалить: ${student.name}`,
        ),
      );
    }
    cell(row, "Действия", undefined, "actions-cell").append(actions);
    tbody.append(row);
  }
  table.append(caption, thead, tbody);
  container.append(table);
}

function openPayment(studentId) {
  if (!state.students.length) {
    toast("Сначала добавьте ученика.");
    return;
  }
  $("#payment-form").reset();
  const select = $("#payment-student");
  select.replaceChildren();
  for (const student of state.students) {
    const option = element(
      "option",
      "",
      `#${student.id} · ${student.name} · ${student.group}`,
    );
    option.value = student.id;
    select.append(option);
  }
  if (studentId) select.value = String(studentId);
  const debtor = state.report?.debtors.find(
    (item) => item.student_id === Number(select.value),
  );
  $("#payment-amount").value = debtor?.debt || "";
  const month = $("#month").value;
  $("#payment-date").value =
    month === state.today.slice(0, 7) ? state.today : month + "-01";
  openDialog("#payment-dialog");
}

function openStudent(studentId) {
  const dialog = $("#student-dialog");
  $("#student-form").reset();
  dialog.dataset.studentId = studentId ? String(studentId) : "";
  $("#student-title").textContent = studentId
    ? "Изменить ученика"
    : "Добавить ученика";
  if (studentId) {
    const student = state.students.find((item) => item.id === studentId);
    if (!student) return;
    for (const [id, value] of [
      ["#student-name", student.name],
      ["#student-phone", student.phone],
      ["#student-group", student.group],
      ["#student-fee", student.monthly_fee],
    ])
      $(id).value = value;
  }
  openDialog("#student-dialog");
}

async function openHistory(id) {
  const student = state.students.find((item) => item.id === id);
  if (!student) return;
  const dialog = $("#history-dialog");
  dialog.dataset.studentId = String(id);
  $("#history-title").textContent = student.name;
  $("#history-subtitle").textContent = `${student.group} · ${student.phone}`;
  $("#history-content").replaceChildren(element("p", "form-note", "Загрузка…"));
  openDialog("#history-dialog");
  try {
    const payments = await api(`/students/${id}/payments`);
    if (!dialog.open || dialog.dataset.studentId !== String(id)) return;
    const content = $("#history-content");
    content.replaceChildren();
    if (!payments.length) {
      content.append(
        element("p", "form-note", "У этого ученика пока нет платежей."),
      );
      return;
    }
    const table = element("table", "history-table");
    const thead = element("thead");
    const header = element("tr");
    for (const name of ["Дата", "№", "Сумма, сум"]) {
      const th = element("th", "", name);
      th.scope = "col";
      header.append(th);
    }
    thead.append(header);
    const tbody = element("tbody");
    for (const payment of payments) {
      const row = element("tr");
      for (const text of [
        payment.date.split("-").reverse().join("."),
        `#${payment.id}`,
        money(payment.amount),
      ])
        row.append(element("td", "", text));
      tbody.append(row);
    }
    table.append(thead, tbody);
    content.append(table);
  } catch (error) {
    if (dialog.open && dialog.dataset.studentId === String(id))
      $("#history-content").replaceChildren(
        element("p", "form-error", error.message),
      );
  }
}

function openDelete(id) {
  const student = state.students.find((item) => item.id === id);
  if (!student) return;
  $("#delete-dialog").dataset.studentId = String(id);
  $("#delete-description").textContent = `${student.name} · ${student.group}`;
  openDialog("#delete-dialog");
}

$("#student-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const dialog = $("#student-dialog");
  if (dialog.dataset.busy === "true") return;
  formError(dialog);
  try {
    const data = {
      name: $("#student-name").value,
      phone: $("#student-phone").value,
      group: $("#student-group").value,
      monthly_fee: normalizeMoney($("#student-fee"), true),
    };
    const id = dialog.dataset.studentId;
    setBusy(dialog, true);
    await api(id ? `/students/${id}` : "/students", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data),
    });
    dialog.close();
    toast(id ? "Данные ученика обновлены" : "Ученик добавлен");
    if (!id) {
      $("#search").value = "";
      setTab("students");
    }
    await loadData();
  } catch (error) {
    formError(dialog, error.message);
  } finally {
    setBusy(dialog, false);
  }
});

$("#payment-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const dialog = $("#payment-dialog");
  if (dialog.dataset.busy === "true") return;
  formError(dialog);
  try {
    const id = $("#payment-student").value;
    const data = {
      amount: normalizeMoney($("#payment-amount")),
      date: $("#payment-date").value,
    };
    setBusy(dialog, true);
    await api(`/students/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    dialog.close();
    toast("Платёж сохранён");
    await loadData();
  } catch (error) {
    formError(dialog, error.message);
  } finally {
    setBusy(dialog, false);
  }
});

$("#confirm-delete").addEventListener("click", async () => {
  const dialog = $("#delete-dialog");
  if (dialog.dataset.busy === "true") return;
  setBusy(dialog, true);
  formError(dialog);
  try {
    await api(`/students/${dialog.dataset.studentId}`, { method: "DELETE" });
    dialog.close();
    toast("Ученик и его платежи удалены");
    await loadData();
  } catch (error) {
    formError(dialog, error.message);
  } finally {
    setBusy(dialog, false);
  }
});

document.querySelectorAll("[data-close]").forEach((button) =>
  button.addEventListener("click", () => {
    const dialog = button.closest("dialog");
    if (dialog.dataset.busy !== "true") dialog.close();
  }),
);
document.querySelectorAll("dialog").forEach((dialog) =>
  dialog.addEventListener("cancel", (event) => {
    if (dialog.dataset.busy === "true") event.preventDefault();
  }),
);
$("#new-student").addEventListener("click", () => openStudent());
$("#new-payment").addEventListener("click", () => openPayment());
$("#history-pay").addEventListener("click", () => {
  const id = Number($("#history-dialog").dataset.studentId);
  $("#history-dialog").close();
  openPayment(id);
});
$("#search").addEventListener("input", renderRows);
$("#month").addEventListener("change", () => {
  if ($("#month").validity.valid) loadData();
});
$("#refresh").addEventListener("click", loadData);
$("#nav-overview").addEventListener("click", () => setTab("debtors"));
$("#nav-students").addEventListener("click", () => setTab("students"));
$("#tab-debtors").addEventListener("click", () => setTab("debtors"));
$("#tab-students").addEventListener("click", () => setTab("students"));
$(".tabs").addEventListener("keydown", (event) => {
  if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    const tab =
      event.key === "Home"
        ? "debtors"
        : event.key === "End"
          ? "students"
          : state.tab === "debtors"
            ? "students"
            : "debtors";
    setTab(tab);
    $("#tab-" + tab).focus();
  }
});

async function start() {
  try {
    const config = await api("/config");
    state.today = config.today;
    $("#month").value = config.month;
  } catch {
    // Keep the refresh button useful if the server was temporarily unavailable at startup.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (name) => parts.find((value) => value.type === name).value;
    state.today = `${part("year")}-${part("month")}-${part("day")}`;
    $("#month").value = state.today.slice(0, 7);
  }
  await loadData();
}
start();
