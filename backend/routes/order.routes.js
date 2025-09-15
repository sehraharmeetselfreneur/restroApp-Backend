import express from 'express';

const router = express.Router();

router.post('/');
router.get('/:id');
router.put('/:id/cancel');
router.put('/:id/status');
router.get('/customer/:id')
router.get('/restaurant/:id')

export default router;