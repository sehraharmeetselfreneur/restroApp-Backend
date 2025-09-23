import express from "express";

// Middlewares
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { upload } from "../middlewares/file.middleware.js";

// Controllers
import {
    getAdminProfileController,
    getAllCustomersController,
    getCustomerByIdController,
    getOrdersController,
    getRestaurantByIdController,
    getRestaurantsController,
    loginAdminController,
    logoutAdminController,
    registerAdminController,
    verifyRestaurantController
} from "../controllers/admin.controller.js";

const router = express.Router();

//Auth routes
router.post('/register', upload.single("profileImage"), registerAdminController);
router.post('/login', loginAdminController);
router.post('/logout', authMiddleware, roleMiddleware(["Admin", "SuperAdmin"]), logoutAdminController);

router.get('/profile', authMiddleware, roleMiddleware(["Admin", "SuperAdmin"]), getAdminProfileController);

//Restaurant Routes
router.get('/restaurants', authMiddleware, roleMiddleware(["Admin", "SuperAdmin"]), getRestaurantsController);
router.get('/restaurant/:id', authMiddleware, roleMiddleware(["Admin", "SuperAdmin"]), getRestaurantByIdController);
router.post('/verify-restaurant/:id', authMiddleware, roleMiddleware(["Admin", "SuperAdmin"]), verifyRestaurantController);

router.get('/customers', authMiddleware, roleMiddleware(["Admin", "SuperAdmin"]), getAllCustomersController);
router.get('/customers/:id', authMiddleware, roleMiddleware(["Admin", "SuperAdmin"]), getCustomerByIdController);

router.get('/orders', authMiddleware, roleMiddleware(["Admin", "SuperAdmin"]), getOrdersController);

// router.get('/orders');
// router.get('/payments');
// router.put('/block-user/:id');
// router.delete('/remove-restaurant/:id');

export default router;