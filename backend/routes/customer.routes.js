import express from 'express';

//Middlewares
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

//Controllers
import { getCustomerProfileController } from '../controllers/customer.controller.js';

const router = express.Router();

//Auth routes
// router.post('/signup');
// router.post('/login');
// router.post('/verify-otp');
// router.post('/resend-otp');

//Profile routes
router.get('/profile', authMiddleware, roleMiddleware(["Customer"]), getCustomerProfileController);
router.put('/profile', authMiddleware, roleMiddleware(["Customer"]));

//Address routes
router.post('/address', authMiddleware, roleMiddleware(["Customer"]));
router.get('/address', authMiddleware, roleMiddleware(["Customer"]));
router.delete('/address/:id', authMiddleware, roleMiddleware(["Customer"]));

//Orders routes
router.get('/orders', authMiddleware, roleMiddleware(["Customer"]));

export default router;