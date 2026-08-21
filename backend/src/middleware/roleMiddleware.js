 // src/middleware/roleMiddleware.js
import prisma from '../config/prisma.js';

// ── Admin only ────────────────────────────────────────────────────────────────
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied — admin only' });
  }
  next();
};

// ── Operations or Admin ───────────────────────────────────────────────────────
export const opsOrAdmin = (req, res, next) => {
  if (!['ADMIN', 'OPERATIONS'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// ── Attach region to request ──────────────────────────────────────────────────
export const attachRegion = async (req, res, next) => {
  try {
    // ✅ ADMIN check must come first — admins have no RegionAssignment row
    if (req.user.role === 'ADMIN') {
      req.regionId   = null;   // null = no filter, sees all regions
      req.regionName = 'All regions';
      return next();           // skip the database query entirely
    }

    // OPERATIONS — look up their assigned region
    const assignment = await prisma.regionAssignment.findFirst({
      where:   { userId: req.user.id },
      include: { region: true },
    });

    if (!assignment) {
      return res.status(403).json({
        message: 'No region assigned to your account — contact the admin',
      });
    }

    req.regionId   = assignment.regionId;
    req.regionName = assignment.region.name;
    next();
  } catch (err) {
    next(err);
  }
};