// src/middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  // Always log the full stack trace in development
 
  // Prisma errors have a specific code format
  if (err.code === 'P2002') {
    // P2002 = unique constraint violation
    // e.g. trying to register with an email that already exists
    return res.status(409).json({
      message: 'A record with this value already exists',
    }); 
  }
 
  if (err.code === 'P2025') {
    // P2025 = record not found
    return res.status(404).json({ message: 'Record not found' });
  }
 
  // Default: 500 Internal Server Error
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error',
    // Never expose stack traces in production
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
