import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  registrationNumber: text("registration_number").notNull().unique(),
  position: text("position").notNull(),
  observations: text("observations"),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
});

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export const hoursBank = pgTable("hours_bank", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  hours: integer("hours").notNull(),
  description: text("description"),
});

export const insertHoursBankSchema = createInsertSchema(hoursBank).omit({
  id: true,
});

export type InsertHoursBank = z.infer<typeof insertHoursBankSchema>;
export type HoursBank = typeof hoursBank.$inferSelect;

export const vacationPeriods = pgTable("vacation_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
});

export const insertVacationSchema = createInsertSchema(vacationPeriods).omit({
  id: true,
});

export type InsertVacation = z.infer<typeof insertVacationSchema>;
export type VacationPeriod = typeof vacationPeriods.$inferSelect;

export const leavePeriods = pgTable("leave_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
});

export const insertLeaveSchema = createInsertSchema(leavePeriods).omit({
  id: true,
});

export type InsertLeave = z.infer<typeof insertLeaveSchema>;
export type LeavePeriod = typeof leavePeriods.$inferSelect;

export const paidDaysOff = pgTable("paid_days_off", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  date: text("date").notNull(),
  hours: integer("hours").notNull(),
  year: integer("year").notNull(),
  initialHours: integer("initial_hours"),
});

export const insertPaidDayOffSchema = createInsertSchema(paidDaysOff).omit({
  id: true,
});

export type InsertPaidDayOff = z.infer<typeof insertPaidDayOffSchema>;
export type PaidDayOff = typeof paidDaysOff.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
