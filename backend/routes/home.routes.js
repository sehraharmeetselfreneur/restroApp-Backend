import express from 'express';

import { getNearByRestaurantsController } from '../controllers/home.controller.js';

const router = express.Router();

router.get('/restaurants', getNearByRestaurantsController);

export default router;