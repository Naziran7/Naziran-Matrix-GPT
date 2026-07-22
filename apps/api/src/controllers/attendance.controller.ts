import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';
import { AttendanceStatus, Role } from '@prisma/client';

export const clockIn = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.user?.employeeProfileId;
    if (!employeeId) {
      throw new AppError('User profile not linked to an Employee record', 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: today,
      },
    });

    if (existingAttendance) {
      throw new AppError('Already clocked in today', 400);
    }

    const now = new Date();
    const shiftStart = new Date(now);
    shiftStart.setHours(9, 0, 0, 0); // 9:00 AM standard shift start

    let status = AttendanceStatus.PRESENT;
    let lateMinutes = 0;

    if (now > shiftStart) {
      status = AttendanceStatus.LATE;
      lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / (1000 * 60));
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: today,
        clockIn: now,
        status,
        lateMinutes,
      },
    });

    res.status(201).json({ success: true, message: 'Clocked in successfully', attendance });
  } catch (error) {
    next(error);
  }
};

export const clockOut = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.user?.employeeProfileId;
    if (!employeeId) {
      throw new AppError('User profile not linked to an Employee record', 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: today,
      },
    });

    if (!attendance) {
      throw new AppError('No clock-in record found for today', 400);
    }

    if (attendance.clockOut) {
      throw new AppError('Already clocked out today', 400);
    }

    const now = new Date();
    const clockInTime = new Date(attendance.clockIn);
    const workingHours = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

    let overtimeHours = 0;
    const regularHours = 9; // 9-hour workday including lunch
    if (workingHours > regularHours) {
      overtimeHours = parseFloat((workingHours - regularHours).toFixed(2));
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOut: now,
        overtimeHours,
      },
    });

    res.status(200).json({ success: true, message: 'Clocked out successfully', attendance: updatedAttendance });
  } catch (error) {
    next(error);
  }
};

export const getTodayStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.user?.employeeProfileId;
    if (!employeeId) {
      throw new AppError('User profile not linked to an Employee record', 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: today,
      },
    });

    res.status(200).json({
      success: true,
      clockedIn: !!attendance,
      clockedOut: !!(attendance && attendance.clockOut),
      record: attendance || null,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyCalendar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.user?.employeeProfileId;
    if (!employeeId) {
      throw new AppError('User profile not linked to an Employee record', 400);
    }

    const { month, year } = req.query; // 1-12, 2026 etc
    const filterYear = year ? parseInt(year as string) : new Date().getFullYear();
    const filterMonth = month ? parseInt(month as string) - 1 : new Date().getMonth();

    const startDate = new Date(filterYear, filterMonth, 1);
    const endDate = new Date(filterYear, filterMonth + 1, 0);

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    res.status(200).json({ success: true, records });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { departmentId, date } = req.query;
    const filter: any = {};

    if (date) {
      const searchDate = new Date(date as string);
      searchDate.setHours(0, 0, 0, 0);
      filter.date = searchDate;
    }

    if (departmentId) {
      filter.employee = {
        departmentId: departmentId as string,
      };
    }

    const logs = await prisma.attendance.findMany({
      where: filter,
      include: {
        employee: {
          include: {
            department: true,
            designation: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.status(200).json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};
