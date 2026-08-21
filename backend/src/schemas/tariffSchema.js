 import { z } from 'zod';

const tariffBase = z.object({
  vehicleType:  z.enum(['SALOON', 'SUV', 'TRUCK']),
  rateType:     z.enum(['HOURLY', 'FLAT']).default('HOURLY'),
  ratePerHour:  z.coerce.number().positive().nullable().optional(),
  flatRate:     z.coerce.number().positive().nullable().optional(),
  minCharge:    z.coerce.number().min(0).default(0),
  maxDailyRate: z.coerce.number().positive().nullable().optional(),
  dayType:      z.enum(['ALL', 'WEEKDAY', 'WEEKEND', 'HOLIDAY']).default('ALL'),
  startTime:    z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  endTime:      z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  isActive:     z.boolean().default(true),
}).refine(
  (d) => d.rateType === 'FLAT' ? !!d.flatRate : !!d.ratePerHour,
  { message: 'Provide flatRate for FLAT type, ratePerHour for HOURLY type' }
);

// Create — requires zoneId
export const tariffSchema = tariffBase.and(
  z.object({ zoneId: z.string().uuid('Invalid zone ID') })
);

// Update — zoneId not needed (can't change zone)
export const tariffUpdateSchema = tariffBase;

export const zoneSchema = z.object({
  name:        z.string().min(1, 'Zone name is required'),
  description: z.string().optional(),
});

export const calculateSchema = z.object({
  zoneId:      z.string().uuid(),
  vehicleType: z.enum(['SALOON', 'SUV', 'TRUCK']),
  entryTime:   z.string().datetime(),
  exitTime:    z.string().datetime(),
});