// src/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt    from 'jsonwebtoken';
import prisma from '../config/prisma.js';
 
// ── REGISTER ──────────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    // req.body is already validated by Zod middleware
 
    // Check if email is taken
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
 
    // Hash the password — never store plain text
    // 10 = salt rounds (work factor). Higher = slower but more secure.
    // 10 is the industry standard for web apps
    const hashedPassword = await bcrypt.hash(password, 10);
 
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'USER' },
      select: { id: true, name: true, email: true, role: true },
      // select prevents the password hash from being returned
    });
 
    res.status(201).json({ message: 'Account created', user });
  } catch (err) {
    next(err); // passes to errorHandler middleware
  }
};
 
// ── LOGIN ─────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
 
    const user = await prisma.user.findUnique({ where: { email } });
 
    // Check user exists AND password matches in the same response
    // DO NOT say 'user not found' vs 'wrong password' separately
    // — that reveals whether the email is registered (a security risk)
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
 
    // Create JWT — payload contains user ID and role
    console.log("JWT_SECRET:", process.env.JWT_SECRET);
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
 
    // Return token + user (without password)
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
};
 
// ── GET ME ───────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    // req.user.id comes from the JWT decoded in authMiddleware
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
};
