import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateParkingCost, getPenaltyForZone } from '../src/services/tariffService.js';

test('adds a penalty when a general-assigned vehicle parks in a VIP zone', () => {
  const tariff = {
    rateType: 'HOURLY',
    ratePerHour: 50,
    minCharge: 0,
  };

  const cost = calculateParkingCost(
    tariff,
    '2026-07-08T09:00:00.000Z',
    '2026-07-08T10:00:00.000Z',
    'General Parking',
    { name: 'VIP Parking', description: 'Reserved guest parking' }
  );

  assert.equal(cost, 550);
});

test('adds a penalty when a VIP-assigned vehicle parks in general parking', () => {
  const penalty = getPenaltyForZone('VIP', { name: 'General Parking', description: 'Open parking for visitors' });

  assert.deepEqual(penalty, { applied: true, amount: 500, reason: 'Parking in a VIP area' });
});

test('does not apply a penalty when the vehicle is parked in its assigned zone', () => {
  const penalty = getPenaltyForZone('General Parking', { name: 'General Parking', description: 'Open parking for visitors' });

  assert.deepEqual(penalty, { applied: false, amount: 0, reason: null });
});
