import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post('/create', authMiddleware, roleMiddleware(["Customer"]));
router.post('/verify', authMiddleware, roleMiddleware(["Customer"]));
router.get('/cod', authMiddleware, roleMiddleware(["Customer"]));
router.get('/:id', authMiddleware, roleMiddleware(["Customer"]));

export default router;