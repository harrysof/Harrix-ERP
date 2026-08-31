import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto.js';
import { CreateTimeEntryDto } from './dto/time-entry.dto.js';
import { CreateAbsenceDto } from './dto/absence.dto.js';
import {
  ABSENCE_TYPES,
  absenceDaysInRange,
  EXPECTED_HOURS_PER_DAY,
  hoursWorkedInRange,
  payEstimateOf,
  tenureOf,
} from './payroll-math.js';

export interface EmployeeFilters {
  includeArchived?: boolean;
  search?: string;
}

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- employees

  async listEmployees(filters: EmployeeFilters = {}) {
    const employees = await this.prisma.employee.findMany({
      where: {
        ...(filters.includeArchived ? {} : { archived: false }),
        ...(filters.search
          ? {
              OR: [
                { fullName: { contains: filters.search } },
                { position: { contains: filters.search } },
              ],
            }
          : {}),
      },
      orderBy: { fullName: 'asc' },
    });
    return employees.map((e) => decorate(e));
  }

  async getEmployee(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        timeEntries: { orderBy: { date: 'desc' }, take: 60 },
        absences: { orderBy: { startDate: 'desc' }, take: 60 },
      },
    });
    if (!employee) throw new NotFoundException(`Employé introuvable : ${id}`);
    return decorate(employee);
  }

  async createEmployee(dto: CreateEmployeeDto) {
    this.assertContractConsistent(dto.contractType, dto.contractEndDate);

    const employee = await this.prisma.employee.create({
      data: {
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
        position: dto.position.trim(),
        hireDate: new Date(dto.hireDate),
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        nin: dto.nin?.trim() || null,
        cnasNumber: dto.cnasNumber?.trim() || null,
        contractType: dto.contractType ?? 'CDI',
        contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : null,
        maritalStatus: dto.maritalStatus ?? null,
        dependentChildren: dto.dependentChildren ?? 0,
        salary: dto.salary,
        bankRib: dto.bankRib?.trim() || null,
        emergencyContactName: dto.emergencyContactName?.trim() || null,
        emergencyContactPhone: dto.emergencyContactPhone?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });
    return decorate(employee);
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto) {
    const existing = await this.requireEmployee(id);

    const contractType = dto.contractType ?? existing.contractType;
    const contractEndDate = dto.contractEndDate !== undefined ? dto.contractEndDate : existing.contractEndDate?.toISOString();
    this.assertContractConsistent(contractType, contractEndDate ?? undefined);

    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() || null } : {}),
        ...(dto.position !== undefined ? { position: dto.position.trim() } : {}),
        ...(dto.hireDate !== undefined ? { hireDate: new Date(dto.hireDate) } : {}),
        ...(dto.birthDate !== undefined ? { birthDate: dto.birthDate ? new Date(dto.birthDate) : null } : {}),
        ...(dto.nin !== undefined ? { nin: dto.nin.trim() || null } : {}),
        ...(dto.cnasNumber !== undefined ? { cnasNumber: dto.cnasNumber.trim() || null } : {}),
        ...(dto.contractType !== undefined ? { contractType: dto.contractType } : {}),
        ...(dto.contractEndDate !== undefined
          ? { contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : null }
          : {}),
        ...(dto.maritalStatus !== undefined ? { maritalStatus: dto.maritalStatus } : {}),
        ...(dto.dependentChildren !== undefined ? { dependentChildren: dto.dependentChildren } : {}),
        ...(dto.salary !== undefined ? { salary: dto.salary } : {}),
        ...(dto.bankRib !== undefined ? { bankRib: dto.bankRib.trim() || null } : {}),
        ...(dto.emergencyContactName !== undefined ? { emergencyContactName: dto.emergencyContactName.trim() || null } : {}),
        ...(dto.emergencyContactPhone !== undefined
          ? { emergencyContactPhone: dto.emergencyContactPhone.trim() || null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
        // Clearing a CDI's end date if the contract type just changed away from CDD.
        ...(contractType === 'CDI' ? { contractEndDate: null } : {}),
      },
    });
    return decorate(employee);
  }

  /**
   * Archived, not deleted — a worker who leaves still has time entries and
   * absences that must stay attributable, the same reasoning as
   * Supplier.archived and User.active.
   */
  async setArchived(id: string, archived: boolean) {
    await this.requireEmployee(id);
    const employee = await this.prisma.employee.update({
      where: { id },
      data: { archived, archivedAt: archived ? new Date() : null },
    });
    return decorate(employee);
  }

  private assertContractConsistent(contractType: string | undefined, contractEndDate: string | undefined) {
    if (contractType === 'CDD' && !contractEndDate) {
      throw new BadRequestException('Un CDD doit avoir une date de fin de contrat.');
    }
  }

  private async requireEmployee(id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException(`Employé introuvable : ${id}`);
    return employee;
  }

  // ------------------------------------------------------------- time entries

  async listTimeEntries(filters: { employeeId?: string; from?: string; to?: string } = {}) {
    return this.prisma.timeEntry.findMany({
      where: {
        ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters.from || filters.to
          ? { date: { ...(filters.from ? { gte: new Date(filters.from) } : {}), ...(filters.to ? { lt: new Date(filters.to) } : {}) } }
          : {}),
      },
      orderBy: { date: 'desc' },
      include: { employee: { select: { id: true, fullName: true } } },
    });
  }

  async createTimeEntry(dto: CreateTimeEntryDto) {
    await this.requireEmployee(dto.employeeId);
    return this.prisma.timeEntry.create({
      data: {
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        hoursWorked: dto.hoursWorked,
        source: dto.source ?? 'manual',
      },
      include: { employee: { select: { id: true, fullName: true } } },
    });
  }

  async deleteTimeEntry(id: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Entrée introuvable : ${id}`);
    await this.prisma.timeEntry.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ---------------------------------------------------------------- absences

  async listAbsences(filters: { employeeId?: string; from?: string; to?: string } = {}) {
    return this.prisma.absence.findMany({
      where: {
        ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
        // An absence "touches" the range if it hasn't ended before it starts,
        // and hasn't started after it ends — the usual interval-overlap test.
        ...(filters.from ? { endDate: { gte: new Date(filters.from) } } : {}),
        ...(filters.to ? { startDate: { lt: new Date(filters.to) } } : {}),
      },
      orderBy: { startDate: 'desc' },
      include: { employee: { select: { id: true, fullName: true } } },
    });
  }

  async createAbsence(dto: CreateAbsenceDto) {
    await this.requireEmployee(dto.employeeId);
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException('La date de fin ne peut pas précéder la date de début.');

    return this.prisma.absence.create({
      data: {
        employeeId: dto.employeeId,
        type: dto.type,
        startDate: start,
        endDate: end,
        reason: dto.reason?.trim() || null,
      },
      include: { employee: { select: { id: true, fullName: true } } },
    });
  }

  async deleteAbsence(id: string) {
    const absence = await this.prisma.absence.findUnique({ where: { id } });
    if (!absence) throw new NotFoundException(`Absence introuvable : ${id}`);
    await this.prisma.absence.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ---------------------------------------------------------------- summary

  /**
   * §HR's monthly overview: expected vs. worked hours and absence days per
   * employee, for one calendar month. Computed on read from the ledgers —
   * see payroll-math.ts for why nothing here is ever stored.
   */
  async getMonthlySummary(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('Mois invalide (format AAAA-MM attendu).');
    const [year, m] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, m - 1, 1));
    const end = new Date(Date.UTC(year, m, 1));
    const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    const expectedHours = daysInMonth * EXPECTED_HOURS_PER_DAY;

    const [employees, timeEntries, absences] = await Promise.all([
      this.prisma.employee.findMany({ where: { archived: false }, orderBy: { fullName: 'asc' } }),
      this.prisma.timeEntry.findMany({ where: { date: { gte: start, lt: end } } }),
      this.prisma.absence.findMany({ where: { startDate: { lt: end }, endDate: { gte: start } } }),
    ]);

    return {
      month,
      expectedHours,
      rows: employees.map((e) => ({
        employeeId: e.id,
        fullName: e.fullName,
        expectedHours,
        workedHours: hoursWorkedInRange(timeEntries, e.id, start, end),
        absences: Object.fromEntries(ABSENCE_TYPES.map((t) => [t, absenceDaysInRange(absences, e.id, t, start, end)])),
      })),
    };
  }
}

/** Attaches tenure and a payroll estimate — computed on every read, never stored. */
function decorate<T extends { hireDate: Date; salary: number }>(employee: T) {
  return {
    ...employee,
    tenure: tenureOf(employee.hireDate, new Date()),
    payEstimate: payEstimateOf(employee.salary),
  };
}
