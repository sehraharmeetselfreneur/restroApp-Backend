import express from 'express';

const router = express.Router();

router.post('/cart');
router.get('/cart');
router.put('/cart/:id');
router.delete('/cart/:id');
router.delete('/cart/clear');

export default router;