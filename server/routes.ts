import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { storage } from './storage';
import {
  insertEmployeeSchema,
  insertHoursBankSchema,
  insertVacationSchema,
  insertLeaveSchema,
  insertPaidDayOffSchema,
} from '@shared/schema';

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get('/api/employees', async (_req: Request, res: Response) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar funcionários' });
    }
  });

  app.get('/api/employees/:id', async (req: Request, res: Response) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: 'Funcionário não encontrado' });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar funcionário' });
    }
  });

  app.post('/api/employees', async (req: Request, res: Response) => {
    try {
      const parsed = insertEmployeeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: parsed.error.flatten(),
        });
      }

      const existing = await storage.getEmployeeByRegistration(
        parsed.data.registrationNumber,
      );
      if (existing) {
        return res.status(400).json({ message: 'Matrícula já cadastrada' });
      }

      const employee = await storage.createEmployee(parsed.data);
      res.status(201).json(employee);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao criar funcionário' });
    }
  });

  app.post('/api/employees/bulk', async (req: Request, res: Response) => {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res
          .status(400)
          .json({ message: 'Nenhuma linha válida no arquivo' });
      }

      const sanitizeRegistration = (reg: string): string => {
        return reg.replace(/[\s.-]/g, '').trim();
      };

      const existingEmployees = await storage.getAllEmployees();
      const sanitizedExisting = new Set(
        existingEmployees.map((e) =>
          sanitizeRegistration(e.registrationNumber),
        ),
      );

      const duplicates: Array<{
        row: number;
        fullName: string;
        registrationNumber: string;
        reason: string;
      }> = [];
      let created = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const { fullName, registrationNumber, position } = row;

        // Validate required fields
        if (!fullName || !registrationNumber || !position) {
          duplicates.push({
            row: i + 1,
            fullName: fullName || 'Desconhecido',
            registrationNumber: registrationNumber || 'Vazio',
            reason: 'Dados incompletos',
          });
          continue;
        }

        const sanitized = sanitizeRegistration(registrationNumber);
        if (sanitizedExisting.has(sanitized)) {
          duplicates.push({
            row: i + 1,
            fullName,
            registrationNumber,
            reason: 'Matrícula já existe',
          });
          continue;
        }

        try {
          // Create employee with sanitized registration number
          const employee = await storage.createEmployee({
            fullName,
            registrationNumber: sanitized,
            position,
          });
          sanitizedExisting.add(sanitized);
          created++;
        } catch (error) {
          duplicates.push({
            row: i + 1,
            fullName,
            registrationNumber,
            reason: 'Erro ao criar',
          });
        }
      }

      res.status(200).json({
        totalRows: rows.length,
        created,
        duplicates,
      });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao processar importação' });
    }
  });

  app.patch('/api/employees/:id', async (req: Request, res: Response) => {
    try {
      const existingEmployee = await storage.getEmployee(req.params.id);
      if (!existingEmployee) {
        return res.status(404).json({ message: 'Funcionário não encontrado' });
      }

      if (
        req.body.registrationNumber &&
        req.body.registrationNumber !== existingEmployee.registrationNumber
      ) {
        const existingRegistration = await storage.getEmployeeByRegistration(
          req.body.registrationNumber,
        );
        if (existingRegistration) {
          return res.status(400).json({ message: 'Matrícula já cadastrada' });
        }
      }

      const employee = await storage.updateEmployee(req.params.id, req.body);
      if (!employee) {
        return res.status(404).json({ message: 'Funcionário não encontrado' });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao atualizar funcionário' });
    }
  });

  app.delete('/api/employees/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteEmployee(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'Funcionário não encontrado' });
      }
      res.status(200).json({ success: true, message: 'Funcionário removido' });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao remover funcionário' });
    }
  });

  app.get('/api/hours-bank', async (_req: Request, res: Response) => {
    try {
      const entries = await storage.getAllHoursBank();
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar banco de horas' });
    }
  });

  app.get(
    '/api/hours-bank/employee/:employeeId',
    async (req: Request, res: Response) => {
      try {
        const entries = await storage.getHoursBankByEmployee(
          req.params.employeeId,
        );
        res.json(entries);
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar banco de horas' });
      }
    },
  );

  app.post('/api/hours-bank', async (req: Request, res: Response) => {
    try {
      const parsed = insertHoursBankSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: parsed.error.flatten(),
        });
      }

      const employee = await storage.getEmployee(parsed.data.employeeId);

      if (!employee) {
        return res.status(400).json({ message: 'Funcionário não encontrado' });
      }

      const entry = await storage.createHoursBank(parsed.data);
      res.status(201).json(entry);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao criar lançamento' });
    }
  });

  app.delete('/api/hours-bank/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteHoursBank(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'Lançamento não encontrado' });
      }
      res.status(200).json({ success: true, message: 'Lançamento removido' });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao remover lançamento' });
    }
  });

  app.get('/api/vacations', async (_req: Request, res: Response) => {
    try {
      const vacations = await storage.getAllVacations();
      res.json(vacations);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar férias' });
    }
  });

  app.get(
    '/api/vacations/employee/:employeeId',
    async (req: Request, res: Response) => {
      try {
        const vacations = await storage.getVacationsByEmployee(
          req.params.employeeId,
        );
        res.json(vacations);
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar férias' });
      }
    },
  );

  app.post('/api/vacations', async (req: Request, res: Response) => {
    try {
      const parsed = insertVacationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: parsed.error.flatten(),
        });
      }

      const employee = await storage.getEmployee(parsed.data.employeeId);
      if (!employee) {
        return res.status(400).json({ message: 'Funcionário não encontrado' });
      }

      const vacation = await storage.createVacation(parsed.data);
      res.status(201).json(vacation);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao criar período de férias' });
    }
  });

  app.patch('/api/vacations/:id', async (req: Request, res: Response) => {
    try {
      const vacation = await storage.updateVacation(req.params.id, req.body);
      if (!vacation) {
        return res
          .status(404)
          .json({ message: 'Período de férias não encontrado' });
      }
      res.json(vacation);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao atualizar período de férias' });
    }
  });

  app.delete('/api/vacations/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteVacation(req.params.id);
      if (!deleted) {
        return res
          .status(404)
          .json({ message: 'Período de férias não encontrado' });
      }
      res
        .status(200)
        .json({ success: true, message: 'Período de férias removido' });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao remover período de férias' });
    }
  });

  app.get('/api/leaves', async (_req: Request, res: Response) => {
    try {
      const leaves = await storage.getAllLeaves();
      res.json(leaves);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar licenças' });
    }
  });

  app.get(
    '/api/leaves/employee/:employeeId',
    async (req: Request, res: Response) => {
      try {
        const leaves = await storage.getLeavesByEmployee(req.params.employeeId);
        res.json(leaves);
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar licenças' });
      }
    },
  );

  app.post('/api/leaves', async (req: Request, res: Response) => {
    try {
      const parsed = insertLeaveSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: parsed.error.flatten(),
        });
      }

      const employee = await storage.getEmployee(parsed.data.employeeId);
      if (!employee) {
        return res.status(400).json({ message: 'Funcionário não encontrado' });
      }

      const leave = await storage.createLeave(parsed.data);
      res.status(201).json(leave);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao criar período de licença' });
    }
  });

  app.patch('/api/leaves/:id', async (req: Request, res: Response) => {
    try {
      const leave = await storage.updateLeave(req.params.id, req.body);
      if (!leave) {
        return res
          .status(404)
          .json({ message: 'Período de licença não encontrado' });
      }
      res.json(leave);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao atualizar período de licença' });
    }
  });

  app.delete('/api/leaves/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteLeave(req.params.id);
      if (!deleted) {
        return res
          .status(404)
          .json({ message: 'Período de licença não encontrado' });
      }
      res
        .status(200)
        .json({ success: true, message: 'Período de licença removido' });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao remover período de licença' });
    }
  });

  app.get('/api/paid-days-off', async (_req: Request, res: Response) => {
    try {
      const daysOff = await storage.getAllPaidDaysOff();
      res.json(daysOff);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar folgas abonadas' });
    }
  });

  app.get(
    '/api/paid-days-off/employee/:employeeId',
    async (req: Request, res: Response) => {
      try {
        const daysOff = await storage.getPaidDaysOffByEmployee(
          req.params.employeeId,
        );
        res.json(daysOff);
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar folgas abonadas' });
      }
    },
  );

  app.post('/api/paid-days-off', async (req: Request, res: Response) => {
    try {
      const parsed = insertPaidDayOffSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: 'Dados inválidos',
          errors: parsed.error.flatten(),
        });
      }

      const employee = await storage.getEmployee(parsed.data.employeeId);
      if (!employee) {
        return res.status(400).json({ message: 'Funcionário não encontrado' });
      }

      const dayOff = await storage.createPaidDayOff(parsed.data);
      res.status(201).json(dayOff);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao criar folga abonada' });
    }
  });

  app.delete('/api/paid-days-off/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deletePaidDayOff(req.params.id);
      if (!deleted) {
        return res
          .status(404)
          .json({ message: 'Folga abonada não encontrada' });
      }
      res
        .status(200)
        .json({ success: true, message: 'Folga abonada removida' });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao remover folga abonada' });
    }
  });

  return httpServer;
}
