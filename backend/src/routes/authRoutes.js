// src/routes/authRoutes.js
import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { protect }                from '../middleware/authMiddleware.js';
import { validate }               from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../schemas/authSchema.js';
 
const router = Router();
 
router.post('/register', validate(registerSchema), register);
router.post('/login',    validate(loginSchema),    login);
router.get('/me',        protect,                  getMe);
// protect runs first on /me — returns 401 if no valid token
 
export default router;
