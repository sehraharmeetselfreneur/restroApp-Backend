import express from 'express';

//Middlewares
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { upload } from '../middlewares/file.middleware.js';

//Controllers
import { addFoodItemController, addMenuCategoryController, deleteFoodItemController, getRestaurantProfileController, loginRestaurantController, logoutRestaurantController, registerRestaurantController, updateFoodItemController } from '../controllers/restaurant.controller.js';
import { generateOtpController, verifyOtpController } from '../controllers/otp.controller.js';

const router = express.Router();

//Auth routes
router.post('/register', upload.fields([
    { name: "fssaiLicense", maxCount: 1 }, { name: "gstCertificate", maxCount: 1 },
    { name: "panCard", maxCount: 1 }, { name: "images", maxCount: 5 }, { name: "bannerImage", maxCount: 1 }]), registerRestaurantController);
router.post('/login', loginRestaurantController);
router.post('/generate-otp', generateOtpController);
router.post('/verify-otp', verifyOtpController);
router.post('/logout', authMiddleware, roleMiddleware(["Restaurant"]), logoutRestaurantController);

//Profile routes
router.get('/profile', authMiddleware, roleMiddleware(["Restaurant"]), getRestaurantProfileController);
router.put('/profile', authMiddleware, roleMiddleware(["Restaurant"]));

//Menu routes
router.post('/menu', authMiddleware, roleMiddleware(["Restaurant"]), addMenuCategoryController);
// router.get('/menu', authMiddleware, roleMiddleware(["Restaurant"]));  MAY NOT BE NEEDED
router.put('/menu/:id', authMiddleware, roleMiddleware(["Restaurant"]));
router.delete('/menu/:id', authMiddleware, roleMiddleware(["Restaurant"]));

// Food Item routes
router.post('/food-item', authMiddleware, roleMiddleware(["Restaurant"]), upload.fields([ { name: "images", maxCount: 5 } ]), addFoodItemController);
router.put('/food-item/:id', authMiddleware, roleMiddleware(["Restaurant"]), upload.fields([ { name: "images", maxCount: 5 }]), updateFoodItemController);
router.delete('/food-item/:id', authMiddleware, roleMiddleware(["Restaurant"]), deleteFoodItemController);

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