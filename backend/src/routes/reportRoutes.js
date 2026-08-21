import { Router } from 'express';
import {
  getRevenueReport, getSessionsReport, getZoneStats,
} from '../controllers/reportController.js';
import { protect }   from '../middleware/authMiddleware.js';
import { opsOrAdmin, attachRegion } from '../middleware/roleMiddleware.js';
const router = Router();
router.use(protect, opsOrAdmin, attachRegion);

router.get('/revenue',  getRevenueReport);
router.get('/sessions', getSessionsReport);
router.get('/zones',    getZoneStats);

export default router;