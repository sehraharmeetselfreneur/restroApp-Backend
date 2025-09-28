import express from 'express';

import { getNearByRestaurantsController, getParticularRestaurantController } from '../controllers/home.controller.js';

const router = express.Router();

router.get('/restaurants', getNearByRestaurantsController);
router.get('/restaurant/:id', getParticularRestaurantController);

export default router;