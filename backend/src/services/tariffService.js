// src/services/tariffService.js

const normalizeZoneName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, ' ');

const PENALTY_RULES = [
  {
    assignedZone: 'vip',
    keywords: ['general parking', 'loading bay'],
    amount: 500,
    reason: 'Parking in a VIP area',
  },
  {
    assignedZone: 'loading bay',
    keywords: ['vip', 'general parking'],
    amount: 500,
    reason: 'Parking in a loading bay',
  },
  {
    assignedZone: 'general parking',
    keywords: ['vip', 'loading bay'],
    amount: 500,
    reason: 'Parking in General Parking',
  },
];

export const getPenaltyForZone = (assignedZone, zone) => {
  const zoneText = [
    typeof zone === 'string' ? zone : zone?.name,
    typeof zone === 'string' ? null : zone?.description,
  ]
    .filter(Boolean)
    .join(' ');

  if (!zoneText) {
    return { applied: false, amount: 0, reason: null };
  }

  const normalizedZoneText = normalizeZoneName(zoneText);
  const normalizedAssignedZone = normalizeZoneName(assignedZone);

  const matchedRule = PENALTY_RULES.find(({ assignedZone: ruleAssignedZone }) =>
    normalizeZoneName(ruleAssignedZone) === normalizedAssignedZone
  );

  if (!matchedRule) {
    return { applied: false, amount: 0, reason: null };
  }

  const isDisallowedZone = matchedRule.keywords.some((keyword) =>
    normalizedZoneText.includes(normalizeZoneName(keyword))
  );

  if (!isDisallowedZone) {
    return { applied: false, amount: 0, reason: null };
  }

  return {
    applied: true,
    amount: matchedRule.amount,
    reason: matchedRule.reason,
  };
};

export const calculateParkingCost = (tariff, entryTime, exitTime, vehicleType = null, zone = null) => {
  const entry = new Date(entryTime);
  const exit  = new Date(exitTime);

  const durationHours = (exit - entry) / (1000 * 60 * 60);
  if (durationHours < 0) throw new Error('Exit time cannot be before entry time');

  let cost = 0;

  if (tariff.rateType === 'FLAT') {
    // Flat rate — charge the fixed amount regardless of how long they park
    cost = parseFloat(tariff.flatRate || 0);
  } else {
    // Hourly rate — charge based on duration
    cost = durationHours * parseFloat(tariff.ratePerHour || 0);
  }

  // Apply minimum charge
  const minCharge = parseFloat(tariff.minCharge || 0);
  if (cost < minCharge) cost = minCharge;

  // Apply maximum daily rate cap
  if (tariff.maxDailyRate) {
    const maxRate = parseFloat(tariff.maxDailyRate);
    if (cost > maxRate) cost = maxRate;
  }

  const penalty = getPenaltyForZone(vehicleType, zone);
  if (penalty.applied) cost += penalty.amount;

  return Math.round(cost * 100) / 100;
};

// ─── Find the best matching tariff for a session ────────────────────────────
// Priority: most specific rule wins
// WEEKDAY/WEEKEND > ALL, time-windowed > all-day
export const findApplicableTariff = async (prisma, zoneId, vehicleType, entryTime) => {
  const entry   = new Date(entryTime);
  const hour    = entry.getHours();
  const minutes = entry.getMinutes();
  const timeStr = `${String(hour).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
  const dayOfWeek = entry.getDay(); // 0=Sun, 6=Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Get all active tariffs for this zone + vehicle
  const tariffs = await prisma.tariff.findMany({
    where: { zoneId, vehicleType, isActive: true },
  });

  // Filter by day type
  const dayFiltered = tariffs.filter((t) => {
    if (t.dayType === 'ALL')     return true;
    if (t.dayType === 'WEEKEND') return isWeekend;
    if (t.dayType === 'WEEKDAY') return !isWeekend;
    return false;
  });

  // Filter by time window — handles overnight windows like 21:00–05:00
  const timeFiltered = dayFiltered.filter((t) => {
    if (!t.startTime || !t.endTime) return true; // all-day rule always matches

    const start = t.startTime; // e.g. "21:00"
    const end   = t.endTime;   // e.g. "05:00"

    if (start <= end) {
      // Normal window e.g. 08:00–14:00
      return timeStr >= start && timeStr <= end;
    } else {
      // Overnight window e.g. 21:00–05:00
      return timeStr >= start || timeStr <= end;
    }
  });

  if (timeFiltered.length === 0) return null;

  // Most specific rule wins:
  // 1. Time-windowed + specific day type
  // 2. Time-windowed + ALL day type
  // 3. All-day + specific day type
  // 4. All-day + ALL day type (fallback)
  const scored = timeFiltered.map((t) => ({
    tariff: t,
    score:
      (t.startTime ? 2 : 0) +  // has time window = more specific
      (t.dayType !== 'ALL' ? 1 : 0), // specific day type = more specific
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0].tariff;
};