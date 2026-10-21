/** Shared by the browser and HTTP errors. Tuple order: Uzbek, Russian, English. */
export const languages = ["uz", "ru", "en"] as const;
export type Language = (typeof languages)[number];
export const defaultLanguage: Language = "uz";
export const languageStorageKey = "oquv-markaz.language";
export const locales: Record<Language, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};
const languageColumn: Record<Language, 0 | 1 | 2> = { uz: 0, ru: 1, en: 2 };

export const messages = {
  brandName: ["Ecomdev", "Ecomdev", "Ecomdev"],
  pageTitle: ["Ecomdev — To‘lovlar", "Ecomdev — Оплаты", "Ecomdev — Payments"],
  pageDescription: [
    "O‘quv markazi uchun o‘quvchilar, to‘lovlar va oylik qarzdorlik hisobi.",
    "Учёт учеников, оплат и ежемесячной задолженности учебного центра.",
    "Students, payments and monthly balances for an education center.",
  ],
  language: ["Til", "Язык", "Language"],
  skipMain: [
    "Asosiy qismga o‘tish",
    "Перейти к содержимому",
    "Skip to main content",
  ],
  home: ["Ecomdev bosh sahifasi", "Главная Ecomdev", "Ecomdev home"],
  brandTagline: [
    "TO‘LOVLAR BOSHQARUVI",
    "УПРАВЛЕНИЕ ОПЛАТАМИ",
    "PAYMENT MANAGEMENT",
  ],
  workspaceCaption: ["ISH MAYDONI", "РАБОЧАЯ ОБЛАСТЬ", "WORKSPACE"],
  workspace: ["Ish maydoni", "Рабочая область", "Workspace"],
  mainNavigation: [
    "Asosiy navigatsiya",
    "Основная навигация",
    "Main navigation",
  ],
  debtors: ["Qarzdorlar", "Должники", "Debtors"],
  students: ["O‘quvchilar", "Ученики", "Students"],
  paymentHistory: ["To‘lovlar tarixi", "История оплат", "Payment history"],
  payments: ["To‘lovlar", "Оплаты", "Payments"],
  sidebarTitle: [
    "Har bir to‘lov hisobda.",
    "Каждый платёж учтён.",
    "Every payment accounted for.",
  ],
  sidebarText: [
    "Markazingiz moliyasini bir joyda boshqaring.",
    "Управляйте финансами центра в одном месте.",
    "Manage your center’s finances in one place.",
  ],
  educationCenter: ["O‘quv markazi", "Учебный центр", "Education center"],
  administrator: [
    "Administrator paneli",
    "Панель администратора",
    "Administrator panel",
  ],
  financialAccount: [
    "Moliyaviy hisob",
    "Финансовый учёт",
    "Financial overview",
  ],
  pageEyebrow: [
    "MARKAZINGIZNING MOLIYAVIY HOLATI",
    "ФИНАНСОВОЕ СОСТОЯНИЕ ЦЕНТРА",
    "YOUR CENTER’S FINANCIAL OVERVIEW",
  ],
  heading: [
    "To‘lovlar nazoratda",
    "Оплаты под контролем",
    "Payments under control",
  ],
  intro: [
    "O‘quvchilar, to‘lovlar va qarzdorlik — barchasi bir joyda.",
    "Ученики, оплаты и задолженность — всё в одном месте.",
    "Students, payments and balances — all in one place.",
  ],
  addPayment: ["To‘lov qo‘shish", "Добавить оплату", "Add payment"],
  reportPeriod: ["Hisobot davri", "Период отчёта", "Reporting period"],
  reportMonth: ["Hisobot oyi", "Месяц отчёта", "Report month"],
  previousMonth: ["Oldingi oy", "Предыдущий месяц", "Previous month"],
  nextMonth: ["Keyingi oy", "Следующий месяц", "Next month"],
  currentMonth: ["Joriy oy", "Текущий месяц", "Current month"],
  refresh: ["Ma’lumotlarni yangilash", "Обновить данные", "Refresh data"],
  retry: ["Qayta urinish", "Повторить", "Retry"],
  monthlyStats: [
    "Oylik ko‘rsatkichlar",
    "Показатели за месяц",
    "Monthly statistics",
  ],
  collected: ["Kelgan to‘lovlar", "Получено оплат", "Payments received"],
  collectedCaption: [
    "Tanlangan oy uchun tushum",
    "Поступления за выбранный месяц",
    "Receipts for the selected month",
  ],
  expected: ["Kutilayotgan to‘lov", "Ожидаемые оплаты", "Expected payments"],
  expectedCaption: [
    "Barcha o‘quvchilarning oylik summasi",
    "Сумма месячных тарифов учеников",
    "Total monthly student fees",
  ],
  outstanding: ["Jami qarzdorlik", "Общий долг", "Total outstanding"],
  allStudents: [
    "Markazning barcha o‘quvchilari",
    "Все ученики центра",
    "All students at the center",
  ],
  debtorCaption: [
    "{count} nafar o‘quvchida qarzdorlik mavjud",
    "Должников: {count}",
    "Students with an outstanding balance: {count}",
  ],
  settledCaption: [
    "{count} nafarida qarzdorlik yo‘q",
    "Без задолженности: {count}",
    "Students with no outstanding balance: {count}",
  ],
  peopleUnit: ["nafar", "чел.", "total"],
  currency: ["so‘m", "сум", "UZS"],
  debtorsDescription: [
    "Tanlangan oyda to‘lovi yakunlanmagan o‘quvchilar.",
    "Ученики, не полностью оплатившие выбранный месяц.",
    "Students who have not fully paid for the selected month.",
  ],
  studentsDescription: [
    "Markazning barcha o‘quvchilari va oylik to‘lovlari.",
    "Все ученики центра и их месячные тарифы.",
    "All students at the center and their monthly fees.",
  ],
  paymentsDescription: [
    "Tanlangan oyda qayd etilgan barcha to‘lovlar.",
    "Все оплаты, внесённые за выбранный месяц.",
    "All payments recorded for the selected month.",
  ],
  student: ["O‘quvchi", "Ученик", "Student"],
  sectionLabel: ["Hisob bo‘limi", "Раздел учёта", "Accounting section"],
  searchLabel: [
    "Ism, telefon yoki guruh bo‘yicha qidirish",
    "Поиск по имени, телефону или группе",
    "Search by name, phone or group",
  ],
  searchPlaceholder: [
    "Ism, telefon yoki guruh…",
    "Имя, телефон или группа…",
    "Name, phone or group…",
  ],
  groupFilter: [
    "Guruh bo‘yicha saralash",
    "Фильтр по группе",
    "Filter by group",
  ],
  allGroups: ["Barcha guruhlar", "Все группы", "All groups"],
  loadingData: [
    "Ma’lumotlar yuklanmoqda…",
    "Загрузка данных…",
    "Loading data…",
  ],
  initialLoading: [
    "Ma’lumotlar yuklanmoqda",
    "Загрузка данных",
    "Loading data",
  ],
  loading: ["Yuklanmoqda…", "Загрузка…", "Loading…"],
  savedData: ["Saqlangan ma’lumotlar", "Сохранённые данные", "Saved records"],
  reportDetails: ["Hisobot tafsilotlari", "Детали отчёта", "Report details"],
  monthlyCollection: ["Oylik yig‘im", "Сбор за месяц", "Monthly collection"],
  planCompleted: ["reja bajarildi", "плана выполнено", "of target collected"],
  applied: ["Qoplangan", "Покрыто", "Covered"],
  remaining: ["Qolgan", "Осталось", "Remaining"],
  paymentStatus: [
    "Tanlangan oyning to‘lov holati.",
    "Состояние оплат за выбранный месяц.",
    "Payment status for the selected month.",
  ],
  surplusNote: [
    "{amount} {currency} ortiqcha to‘lov bor. U keyingi oyga avtomatik o‘tmaydi.",
    "Переплата: {amount} {currency}. Она не переносится автоматически на следующий месяц.",
    "Overpayment: {amount} {currency}. It does not carry over automatically to the next month.",
  ],
  noPlan: [
    "Oylik to‘lov rejasi hali belgilanmagan.",
    "Месячный план оплат ещё не задан.",
    "No monthly payment target has been set.",
  ],
  planNote: [
    "Har bir o‘quvchining oylik rejasi bo‘yicha hisoblangan.",
    "Рассчитано по месячному тарифу каждого ученика.",
    "Calculated from each student’s monthly fee.",
  ],
  latestPayments: ["Oxirgi to‘lovlar", "Последние оплаты", "Recent payments"],
  thisMonth: ["SHU OY", "ЭТОТ МЕСЯЦ", "THIS MONTH"],
  loadingPayments: [
    "To‘lovlar yuklanmoqda…",
    "Загрузка оплат…",
    "Loading payments…",
  ],
  viewAll: ["Barcha to‘lovlarni ko‘rish", "Все оплаты", "View all payments"],
  separateMonths: [
    "Qarzdorlik har bir oy uchun alohida hisoblanadi.",
    "Задолженность рассчитывается отдельно для каждого месяца.",
    "Outstanding balances are calculated separately for each month.",
  ],
  footer: [
    "Tartibli hisob. Xotirjam boshqaruv.",
    "Точный учёт. Спокойное управление.",
    "Organized accounts. Confident management.",
  ],
  newOperation: ["YANGI OPERATSIYA", "НОВАЯ ОПЕРАЦИЯ", "NEW TRANSACTION"],
  close: ["Yopish", "Закрыть", "Close"],
  paymentIntro: [
    "To‘lov o‘quvchi hisobiga darhol yoziladi.",
    "Оплата сразу записывается на счёт ученика.",
    "The payment is recorded against the student immediately.",
  ],
  selectStudent: ["O‘quvchini tanlang", "Выберите ученика", "Select a student"],
  amount: ["Summa", "Сумма", "Amount"],
  paymentDate: ["To‘lov sanasi", "Дата оплаты", "Payment date"],
  paymentDateHelp: [
    "To‘lov sanasi qaysi oyga tegishli bo‘lsa, o‘sha oy hisobotiga kiritiladi.",
    "Оплата учитывается в отчёте за месяц, к которому относится её дата.",
    "The payment is included in the report for the month of its payment date.",
  ],
  cancel: ["Bekor qilish", "Отмена", "Cancel"],
  savePayment: ["To‘lovni saqlash", "Сохранить оплату", "Save payment"],
  studentDetails: [
    "O‘QUVCHI MA’LUMOTLARI",
    "ДАННЫЕ УЧЕНИКА",
    "STUDENT DETAILS",
  ],
  addStudent: ["O‘quvchi qo‘shish", "Добавить ученика", "Add student"],
  editStudent: [
    "O‘quvchini tahrirlash",
    "Редактировать ученика",
    "Edit student",
  ],
  fullName: ["Ism va familiya", "Имя и фамилия", "Full name"],
  exampleName: [
    "Masalan, Aziz Karimov",
    "Например, Aziz Karimov",
    "For example, Aziz Karimov",
  ],
  phoneNumber: ["Telefon raqami", "Номер телефона", "Phone number"],
  group: ["Guruh", "Группа", "Group"],
  monthlyFee: ["Oylik to‘lov", "Месячный тариф", "Monthly fee"],
  feeChangeHelp: [
    "Oylik to‘lov o‘zgarsa, oldingi oylar hisobotlari ham yangi summa bilan hisoblanadi.",
    "При изменении тарифа отчёты за прошлые месяцы также пересчитываются по новой сумме.",
    "Changing the monthly fee also recalculates previous months using the new amount.",
  ],
  save: ["Saqlash", "Сохранить", "Save"],
  deleteStudent: ["O‘quvchini o‘chirish", "Удалить ученика", "Delete student"],
  deleteWarning: [
    "va uning barcha to‘lovlari o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.",
    "и все связанные оплаты будут удалены. Это действие нельзя отменить.",
    "and all associated payments will be deleted. This action cannot be undone.",
  ],
  delete: ["O‘chirish", "Удалить", "Delete"],
  historyEyebrow: ["TO‘LOVLAR TARIXI", "ИСТОРИЯ ОПЛАТ", "PAYMENT HISTORY"],
  paid: ["To‘langan", "Оплачено", "Paid"],
  debt: ["Qarzdorlik", "Долг", "Outstanding"],
  action: ["Amal", "Действие", "Action"],
  actions: ["Amallar", "Действия", "Actions"],
  phone: ["Telefon", "Телефон", "Phone"],
  date: ["Sana", "Дата", "Date"],
  monthlyAmount: [
    "Oylik · {currency}",
    "Тариф · {currency}",
    "Monthly · {currency}",
  ],
  paidAmount: [
    "To‘langan · {currency}",
    "Оплачено · {currency}",
    "Paid · {currency}",
  ],
  debtAmount: ["Qarz · {currency}", "Долг · {currency}", "Due · {currency}"],
  sumAmount: [
    "Summa · {currency}",
    "Сумма · {currency}",
    "Amount · {currency}",
  ],
  rowPayment: ["+ To‘lov", "+ Оплата", "+ Payment"],
  payFor: ["{name} uchun to‘lov", "Оплата за: {name}", "Payment for {name}"],
  editFor: [
    "{name} ma’lumotlarini tahrirlash",
    "Редактировать: {name}",
    "Edit {name}",
  ],
  deleteFor: ["{name}ni o‘chirish", "Удалить: {name}", "Delete {name}"],
  historyFor: [
    "{name} — to‘lovlar tarixi",
    "{name} — история оплат",
    "{name} — payment history",
  ],
  edit: ["Tahrirlash", "Редактировать", "Edit"],
  studentReference: ["O‘quvchi #{id}", "Ученик #{id}", "Student #{id}"],
  paymentReference: ["To‘lov #{id}", "Оплата #{id}", "Payment #{id}"],
  shownStudents: [
    "{count} ta o‘quvchi ko‘rsatilmoqda",
    "Показано учеников: {count}",
    "Students shown: {count}",
  ],
  shownPayments: [
    "{count} ta to‘lov ko‘rsatilmoqda",
    "Показано оплат: {count}",
    "Payments shown: {count}",
  ],
  noResults: ["Natija topilmadi", "Ничего не найдено", "No results found"],
  noDebt: ["Qarzdorlik yo‘q", "Задолженности нет", "No outstanding balances"],
  startWithStudent: [
    "O‘quvchi qo‘shishdan boshlang",
    "Начните с добавления ученика",
    "Start by adding a student",
  ],
  noStudents: ["Hali o‘quvchilar yo‘q", "Учеников пока нет", "No students yet"],
  noMonthPayments: [
    "Bu oyda to‘lovlar yo‘q",
    "В этом месяце оплат нет",
    "No payments this month",
  ],
  searchHelp: [
    "Boshqa ism kiriting yoki guruh filtrini o‘zgartiring.",
    "Введите другое имя или измените фильтр группы.",
    "Try another name or change the group filter.",
  ],
  addFirstStudent: [
    "«+ O‘quvchi» tugmasi orqali birinchi o‘quvchini qo‘shing.",
    "Добавьте первого ученика кнопкой «+ Ученик».",
    "Use the “+ Student” button to add your first student.",
  ],
  allPaid: [
    "Barcha o‘quvchilar tanlangan oy to‘lovini to‘liq bajargan.",
    "Все ученики полностью оплатили выбранный месяц.",
    "All students have fully paid for the selected month.",
  ],
  addFirstPayment: [
    "Yuqoridagi tugma orqali yangi to‘lov kiriting.",
    "Добавьте оплату с помощью кнопки выше.",
    "Use the button above to record a payment.",
  ],
  noRecent: [
    "Shu oy uchun hali to‘lov kiritilmagan.",
    "За этот месяц ещё нет оплат.",
    "No payments have been recorded for this month.",
  ],
  noStudentPayments: [
    "Bu o‘quvchi uchun hali to‘lov kiritilmagan.",
    "У этого ученика пока нет оплат.",
    "No payments have been recorded for this student.",
  ],
  allMonthHistory: [
    "Barcha oylardagi to‘lovlar · {count} ta yozuv",
    "Оплаты за все месяцы · записей: {count}",
    "Payments across all months · records: {count}",
  ],
  totalPaid: ["Jami to‘langan", "Всего оплачено", "Total paid"],
  paymentSaved: [
    "{amount} {currency} to‘lov saqlandi.",
    "Оплата {amount} {currency} сохранена.",
    "Payment of {amount} {currency} saved.",
  ],
  studentAdded: ["O‘quvchi qo‘shildi.", "Ученик добавлен.", "Student added."],
  studentUpdated: [
    "O‘quvchi ma’lumotlari yangilandi.",
    "Данные ученика обновлены.",
    "Student details updated.",
  ],
  studentDeleted: [
    "O‘quvchi va uning to‘lovlari o‘chirildi.",
    "Ученик и его оплаты удалены.",
    "Student and associated payments deleted.",
  ],
  firstAddStudent: [
    "Avval o‘quvchi qo‘shing.",
    "Сначала добавьте ученика.",
    "Add a student first.",
  ],
  loadFirst: [
    "Avval ma’lumotlarni yuklang yoki sahifani yangilang.",
    "Сначала загрузите данные или обновите страницу.",
    "Load the data or refresh the page first.",
  ],
  chooseValidMonth: [
    "Hisobot uchun haqiqiy oyni tanlang.",
    "Выберите корректный месяц отчёта.",
    "Select a valid report month.",
  ],
  dataFailed: [
    "Ma’lumotlar yuklanmadi",
    "Не удалось загрузить данные",
    "Could not load data",
  ],
  recentFailed: [
    "Ma’lumotlar yuklanmadi.",
    "Данные не загружены.",
    "Data could not be loaded.",
  ],
  connectionHelp: [
    "Server bilan ulanishni tekshiring va «Qayta urinish» tugmasini bosing.",
    "Проверьте соединение с сервером и нажмите «Повторить».",
    "Check the server connection and select “Retry”.",
  ],
  loadingFailed: ["Yuklashda xato", "Ошибка загрузки", "Loading failed"],
  reportRetry: [
    "Hisobotni olish uchun qayta urinib ko‘ring.",
    "Повторите запрос, чтобы получить отчёт.",
    "Retry to load the report.",
  ],
  noConnection: [
    "Server bilan aloqa yo‘q",
    "Нет связи с сервером",
    "Cannot connect to server",
  ],
  startServer: [
    "Serverni ishga tushirib, qayta urinib ko‘ring.",
    "Запустите сервер и повторите попытку.",
    "Start the server and try again.",
  ],
  timeout: [
    "Server javobi kutilmoqda. Ulanishni tekshirib, qayta urinib ko‘ring.",
    "Сервер не ответил вовремя. Проверьте соединение и повторите попытку.",
    "The server took too long to respond. Check the connection and try again.",
  ],
  networkError: [
    "Server bilan aloqa yo‘q. Server ishga tushganini tekshiring.",
    "Нет связи с сервером. Проверьте, что сервер запущен.",
    "Cannot connect to the server. Check that it is running.",
  ],
  unknownError: [
    "Noma’lum xato. Qayta urinib ko‘ring.",
    "Неизвестная ошибка. Повторите попытку.",
    "An unknown error occurred. Please try again.",
  ],
  requestFailed: [
    "So‘rov bajarilmadi ({status}).",
    "Запрос не выполнен ({status}).",
    "Request failed ({status}).",
  ],
  apiValidation: [
    "Yuborilgan ma’lumotlarni tekshiring.",
    "Проверьте отправленные данные.",
    "Please check the submitted data.",
  ],
  apiStudentNotFound: [
    "O‘quvchi topilmadi.",
    "Ученик не найден.",
    "Student not found.",
  ],
  apiNotFound: ["Manzil topilmadi.", "Адрес не найден.", "Address not found."],
  apiOrigin: [
    "Ruxsat etilmagan manba.",
    "Источник запроса не разрешён.",
    "Request origin is not allowed.",
  ],
  apiMediaType: [
    "Content-Type: application/json talab qilinadi.",
    "Требуется Content-Type: application/json.",
    "Content-Type: application/json is required.",
  ],
  apiJson: ["JSON noto‘g‘ri.", "Некорректный JSON.", "Invalid JSON."],
  apiBodyLimit: [
    "So‘rov hajmi 16 KB dan oshmasin.",
    "Размер запроса не должен превышать 16 КБ.",
    "The request body must not exceed 16 KB.",
  ],
  apiInternal: [
    "Server xatosi. Qayta urinib ko‘ring.",
    "Ошибка сервера. Повторите попытку.",
    "Server error. Please try again.",
  ],
  validationRequired: [
    "Bu maydonni to‘ldiring.",
    "Заполните это поле.",
    "Please complete this field.",
  ],
  validationValue: [
    "Qiymatni tekshiring.",
    "Проверьте значение.",
    "Please check this value.",
  ],
  validationNumber: ["Son kiriting.", "Введите число.", "Enter a number."],
  validationText: ["Matn kiriting.", "Введите текст.", "Enter text."],
  validationInteger: [
    "Musbat butun son kiriting.",
    "Введите положительное целое число.",
    "Enter a positive whole number.",
  ],
  validationNonnegative: [
    "Summa manfiy bo‘lmasin.",
    "Сумма не может быть отрицательной.",
    "The amount cannot be negative.",
  ],
  validationMaximum: [
    "Summa 100 000 000 dan oshmasin.",
    "Сумма не должна превышать 100 000 000.",
    "The amount must not exceed 100,000,000.",
  ],
  validationDecimals: [
    "Summada ko‘pi bilan 2 ta kasr raqami bo‘lishi mumkin.",
    "В сумме допускается не более 2 знаков после запятой.",
    "The amount can have at most 2 decimal places.",
  ],
  validationPositive: [
    "To‘lov summasi 0 dan katta bo‘lishi kerak.",
    "Сумма оплаты должна быть больше 0.",
    "The payment amount must be greater than 0.",
  ],
  validationMonth: [
    "Oy YYYY-MM formatida bo‘lishi kerak.",
    "Месяц должен иметь формат YYYY-MM.",
    "The month must use YYYY-MM format.",
  ],
  validationDate: [
    "Sana haqiqiy YYYY-MM-DD formatida bo‘lishi kerak.",
    "Укажите существующую дату в формате YYYY-MM-DD.",
    "Enter a valid calendar date in YYYY-MM-DD format.",
  ],
  validationPhone: [
    "Telefon raqami noto‘g‘ri.",
    "Некорректный номер телефона.",
    "Invalid phone number.",
  ],
  validationPhoneDigits: [
    "Telefonda kamida 5 ta raqam bo‘lsin.",
    "Номер телефона должен содержать не менее 5 цифр.",
    "The phone number must contain at least 5 digits.",
  ],
  validationLength: [
    "Matn uzunligini tekshiring.",
    "Проверьте длину текста.",
    "Please check the text length.",
  ],
  validationPatch: [
    "Kamida bitta maydonni yuboring.",
    "Укажите хотя бы одно поле.",
    "Provide at least one field.",
  ],
  validationId: [
    "ID musbat butun son bo‘lishi kerak.",
    "ID должен быть положительным целым числом.",
    "ID must be a positive whole number.",
  ],
  validationIdLarge: [
    "ID juda katta.",
    "Слишком большой ID.",
    "ID is too large.",
  ],
  validationUnknownFields: [
    "Noma’lum maydonlar yuborilgan.",
    "Переданы неизвестные поля.",
    "Unknown fields were submitted.",
  ],
  validationMinimum: [
    "Eng kichik qiymat: {min}.",
    "Минимальное значение: {min}.",
    "The minimum value is {min}.",
  ],
  validationMaximumInput: [
    "Eng katta qiymat: {max}.",
    "Максимальное значение: {max}.",
    "The maximum value is {max}.",
  ],
} as const satisfies Record<string, readonly [string, string, string]>;

