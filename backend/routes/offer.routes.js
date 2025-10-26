import express from 'express';

import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

import { createOfferController, deleteOfferController, toggleOfferStatusController } from '../controllers/offer.controller.js';

const router = express.Router();

router.post('/create', authMiddleware, roleMiddleware(["Restaurant"]), createOfferController);

router.put('/status/:offerId', authMiddleware, roleMiddleware(["Restaurant"]), toggleOfferStatusController);

router.delete('/delete/:offerId', authMiddleware, roleMiddleware(["Restaurant"]), deleteOfferController);

export default router;