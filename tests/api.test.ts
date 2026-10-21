import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Server } from 'node:http';
import type { DatabaseSync } from 'node:sqlite';
import { createApp } from '../src/server/app.js';
import { openDatabase } from '../src/server/database.js';
import type { Student, Balance, Payment } from '../src/server/domain.js';

let db: DatabaseSync;
let server: Server;
let base: string;
interface ErrorBody { error: { code: string; message: string } }
interface DebtorsBody { month: string; count: number; totalDebt: number; debtors: Balance[] }

beforeEach(async () => {
  db = openDatabase(':memory:');
  server = createApp({ db, staticDirectory: resolve('public') }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  await new Promise<void>((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
  db.close();
});

async function request<T = ErrorBody>(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`${base}${path}`, { method, ...(body !== undefined ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) });
  const json = response.status === 204 ? undefined as T : await response.json() as T;
  return { status: response.status, body: json, headers: response.headers };
}
async function student(overrides: Record<string, unknown> = {}): Promise<Student> {
  const result = await request<Student>('/students', 'POST', { name: 'Test Student', phone: '+998 90 123 45 67', group: 'A1', monthlyFee: 500, ...overrides });
  assert.equal(result.status, 201);
  assert.equal(result.headers.get('location'), `/students/${result.body.id}`);
  return result.body;
}
async function pay(studentId: number, amount: number, date = '2026-10-10') {
  const result = await request<Payment>('/payments', 'POST', { studentId, amount, date });
  assert.equal(result.status, 201);
  return result.body;
}

test('empty database, automatic migration, health and static page are ready from startup', async () => {
  assert.deepEqual((await request<{students: Student[]}>('/students')).body, { students: [] });
  assert.deepEqual((await request<DebtorsBody>('/debtors?month=2026-10')).body, { month: '2026-10', count: 0, totalDebt: 0, debtors: [] });
  assert.deepEqual((await request('/health')).body, { status: 'ok' });
  assert.equal(db.prepare('PRAGMA user_version').get()!['user_version'], 1);
  assert.equal(db.prepare('PRAGMA foreign_keys').get()!['foreign_keys'], 1);
  const page = await fetch(base);
  assert.equal(page.status, 200); assert.match(await page.text(), /lang="uz"/);
  assert.ok(page.headers.get('content-security-policy')?.includes("script-src 'self'"));
  assert.equal(page.headers.get('x-powered-by'), null);
});

test('student CRUD, partial update and full replacement preserve the API contract', async () => {
  const created = await student({ name: '  Aziz Karimov  ' });
  assert.equal(created.name, 'Aziz Karimov');
  assert.equal((await request<Student>(`/students/${created.id}`)).body.phone, created.phone);
  const patch = await request<Student>(`/students/${created.id}`, 'PATCH', { monthlyFee: 750.25, phone: '+998 91 111 22 33' });
  assert.equal(patch.status, 200); assert.equal(patch.body.monthlyFee, 750.25); assert.equal(patch.body.name, created.name);
  const put = await request<Student>(`/students/${created.id}`, 'PUT', { name: 'New Name', phone: '12345', group: 'B2', monthlyFee: 0 });
  assert.equal(put.status, 200); assert.equal(put.body.group, 'B2');
  assert.equal((await request<{students: Student[]}>('/students')).body.students.length, 1);
  assert.equal((await request(`/students/${created.id}`, 'DELETE')).status, 204);
  assert.equal((await request(`/students/${created.id}`)).status, 404);
});

test('invalid student records and empty patches cannot modify the database', async () => {
  const created = await student();
  for (const [label, input] of Object.entries({ emptyName: {name: '   '}, invalidPhone: {phone: 'abcde'}, emptyGroup: {group: ''}, negativeFee: {monthlyFee: -1}, stringFee: {monthlyFee: '500'}, excessDecimals: {monthlyFee: 0.001}, unknownField: {role: 'admin'}, oversizedFee: {monthlyFee: 100000001}, oversizedName: {name: 'a'.repeat(101)} })) {
    assert.equal((await request(`/students/${created.id}`, 'PATCH', input)).status, 400, label);
  }
  assert.equal((await request(`/students/${created.id}`, 'PATCH', {})).status, 400);
  assert.equal((await request(`/students/${created.id}`, 'PUT', {name: 'Incomplete'})).status, 400);
  assert.equal((await request<Student>(`/students/${created.id}`)).body.monthlyFee, 500);
});

test('payments can be added through both routes and listed only for the specified student', async () => {
  const first = await student(); const second = await student({ name: 'Other Student' });
  await pay(first.id, 100);
  const nested = await request<Payment>(`/students/${first.id}/payments`, 'POST', { amount: 250, date: '2026-10-11' });
  assert.equal(nested.status, 201); assert.equal(nested.body.studentId, first.id);
  await pay(second.id, 10);
  const list = await request<{payments: Payment[]}>(`/students/${first.id}/payments`);
  assert.deepEqual(list.body.payments.map(row => row.amount), [250, 100]);
  assert.ok(list.body.payments.every(row => row.studentId === first.id));
  assert.equal((await request<{payments: Payment[]}>(`/payments?studentId=${second.id}&month=2026-10`)).body.payments.length, 1);
});

test('monthly debt is exact for unpaid, partial, full, overpaid and zero-fee students', async () => {
  const unpaid = await student({ name: 'Unpaid' });
  const partial = await student({ name: 'Partial' });
  const full = await student({ name: 'Full' });
  const extra = await student({ name: 'Extra' });
  await student({ name: 'Scholarship', monthlyFee: 0 });
  await pay(partial.id, 200); await pay(full.id, 500); await pay(extra.id, 600);
  await pay(unpaid.id, 5000, '2026-09-30'); await pay(unpaid.id, 5000, '2026-11-01');
  const report = (await request<DebtorsBody>('/debtors?month=2026-10')).body;
  assert.equal(report.count, 2); assert.equal(report.totalDebt, 800);
  assert.deepEqual(report.debtors.map(row => [row.name, row.paid, row.debt]), [['Unpaid', 0, 500], ['Partial', 200, 300]]);
  const summary = (await request<Record<string, number | string>>('/summary?month=2026-10')).body;
  assert.deepEqual(summary, { month: '2026-10', studentCount: 5, debtorCount: 2, expected: 2000, collected: 1300, applied: 1200, outstanding: 800, surplus: 100 });
});

test('month boundaries include the last day and exclude adjacent months, including leap February', async () => {
  const person = await student({ monthlyFee: 100 });
  for (const [month, lastDay, nextDay] of [
    ['2024-02', '2024-02-29', '2024-03-01'],
    ['2026-02', '2026-02-28', '2026-03-01'],
    ['2026-12', '2026-12-31', '2027-01-01'],
    ['9999-12', '9999-12-31', '9999-11-30'],
  ] as const) {
    db.exec('DELETE FROM payments');
    await pay(person.id, 40, lastDay); await pay(person.id, 60, nextDay);
    const result = (await request<DebtorsBody>(`/debtors?month=${month}`)).body;
    assert.equal(result.debtors[0]!.paid, 40, month); assert.equal(result.totalDebt, 60, month);
  }
});

test('decimal payments add up without floating point debt', async () => {
  const person = await student({ monthlyFee: 0.3 });
  await pay(person.id, 0.1); await pay(person.id, 0.2);
  assert.equal((await request<DebtorsBody>('/debtors?month=2026-10')).body.totalDebt, 0);
  assert.equal(db.prepare('SELECT SUM(amount_minor) AS total FROM payments').get()!['total'], 30);
});

test('invalid payment dates and amounts are rejected without adding entries', async () => {
  const person = await student();
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-1-01', '2026-10-01T00:00:00Z', 'yesterday']) {
    assert.equal((await request('/payments', 'POST', { studentId: person.id, amount: 10, date })).status, 400, date);
  }
  for (const amount of [0, -1, 0.001, '10', 100000001]) assert.equal((await request('/payments', 'POST', { studentId: person.id, amount, date: '2026-10-01' })).status, 400);
  assert.equal((await request<{payments: Payment[]}>('/payments')).body.payments.length, 0);
});

test('unknown students return 404 and invalid IDs or query shapes return 400', async () => {
  for (const path of ['/students/123', '/students/123/payments', '/payments?studentId=123']) assert.equal((await request(path)).status, 404);
  assert.equal((await request('/payments', 'POST', {studentId: 123, amount: 100, date: '2026-10-01'})).status, 404);
  for (const path of ['/students/0', '/students/-1', '/students/1.1', '/students/1e2', '/students/9007199254740992', '/debtors', '/debtors?month=2026-13', '/debtors?month=2026-1', '/debtors?month=2026-01&month=2026-02', '/payments?studentId=abc']) assert.equal((await request(path)).status, 400, path);
  assert.equal((await request('/unknown')).status, 404);
});

test('deleting a student cascades payments, never reuses IDs, and leaves no orphan debts', async () => {
  const person = await student(); await pay(person.id, 200);
  await request(`/students/${person.id}`, 'DELETE');
  assert.equal((await request<{payments: Payment[]}>('/payments')).body.payments.length, 0);
  assert.equal((await request<DebtorsBody>('/debtors?month=2026-10')).body.count, 0);
  const next = await student(); assert.ok(next.id > person.id);
  assert.throws(() => db.prepare('INSERT INTO payments(student_id,amount_minor,date) VALUES (?,?,?)').run(999, 1, '2026-10-01'), /FOREIGN KEY/);
});

test('fee changes deliberately recalculate reports for previous months', async () => {
  const person = await student(); await pay(person.id, 400, '2025-01-15');
  await request(`/students/${person.id}`, 'PATCH', {monthlyFee: 600});
  assert.equal((await request<DebtorsBody>('/debtors?month=2025-01')).body.totalDebt, 200);
});

test('bound parameters preserve SQL-like names as data', async () => {
  const name = "Robert'); DROP TABLE students;--";
  const person = await student({ name });
  assert.equal((await request<Student>(`/students/${person.id}`)).body.name, name);
  assert.equal((await request<{students: Student[]}>('/students')).body.students.length, 1);
});

test('JSON parsing, request limits, unsupported types and cross-origin writes have controlled errors', async () => {
  const invalid = await fetch(`${base}/students`, {method:'POST', headers:{'Content-Type':'application/json'}, body:'{"name":'});
  assert.equal(invalid.status, 400); assert.equal(((await invalid.json()) as ErrorBody).error.code, 'INVALID_JSON');
  const oversized = await fetch(`${base}/students`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:'a'.repeat(20000)})});
  assert.equal(oversized.status, 413);
  const wrongType = await fetch(`${base}/students`, {method:'POST', headers:{'Content-Type':'text/plain'}, body:'hello'});
  assert.equal(wrongType.status, 415);
  const crossOrigin = await fetch(`${base}/students`, {method:'POST', headers:{'Content-Type':'application/json', Origin:'https://other.example'}, body:'{}'});
  assert.equal(crossOrigin.status, 403);
  const differentScheme = await fetch(`${base}/students`, {method:'POST', headers:{'Content-Type':'application/json', Origin:base.replace('http://', 'https://')}, body:'{}'});
  assert.equal(differentScheme.status, 403);
  const opaqueOrigin = await fetch(`${base}/students`, {method:'POST', headers:{'Content-Type':'application/json', Origin:'null'}, body:'{}'});
  assert.equal(opaqueOrigin.status, 403);
  const sameOrigin = await fetch(`${base}/students`, {method:'POST', headers:{'Content-Type':'application/json', Origin:base}, body:JSON.stringify({name:'Same Origin',phone:'12345',group:'A1',monthlyFee:10})});
  assert.equal(sameOrigin.status, 201);
});