export type MessageKey = keyof typeof messages;
export type TranslationParams = Readonly<Record<string, string | number>>;
export function isLanguage(value: unknown): value is Language {
  return (
    typeof value === "string" &&
    languages.some((language) => language === value)
  );
}
export function isMessageKey(value: unknown): value is MessageKey {
  return typeof value === "string" && Object.hasOwn(messages, value);
}
export function resolveLanguage(query: unknown, stored: unknown): Language {
  return isLanguage(query)
    ? query
    : isLanguage(stored)
      ? stored
      : defaultLanguage;
}
/** Text only: escape the result before inserting it as HTML. */
export function translate(
  language: Language,
  key: MessageKey,
  params: TranslationParams = {},
): string {
  return messages[key][languageColumn[language]].replace(
    /\{(\w+)\}/g,
    (placeholder, name: string) =>
      Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  );
}
const numberFormats = Object.fromEntries(
  languages.map((language) => [
    language,
    new Intl.NumberFormat(locales[language], { maximumFractionDigits: 2 }),
  ]),
) as Record<Language, Intl.NumberFormat>;
const dateFormats = Object.fromEntries(
  languages.map((language) => [
    language,
    new Intl.DateTimeFormat(locales[language], {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
  ]),
) as Record<Language, Intl.DateTimeFormat>;
export const formatNumber = (language: Language, value: number): string =>
  numberFormats[language].format(value);
export const formatCalendarDate = (language: Language, iso: string): string =>
  dateFormats[language].format(new Date(`${iso}T00:00:00Z`));

export const apiErrorKeys: Readonly<Record<string, MessageKey>> = {
  VALIDATION_ERROR: "apiValidation",
  STUDENT_NOT_FOUND: "apiStudentNotFound",
  NOT_FOUND: "apiNotFound",
  ORIGIN_REJECTED: "apiOrigin",
  UNSUPPORTED_MEDIA_TYPE: "apiMediaType",
  INVALID_JSON: "apiJson",
  BODY_TOO_LARGE: "apiBodyLimit",
  INTERNAL_ERROR: "apiInternal",
};
