import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventFilePdf, createManagerEventFilePdf, eventFilePdfName, managerEventFilePdfName, type EventFileFunction } from '../lib/eventFilePdf';
import type { WorkState } from '../lib/types';

export const exampleWork: WorkState = {
  costingId: 'event-file-test', event: { eventName: 'Reception and Lunch', clientName: 'Sample Client', eventDate: '2026-10-10', venue: 'Garden Hall', city: 'Surat', pax: 100, functionType: 'Wedding', uploadFileName: '', rawMenuText: '' },
  menu: [], manpower: [], disposableItems: [], extras: { staff: 0, transport: 0, gasFuel: 0, disposable: 0, other: 0 },
  sellingPricePerPlate: 500, profile: { businessName: 'Sample Catering', ownerName: 'Owner', phone: '1234567890', city: 'Surat', logoText: 'SC' }, updatedAt: '',
};
export const exampleFunctions: EventFileFunction[] = ['Lunch', 'Reception'].map((mealLabel, fnIndex) => ({
  key: mealLabel, dayLabel: 'Day 1', mealLabel, pax: 100, menu: [],
  rows: Array.from({ length: 24 }, (_, i) => ({ kind: 'EQUIPMENT', requirement: `Function ${fnIndex + 1} equipment ${i + 1}`, detail: 'Delivery to the service entrance. Confirm setup location with the venue manager.', quantity: 5, unit: 'pcs', assignedTo: 'Example Rentals', partnerType: 'VENDOR', rate: 100, status: 'CONFIRMED', deliveryTime: '2026-10-10T09:00', pickupTime: '2026-10-10T23:00', paymentTerms: 'Balance after pickup' })),
}));
export const exampleMetadata = { status: 'Confirmed', phone: '1234567890', email: 'client@example.com', notes: 'Keep the entrance clear. Serve lunch at noon.', attachments: [{ name: 'venue-plan.pdf', size: 2048 }] };
test('complete event PDF contains both functions, last assignment, notes and attachment register across pages', () => {
  const doc = createEventFilePdf(exampleWork, exampleFunctions, exampleMetadata);
  const output = doc.output();
  assert.ok(doc.getNumberOfPages() > 3);
  for (const value of ['Lunch', 'Reception', 'Function 2 equipment 24', 'Keep the entrance clear.', 'venue-plan.pdf', 'Costing summary']) assert.ok(output.includes(value), value);
  assert.equal(eventFilePdfName(exampleWork), 'Reception-and-Lunch-complete-event-file.pdf');
});
test('empty event exports without crashing', () => {
  assert.ok(createEventFilePdf(exampleWork, [], { ...exampleMetadata, attachments: [], notes: '' }).getNumberOfPages() > 0);
});

test('manager event PDF keeps operations but excludes every rate and costing section', () => {
  const doc = createManagerEventFilePdf(exampleWork, exampleFunctions, exampleMetadata);
  const output = doc.output();
  for (const value of ['Manager Event File', 'Lunch', 'Reception', 'Function 2 equipment 24', 'Example Rentals', 'Keep the entrance clear.', 'venue-plan.pdf']) {
    assert.ok(output.includes(value), value);
  }
  for (const hidden of ['Costing summary', 'Rate per cover', 'Estimated profit', 'INR 100', 'INR 500']) {
    assert.ok(!output.includes(hidden), hidden);
  }
  assert.equal(managerEventFilePdfName(exampleWork), 'Reception-and-Lunch-manager-event-file.pdf');
});
