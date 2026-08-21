// src/middleware/validate.js
export const validate = (schema) => (req, res, next) => {
  // validate() returns a middleware function
  // schema is a Zod schema passed in when defining the route
 
  const result = schema.safeParse(req.body);
  // safeParse does not throw — returns { success, data, error }
 
  if (!result.success) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: result.error.flatten().fieldErrors,
      // flatten() converts Zod errors into readable field names
      // e.g. { ratePerHour: ['Expected number, received string'] }
    });
  }
 
  req.body = result.data;
  // Replace req.body with the validated + coerced data
  // e.g. string '50' becomes number 50 if schema expects a number
 
  next();
};
 
// Usage:
// router.post('/tariffs', protect, adminOnly, validate(tariffSchema), createTariff);
