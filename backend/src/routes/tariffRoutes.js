// src/routes/tariffRoutes.js
import { Router } from 'express';
import {
  getTariffs, getTariffById, createTariff, updateTariff,
  deactivateTariff, getZones, createZone, calculateCost
} from '../controllers/tariffController.js';
import { protect }   from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/roleMiddleware.js';
import { validate }  from '../middleware/validate.js';
import { tariffSchema, zoneSchema, calculateSchema, tariffUpdateSchema } from '../schemas/tariffSchema.js';
 
const router = Router();
 
// All tariff routes require authentication
router.use(protect);
 
// Zones
router.get('/zones',        getZones);
router.post('/zones',       adminOnly, validate(zoneSchema), createZone);
 
// Cost calculator — available to all authenticated users
router.post('/calculate',   validate(calculateSchema), calculateCost);
 
// Tariff CRUD
router.get('/',             getTariffs);
router.get('/:id',          getTariffById);
router.post('/',            adminOnly, validate(tariffSchema), createTariff);
router.put('/:id',        adminOnly, validate(tariffUpdateSchema), updateTariff);
router.delete('/:id',       adminOnly, deactivateTariff);
// delete does a soft delete (isActive = false), not a real SQL DELETE
 
export default router;
