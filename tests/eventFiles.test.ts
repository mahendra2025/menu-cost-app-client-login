import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEventPlan, validateAttachment, MAX_ATTACHMENT_BYTES } from '../lib/eventFiles';
const plan = { status: 'Confirmed', phone: ' 123 ', email: 'client@example.com', notes: ' Venue access at 9 am ' };
test('planning fields are trimmed and supported statuses accepted', () => {
  assert.deepEqual(validateEventPlan(plan), { ...plan, phone: '123', notes: 'Venue access at 9 am' });
});
test('invalid status, email, field types and oversized notes are rejected', () => {
  for (const value of [null, [], { ...plan, status: 'Unknown' }, { ...plan, email: 'bad@' }, { ...plan, phone: 123 }, { ...plan, notes: 'x'.repeat(10001) }]) assert.throws(() => validateEventPlan(value));
});
test('attachments enforce allowed types, nonempty content and size limits', () => {
  assert.equal(validateAttachment('menu.PDF', MAX_ATTACHMENT_BYTES), 'menu.PDF');
  for (const [name, size] of [['bad.html', 10], ['empty.pdf', 0], ['big.pdf', MAX_ATTACHMENT_BYTES + 1]] as const) assert.throws(() => validateAttachment(name, size));
  assert.equal(validateAttachment('../menu\n.pdf', 10), '.._menu_.pdf');
});
