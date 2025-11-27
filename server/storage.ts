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
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByRegistration(registrationNumber: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;

  getAllHoursBank(): Promise<HoursBank[]>;
  getHoursBankByEmployee(employeeId: string): Promise<HoursBank[]>;
  createHoursBank(entry: InsertHoursBank): Promise<HoursBank>;
  deleteHoursBank(id: string): Promise<boolean>;

  getAllVacations(): Promise<VacationPeriod[]>;
  getVacationsByEmployee(employeeId: string): Promise<VacationPeriod[]>;
  createVacation(vacation: InsertVacation): Promise<VacationPeriod>;
  updateVacation(id: string, vacation: Partial<InsertVacation>): Promise<VacationPeriod | undefined>;
  deleteVacation(id: string): Promise<boolean>;

  getAllLeaves(): Promise<LeavePeriod[]>;
  getLeavesByEmployee(employeeId: string): Promise<LeavePeriod[]>;
  createLeave(leave: InsertLeave): Promise<LeavePeriod>;
  updateLeave(id: string, leave: Partial<InsertLeave>): Promise<LeavePeriod | undefined>;
  deleteLeave(id: string): Promise<boolean>;

  getAllPaidDaysOff(): Promise<PaidDayOff[]>;
  getPaidDaysOffByEmployee(employeeId: string): Promise<PaidDayOff[]>;
  createPaidDayOff(dayOff: InsertPaidDayOff): Promise<PaidDayOff>;
  deletePaidDayOff(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private employees: Map<string, Employee>;
  private hoursBank: Map<string, HoursBank>;
  private vacations: Map<string, VacationPeriod>;
  private leaves: Map<string, LeavePeriod>;
  private paidDaysOff: Map<string, PaidDayOff>;

  constructor() {
    this.users = new Map();
    this.employees = new Map();
    this.hoursBank = new Map();
    this.vacations = new Map();
    this.leaves = new Map();
    this.paidDaysOff = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async getEmployeeByRegistration(registrationNumber: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(
      (emp) => emp.registrationNumber === registrationNumber,
    );
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const id = randomUUID();
    const employee: Employee = { ...insertEmployee, id };
    this.employees.set(id, employee);
    return employee;
  }

  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    if (!employee) return undefined;

    const updated: Employee = { ...employee, ...data };
    this.employees.set(id, updated);
    return updated;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const deleted = this.employees.delete(id);
    if (deleted) {
      for (const [hId, h] of this.hoursBank) {
        if (h.employeeId === id) this.hoursBank.delete(hId);
      }
      for (const [vId, v] of this.vacations) {
        if (v.employeeId === id) this.vacations.delete(vId);
      }
      for (const [lId, l] of this.leaves) {
        if (l.employeeId === id) this.leaves.delete(lId);
      }
      for (const [dId, d] of this.paidDaysOff) {
        if (d.employeeId === id) this.paidDaysOff.delete(dId);
      }
    }
    return deleted;
  }

  async getAllHoursBank(): Promise<HoursBank[]> {
    return Array.from(this.hoursBank.values());
  }

  async getHoursBankByEmployee(employeeId: string): Promise<HoursBank[]> {
    return Array.from(this.hoursBank.values()).filter(
      (h) => h.employeeId === employeeId,
    );
  }

  async createHoursBank(insertEntry: InsertHoursBank): Promise<HoursBank> {
    const id = randomUUID();
    const entry: HoursBank = { ...insertEntry, id };
    this.hoursBank.set(id, entry);
    return entry;
  }

  async deleteHoursBank(id: string): Promise<boolean> {
    return this.hoursBank.delete(id);
  }

  async getAllVacations(): Promise<VacationPeriod[]> {
    return Array.from(this.vacations.values());
  }

  async getVacationsByEmployee(employeeId: string): Promise<VacationPeriod[]> {
    return Array.from(this.vacations.values()).filter(
      (v) => v.employeeId === employeeId,
    );
  }

  async createVacation(insertVacation: InsertVacation): Promise<VacationPeriod> {
    const id = randomUUID();
    // Auto-approve if start date is today or in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(insertVacation.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const status = startDate <= today ? "approved" : insertVacation.status;
    const vacation: VacationPeriod = { ...insertVacation, status, id };
    this.vacations.set(id, vacation);
    return vacation;
  }

  async updateVacation(id: string, data: Partial<InsertVacation>): Promise<VacationPeriod | undefined> {
    const vacation = this.vacations.get(id);
    if (!vacation) return undefined;

    const updated: VacationPeriod = { ...vacation, ...data };
    this.vacations.set(id, updated);
    return updated;
  }

  async deleteVacation(id: string): Promise<boolean> {
    return this.vacations.delete(id);
  }

  async getAllLeaves(): Promise<LeavePeriod[]> {
    return Array.from(this.leaves.values());
  }

  async getLeavesByEmployee(employeeId: string): Promise<LeavePeriod[]> {
    return Array.from(this.leaves.values()).filter(
      (l) => l.employeeId === employeeId,
    );
  }

  async createLeave(insertLeave: InsertLeave): Promise<LeavePeriod> {
    const id = randomUUID();
    // Auto-approve if start date is today or in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(insertLeave.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const status = startDate <= today ? "approved" : insertLeave.status;
    const leave: LeavePeriod = { ...insertLeave, status, id };
    this.leaves.set(id, leave);
    return leave;
  }

  async updateLeave(id: string, data: Partial<InsertLeave>): Promise<LeavePeriod | undefined> {
    const leave = this.leaves.get(id);
    if (!leave) return undefined;

    const updated: LeavePeriod = { ...leave, ...data };
    this.leaves.set(id, updated);
    return updated;
  }

  async deleteLeave(id: string): Promise<boolean> {
    return this.leaves.delete(id);
  }

  async getAllPaidDaysOff(): Promise<PaidDayOff[]> {
    return Array.from(this.paidDaysOff.values());
  }

  async getPaidDaysOffByEmployee(employeeId: string): Promise<PaidDayOff[]> {
    return Array.from(this.paidDaysOff.values()).filter(
      (d) => d.employeeId === employeeId,
    );
  }

  async createPaidDayOff(insertDayOff: InsertPaidDayOff): Promise<PaidDayOff> {
    const id = randomUUID();
    const dayOff: PaidDayOff = { ...insertDayOff, id };
    this.paidDaysOff.set(id, dayOff);
    return dayOff;
  }

  async deletePaidDayOff(id: string): Promise<boolean> {
    return this.paidDaysOff.delete(id);
  }
}

export const storage = new MemStorage();
