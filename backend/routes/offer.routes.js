import express from 'express';

import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

import { createOfferController } from '../controllers/offer.controller.js';

const router = express.Router();

router.post('/create', authMiddleware, roleMiddleware(["Restaurant"]), createOfferController);

export default router;