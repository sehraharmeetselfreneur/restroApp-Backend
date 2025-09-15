import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';

const router = express.Router();

//Auth routes
router.post('/signup');
router.post('/login');
router.post('/verify-otp');
router.post('/resend-otp');

//Profile routes
router.get('/profile', authMiddleware, roleMiddleware(["Restaurant"]));
router.put('/profile', authMiddleware, roleMiddleware(["Restaurant"]));

//Menu routes
router.post('/menu', authMiddleware, roleMiddleware(["Restaurant"]));
router.get('/menu', authMiddleware, roleMiddleware(["Restaurant"]));
router.put('/menu/:id', authMiddleware, roleMiddleware(["Restaurant"]));
router.delete('/menu/:id', authMiddleware, roleMiddleware(["Restaurant"]));

//Orders routes
router.get('/orders', authMiddleware, roleMiddleware(["Restaurant"]));
router.put('/orders/:id/status', authMiddleware, roleMiddleware(["Restaurant"]));

//Offers routes
router.post('/offers', authMiddleware, roleMiddleware(["Restaurant"]));
router.get('/offers', authMiddleware, roleMiddleware(["Restaurant"]));

//Dashboard routes
router.get('/dashboard/summary', authMiddleware, roleMiddleware(["Restaurant"]));
router.get('/dashboard/popular-items', authMiddleware, roleMiddleware(["Restaurant"]));
router.get('/dashboard/stats', authMiddleware, roleMiddleware(["Restaurant"]));

export default router;