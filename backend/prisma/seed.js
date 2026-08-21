 // prisma/seed.js
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg }     from '@prisma/adapter-pg';
import pg               from 'pg';
import bcrypt           from 'bcryptjs';

const { Pool } = pg;
const pool     = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter  = new PrismaPg(pool);
const prisma   = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Passwords ─────────────────────────────────────────────────────────────
  const [adminPwd, opsPwd, userPwd] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('ops123',   10),
    bcrypt.hash('user123',  10),
  ]);

  // ── Users ─────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@parktariff.com' },
    update: {},
    create: { name: 'System Admin', email: 'admin@parktariff.com', password: adminPwd, role: 'ADMIN' },
  });
  console.log('✅ Admin:', admin.email);

  const opsAirport = await prisma.user.upsert({
    where:  { email: 'ops.airport@parktariff.com' },
    update: {},
    create: { name: 'Airport Ops Manager', email: 'ops.airport@parktariff.com', password: opsPwd, role: 'OPERATIONS' },
  });
  console.log('✅ Ops (Airport):', opsAirport.email);

  const opsCBD = await prisma.user.upsert({
    where:  { email: 'ops.cbd@parktariff.com' },
    update: {},
    create: { name: 'CBD Ops Manager', email: 'ops.cbd@parktariff.com', password: opsPwd, role: 'OPERATIONS' },
  });
  console.log('✅ Ops (CBD):', opsCBD.email);

  const opsHospital = await prisma.user.upsert({
    where:  { email: 'ops.hospital@parktariff.com' },
    update: {},
    create: { name: 'Hospital Ops Manager', email: 'ops.hospital@parktariff.com', password: opsPwd, role: 'OPERATIONS' },
  });
  console.log('✅ Ops (Hospital):', opsHospital.email);

  const testUser = await prisma.user.upsert({
    where:  { email: 'user@parktariff.com' },
    update: {},
    create: { name: 'James Kamau', email: 'user@parktariff.com', password: userPwd, role: 'USER' },
  });
  console.log('✅ Test user:', testUser.email);

  // ── Regions ───────────────────────────────────────────────────────────────
  const regionAirport = await prisma.region.upsert({
    where:  { name: 'Airport' },
    update: {},
    create: {
      name:        'Airport',
      description: 'Jomo Kenyatta International Airport parking facilities',
    },
  });

  const regionCBD = await prisma.region.upsert({
    where:  { name: 'CBD' },
    update: {},
    create: {
      name:        'CBD',
      description: 'Central Business District — Nairobi city centre',
    },
  });

  const regionHospital = await prisma.region.upsert({
    where:  { name: 'Hospital' },
    update: {},
    create: {
      name:        'Hospital',
      description: 'Kenyatta National Hospital and surrounding medical facilities',
    },
  });

  console.log('✅ Regions created: Airport, CBD, Hospital');

  // ── Region assignments ────────────────────────────────────────────────────
  await prisma.regionAssignment.upsert({
    where:  { userId_regionId: { userId: opsAirport.id,  regionId: regionAirport.id  } },
    update: {},
    create: { userId: opsAirport.id,  regionId: regionAirport.id  },
  });

  await prisma.regionAssignment.upsert({
    where:  { userId_regionId: { userId: opsCBD.id,      regionId: regionCBD.id      } },
    update: {},
    create: { userId: opsCBD.id,      regionId: regionCBD.id      },
  });

  await prisma.regionAssignment.upsert({
    where:  { userId_regionId: { userId: opsHospital.id, regionId: regionHospital.id } },
    update: {},
    create: { userId: opsHospital.id, regionId: regionHospital.id },
  });

  console.log('✅ Region assignments created');

  // ── Zones (all linked to regions) ────────────────────────────────────────

  // Airport
  const zoneAirportGeneral = await prisma.tariffZone.upsert({
    where:  { id: 'zone-airport-general' },
    update: { regionId: regionAirport.id },
    create: {
      id: 'zone-airport-general', name: 'Airport — General Parking',
      description: 'Short and long stay public parking',
      regionId: regionAirport.id,
    },
  });

  const zoneAirportVIP = await prisma.tariffZone.upsert({
    where:  { id: 'zone-airport-vip' },
    update: { regionId: regionAirport.id },
    create: {
      id: 'zone-airport-vip', name: 'Airport — VIP',
      description: 'Premium executive parking bay',
      regionId: regionAirport.id,
    },
  });

  // CBD
  const zoneCBDGeneral = await prisma.tariffZone.upsert({
    where:  { id: 'zone-cbd-general' },
    update: { regionId: regionCBD.id },
    create: {
      id: 'zone-cbd-general', name: 'CBD — General Parking',
      description: 'Street and multilevel public parking',
      regionId: regionCBD.id,
    },
  });

  const zoneCBDLoading = await prisma.tariffZone.upsert({
    where:  { id: 'zone-cbd-loading' },
    update: { regionId: regionCBD.id },
    create: {
      id: 'zone-cbd-loading', name: 'CBD — Loading Bay',
      description: 'Short-stay loading and offloading',
      regionId: regionCBD.id,
    },
  });

  // Hospital
  const zoneHospitalGeneral = await prisma.tariffZone.upsert({
    where:  { id: 'zone-hospital-general' },
    update: { regionId: regionHospital.id },
    create: {
      id: 'zone-hospital-general', name: 'Hospital — General Parking',
      description: 'Visitor and patient parking',
      regionId: regionHospital.id,
    },
  });

  const zoneHospitalVIP = await prisma.tariffZone.upsert({
    where:  { id: 'zone-hospital-vip' },
    update: { regionId: regionHospital.id },
    create: {
      id: 'zone-hospital-vip', name: 'Hospital — VIP',
      description: 'Reserved for medical staff and visitors',
      regionId: regionHospital.id,
    },
  });

  // Keep old zones from previous seed — link them to CBD region
  const zoneGeneral = await prisma.tariffZone.upsert({
    where:  { id: 'zone-general-001' },
    update: { regionId: regionCBD.id },
    create: {
      id: 'zone-general-001', name: 'Zone A — General Parking',
      description: 'Standard public parking area',
      regionId: regionCBD.id,
    },
  });

  const zoneVIP = await prisma.tariffZone.upsert({
    where:  { id: 'zone-vip-001' },
    update: { regionId: regionCBD.id },
    create: {
      id: 'zone-vip-001', name: 'Zone B — VIP',
      description: 'Reserved VIP parking with premium rates',
      regionId: regionCBD.id,
    },
  });

  const zoneLoading = await prisma.tariffZone.upsert({
    where:  { id: 'zone-loading-001' },
    update: { regionId: regionCBD.id },
    create: {
      id: 'zone-loading-001', name: 'Zone C — Loading Bay',
      description: 'Short-stay loading and offloading area',
      regionId: regionCBD.id,
    },
  });

  console.log('✅ All zones created and linked to regions');

  // ── Tariffs ───────────────────────────────────────────────────────────────
  const buildRules = (zoneId, vehicleType, hourly, flat, weekendHourly, min, weekendMin, max) => [
    {
      zoneId, vehicleType,
      rateType: 'HOURLY', ratePerHour: hourly, flatRate: null,
      minCharge: min, maxDailyRate: max,
      dayType: 'ALL', startTime: null, endTime: null, isActive: true,
    },
    {
      zoneId, vehicleType,
      rateType: 'FLAT', ratePerHour: null, flatRate: flat,
      minCharge: 0, maxDailyRate: null,
      dayType: 'ALL', startTime: '21:00', endTime: '05:00', isActive: true,
    },
    {
      zoneId, vehicleType,
      rateType: 'HOURLY', ratePerHour: weekendHourly, flatRate: null,
      minCharge: weekendMin, maxDailyRate: max,
      dayType: 'WEEKEND', startTime: '08:00', endTime: '14:00', isActive: true,
    },
  ];

  const allTariffs = [
    // Airport General
    ...buildRules(zoneAirportGeneral.id,  'SALOON', 60,  180, 80,  40,  60,  500),
    ...buildRules(zoneAirportGeneral.id,  'SUV',    90,  250, 110, 70,  90,  700),
    ...buildRules(zoneAirportGeneral.id,  'TRUCK',  120, 350, 150, 100, 120, 900),
    // Airport VIP
    ...buildRules(zoneAirportVIP.id,      'SALOON', 180, 400, 200, 150, 180, 1200),
    ...buildRules(zoneAirportVIP.id,      'SUV',    250, 550, 280, 200, 250, 1500),
    // CBD General
    ...buildRules(zoneCBDGeneral.id,      'SALOON', 50,  150, 70,  30,  50,  400),
    ...buildRules(zoneCBDGeneral.id,      'SUV',    70,  200, 90,  50,  70,  550),
    ...buildRules(zoneCBDGeneral.id,      'TRUCK',  100, 300, 120, 80,  100, 700),
    // CBD Loading Bay
    ...buildRules(zoneCBDLoading.id,      'SUV',    80,  180, 100, 50,  70,  null),
    ...buildRules(zoneCBDLoading.id,      'TRUCK',  120, 350, 150, 100, 120, null),
    // Hospital General
    ...buildRules(zoneHospitalGeneral.id, 'SALOON', 40,  120, 60,  20,  40,  350),
    ...buildRules(zoneHospitalGeneral.id, 'SUV',    60,  170, 80,  40,  60,  500),
    ...buildRules(zoneHospitalGeneral.id, 'TRUCK',  90,  250, 110, 70,  90,  650),
    // Hospital VIP
    ...buildRules(zoneHospitalVIP.id,     'SALOON', 150, 350, 180, 120, 150, 1000),
    ...buildRules(zoneHospitalVIP.id,     'SUV',    200, 450, 230, 160, 200, 1200),
    // Old Zone A (CBD region)
    ...buildRules(zoneGeneral.id, 'SALOON', 50,  150, 70,  30,  50,  400),
    ...buildRules(zoneGeneral.id, 'SUV',    70,  200, 90,  50,  70,  550),
    ...buildRules(zoneGeneral.id, 'TRUCK',  100, 300, 120, 80,  100, 700),
    // Old Zone B VIP (CBD region)
    ...buildRules(zoneVIP.id, 'SALOON', 150, 350, 180, 120, 150, 1000),
    ...buildRules(zoneVIP.id, 'SUV',    200, 450, 230, 160, 200, 1200),
    // Old Zone C Loading (CBD region)
    ...buildRules(zoneLoading.id, 'SUV',   80,  180, 100, 50,  70,  null),
    ...buildRules(zoneLoading.id, 'TRUCK', 120, 350, 150, 100, 120, null),
  ];

  await prisma.tariff.createMany({
    data:           allTariffs,
    skipDuplicates: true,
  });

  console.log('✅ All tariff rules created');
  console.log('\n── Login credentials ──────────────────────────────────');
  console.log('Admin:            admin@parktariff.com        / admin123');
  console.log('Ops (Airport):    ops.airport@parktariff.com  / ops123');
  console.log('Ops (CBD):        ops.cbd@parktariff.com      / ops123');
  console.log('Ops (Hospital):   ops.hospital@parktariff.com / ops123');
  console.log('Test user:        user@parktariff.com         / user123');
  console.log('────────────────────────────────────────────────────────\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());