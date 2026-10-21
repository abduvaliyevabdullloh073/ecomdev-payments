import type { DatabaseSync } from 'node:sqlite';
import { fromMinor, monthRange, toMinor } from './domain.js';
import type { Student, StudentInput, Payment, PaymentInput, Balance } from './domain.js';

interface StudentRow {
  id: number; name: string; phone: string; group_name: string; monthly_fee_minor: number;
  created_at: string; updated_at: string;
}
interface PaymentRow {
  id: number; student_id: number; amount_minor: number; date: string;
  created_at: string; student_name: string; group_name: string;
}
interface BalanceRow extends StudentRow { paid_minor: number }

const mapStudent = (row: StudentRow): Student => ({
  id: row.id, name: row.name, phone: row.phone, group: row.group_name,
  monthlyFee: fromMinor(row.monthly_fee_minor), createdAt: row.created_at, updatedAt: row.updated_at,
});
const mapPayment = (row: PaymentRow): Payment => ({
  id: row.id, studentId: row.student_id, amount: fromMinor(row.amount_minor), date: row.date,
  createdAt: row.created_at, studentName: row.student_name, group: row.group_name,
});
const PAYMENT_SELECT = `SELECT p.*, s.name AS student_name, s.group_name
  FROM payments p JOIN students s ON s.id = p.student_id`;

export class LedgerRepository {
  constructor(private readonly db: DatabaseSync) {}

  listStudents(): Student[] {
    return (this.db.prepare('SELECT * FROM students ORDER BY id DESC').all() as unknown as StudentRow[]).map(mapStudent);
  }

  getStudent(id: number): Student | undefined {
    const row = this.db.prepare('SELECT * FROM students WHERE id = ?').get(id) as unknown as StudentRow | undefined;
    return row ? mapStudent(row) : undefined;
  }

  createStudent(input: StudentInput): Student {
    const result = this.db.prepare('INSERT INTO students(name, phone, group_name, monthly_fee_minor) VALUES (?, ?, ?, ?)')
      .run(input.name, input.phone, input.group, toMinor(input.monthlyFee));
    return this.getStudent(Number(result.lastInsertRowid))!;
  }

  updateStudent(id: number, input: StudentInput): Student {
    this.db.prepare(`UPDATE students SET name = ?, phone = ?, group_name = ?, monthly_fee_minor = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`)
      .run(input.name, input.phone, input.group, toMinor(input.monthlyFee), id);
    return this.getStudent(id)!;
  }

  deleteStudent(id: number): void {
    this.db.prepare('DELETE FROM students WHERE id = ?').run(id);
  }

  createPayment(input: PaymentInput): Payment {
    const result = this.db.prepare('INSERT INTO payments(student_id, amount_minor, date) VALUES (?, ?, ?)')
      .run(input.studentId, toMinor(input.amount), input.date);
    return mapPayment(this.db.prepare(`${PAYMENT_SELECT} WHERE p.id = ?`).get(Number(result.lastInsertRowid)) as unknown as PaymentRow);
  }

  listPayments(filter: { studentId?: number; month?: string } = {}): Payment[] {
    const clauses: string[] = [];
    const values: (string | number)[] = [];
    if (filter.studentId !== undefined) { clauses.push('p.student_id = ?'); values.push(filter.studentId); }
    if (filter.month !== undefined) {
      const { start, end } = monthRange(filter.month);
      clauses.push('p.date >= ? AND p.date <= ?'); values.push(start, end);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    return (this.db.prepare(`${PAYMENT_SELECT}${where} ORDER BY p.date DESC, p.id DESC`).all(...values) as unknown as PaymentRow[]).map(mapPayment);
  }

  private balanceRows(month: string): BalanceRow[] {
    const { start, end } = monthRange(month);
    return this.db.prepare(`SELECT s.*, COALESCE(SUM(p.amount_minor), 0) AS paid_minor
      FROM students s LEFT JOIN payments p ON p.student_id = s.id AND p.date >= ? AND p.date <= ?
      GROUP BY s.id ORDER BY (s.monthly_fee_minor - COALESCE(SUM(p.amount_minor), 0)) DESC, s.id ASC`)
      .all(start, end) as unknown as BalanceRow[];
  }

  monthlyReport(month: string): { balances: Balance[]; summary: {
    month: string; studentCount: number; debtorCount: number; expected: number;
    collected: number; applied: number; outstanding: number; surplus: number;
  } } {
    const rows = this.balanceRows(month);
    const balances: Balance[] = rows.map(row => ({
      studentId: row.id, name: row.name, phone: row.phone, group: row.group_name,
      monthlyFee: fromMinor(row.monthly_fee_minor), paid: fromMinor(row.paid_minor),
      debt: fromMinor(Math.max(0, row.monthly_fee_minor - row.paid_minor)),
    }));
    const expected = rows.reduce((sum, row) => sum + row.monthly_fee_minor, 0);
    const collected = rows.reduce((sum, row) => sum + row.paid_minor, 0);
    const applied = rows.reduce((sum, row) => sum + Math.min(row.monthly_fee_minor, row.paid_minor), 0);
    return { balances, summary: {
      month, studentCount: rows.length, debtorCount: balances.filter(row => row.debt > 0).length,
      expected: fromMinor(expected), collected: fromMinor(collected), applied: fromMinor(applied),
      outstanding: fromMinor(expected - applied), surplus: fromMinor(collected - applied),
    } };
  }
}
