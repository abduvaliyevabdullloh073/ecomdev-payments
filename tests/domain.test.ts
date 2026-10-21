import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarToday, isCalendarDate, monthRange, paymentSchema, studentSchema, toMinor, fromMinor } from '../src/server/domain.js';

test('money conversion preserves decimal amounts as integer minor units', () => {
  for (const [amount, minor] of [[0, 0], [0.01, 1], [0.29, 29], [10.1, 1010], [850000.99, 85000099], [100000000, 10000000000]]) {
    assert.equal(toMinor(amount!), minor);
    assert.equal(fromMinor(minor!), amount);
  }
  assert.equal(fromMinor(toMinor(0.1) + toMinor(0.2)), 0.3);
});

test('calendar dates reject rollover, non-padded dates, time components and non-leap February 29', () => {
  for (const valid of ['2024-02-29', '2000-02-29', '2026-01-31', '9999-12-31', '1000-01-01']) assert.equal(isCalendarDate(valid), true, valid);
  for (const invalid of ['2026-02-29', '1900-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '2026-01-00', '2026-1-1', '2026-10-01T00:00:00Z', '0000-01-01', 'invalid']) assert.equal(isCalendarDate(invalid), false, invalid);
});

test('month ranges handle leap years and the maximum supported year without a year-10000 boundary', () => {
  assert.deepEqual(monthRange('2024-02'), { start: '2024-02-01', end: '2024-02-29' });
  assert.deepEqual(monthRange('2026-02'), { start: '2026-02-01', end: '2026-02-28' });
  assert.deepEqual(monthRange('9999-12'), { start: '9999-12-01', end: '9999-12-31' });
});

test('current calendar date follows the configured timezone at a UTC month boundary', () => {
  const instant = new Date('2026-01-31T20:00:00Z');
  assert.equal(calendarToday('Asia/Tashkent', instant), '2026-02-01');
  assert.equal(calendarToday('UTC', instant), '2026-01-31');
  assert.throws(() => calendarToday('Not/AZone', instant), RangeError);
});

test('amount validation rejects non-finite values and more than two decimal places', () => {
  const base = { studentId: 1, amount: 1, date: '2026-10-01' };
  for (const amount of [NaN, Infinity, -Infinity, 0, -1, 1.005, 0.0001, 100000000.01, '100']) {
    assert.equal(paymentSchema.safeParse({ ...base, amount }).success, false, String(amount));
  }
  assert.equal(paymentSchema.safeParse({ ...base, amount: 0.01 }).success, true);
});

test('student validation trims text, permits a zero fee, and rejects unknown fields', () => {
  const base = { name: '  Test Student  ', phone: '+998 90 123 45 67', group: '  A1  ', monthlyFee: 0 };
  const student = studentSchema.parse(base);
  assert.equal(student.name, 'Test Student'); assert.equal(student.group, 'A1');
  assert.equal(studentSchema.safeParse({ ...base, admin: true }).success, false);
  assert.equal(studentSchema.safeParse({ ...base, phone: '-----' }).success, false);
});
