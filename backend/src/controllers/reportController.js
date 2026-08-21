 // src/controllers/reportController.js
import prisma from '../config/prisma.js';

// ── Helper — build zone filter scoped to a region ─────────────────────────────
const getZoneIds = async (regionId) => {
  if (!regionId) return null; // null = no filter (admin sees all)
  const zones = await prisma.tariffZone.findMany({
    where:  { regionId },
    select: { id: true },
  });
  return zones.map(z => z.id);
};

// GET /api/reports/revenue
export const getRevenueReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const zoneIds = await getZoneIds(req.regionId);

    const baseWhere = {
      status: 'COMPLETED',
      ...(zoneIds && { zoneId: { in: zoneIds } }),
      ...(startDate && endDate && {
        exitTime: { gte: new Date(startDate), lte: new Date(endDate) },
      }),
    };

    // Total revenue + session count
    const revenueData = await prisma.parkingSession.aggregate({
      where: baseWhere,
      _sum:  { totalCost: true },
      _count:{ id: true },
    });

    // Revenue by zone
    const byZone = await prisma.parkingSession.groupBy({
      by:    ['zoneId'],
      where: baseWhere,
      _sum:  { totalCost: true },
      _count:{ id: true },
    });

    // Attach zone + region names
    const zones = await prisma.tariffZone.findMany({
      where:   { id: { in: byZone.map(z => z.zoneId) } },
      select:  { id: true, name: true, region: { select: { name: true } } },
    });

    const byZoneWithNames = byZone.map(z => ({
      ...z,
      zoneName:   zones.find(zone => zone.id === z.zoneId)?.name   ?? 'Unknown',
      regionName: zones.find(zone => zone.id === z.zoneId)?.region?.name ?? 'Unknown',
    }));

    // Revenue by vehicle type
    const byVehicle = await prisma.parkingSession.groupBy({
      by:    ['vehicleType'],
      where: baseWhere,
      _sum:  { totalCost: true },
      _count:{ id: true },
    });

    // Daily revenue — last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailySessions = await prisma.parkingSession.findMany({
      where: {
        status:   'COMPLETED',
        exitTime: { gte: sevenDaysAgo },
        ...(zoneIds && { zoneId: { in: zoneIds } }),
      },
      select: { exitTime: true, totalCost: true },
    });

    const dailyMap = {};
    dailySessions.forEach(({ exitTime, totalCost }) => {
      const day = exitTime.toISOString().split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { date: day, revenue: 0, sessions: 0 };
      dailyMap[day].revenue  += parseFloat(totalCost || 0);
      dailyMap[day].sessions += 1;
    });
    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      summary: {
        totalRevenue:  revenueData._sum.totalCost || 0,
        totalSessions: revenueData._count.id,
        // Include region context for ops users
        ...(req.regionId && { regionId: req.regionId, regionName: req.regionName }),
      },
      byZone:    byZoneWithNames,
      byVehicle,
      daily,
    });
  } catch (err) { next(err); }
};

// GET /api/reports/sessions
export const getSessionsReport = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;
    const { vehicleType, status, startDate, endDate } = req.query;

    const zoneIds = await getZoneIds(req.regionId);

    const where = {
      ...(zoneIds     && { zoneId: { in: zoneIds } }),
      ...(vehicleType && { vehicleType }),
      ...(status      && { status }),
      ...(startDate && endDate && {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      }),
    };

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

// GET /api/reports/zones
export const getZoneStats = async (req, res, next) => {
  try {
    const zoneFilter = req.regionId ? { regionId: req.regionId } : {};

    const zones = await prisma.tariffZone.findMany({
      where:   { isActive: true, ...zoneFilter },
      include: {
        region:   { select: { name: true } },
        _count:   { select: { sessions: true } },
        sessions: { where: { status: 'COMPLETED' }, select: { totalCost: true } },
      },
    });

    const stats = zones.map(z => ({
      id:         z.id,
      name:       z.name,
      regionName: z.region?.name ?? '—',
      sessions:   z._count.sessions,
      revenue:    z.sessions.reduce((sum, s) => sum + parseFloat(s.totalCost || 0), 0),
    }));

    res.json(stats);
  } catch (err) { next(err); }
};