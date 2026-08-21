 // src/controllers/tariffController.js
import prisma from '../config/prisma.js';
import { calculateParkingCost, getPenaltyForZone } from '../services/tariffService.js';
 
// GET /api/tariffs
export const getTariffs = async (req, res, next) => {
  try {  
    const tariffs = await prisma.tariff.findMany({
      include: { zone: { select: { id: true, name: true } } },
      // include fetches the related zone name alongside each tariff
      orderBy: { createdAt: 'desc' },
    });
    res.json(tariffs);
  } catch (err) { next(err); }
};
 

// GET /api/tariffs/:id
export const getTariffById = async (req, res, next) => {
  try {
    const tariff = await prisma.tariff.findUnique({
      where: { id: req.params.id },
      include: { zone: { select: { id: true, name: true } } },
    });
    if (!tariff) {
      return res.status(404).json({ message: 'Tariff not found' });
    }
    res.json(tariff);
  } catch (err) { next(err); }
};

// GET /api/tariffs/zones
export const getZones = async (req, res, next) => {
  try {
    const zones = await prisma.tariffZone.findMany({
      where: { isActive: true },
      include: { _count: { select: { tariffs: true } } },
      // _count.tariffs gives the number of tariff rules per zone
    });
    res.json(zones);
  } catch (err) { next(err); }
};

// POST /api/tariffs/zones
export const createZone = async (req, res, next) => {
  try {
    const zone = await prisma.tariffZone.create({ data: req.body });
    res.status(201).json(zone);
  } catch (err) { next(err); }
};

 
// POST /api/tariffs
export const createTariff = async (req, res, next) => {
  try {
    const tariff = await prisma.tariff.create({ data: req.body });
    res.status(201).json(tariff);
  } catch (err) { next(err); }
};
 
// PUT /api/tariffs/:id

export const updateTariff = async (req, res, next) => {
  try {
    // Destructure out fields Prisma doesn't accept on update
    const {
      id, createdAt, updatedAt, zone, zoneId,
      ...updateData
    } = req.body;

    const tariff = await prisma.tariff.update({
      where: { id: req.params.id },
      data:  updateData,
    });
    res.json(tariff);
  } catch (err) { next(err); }
};
// DELETE /api/tariffs/:id  (soft delete)
export const deactivateTariff = async (req, res, next) => {
  try {
    const tariff = await prisma.tariff.update({
      where: { id: req.params.id },
      data: { isActive: false },
      // Sets isActive: false instead of deleting the row
      // Historical sessions that used this tariff remain intact
    });
    res.json(tariff);
  } catch (err) { next(err); }
};
 
// POST /api/tariffs/calculate
export const calculateCost = async (req, res, next) => {
  try {
    const { zoneId, vehicleType, entryTime, exitTime } = req.body;
 
    // Find the matching tariff for this zone + vehicle type
    const tariff = await prisma.tariff.findFirst({
      where: { zoneId, vehicleType, isActive: true },
    });
 
    if (!tariff) {
      return res.status(404).json({ message: 'No tariff found for this zone and vehicle type' });
    }
 
    const zone = await prisma.tariffZone.findUnique({
      where: { id: zoneId },
      select: { id: true, name: true, description: true },
    });

    const cost = calculateParkingCost(tariff, entryTime, exitTime, vehicleType, zone);
    res.json({ cost, tariff, penalty: getPenaltyForZone(vehicleType, zone) });
  } catch (err) { next(err); }
};
