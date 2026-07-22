import { Router } from 'express';
import {
  getCustomers,
  createCustomer,
  getOrders,
  createOrder,
  payInvoice,
  getInvoices,
  getQuotations,
  createQuotation,
} from '../controllers/sales.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

// Customers
router.get('/customers', getCustomers);
router.post('/customers', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES, Role.MANAGER), createCustomer);

// Orders
router.get('/orders', getOrders);
router.post('/orders', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES, Role.MANAGER), createOrder);

// Invoices
router.get('/invoices', getInvoices);
router.post('/invoices/:id/pay', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.FINANCE, Role.MANAGER), payInvoice);

// Quotations
router.get('/quotations', getQuotations);
router.post('/quotations', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES, Role.MANAGER), createQuotation);

export default router;
