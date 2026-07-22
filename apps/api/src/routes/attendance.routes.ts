import { Router } from 'express';
import {
  clockIn,
  clockOut,
  getTodayStatus,
  getMyCalendar,
  getAttendanceLogs,
} from '../controllers/attendance.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/today-status', getTodayStatus);
router.get('/my-calendar', getMyCalendar);

// Supervisor / Admin routes
router.get('/logs', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.HR, Role.MANAGER), getAttendanceLogs);

export default router;
