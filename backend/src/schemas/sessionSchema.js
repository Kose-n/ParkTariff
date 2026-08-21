// src/schemas/sessionSchema.js
import { z } from 'zod';

export const startSessionSchema = z.object({
  zoneId: z.string().min(1, 'Zone ID is required'),
  vehicleType: z.enum(['SALOON', 'SUV', 'TRUCK']),
  licensePlate: z.string().min(1, 'License plate is required'),
  // Add other fields as needed based on your sessionController
});