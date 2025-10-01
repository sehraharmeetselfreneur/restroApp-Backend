import express from 'express';

//Middlewares
import { upload } from '../middlewares/file.middleware.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

//Controllers
import { addAddressController, deleteAddressController, getCustomerProfileController, loginCustomerController, logoutCustomerController, registerCustomerController, updateAddressController } from '../controllers/customer.controller.js';
import { generateOtpController, verifyOtpController } from '../controllers/otp.controller.js';

const router = express.Router();

//Auth routes
router.post('/register', upload.single("profileImage"), registerCustomerController);
router.post('/login', loginCustomerController);
router.post('/verify-otp', generateOtpController);
router.post('/resend-otp', verifyOtpController);
router.post('/logout', authMiddleware, roleMiddleware(["Customer"]), logoutCustomerController)

//Profile routes
router.get('/profile', authMiddleware, roleMiddleware(["Customer"]), getCustomerProfileController);
router.put('/profile', authMiddleware, roleMiddleware(["Customer"]));

//Address routes
router.post('/address', authMiddleware, roleMiddleware(["Customer"]), addAddressController);
router.put('/address/:tag', authMiddleware, roleMiddleware(["Customer"]), updateAddressController);
router.post('/address/:tag', authMiddleware, roleMiddleware(["Customer"]), deleteAddressController);

//Orders routes
router.get('/orders', authMiddleware, roleMiddleware(["Customer"]));

export default router;