test('SQLite data survives closing, reopening, and rerunning migrations', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ecomdev-db-'));
  const filename = join(directory, 'ledger.sqlite');
  try {
    const first = openDatabase(filename);
    first.prepare('INSERT INTO students(name,phone,group_name,monthly_fee_minor) VALUES(?,?,?,?)').run('Persistent', '12345', 'A1', 12345);
    first.close();
    const second = openDatabase(filename);
    try {
      assert.equal(second.prepare('SELECT monthly_fee_minor FROM students').get()!['monthly_fee_minor'], 12345);
      assert.equal(second.prepare('PRAGMA user_version').get()!['user_version'], 1);
    } finally { second.close(); }
  } finally { rmSync(directory, {recursive:true, force:true}); }
});

test('API errors negotiate regional and weighted Accept-Language values per request', async () => {
  for (const [header, expected, message] of [
    ['ru-RU, en;q=0.8', 'ru', 'Ученик не найден.'],
    ['en;q=0.9, ru;q=0.3', 'en', 'Student not found.'],
    ['en;q=0, ru;q=1', 'ru', 'Ученик не найден.'],
    ['de, xx;q=0.5', 'uz', 'O‘quvchi topilmadi.'],
    ['', 'uz', 'O‘quvchi topilmadi.'],
  ]) {
    const response = await fetch(`${base}/students/999`, {headers:{'Accept-Language':header!}});
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('content-language'), expected);
    assert.match(response.headers.get('vary') ?? '', /Accept-Language/);
    const result = await response.json() as ErrorBody;
    assert.equal(result.error.code, 'STUDENT_NOT_FOUND');
    assert.equal(result.error.message, message);
  }
});

test('validation details use the request language and expose stable translation keys', async () => {
  const response = await fetch(`${base}/payments`, {method:'POST',headers:{'Content-Type':'application/json','Accept-Language':'ru'},body:JSON.stringify({studentId:1,amount:1,date:'2026-02-29'})});
  assert.equal(response.status, 400);
  const result = await response.json() as {error:{message:string;details:{field:string;message:string;messageKey:string}[]}};
  assert.equal(result.error.message, 'Проверьте отправленные данные.');
  assert.deepEqual(result.error.details, [{field:'date',message:'Укажите существующую дату в формате YYYY-MM-DD.',messageKey:'validationDate'}]);
});

test('simultaneous requests in different languages keep their error messages isolated', async () => {
  const expected = {uz:'Manzil topilmadi.',ru:'Адрес не найден.',en:'Address not found.'};
  await Promise.all(Object.entries(expected).map(async ([language, message]) => {
    const response = await fetch(`${base}/unknown`, {headers:{'Accept-Language':language}});
    const result = await response.json() as ErrorBody;
    assert.equal(result.error.message, message);
  }));
});
