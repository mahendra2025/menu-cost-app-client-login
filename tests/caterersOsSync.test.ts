import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCaterersOsEventPayload } from '../lib/caterersOsSync';
import type { WorkState } from '../lib/types';

const work: WorkState = {
  costingId: 'costing-123',
  event: {
    clientName: 'Sharma Family',
    eventName: 'Sharma Wedding',
    eventDate: '2026-11-12',
    functionType: 'Wedding',
    city: 'Indore',
    venue: 'Grand Palace',
    pax: 500,
    uploadFileName: 'private-menu.pdf',
    rawMenuText: 'private source text',
  },
  menu: [
    {
      id: 'dish-1',
      name: 'Paneer Tikka',
      category: 'Starter',
      costPerPlate: 48,
      serviceId: 'dinner',
      dayLabel: 'Day 1',
      mealLabel: 'Reception Dinner',
      servicePax: 500,
    },
    {
      id: 'dish-2',
      name: 'Dal Fry',
      category: 'Main Course',
      costPerPlate: 35,
      serviceId: 'dinner',
      dayLabel: 'Day 1',
      mealLabel: 'Reception Dinner',
      servicePax: 500,
    },
  ],
  manpower: [],
  extras: { staff: 0, transport: 5000, gasFuel: 2000, disposable: 0, other: 0 },
  disposableItems: [],
  sellingPricePerPlate: 500,
  profile: {
    businessName: 'Private Business Profile',
    ownerName: 'Private Owner',
    phone: '9999999999',
    city: 'Indore',
    logoText: 'Private',
  },
  updatedAt: '2026-08-23T10:00:00.000Z',
};

test('builds a normalized CaterersOS event without private source or profile fields', () => {
  const payload = buildCaterersOsEventPayload({
    workspaceId: 'workspace-1',
    work,
    completedAt: '2026-08-23T10:30:00.000Z',
    summary: {
      menuCount: 2,
      totalCovers: 500,
      totalCost: 150000,
      sellingPricePerPlate: 500,
      totalSelling: 250000,
      totalProfit: 100000,
    },
  });

  assert.equal(payload.costingId, 'costing-123');
  assert.equal(payload.event.venue, 'Grand Palace');
  assert.equal(payload.functions.length, 1);
  assert.equal(payload.functions[0].dishCount, 2);
  assert.equal(payload.menu.length, 2);
  assert.equal(payload.summary.totalProfit, 100000);
  assert.doesNotMatch(JSON.stringify(payload), /private source text/i);
  assert.doesNotMatch(JSON.stringify(payload), /Private Business Profile/i);
});
