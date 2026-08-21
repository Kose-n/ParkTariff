import { Router } from 'express';
import {
  getAllUsers, getMyProfile, updateMyProfile,
  getUserById, updateUser,
} from '../controllers/userController.js';
import { protect }   from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/roleMiddleware.js';

const router = Router();
router.use(protect);

router.get('/',      adminOnly, getAllUsers);
router.get('/me',    getMyProfile);
router.put('/me',    updateMyProfile);
router.get('/:id',  adminOnly, getUserById);
router.put('/:id',  adminOnly, updateUser);

export default router;