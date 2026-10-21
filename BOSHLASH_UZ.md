# Loyihani ishga tushirish va topshirish

Tayyor repozitoriy: https://github.com/abduvaliyevabdullloh073/ecomdev-payments

Bu — Ecomdev topshirig‘idagi **B varianti**: o‘quv markazi to‘lovlarini hisoblaydigan API va telefonga mos veb-interfeys. Asosiy README tekshiruvchilarga qulay bo‘lishi uchun rus tilida yozilgan.

## Windows kompyuteringizda

1. Python 3.12 yoki yangirog‘ini o‘rnating. O‘rnatish oynasida **Add Python to PATH** belgisini yoqing.
2. ZIP faylni alohida papkaga oching.
3. `README.md` va `app` papkasi turgan joyda PowerShell terminalini oching.
4. Quyidagi buyruqlarni ketma-ket bajaring:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m app
```

Agar `py -3.12` topilmasa, o‘rnatilgan Python 3.12+ bilan birinchi buyruqni `python -m venv .venv` qilib bajaring.

Brauzerda **http://127.0.0.1:8000** manzilini oching. Terminal ishlayotgan holatda tursin. To‘xtatish uchun `Ctrl+C` bosing. Qayta ishga tushirishda faqat oxirgi buyruq yetadi; ma’lumotlar saqlanadi.

## Tayyor namuna bilan ko‘rish

Ikkinchi terminalni shu loyiha papkasida ochib bajaring:

```powershell
.\.venv\Scripts\python.exe -m app.seed
```

Sahifani yangilang. 6 ta to‘qima o‘quvchi va joriy oy uchun to‘lovlar chiqadi. Baza oldindan o‘quvchilar bilan to‘ldirilgan bo‘lsa, namuna qo‘shilmaydi; mavjud ma’lumotlar o‘zgarmaydi.

## Imkoniyatlarni o‘zingiz tekshiring

1. **Добавить ученика** orqali yangi o‘quvchi yarating: ism, telefon, guruh va oylik to‘lovni kiriting.
2. **Должники** bo‘limida uning qarzi oylik to‘lovga teng chiqadi.
3. **Оплатить** tugmasidan qisman to‘lov kiriting. Qarzi to‘langan miqdorga kamayadi.
4. **История** tugmasida to‘lovning sanasi va summasini ko‘ring.
5. Qolgan summani ham to‘lang: u o‘sha oyning qarzdorlar ro‘yxatidan chiqadi.
6. Boshqa oyni tanlang: faqat tanlangan oyga tegishli to‘lovlar hisoblanadi.
7. **Все ученики** bo‘limida o‘quvchini tahrirlash yoki tasdiqlab o‘chirish mumkin. O‘chirish uning to‘lovlarini ham o‘chiradi.

Pul hisobida `0.10 + 0.20` kabi qiymatlar ham aniq hisoblanadi. Bir o‘quvchining ortiqcha to‘lovi boshqa o‘quvchining qarzini yopmaydi va keyingi oyga avtomatik o‘tmaydi.

API’ni **http://127.0.0.1:8000/docs** orqali oching. Har bir endpointni ochib, **Try it out** bilan tekshirish mumkin.

## Avtomatik testlarni bajarish

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
```

Brauzerda avtomatik tekshirish uchun qo‘shimcha Node.js kerak; buyruqlari asosiy README’da bor. Oddiy foydalanish uchun Node.js shart emas.

## GitHub’ga joylash

Agar repozitoriy avtomatik yaratilmagan bo‘lsa:

1. GitHub hisobingizda **New repository** bosing va nomini `ecomdev-payments` deb qo‘ying.
2. Topshiriqqa ko‘ra ochiq repozitoriy mumkin; yopiq bo‘lsa, tekshiruvchilarga kirish bering.
3. **Add file → Upload files** orqali loyiha ichidagi fayllar va papkalarni yuklang. ZIP’ning o‘zini yuklamang: kod repozitoriyda ochiq ko‘rinishi kerak.
4. `README.md`, `app`, `tests`, `requirements.txt` va `requirements-dev.txt` tushganini tekshiring. `.venv`, `data`, `node_modules` papkalarini yuklamang.
5. **Commit changes** bosing va repozitoriy havolasini nusxalang.

Git o‘rnatilgan bo‘lsa, yangi bo‘sh repozitoriy sahifasidagi **push an existing repository** buyruqlaridan foydalanishingiz ham mumkin. `.github/workflows/tests.yml` fayli ham yuklansa, GitHub Actions tekshiruvlarni avtomatik bajaradi; veb-yuklash yashirin papkani o‘tkazib yubormaganini tekshiring.

## Telegram orqali topshirish

`@code_debugger007` ga quyidagi uch narsani yuborish talab qilingan:

- GitHub repozitoriy havolasi;
- `SUBMISSION_RU.md` faylidagi **7 gaplik AI izohi**;
- Haqiqatan sarflagan vaqtingiz, soat hisobida.

AI izohida bu versiyadagi kod, interfeys, testlar va hujjatlar AI yordamida yaratilgani ochiq aytilgan. O‘zingiz keyinchalik kodni o‘zgartirsangiz, shu matnni haqiqiy holatga moslang. Telegramga xabarni o‘zingiz yuborasiz.

Suhbatdan oldin `app/service.py` dagi `debt_report()` funksiyasini o‘qing: oylik qarz qanday hisoblanishini tushuntirib bera olish foydali. `SUBMISSION_RU.md` ichida qisqa tushuntirish ham bor.
