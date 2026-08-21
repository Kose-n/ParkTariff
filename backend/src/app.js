 // src/app.js
import express   from 'express';
import cors      from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import authRoutes    from './routes/authRoutes.js';
import tariffRoutes  from './routes/tariffRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import userRoutes    from './routes/userRoutes.js';    // ← add
import reportRoutes  from './routes/reportRoutes.js';  // ← add
import { errorHandler } from './middleware/errorHandler.js';
import regionRoutes from './routes/regionRoutes.js';

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',     authRoutes);
app.use('/api/tariffs',  tariffRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users',    userRoutes);    // ← add
app.use('/api/reports',  reportRoutes);  // ← add
app.use('/api/regions', regionRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

export default app;