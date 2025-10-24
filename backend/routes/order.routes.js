import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { createOrderController, updateOrderStatusController } from '../controllers/order.controller.js';

const router = express.Router();

router.post('/create', authMiddleware, roleMiddleware(["Customer"]), createOrderController);
router.put('/:orderId/status', authMiddleware, roleMiddleware(["Restaurant"]), updateOrderStatusController);

export default router;