import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';
import { Role, LeaveStatus, LeaveType } from '@prisma/client';

// --- Employee Core CRUD ---

export const getEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, departmentId, status } = req.query;

    const filter: any = {};
    if (departmentId) {
      filter.departmentId = departmentId as string;
    }
    if (status) {
      filter.status = status as string;
    }
    if (search) {
      filter.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const employees = await prisma.employee.findMany({
      where: filter,
      include: {
        department: true,
        designation: true,
      },
      orderBy: { firstName: 'asc' }
    });

    res.status(200).json({ success: true, employees });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        designation: true,
        user: { select: { id: true, role: true, isVerified: true } },
        reviews: { orderBy: { reviewDate: 'desc' } },
        leaveRequests: { orderBy: { startDate: 'desc' } },
        attendance: { orderBy: { date: 'desc' }, take: 30 }
      }
    });

    if (!employee) {
      throw new AppError('Employee profile not found', 404);
    }

    res.status(200).json({ success: true, employee });
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, phone, address, salary, departmentId, designationId, status, createAccount, role } = req.body;

    if (!firstName || !lastName || !email || !departmentId || !designationId) {
      throw new AppError('First name, last name, email, department, and designation are required', 400);
    }

    const existingEmp = await prisma.employee.findUnique({ where: { email } });
    if (existingEmp) {
      throw new AppError('An employee with this email already exists', 400);
    }

    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        address,
        salary: salary ? parseFloat(salary) : 0,
        departmentId,
        designationId,
        status: status || 'Active',
      }
    });

    // Optionally create user account automatically
    if (createAccount) {
      const defaultPassword = 'Password123';
      const passwordHash = await prisma.user.findFirst().then(async () => {
        const bcrypt = require('bcrypt');
        return await bcrypt.hash(defaultPassword, 10);
      });

      await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          name: `${firstName} ${lastName}`,
          role: (role as Role) || Role.EMPLOYEE,
          isVerified: true,
          employeeProfileId: employee.id
        }
      });
      console.log(`[Account Created] Account created for ${email} with role ${role || 'EMPLOYEE'}. Default pass: ${defaultPassword}`);
    }

    res.status(201).json({ success: true, message: 'Employee created successfully', employee });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, address, salary, departmentId, designationId, status, profilePhoto } = req.body;

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        firstName,
        lastName,
        phone,
        address,
        salary: salary ? parseFloat(salary) : undefined,
        departmentId,
        designationId,
        status,
        profilePhoto
      }
    });

    // Sync User name if exists
    await prisma.user.updateMany({
      where: { employeeProfileId: id },
      data: { name: `${employee.firstName} ${employee.lastName}` }
    });

    res.status(200).json({ success: true, message: 'Employee profile updated successfully', employee });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // Set employee status to Terminated rather than hard delete for history
    const employee = await prisma.employee.update({
      where: { id },
      data: { status: 'Terminated' }
    });

    res.status(200).json({ success: true, message: 'Employee terminated successfully', employee });
  } catch (error) {
    next(error);
  }
};

// --- Department and Designation Controllers ---

export const getDepartments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        designations: true,
        employees: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, departments });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, managerId } = req.body;
    if (!name) {
      throw new AppError('Department name is required', 400);
    }

    const dept = await prisma.department.create({
      data: { name, description, managerId }
    });
    res.status(201).json({ success: true, department: dept });
  } catch (error) {
    next(error);
  }
};

export const getDesignations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { departmentId } = req.query;
    const filter = departmentId ? { departmentId: departmentId as string } : {};

    const designations = await prisma.designation.findMany({
      where: filter,
      include: { department: true },
      orderBy: { title: 'asc' }
    });
    res.status(200).json({ success: true, designations });
  } catch (error) {
    next(error);
  }
};

export const createDesignation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, basicSalary, departmentId } = req.body;
    if (!title || !departmentId) {
      throw new AppError('Designation title and departmentId are required', 400);
    }

    const desig = await prisma.designation.create({
      data: {
        title,
        basicSalary: basicSalary ? parseFloat(basicSalary) : 0,
        departmentId
      }
    });
    res.status(201).json({ success: true, designation: desig });
  } catch (error) {
    next(error);
  }
};

// --- Performance Review Controllers ---

export const getPerformanceReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId } = req.query;
    const filter = employeeId ? { employeeId: employeeId as string } : {};

    const reviews = await prisma.performanceReview.findMany({
      where: filter,
      include: { employee: { include: { department: true, designation: true } } },
      orderBy: { reviewDate: 'desc' }
    });
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    next(error);
  }
};

export const createPerformanceReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, score, feedback, goals } = req.body;
    if (!employeeId || !score || !feedback) {
      throw new AppError('EmployeeId, score, and feedback are required', 400);
    }

    const review = await prisma.performanceReview.create({
      data: {
        employeeId,
        score: parseInt(score),
        feedback,
        goals,
        reviewerName: req.user?.name || 'Reviewer'
      }
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    next(error);
  }
};

// --- Leave Requests Controllers ---

export const getLeaveRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { employeeId, status } = req.query;
    const filter: any = {};

    if (employeeId) {
      filter.employeeId = employeeId as string;
    }
    if (status) {
      filter.status = status as LeaveStatus;
    }

    // Standard employees can only view their own leave requests
    if (req.user?.role === Role.EMPLOYEE && req.user.employeeProfileId) {
      filter.employeeId = req.user.employeeProfileId;
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: filter,
      include: { employee: { include: { department: true, designation: true } } },
      orderBy: { startDate: 'desc' }
    });

    res.status(200).json({ success: true, leaves });
  } catch (error) {
    next(error);
  }
};

export const createLeaveRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    if (!leaveType || !startDate || !endDate || !reason) {
      throw new AppError('Leave type, start date, end date, and reason are required', 400);
    }

    const employeeId = req.user?.employeeProfileId;
    if (!employeeId) {
      throw new AppError('User profile is not linked to an Employee record', 400);
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveType: leaveType as LeaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: LeaveStatus.PENDING
      }
    });

    res.status(201).json({ success: true, leave });
  } catch (error) {
    next(error);
  }
};

export const approveLeaveRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // APPROVED or REJECTED

    if (!status || !Object.values(LeaveStatus).includes(status)) {
      throw new AppError('Valid approval status (APPROVED or REJECTED) is required', 400);
    }

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status as LeaveStatus,
        approvedBy: req.user?.name || 'Manager'
      },
      include: { employee: true }
    });

    // Notify employee
    const user = await prisma.user.findFirst({ where: { employeeProfileId: leave.employeeId } });
    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: `Leave Request ${status.toLowerCase()}`,
          message: `Your leave request for ${new Date(leave.startDate).toLocaleDateString()} has been ${status.toLowerCase()} by ${req.user?.name}.`,
          type: status === LeaveStatus.APPROVED ? 'success' : 'error'
        }
      });
    }

    res.status(200).json({ success: true, message: `Leave request status updated to ${status}`, leave });
  } catch (error) {
    next(error);
  }
};
