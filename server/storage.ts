import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { randomUUID } from 'crypto';

import {
  type User,
  type InsertUser,
  type Employee,
  type InsertEmployee,
  type HoursBank,
  type InsertHoursBank,
  type VacationPeriod,
  type InsertVacation,
  type LeavePeriod,
  type InsertLeave,
  type PaidDayOff,
  type InsertPaidDayOff,
} from '@shared/schema';

/**
 * Abre a conexão com o banco SQLite.
 * Observação: cada chamada abre uma conexão. Para projetos maiores,
 * considere manter uma conexão única compartilhada.
 */
export async function initDB(): Promise<Database> {
  return open({
    filename: './database.sqlite',
    driver: sqlite3.Database,
  });
}

/**
 * Cria todas as tabelas necessárias se não existirem.
 * Chame createTables() na inicialização da aplicação.
 */
export async function createTables() {
  const db = await initDB();

  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      registrationNumber TEXT UNIQUE NOT NULL,
      position TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hoursBank (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      hours INTEGER NOT NULL,
      description TEXT,
      FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vacations (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS leaves (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS paidDaysOff (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      date TEXT NOT NULL,
      hours INTEGER NOT NULL,
      year INTEGER NOT NULL,
      initialHours INTEGER,
      FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);
}

/**
 * Interface de storage (já presente no seu projeto).
 * Mantida para compatibilidade com as rotas existentes.
 */
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByRegistration(
    registrationNumber: string,
  ): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(
    id: string,
    employee: Partial<InsertEmployee>,
  ): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;

  getAllHoursBank(): Promise<HoursBank[]>;
  getHoursBankByEmployee(employeeId: string): Promise<HoursBank[]>;
  createHoursBank(entry: InsertHoursBank): Promise<HoursBank>;
  deleteHoursBank(id: string): Promise<boolean>;

  getAllVacations(): Promise<VacationPeriod[]>;
  getVacationsByEmployee(employeeId: string): Promise<VacationPeriod[]>;
  createVacation(vacation: InsertVacation): Promise<VacationPeriod>;
  updateVacation(
    id: string,
    vacation: Partial<InsertVacation>,
  ): Promise<VacationPeriod | undefined>;
  deleteVacation(id: string): Promise<boolean>;

  getAllLeaves(): Promise<LeavePeriod[]>;
  getLeavesByEmployee(employeeId: string): Promise<LeavePeriod[]>;
  createLeave(leave: InsertLeave): Promise<LeavePeriod>;
  updateLeave(
    id: string,
    leave: Partial<InsertLeave>,
  ): Promise<LeavePeriod | undefined>;
  deleteLeave(id: string): Promise<boolean>;

  getAllPaidDaysOff(): Promise<PaidDayOff[]>;
  getPaidDaysOffByEmployee(employeeId: string): Promise<PaidDayOff[]>;
  createPaidDayOff(dayOff: InsertPaidDayOff): Promise<PaidDayOff>;
  deletePaidDayOff(id: string): Promise<boolean>;
}

/**
 * Implementação completa usando SQLite.
 */
export class SqliteStorage implements IStorage {
  // USERS
  async getUser(id: string): Promise<User | undefined> {
    const db = await initDB();
    return db.get<User>('SELECT * FROM users WHERE id = ?', [id]);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await initDB();
    return db.get<User>('SELECT * FROM users WHERE username = ?', [username]);
  }

  async createUser(user: InsertUser): Promise<User> {
    const db = await initDB();
    const id = randomUUID();
    await db.run(
      'INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
      [id, user.username, user.password],
    );
    return { id, ...user };
  }

  // EMPLOYEES
  async getAllEmployees(): Promise<Employee[]> {
    const db = await initDB();
    return db.all<Employee[]>('SELECT * FROM employees ORDER BY fullName ASC');
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const db = await initDB();
    return db.get<Employee>('SELECT * FROM employees WHERE id = ?', [id]);
  }

  async getEmployeeByRegistration(
    registrationNumber: string,
  ): Promise<Employee | undefined> {
    const db = await initDB();
    return db.get<Employee>(
      'SELECT * FROM employees WHERE registrationNumber = ?',
      [registrationNumber],
    );
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const db = await initDB();
    const id = randomUUID();
    await db.run(
      'INSERT INTO employees (id, fullName, registrationNumber, position) VALUES (?, ?, ?, ?)',
      [id, employee.fullName, employee.registrationNumber, employee.position],
    );
    return { id, ...employee };
  }

  async updateEmployee(
    id: string,
    data: Partial<InsertEmployee>,
  ): Promise<Employee | undefined> {
    const db = await initDB();
    const existing = await this.getEmployee(id);
    if (!existing) return undefined;

    const updated: Employee = {
      ...existing,
      ...data,
    };

    await db.run(
      'UPDATE employees SET fullName = ?, registrationNumber = ?, position = ? WHERE id = ?',
      [updated.fullName, updated.registrationNumber, updated.position, id],
    );
    return updated;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const db = await initDB();
    const result = await db.run('DELETE FROM employees WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // HOURS BANK
  async getAllHoursBank(): Promise<HoursBank[]> {
    const db = await initDB();
    return db.all<HoursBank[]>(
      'SELECT * FROM hoursBank ORDER BY year DESC, month DESC',
    );
  }

  async getHoursBankByEmployee(employeeId: string): Promise<HoursBank[]> {
    const db = await initDB();
    return db.all<HoursBank[]>(
      'SELECT * FROM hoursBank WHERE employeeId = ? ORDER BY year DESC, month DESC',
      [employeeId],
    );
  }

  async createHoursBank(entry: InsertHoursBank): Promise<HoursBank> {
    console.log('chamou createHoursBank em storage.ts');
    const db = await initDB();
    const id = randomUUID();
    await db.run(
      'INSERT INTO hoursBank (id, employeeId, month, year, hours, description) VALUES (?, ?, ?, ?, ?, ?)',
      [
        id,
        entry.employeeId,
        entry.month,
        entry.year,
        entry.hours,
        entry.description,
      ],
    );

    return { id, ...entry };
  }

  async deleteHoursBank(id: string): Promise<boolean> {
    const db = await initDB();
    const result = await db.run('DELETE FROM hoursBank WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // VACATIONS
  async getAllVacations(): Promise<VacationPeriod[]> {
    const db = await initDB();
    return db.all<VacationPeriod[]>(
      'SELECT * FROM vacations ORDER BY startDate DESC',
    );
  }

  async getVacationsByEmployee(employeeId: string): Promise<VacationPeriod[]> {
    const db = await initDB();
    return db.all<VacationPeriod[]>(
      'SELECT * FROM vacations WHERE employeeId = ? ORDER BY startDate DESC',
      [employeeId],
    );
  }

  async createVacation(vacation: InsertVacation): Promise<VacationPeriod> {
    const db = await initDB();
    const id = randomUUID();
    await db.run(
      'INSERT INTO vacations (id, employeeId, startDate, endDate, status) VALUES (?, ?, ?, ?, ?)',
      [
        id,
        vacation.employeeId,
        vacation.startDate,
        vacation.endDate,
        vacation.status,
      ],
    );
    return { id, ...vacation };
  }

  async updateVacation(
    id: string,
    data: Partial<InsertVacation>,
  ): Promise<VacationPeriod | undefined> {
    const db = await initDB();
    const existing = await db.get<VacationPeriod>(
      'SELECT * FROM vacations WHERE id = ?',
      [id],
    );
    if (!existing) return undefined;

    const updated: VacationPeriod = { ...existing, ...data };
    await db.run(
      'UPDATE vacations SET employeeId = ?, startDate = ?, endDate = ?, status = ? WHERE id = ?',
      [
        updated.employeeId,
        updated.startDate,
        updated.endDate,
        updated.status,
        id,
      ],
    );
    return updated;
  }

  async deleteVacation(id: string): Promise<boolean> {
    const db = await initDB();
    const result = await db.run('DELETE FROM vacations WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // LEAVES
  async getAllLeaves(): Promise<LeavePeriod[]> {
    const db = await initDB();
    return db.all<LeavePeriod[]>(
      'SELECT * FROM leaves ORDER BY startDate DESC',
    );
  }

  async getLeavesByEmployee(employeeId: string): Promise<LeavePeriod[]> {
    const db = await initDB();
    return db.all<LeavePeriod[]>(
      'SELECT * FROM leaves WHERE employeeId = ? ORDER BY startDate DESC',
      [employeeId],
    );
  }

  async createLeave(leave: InsertLeave): Promise<LeavePeriod> {
    const db = await initDB();
    const id = randomUUID();
    await db.run(
      'INSERT INTO leaves (id, employeeId, startDate, endDate, status) VALUES (?, ?, ?, ?, ?)',
      [id, leave.employeeId, leave.startDate, leave.endDate, leave.status],
    );
    return { id, ...leave };
  }

  async updateLeave(
    id: string,
    data: Partial<InsertLeave>,
  ): Promise<LeavePeriod | undefined> {
    const db = await initDB();
    const existing = await db.get<LeavePeriod>(
      'SELECT * FROM leaves WHERE id = ?',
      [id],
    );
    if (!existing) return undefined;

    const updated: LeavePeriod = { ...existing, ...data };
    await db.run(
      'UPDATE leaves SET employeeId = ?, startDate = ?, endDate = ?, status = ? WHERE id = ?',
      [
        updated.employeeId,
        updated.startDate,
        updated.endDate,
        updated.status,
        id,
      ],
    );
    return updated;
  }

  async deleteLeave(id: string): Promise<boolean> {
    const db = await initDB();
    const result = await db.run('DELETE FROM leaves WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // PAID DAYS OFF
  async getAllPaidDaysOff(): Promise<PaidDayOff[]> {
    const db = await initDB();
    return db.all<PaidDayOff[]>('SELECT * FROM paidDaysOff ORDER BY date DESC');
  }

  async getPaidDaysOffByEmployee(employeeId: string): Promise<PaidDayOff[]> {
    const db = await initDB();
    return db.all<PaidDayOff[]>(
      'SELECT * FROM paidDaysOff WHERE employeeId = ? ORDER BY date DESC',
      [employeeId],
    );
  }

  async createPaidDayOff(dayOff: InsertPaidDayOff): Promise<PaidDayOff> {
    const db = await initDB();
    const id = randomUUID();
    await db.run(
      'INSERT INTO paidDaysOff (id, employeeId, date, hours, year, initialHours) VALUES (?, ?, ?, ?, ?, ?)',
      [
        id,
        dayOff.employeeId,
        dayOff.date,
        dayOff.hours,
        dayOff.year,
        dayOff.initialHours ?? null,
      ],
    );
    return { id, ...dayOff };
  }

  async deletePaidDayOff(id: string): Promise<boolean> {
    const db = await initDB();
    const result = await db.run('DELETE FROM paidDaysOff WHERE id = ?', [id]);
    return result.changes > 0;
  }
}

/**
 * Exporta a implementação baseada em SQLite.
 * As suas rotas continuam funcionando sem alterações.
 */
export const storage = new SqliteStorage();
