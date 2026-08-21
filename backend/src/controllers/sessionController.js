// src/controllers/sessionController.js
import prisma from '../config/prisma.js';
import { calculateParkingCost, findApplicableTariff } from '../services/tariffService.js';

// ── Helper — build region filter for session queries ──────────────────────────
// If regionId is set (ops user), only return sessions from zones in that region
const regionFilter = (regionId) =>
  regionId ? { zone: { regionId } } : {}; 

// POST /api/sessions/start
export const startSession = async (req, res, next) => {
  try {
    const { zoneId, vehicleType, licensePlate } = req.body;
    const userId = req.user.id; // from JWT

    // If ops user, confirm the zone belongs to their region
    if (req.user.role === 'OPERATIONS') {
      const zone = await prisma.tariffZone.findUnique({ where: { id: zoneId } });
      if (!zone || zone.regionId !== req.regionId) {
        return res.status(403).json({
          message: 'You can only start sessions in your assigned region',
        });
      }
    }
 
    // Prevent duplicate active sessions
    const existing = await prisma.parkingSession.findFirst({
      where: { userId, status: 'ACTIVE' }
    });
    if (existing) {
      return res.status(409).json({ message: 'You already have an active session' });
    }
 
    const session = await prisma.parkingSession.create({
      data: { userId, zoneId, vehicleType, licensePlate, status: 'ACTIVE' },
      include: { zone:{include: {region:true}}},  
    });
 
    res.status(201).json(session);
  } catch (err) { next(err); }
};
 
// POST /api/sessions/:id/end
export const endSession = async (req, res, next) => {
  try {
    const session = await prisma.parkingSession.findUnique({
      where: { id: req.params.id }
    });
 
    if (!session) return res.status(404).json({ message: 'Session not found' });
 
    // Users can only end their own sessions
     // Ops can end sessions in their region
    // Admin can end any session
    if (req.user.role === 'USER' && session.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not your session' });
    }

    if (req.user.role === 'OPERATIONS') {
      const zone = await prisma.tariffZone.findUnique({ where: { id: session.zoneId } });
      if (!zone || zone.regionId !== req.regionId) {
        return res.status(403).json({ message: 'Session is outside your region' });
      }
    } 
    // Find the applicable tariff
      // Find the tariff that was applicable at entry time
      const exitTime = new Date();
      const tariff   = await findApplicableTariff(
      prisma,
      session.zoneId,
      session.vehicleType,
      session.entryTime  // use ENTRY time to find the right rule
    );
 
    const zone = await prisma.tariffZone.findUnique({
      where: { id: session.zoneId },
      select: { id: true, name: true, description: true },
    });

   
    const totalCost = tariff
      ? calculateParkingCost(tariff, session.entryTime, exitTime, session.vehicleType, zone)
      : 0;
 
    const updated = await prisma.parkingSession.update({
      where: { id: req.params.id },
      data: { exitTime, totalCost, status: 'COMPLETED' },
    });
 
    res.json(updated);
  } catch (err) { next(err); }
};
 
// GET /api/sessions/active
 export const getActiveSession = async (req, res, next) => {
  try {
    const session = await prisma.parkingSession.findFirst({
      where:   { userId: req.user.id, status: 'ACTIVE' },
      include: { zone:{include: {region:true}}},
    });

    if (!session) return res.json(null);

    // Find the applicable tariff so the frontend can show running cost
    const tariff = await prisma.tariff.findFirst({
      where: {
        zoneId:      session.zoneId,
        vehicleType: session.vehicleType,
        isActive:    true,
      },
    });

    res.json({ ...session, appliedTariff: tariff });
  } catch (err) { next(err); }
};
// GET /api/sessions/history
export const getSessionHistory = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    // Build where clause — scoped to user or region
    let where = {};

    if (req.user.role === 'USER') {
      // Regular users only see their own sessions
      where = { userId: req.user.id };
    } else if (req.user.role === 'OPERATIONS') {
      // Ops sees all sessions in their region only
      where = { zone: { regionId: req.regionId } };
    }
    // ADMIN — no filter, sees everything

    const [sessions, total] = await Promise.all([
      prisma.parkingSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
        include: {
          user: { select: { name: true, email: true } },
          zone: { select: { name: true, region: { select: { name: true } } } },
        },
      }),
      prisma.parkingSession.count({ where }),
    ]);

    res.json({
      sessions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};
// GET /api/sessions/region/:regionId — ops/admin view all sessions in a region
export const getRegionSessions = async (req, res, next) => {
  try {
    const { regionId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip  = (page - 1) * limit;

    // Ops can only access their own region
    if (req.user.role === 'OPERATIONS' && req.regionId !== regionId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const where = { zone: { regionId } };

    const [sessions, total] = await Promise.all([
      prisma.parkingSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
        include: {
          user: { select: { name: true, email: true } },
          zone: { select: { name: true } },
        },
      }),
      prisma.parkingSession.count({ where }),
    ]);

    res.json({
      sessions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};
