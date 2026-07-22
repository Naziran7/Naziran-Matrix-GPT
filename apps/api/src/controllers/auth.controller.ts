import { Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { Role } from '@prisma/client';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key';

const generateTokens = (user: { id: string; email: string; role: Role; name: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      throw new AppError('Name, email, and password are required', 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email is already registered', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    // Since users must be employees, let's create a placeholder employee profile first
    // Or link them to an employee profile if one is created later.
    // For registration, we will create a default employee shell to make data consistent.
    const defaultDept = await prisma.department.findFirst();
    const defaultDesig = await prisma.designation.findFirst();

    if (!defaultDept || !defaultDesig) {
      throw new AppError('Initialize departments and designations before registration', 500);
    }

    const [first, ...lastParts] = name.split(' ');
    const last = lastParts.join(' ') || 'Employee';

    const employee = await prisma.employee.create({
      data: {
        firstName: first,
        lastName: last,
        email,
        departmentId: defaultDept.id,
        designationId: defaultDesig.id,
      }
    });

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        role: (role as Role) || Role.EMPLOYEE,
        verificationToken,
        isVerified: true,
        employeeProfileId: employee.id
      }
    });

    const { accessToken, refreshToken } = generateTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        details: 'User registered account successfully',
        ipAddress: req.ip || 'unknown'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        employeeProfileId: user.employeeProfileId
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: 'User logged in successfully',
        ipAddress: req.ip || 'unknown'
      }
    });

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        employeeProfileId: user.employeeProfileId
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token) {
      throw new AppError('Refresh token is required', 400);
    }

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { id: string; email: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || user.refreshToken !== token) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const tokens = generateTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken }
    });

    res.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    next(new AppError('Invalid refresh token signature', 401));
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token) {
      throw new AppError('Token is required for logout', 400);
    }

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
    await prisma.user.update({
      where: { id: decoded.id },
      data: { refreshToken: null }
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully (token expired)'
    });
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;
    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: token as string }
    });

    if (!user) {
      throw new AppError('Invalid verification token', 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null }
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.'
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new AppError('Email is required', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return 200 even if user doesn't exist for security reasons
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      });
    }

    const resetToken = uuidv4();
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour expiry

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires }
    });

    console.log(`[Reset Password Email] Sent to ${email} - Reset Link Token: ${resetToken}`);

    res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.'
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw new AppError('Token and new password are required', 400);
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gte: new Date() }
      }
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        resetToken: null,
        resetTokenExpires: null,
        refreshToken: null // Force log out everywhere
      }
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login.'
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        createdAt: true,
        employeeProfile: {
          include: {
            department: true,
            designation: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new passwords are required', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Incorrect current password', 401);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash }
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};
