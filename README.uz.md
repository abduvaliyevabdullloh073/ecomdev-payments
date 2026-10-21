# Ecomdev — ishga tushirish

Loyiha o‘quvchilar, to‘lovlar va oy bo‘yicha qarzdorlikni yuritadi. Node.js + TypeScript va SQLite ishlatilgan. Topshiriqdagi **B varianti — mobilga mos veb-sahifa** tayyorlangan.

## Windows’da boshlash

1. [Node.js 24 LTS](https://nodejs.org/en/download) o‘rnating (24.15 yoki undan yangi 24.x). Terminalni yangidan ochib, `node --version` bilan tekshiring.
2. ZIP’ni oddiy papkaga chiqaring. `package.json` turgan `ecomdev-payments` papkasini VS Code’da oching.
3. **Terminal → New Terminal** orqali quyidagi buyruqlarni navbat bilan bajaring:

```sh
npm ci
npm run setup
npm run build
npm start
```

4. Brauzerda **http://127.0.0.1:3000** ni oching. Server ishlayotgan terminalni ochiq qoldiring. To‘xtatish: `Ctrl+C`.

Agar PowerShell `npm.ps1 cannot be loaded` desa, terminal turini **Command Prompt** ga o‘zgartiring yoki `npm` o‘rniga `npm.cmd` yozing. `node:sqlite` topilmasa, Node versiyasini tekshiring. Port band bo‘lsa, `.env` faylida `PORT=3001` qilib, serverni qayta boshlang va yangi portni oching.

## Demo va foydalanish

Demo kerak bo‘lsa, serverni to‘xtatib `npm run seed` buyrug‘ini bajaring, keyin `npm start` qiling. 8 ta shartli o‘quvchi va joriy oyga 7 ta to‘lov yaratiladi. Bazada o‘quvchilar bor bo‘lsa, demo qo‘shilmaydi. Ma’lumotlarni qayta ochganda ham saqlash uchun baza faylini o‘chirmang.

1. **+ O‘quvchi:** ism, telefon, guruh va oylik to‘lovni kiriting.
2. **To‘lov qo‘shish:** o‘quvchi, summa va sanani tanlang. Qisman to‘lash mumkin.
3. **Qarzdorlar:** oy tanlang; faqat shu oyda to‘liq to‘lamaganlar chiqadi.
4. **O‘quvchilar:** tahrirlash va o‘chirish tugmalari bor. Ism ustiga bosilganda barcha oylardagi to‘lovlar tarixi ochiladi.
5. **To‘lovlar:** tanlangan oy to‘lovlarini ko‘ring; ism yoki guruh bo‘yicha qidiring.

Qarz = oylik to‘lov − shu oydagi to‘lovlar (kamida 0). Masalan, 850 000 so‘mlik tarif va 400 000 so‘m to‘lov bo‘lsa, qarz 450 000 so‘m. Boshqa oydagi to‘lovlar aralashmaydi. Ortiqcha to‘lov keyingi oyga avtomatik o‘tmaydi. Tarif o‘zgarsa, oldingi oylar hisoboti ham yangi tarif bilan hisoblanadi. O‘quvchi o‘chirilsa, uning barcha to‘lovlari ham o‘chiriladi; alohida tasdiqlash oynasi bor.

## Tilni almashtirish

Yuqori o‘ng burchakdagi yoki ochiq oynadagi til tanlagichdan **O‘zbekcha, Русский, English** ni tanlang. Tanlov eslab qolinadi; menyular, shakllar, xabarlar, xatolar hamda jadvaldagi sana va summalar moslashadi. Tilni almashtirsangiz, ochiq shakldagi yozuvlaringiz saqlanadi. To‘g‘ridan-to‘g‘ri ruscha ochish uchun `http://127.0.0.1:3000/?lang=ru`, inglizcha uchun `?lang=en` ishlaydi. Batafsil ma’lumot: `docs/I18N.md`.

## Tekshirish

```sh
npm run check
```

Bu buyruq TypeScript tekshiruvi, 28 ta API/domain/i18n testi va loyihani yig‘ishni bajaradi. Brauzer testlari:

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

Brauzerda kompyuter va telefon o‘lchamlarida jami 18 ta sinov bajariladi, jumladan uchala tilda to‘lov kiritish va tilni saqlash tekshiriladi.

## GitHub repository

Loyiha: [abduvaliyevabdullloh073/ecomdev-payments](https://github.com/abduvaliyevabdullloh073/ecomdev-payments). `main` tarmog‘ida Node.js/TypeScript versiyasi; oldingi Python versiyasi Git tarixida saqlangan.

```sh
git clone https://github.com/abduvaliyevabdullloh073/ecomdev-payments.git
cd ecomdev-payments
```

So‘ng yuqoridagi `npm ci`, `npm run setup`, `npm run build`, `npm start` buyruqlarini bajaring. Git bo‘lmasa, repository sahifasidan **Code → Download ZIP** ni tanlang.

`.env`, ishchi baza, `node_modules/` va `dist/` Git’ga kiritilmaydi. Har bir push uchun GitHub Actions turlar, testlar va yig‘ilishni tekshiradi.

Tekshiruvchiga repository havolasini yuboring. [docs/SUBMISSION.md](docs/SUBMISSION.md) ichida AI’dan foydalanish haqida 7 gap va topshirish ro‘yxati bor. Matnni o‘qing va faqat o‘zingiz bajargan ishlarni qo‘shing. Telegram’ga xabar yuborish alohida bajariladi.
