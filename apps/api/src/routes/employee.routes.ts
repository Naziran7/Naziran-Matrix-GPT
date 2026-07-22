import { Router } from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
  createDepartment,
  getDesignations,
  createDesignation,
  getPerformanceReviews,
  createPerformanceReview,
  getLeaveRequests,
  createLeaveRequest,
  approveLeaveRequest
} from '../controllers/employee.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Apply auth globally for employees router
router.use(authenticateJWT);

// Static paths (Registered first to avoid /:id wildcard clashes)
router.get('/departments', getDepartments);
router.post('/departments', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.HR), createDepartment);

router.get('/designations', getDesignations);
router.post('/designations', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.HR), createDesignation);

router.get('/reviews', getPerformanceReviews);
router.post('/reviews', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.HR, Role.MANAGER), createPerformanceReview);

router.get('/leaves', getLeaveRequests);
router.post('/leaves', createLeaveRequest);
router.patch('/leaves/:id', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.HR, Role.MANAGER), approveLeaveRequest);

// Dynamic/Wildcard paths
router.get('/', getEmployees);
router.get('/:id', getEmployeeById);
router.post('/', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.HR), createEmployee);
router.put('/:id', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.HR, Role.MANAGER), updateEmployee);
router.delete('/:id', authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.HR), deleteEmployee);

export default router;
