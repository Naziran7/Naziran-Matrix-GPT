import { Router } from 'express';
import {
  generatePayroll,
  paySalary,
  getPayrollHistory,
  getPayslipData,
} from '../controllers/payroll.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.get('/history', getPayrollHistory);
router.get('/payslip/:id', getPayslipData);

// HR/Admin/Finance operations
router.post('/generate', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.HR, Role.FINANCE), generatePayroll);
router.post('/pay/:id', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.HR, Role.FINANCE), paySalary);

export default router;
