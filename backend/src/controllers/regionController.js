 // src/controllers/regionController.js
import prisma from '../config/prisma.js';

// GET /api/regions — admin sees all, ops sees only their region
export const getRegions = async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') {
      const regions = await prisma.region.findMany({
        where:   { isActive: true },
        include: {
          zones:       { select: { id: true, name: true, isActive: true } },
          assignments: {
            include: { user: { select: { id: true, name: true, email: true } } }
          },
          _count: { select: { zones: true } },
        },
        orderBy: { name: 'asc' },
      });
      return res.json(regions);
    }

    // OPERATIONS — return only their assigned region
    const assignment = await prisma.regionAssignment.findFirst({
      where:   { userId: req.user.id },
      include: {
        region: {
          include: {
            zones:  { select: { id: true, name: true, isActive: true } },
            _count: { select: { zones: true } },
          },
        },
      },
    });

    if (!assignment) {
      return res.status(403).json({ message: 'No region assigned' });
    }

    res.json([assignment.region]);
  } catch (err) { next(err); }
};

// GET /api/regions/:id
export const getRegionById = async (req, res, next) => {
  try {
    const region = await prisma.region.findUnique({
      where:   { id: req.params.id },
      include: {
        zones:       { include: { tariffs: true } },
        assignments: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } }
        },
      },
    });
    if (!region) return res.status(404).json({ message: 'Region not found' });

    // Ops can only see their own region
    if (req.user.role === 'OPERATIONS' && req.regionId !== region.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(region);
  } catch (err) { next(err); }
};

// POST /api/regions — admin only
export const createRegion = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const region = await prisma.region.create({
      data: { name, description },
    });
    res.status(201).json(region);
  } catch (err) { next(err); }
};

// PUT /api/regions/:id — admin only
export const updateRegion = async (req, res, next) => {
  try {
    const { name, description, isActive } = req.body;
    const region = await prisma.region.update({
      where: { id: req.params.id },
      data:  { name, description, isActive },
    });
    res.json(region);
  } catch (err) { next(err); }
};

// POST /api/regions/:id/assign — assign an ops user to a region
export const assignUserToRegion = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const regionId   = req.params.id;

    // Confirm user exists and is OPERATIONS role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role !== 'OPERATIONS') {
      return res.status(400).json({
        message: 'Only OPERATIONS users can be assigned to a region',
      });
    }

    const assignment = await prisma.regionAssignment.upsert({
      where:  { userId_regionId: { userId, regionId } },
      update: {},
      create: { userId, regionId },
      include: {
        user:   { select: { id: true, name: true, email: true } },
        region: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(assignment);
  } catch (err) { next(err); }
};

// DELETE /api/regions/:id/assign/:userId — remove an assignment
export const removeUserFromRegion = async (req, res, next) => {
  try {
    const { id: regionId, userId } = req.params;
    await prisma.regionAssignment.delete({
      where: { userId_regionId: { userId, regionId } },
    });
    res.json({ message: 'Assignment removed' });
  } catch (err) { next(err); }
};

// GET /api/regions/:id/stats — region dashboard stats for ops
export const getRegionStats = async (req, res, next) => {
  try {
    const regionId = req.params.id;

    // Ops can only see their own region
    if (req.user.role === 'OPERATIONS' && req.regionId !== regionId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get zones in this region
    const zones = await prisma.tariffZone.findMany({
      where: { regionId },
      select: { id: true, name: true },
    });

    const zoneIds = zones.map(z => z.id);

    // Active sessions in region
    const activeSessions = await prisma.parkingSession.count({
      where: { zoneId: { in: zoneIds }, status: 'ACTIVE' },
    });

    // Today's revenue
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayRevenue = await prisma.parkingSession.aggregate({
      where: {
        zoneId:   { in: zoneIds },
        status:   'COMPLETED',
        exitTime: { gte: startOfDay },
      },
      _sum: { totalCost: true },
    });

    // Total sessions today
    const todaySessions = await prisma.parkingSession.count({
      where: {
        zoneId:    { in: zoneIds },
        createdAt: { gte: startOfDay },
      },
    });

    // Last 7 days revenue
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailySessions = await prisma.parkingSession.findMany({
      where: {
        zoneId:   { in: zoneIds },
        status:   'COMPLETED',
        exitTime: { gte: sevenDaysAgo },
      },
      select: { exitTime: true, totalCost: true },
    });

    // Group by day
    const dailyMap = {};
    dailySessions.forEach(({ exitTime, totalCost }) => {
      const day = exitTime.toISOString().split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { date: day, revenue: 0, sessions: 0 };
      dailyMap[day].revenue  += parseFloat(totalCost || 0);
      dailyMap[day].sessions += 1;
    });
    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Per-zone breakdown
    const zoneStats = await Promise.all(
      zones.map(async (z) => {
        const [sessionCount, revenue] = await Promise.all([
          prisma.parkingSession.count({ where: { zoneId: z.id } }),
          prisma.parkingSession.aggregate({
            where: { zoneId: z.id, status: 'COMPLETED' },
            _sum:  { totalCost: true },
          }),
        ]);
        return {
          id:       z.id,
          name:     z.name,
          sessions: sessionCount,
          revenue:  parseFloat(revenue._sum.totalCost || 0),
        };
      })
    );

    res.json({
      regionId,
      zones:          zoneStats,
      activeSessions,
      todaySessions,
      todayRevenue:   parseFloat(todayRevenue._sum.totalCost || 0),
      daily,
    });
  } catch (err) { next(err); }
};