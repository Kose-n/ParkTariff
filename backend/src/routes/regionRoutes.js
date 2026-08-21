 // src/routes/regionRoutes.js
import { Router } from 'express';
import {
  getRegions, getRegionById, createRegion, updateRegion,
  assignUserToRegion, removeUserFromRegion, getRegionStats,
} from '../controllers/regionController.js';
import { protect }       from '../middleware/authMiddleware.js';
import { adminOnly, opsOrAdmin, attachRegion } from '../middleware/roleMiddleware.js';

const router = Router();
router.use(protect);

// Admin — full management
router.get('/',                   opsOrAdmin, attachRegion, getRegions);
router.post('/',                  adminOnly,               createRegion);
router.put('/:id',                adminOnly,               updateRegion);
router.post('/:id/assign',        adminOnly,               assignUserToRegion);
router.delete('/:id/assign/:userId', adminOnly,            removeUserFromRegion);

// Both admin and ops — scoped stats
router.get('/:id/stats',          opsOrAdmin, attachRegion, getRegionStats);
router.get('/:id',                opsOrAdmin, attachRegion, getRegionById);

export default router;