import prisma from '../config/prisma.js';

// GET /api/users — admin only
export const getAllUsers = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true, name: true, email: true,
          role: true, createdAt: true,
          _count: { select: { sessions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    res.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

// GET /api/users/me
export const getMyProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.json(user);
  } catch (err) { next(err); }
};

// PUT /api/users/me
export const updateMyProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(user);
  } catch (err) { next(err); }
};

// GET /api/users/:id — admin only
export const getUserById = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true, status: true, totalCost: true,
            entryTime: true, exitTime: true,
            zone: { select: { name: true } },
          },
        },
      },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
};

// PUT /api/users/:id — admin only
export const updateUser = async (req, res, next) => {
  try {
    const { name, email, role } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, email, role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(user);
  } catch (err) { next(err); }
};