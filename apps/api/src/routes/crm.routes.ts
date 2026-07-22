import { Router } from 'express';
import {
  getCRMOverview,
  createLead,
  updateLeadStatus,
  createOpportunity,
  updateOpportunityStage,
  getDeals,
  updateCustomerNotes,
} from '../controllers/crm.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

router.get('/overview', getCRMOverview);
router.get('/deals', getDeals);

// CRM Manager / Sales / Admin actions
router.post('/leads', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES, Role.MANAGER), createLead);
router.patch('/leads/:id/status', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES, Role.MANAGER), updateLeadStatus);

router.post('/opportunities', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES, Role.MANAGER), createOpportunity);
router.patch('/opportunities/:id/stage', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES, Role.MANAGER), updateOpportunityStage);

router.patch('/customers/:id/notes', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES, Role.MANAGER), updateCustomerNotes);

export default router;
