import { AppError } from './errors.js';
import type { LedgerRepository } from './repository.js';
import { studentSchema } from './domain.js';
import type { StudentInput, StudentPatch, PaymentInput, Student } from './domain.js';

export class LedgerService {
  constructor(private readonly repository: LedgerRepository) {}
  listStudents(): Student[] { return this.repository.listStudents(); }
  getStudent(id: number): Student {
    const student = this.repository.getStudent(id);
    if (!student) throw new AppError(404, 'STUDENT_NOT_FOUND', 'O‘quvchi topilmadi.');
    return student;
  }
  createStudent(input: StudentInput): Student { return this.repository.createStudent(input); }
  updateStudent(id: number, input: StudentPatch): Student {
    const current = this.getStudent(id);
    const { name, phone, group, monthlyFee } = current;
    return this.repository.updateStudent(id, studentSchema.parse({ name, phone, group, monthlyFee, ...input }));
  }
  deleteStudent(id: number): void { this.getStudent(id); this.repository.deleteStudent(id); }
  createPayment(input: PaymentInput) { this.getStudent(input.studentId); return this.repository.createPayment(input); }
  studentPayments(id: number) { this.getStudent(id); return this.repository.listPayments({ studentId: id }); }
  listPayments(filter: { studentId?: number; month?: string }) {
    if (filter.studentId !== undefined) this.getStudent(filter.studentId);
    return this.repository.listPayments(filter);
  }
  report(month: string) { return this.repository.monthlyReport(month); }
}
