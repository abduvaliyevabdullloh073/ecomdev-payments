import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  const { students } = await (await request.get('/students')).json() as { students: {id: number}[] };
  for (const student of students) await request.delete(`/students/${student.id}`);
});

test('create student, partial payment, full payment, edit and delete through the interface', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?month=2026-10');
  await expect(page.getByText('O‘quvchi qo‘shishdan boshlang')).toBeVisible();
  await page.getByRole('button', {name:'O‘quvchi', exact:true}).click();
  await page.getByLabel('Ism va familiya').fill('Test O‘quvchi');
  await page.getByLabel('Telefon raqami', {exact:true}).fill('+998 90 111 22 33');
  await page.getByLabel('Guruh', {exact:true}).fill('Node.js · N-01');
  await page.getByLabel('Oylik to‘lov', {exact:false}).fill('500000');
  await page.getByRole('button', {name:'Saqlash',exact:true}).click();
  await expect(page.getByRole('button', {name:'Test O‘quvchi',exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Test O‘quvchi uchun to‘lov',exact:true}).click();
  await page.getByLabel('Summa', {exact:false}).fill('200000');
  await page.getByLabel('To‘lov sanasi', {exact:true}).fill('2026-10-10');
  await page.getByRole('button', {name:'To‘lovni saqlash',exact:true}).click();
  await expect(page.locator('.debt-amount')).toHaveText(/300.?000/);
  await page.getByRole('button', {name:'Test O‘quvchi uchun to‘lov',exact:true}).click();
  await expect(page.getByLabel('Summa', {exact:false})).toHaveValue('300000');
  await page.getByRole('button', {name:'To‘lovni saqlash',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Qarzdorlik yo‘q',exact:true})).toBeVisible();
  await page.getByRole('tab', {name:'O‘quvchilar',exact:true}).click();
  await page.getByRole('button', {name:'Test O‘quvchi ma’lumotlarini tahrirlash',exact:true}).click();
  await page.getByLabel('Ism va familiya').fill('Yangilangan O‘quvchi');
  await page.getByRole('button', {name:'Saqlash',exact:true}).click();
  await expect(page.getByRole('button', {name:'Yangilangan O‘quvchi',exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Yangilangan O‘quvchi',exact:true}).click();
  await expect(page.getByText('Barcha oylardagi to‘lovlar · 2 ta yozuv')).toBeVisible();
  await page.locator('#history-dialog').getByRole('button', {name:'Yopish',exact:true}).click();
  await page.getByRole('button', {name:'Yangilangan O‘quvchini o‘chirish',exact:true}).click();
  await page.getByRole('button', {name:'O‘chirish',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Hali o‘quvchilar yo‘q',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});

test('month filter, search, group filtering and escaped names work without horizontal page overflow', async ({ page, request }) => {
  const response = await request.post('/students', {data:{name:'<img src=x onerror=alert(1)>',phone:'12345',group:'Backend',monthlyFee:100}});
  const person = await response.json() as {id:number};
  await request.post('/payments', {data:{studentId:person.id,amount:100,date:'2026-10-01'}});
  await request.post('/students', {data:{name:'Other Student',phone:'67890',group:'Frontend',monthlyFee:200}});
  const dialogs: string[] = []; page.on('dialog', async dialog => {dialogs.push(dialog.message()); await dialog.dismiss();});
  await page.goto('/?month=2026-09');
  await expect(page.locator('.ledger-table tbody tr')).toHaveCount(2);
  await page.getByLabel('Guruh bo‘yicha saralash').selectOption('Backend');
  await expect(page.locator('.ledger-table tbody tr')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'<img src=x onerror=alert(1)>',exact:true})).toBeVisible();
  await expect(page.locator('#table-content img')).toHaveCount(0);
  await page.getByLabel('Guruh bo‘yicha saralash').selectOption('');
  await page.getByLabel('Ism, telefon yoki guruh bo‘yicha qidirish').fill('missing');
  await expect(page.getByRole('heading',{name:'Natija topilmadi'})).toBeVisible();
  await page.getByLabel('Ism, telefon yoki guruh bo‘yicha qidirish').fill('');
  await page.locator('#month').fill('2026-10'); await page.locator('#month').dispatchEvent('change');
  await expect(page.locator('.ledger-table tbody tr')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#month')).toHaveValue('2026-10');
  await expect(page.locator('.ledger-table tbody tr')).toHaveCount(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false); expect(dialogs).toEqual([]);
});

test('server failures show a retry path and a later refresh recovers', async ({ page }) => {
  await page.route('**/debtors?*', route => route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{message:'Sinov xatosi'}})}));
  await page.goto('/?month=2026-10');
  await expect(page.getByRole('heading',{name:'Ma’lumotlar yuklanmadi'})).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText(/Sinov xatosi/);
  await page.unroute('**/debtors?*');
  await page.getByRole('button',{name:'Qayta urinish',exact:true}).click();
  await expect(page.getByText('O‘quvchi qo‘shishdan boshlang')).toBeVisible();
});
