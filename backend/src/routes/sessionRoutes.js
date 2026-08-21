// src/routes/sessionRoutes.js
import { Router } from 'express';
import {
  startSession, endSession, getActiveSession, getSessionHistory,getRegionSessions,
} from '../controllers/sessionController.js';
import { protect }  from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { startSessionSchema } from '../schemas/sessionSchema.js';
import { attachRegion, opsOrAdmin } from '../middleware/roleMiddleware.js';

 
const router = Router();
router.use(protect); // all session routes require login
 
router.post('/start',          validate(startSessionSchema), startSession);
router.post('/:id/end',        endSession);
router.get('/active',          getActiveSession);
router.get('/history',         getSessionHistory);

router.get(
  '/region/:regionId',
  opsOrAdmin,
  attachRegion,
  getRegionSessions,
);
 
export default router;
