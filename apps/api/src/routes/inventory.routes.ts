import { Router } from 'express';
import {
  getCategories,
  createCategory,
  getSuppliers,
  createSupplier,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  getPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
} from '../controllers/inventory.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateJWT);

// Categories
router.get('/categories', getCategories);
router.post('/categories', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER), createCategory);

// Suppliers
router.get('/suppliers', getSuppliers);
router.post('/suppliers', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER), createSupplier);

// Purchase Orders
router.get('/purchase-orders', getPurchaseOrders);
router.post('/purchase-orders', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FINANCE), createPurchaseOrder);
router.post('/purchase-orders/:id/receive', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FINANCE), receivePurchaseOrder);

// Products
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.post('/products', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER), createProduct);
router.put('/products/:id', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER), updateProduct);

export default router;
