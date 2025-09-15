import express from "express";

const router = express.Router();

router.get('/');
router.get('/:id');
router.get('/category/:category');
router.get('/search?q=query');

export default router;