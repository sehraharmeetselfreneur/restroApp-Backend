import express from "express";

const router = express.Router();

router.get('/restaurants');
router.get('/customers');
router.get('/orders');
router.get('/payments');
router.put('/block-user/:id');
router.delete('/remove-restaurant/:id');

export default router;