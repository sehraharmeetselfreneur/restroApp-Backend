import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { createOrderController } from '../controllers/order.controller.js';

const router = express.Router();

router.post('/create', authMiddleware, roleMiddleware(["Customer"]), createOrderController);
// router.get('/:id');
// router.put('/:id/cancel');
// router.put('/:id/status');

export default router;