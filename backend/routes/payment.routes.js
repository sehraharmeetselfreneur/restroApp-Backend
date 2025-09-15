import express from "express";

const router = express.Router();

router.post('/initiate');
router.post('/verify');
router.get('/order/:id');

export default router;