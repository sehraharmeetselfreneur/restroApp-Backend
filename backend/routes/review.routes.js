import express from "express";

const router = express.Router();

router.post('/');
router.get('/restaurant/:id');
router.get('/food/:id');
router.put('/:id');
router.delete('/:id');

export default router;