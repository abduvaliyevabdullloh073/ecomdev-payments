import { openDatabase } from './database.js';
import { loadConfig } from './config.js';
import { calendarToday } from './domain.js';
import { LedgerRepository } from './repository.js';

const config = loadConfig();
const db = openDatabase(config.databasePath);
try {
  const repository = new LedgerRepository(db);
  if (repository.listStudents().length > 0) {
    console.log('Database contains students. Demo seed skipped; existing data was preserved.');
  } else {
    const month = calendarToday(config.timeZone).slice(0, 7);
    db.exec('BEGIN IMMEDIATE');
    try {
      const students = [
        { name: 'Aziz Karimov', phone: '+998 90 000 01 01', group: 'Frontend · F-12', monthlyFee: 850000, paid: 400000 },
        { name: 'Madina Sobirova', phone: '+998 90 000 01 02', group: 'English · E-08', monthlyFee: 650000, paid: 650000 },
        { name: 'Jasur Rahimov', phone: '+998 90 000 01 03', group: 'Backend · B-04', monthlyFee: 950000, paid: 0 },
        { name: 'Shahnoza Aliyeva', phone: '+998 90 000 01 04', group: 'Frontend · F-12', monthlyFee: 850000, paid: 600000 },
        { name: 'Bekzod Tursunov', phone: '+998 90 000 01 05', group: 'Design · D-03', monthlyFee: 750000, paid: 750000 },
        { name: 'Malika Ismoilova', phone: '+998 90 000 01 06', group: 'English · E-08', monthlyFee: 650000, paid: 200000 },
        { name: 'Sardor Akbarov', phone: '+998 90 000 01 07', group: 'Backend · B-04', monthlyFee: 950000, paid: 1000000 },
        { name: 'Diyora Usmonova', phone: '+998 90 000 01 08', group: 'Design · D-03', monthlyFee: 750000, paid: 350000 },
      ];
      for (const { paid, ...input } of students) {
        const student = repository.createStudent(input);
        if (paid > 0) repository.createPayment({ studentId: student.id, amount: paid, date: `${month}-05` });
      }
      db.exec('COMMIT');
      console.log('8 fictional demo students and 7 payments added for', month);
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
} finally { db.close(); }
