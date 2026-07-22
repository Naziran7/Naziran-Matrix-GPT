import { Router } from 'express';
import {
  getTransactions,
  createTransaction,
  getProfitLossStatement,
  getBalanceSheet,
} from '../controllers/finance.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.get('/transactions', getTransactions);
router.get('/profit-loss', getProfitLossStatement);
router.get('/balance-sheet', getBalanceSheet);

// Restricted ledger inputs
router.post('/transactions', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.FINANCE), createTransaction);

export default router;
