import express from "express";
import { getRestaurantReviewsController } from "../controllers/review.controller.js";

const router = express.Router();

// router.post('/');
router.get('/restaurant/:id', getRestaurantReviewsController);
// router.get('/food/:id');
// router.put('/:id');
// router.delete('/:id');

export default router;