import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';
import { PayrollStatus, TransactionType } from '@prisma/client';

export const generatePayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, month, year, allowance, bonus, deductions } = req.body;

    if (!employeeId || !month || !year) {
      throw new AppError('EmployeeId, month, and year are required', 400);
    }

    // Check if payroll already exists for this employee/month/year
    const existingPayroll = await prisma.payroll.findUnique({
      where: {
        employeeId_month_year: {
          employeeId,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
    });

    if (existingPayroll) {
      throw new AppError('Payroll already generated for this employee for the specified period', 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { designation: true },
    });

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const basicSalary = employee.salary || employee.designation.basicSalary || 0;
    const addAllowance = allowance ? parseFloat(allowance) : 0;
    const addBonus = bonus ? parseFloat(bonus) : 0;
    const subDeductions = deductions ? parseFloat(deductions) : 0;

    // Simple Tax Calculation (progressive tax slabs)
    let tax = 0;
    const taxableIncome = basicSalary + addAllowance + addBonus;
    if (taxableIncome > 100000) {
      tax = taxableIncome * 0.20; // 20% tax
    } else if (taxableIncome > 70000) {
      tax = taxableIncome * 0.15; // 15% tax
    } else if (taxableIncome > 50000) {
      tax = taxableIncome * 0.10; // 10% tax
    } else if (taxableIncome > 30000) {
      tax = taxableIncome * 0.05; // 5% tax
    }

    const netSalary = taxableIncome - subDeductions - tax;

    const payroll = await prisma.payroll.create({
      data: {
        employeeId,
        month: parseInt(month),
        year: parseInt(year),
        basicSalary,
        allowance: addAllowance,
        bonus: addBonus,
        deductions: subDeductions,
        tax,
        netSalary,
        status: PayrollStatus.PENDING,
      },
      include: { employee: { include: { department: true, designation: true } } },
    });

    res.status(201).json({ success: true, message: 'Payroll generated successfully', payroll });
  } catch (error) {
    next(error);
  }
};

export const paySalary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!payroll) {
      throw new AppError('Payroll record not found', 404);
    }

    if (payroll.status === PayrollStatus.PAID) {
      throw new AppError('Salary already paid', 400);
    }

    const updatedPayroll = await prisma.payroll.update({
      where: { id },
      data: {
        status: PayrollStatus.PAID,
        payslipUrl: `/payslips/payslip_${payroll.id}.pdf`, // Mock PDF generation URL
      },
    });

    // Create a transaction record in the general finance ledger automatically!
    await prisma.transaction.create({
      data: {
        type: TransactionType.EXPENSE,
        category: 'Salary',
        amount: payroll.netSalary,
        description: `Salary payout to ${payroll.employee.firstName} ${payroll.employee.lastName} for ${payroll.month}/${payroll.year}`,
        referenceId: payroll.id,
      },
    });

    // Notify employee
    const user = await prisma.user.findFirst({ where: { employeeProfileId: payroll.employeeId } });
    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Salary Disbursed',
          message: `Your net salary of $${payroll.netSalary.toLocaleString()} for ${payroll.month}/${payroll.year} has been disbursed.`,
          type: 'success',
        },
      });
    }

    res.status(200).json({ success: true, message: 'Salary disbursed successfully', payroll: updatedPayroll });
  } catch (error) {
    next(error);
  }
};

export const getPayrollHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, month, year } = req.query;
    const filter: any = {};

    if (employeeId) {
      filter.employeeId = employeeId as string;
    }
    if (month) {
      filter.month = parseInt(month as string);
    }
    if (year) {
      filter.year = parseInt(year as string);
    }

    // Standard employees can only view their own payroll records
    if (req.user?.role === 'EMPLOYEE' && req.user.employeeProfileId) {
      filter.employeeId = req.user.employeeProfileId;
    }

    const history = await prisma.payroll.findMany({
      where: filter,
      include: {
        employee: {
          include: {
            department: true,
            designation: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.status(200).json({ success: true, history });
  } catch (error) {
    next(error);
  }
};

export const getPayslipData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true,
            designation: true,
          },
        },
      },
    });

    if (!payroll) {
      throw new AppError('Payroll record not found', 404);
    }

    // Check permissions: Standard employees can only see their own payslip
    if (req.user?.role === 'EMPLOYEE' && req.user.employeeProfileId !== payroll.employeeId) {
      throw new AppError('Access forbidden: you can only view your own payslips', 403);
    }

    res.status(200).json({ success: true, payslip: payroll });
  } catch (error) {
    next(error);
  }
};
