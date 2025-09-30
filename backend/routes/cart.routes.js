import express from 'express';

import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

import {
    addToCartController,
    clearCartController,
    removeFoodItemFromCartController,
    removeFromCartController
} from '../controllers/cart.controller.js';

const router = express.Router();

router.post('/add', authMiddleware, roleMiddleware(["Customer"]), addToCartController);

router.post('/remove/:foodItemId/:variantId', authMiddleware, roleMiddleware(["Customer"]), removeFromCartController);

router.post('/delete', authMiddleware, roleMiddleware(["Customer"]), removeFoodItemFromCartController);

router.delete('/clear', authMiddleware, roleMiddleware(["Customer"]), clearCartController);

export default router;