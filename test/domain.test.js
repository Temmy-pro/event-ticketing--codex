import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addTier,
  bookTickets,
  createEvent,
  createStore,
  publishEvent,
  searchEvents,
  unpublishEvent,
} from '../src/domain/inventory.js';
import { DomainError } from '../src/domain/errors.js';

function addEvent(store, { title, city = 'Lagos', venue = 'Main Hall', date, tiers = [] }) {
  const event = createEvent(store, { title, city, venue, date });
  const addedTiers = tiers.map((tier) => addTier(store, event.id, tier));
  return { event, tiers: addedTiers };
}

function expectDomainError(action, code) {
  assert.throws(action, (error) => error instanceof DomainError && error.code === code);
}

test('creating an event saves a draft that is not publicly searchable', () => {
  const store = createStore();
  const event = createEvent(store, {
    title: 'Community Concert',
    city: 'Lagos',
    venue: 'Main Hall',
    date: '2026-08-20',
  });

  assert.equal(event.status, 'draft');
  assert.ok(event.id);
  assert.deepEqual(searchEvents(store), []);
});

test('event creation rejects missing required fields and impossible dates without saving', () => {
  const store = createStore();
  const valid = {
    title: 'Community Concert',
    city: 'Lagos',
    venue: 'Main Hall',
    date: '2026-08-20',
  };

  expectDomainError(() => createEvent(store, { ...valid, title: '  ' }), 'VALIDATION');
  expectDomainError(() => createEvent(store, { ...valid, city: '' }), 'VALIDATION');
  expectDomainError(() => createEvent(store, { ...valid, date: '2026-02-30' }), 'VALIDATION');
  assert.equal(store.events.size, 0);
});

test('publishing exposes an event; unpublishing hides it and invalid transitions fail', () => {
  const store = createStore();
  const { event } = addEvent(store, {
    title: 'Community Concert',
    date: '2026-08-20',
  });

  expectDomainError(() => unpublishEvent(store, event.id), 'INVALID_STATE');
  assert.equal(event.status, 'draft');
  publishEvent(store, event.id);
  assert.deepEqual(searchEvents(store).map((item) => item.id), [event.id]);
  expectDomainError(() => publishEvent(store, event.id), 'INVALID_STATE');
  unpublishEvent(store, event.id);
  assert.deepEqual(searchEvents(store), []);
});

test('adding tiers validates values and initializes available inventory', () => {
  const store = createStore();
  const { event } = addEvent(store, {
    title: 'Community Concert',
    date: '2026-08-20',
  });
  const tier = addTier(store, event.id, {
    name: 'General',
    priceCents: 500000,
    capacity: 100,
  });

  assert.equal(tier.sold, 0);
  assert.equal(tier.seatsLeft, 100);
  expectDomainError(() => addTier(store, event.id, {
    name: 'Invalid Price',
    priceCents: 1.5,
    capacity: 10,
  }), 'VALIDATION');
  expectDomainError(() => addTier(store, event.id, {
    name: 'Invalid Capacity',
    priceCents: 100,
    capacity: 0,
  }), 'VALIDATION');
  expectDomainError(() => addTier(store, 'missing', {
    name: 'General',
    priceCents: 100,
    capacity: 10,
  }), 'NOT_FOUND');
});

test('search filters title or venue and matches city without case sensitivity', () => {
  const store = createStore();
  const { event: match } = addEvent(store, {
    title: 'Jazz Evening',
    city: 'Lagos',
    venue: 'Blue Room',
    date: '2026-08-20',
  });
  publishEvent(store, match.id);
  const { event: other } = addEvent(store, {
    title: 'Comedy Night',
    city: 'Abuja',
    venue: 'Town Hall',
    date: '2026-08-21',
  });
  publishEvent(store, other.id);

  assert.deepEqual(searchEvents(store, { text: 'BLUE', city: 'lagos' }).map((item) => item.id), [match.id]);
  assert.deepEqual(searchEvents(store, { text: 'jAzZ' }).map((item) => item.id), [match.id]);
  assert.deepEqual(searchEvents(store, { city: 'LAGOS' }).map((item) => item.id), [match.id]);
  assert.deepEqual(searchEvents(store, { city: 'Lag' }), []);
});

test('date and price filters are inclusive and exclude events with no tiers', () => {
  const store = createStore();
  const { event: first } = addEvent(store, {
    title: 'First',
    date: '2026-08-20T00:00:00Z',
    tiers: [{ name: 'Premium', priceCents: 900, capacity: 10 }, { name: 'General', priceCents: 500, capacity: 10 }],
  });
  publishEvent(store, first.id);
  const { event: last } = addEvent(store, {
    title: 'Last',
    date: '2026-08-20T23:59:59.999Z',
    tiers: [{ name: 'General', priceCents: 1000, capacity: 10 }],
  });
  publishEvent(store, last.id);
  const { event: noTier } = addEvent(store, {
    title: 'No Tier',
    date: '2026-08-20T12:00:00Z',
  });
  publishEvent(store, noTier.id);

  assert.deepEqual(
    searchEvents(store, { from: '2026-08-20', to: '2026-08-20', minPriceCents: 500, maxPriceCents: 1000 })
      .map((item) => item.id),
    [first.id, last.id],
  );
});

test('sorting uses date, cheapest price, availability and title/id tie-breakers without mutation', () => {
  const store = createStore();
  const { event: later, tiers: laterTiers } = addEvent(store, {
    title: 'Zulu',
    date: '2026-08-21',
    tiers: [{ name: 'General', priceCents: 500, capacity: 5 }],
  });
  publishEvent(store, later.id);
  const { event: earlier, tiers: earlierTiers } = addEvent(store, {
    title: 'Beta',
    date: '2026-08-20',
    tiers: [{ name: 'General', priceCents: 500, capacity: 5 }],
  });
  publishEvent(store, earlier.id);
  const { event: noTier } = addEvent(store, {
    title: 'Alpha',
    date: '2026-08-20',
  });
  publishEvent(store, noTier.id);
  const tiedEvents = Array.from({ length: 2 }, () => {
    const { event } = addEvent(store, {
      title: 'Echo',
      date: '2026-08-20',
      tiers: [{ name: 'General', priceCents: 400, capacity: 4 }],
    });
    publishEvent(store, event.id);
    return event;
  });
  bookTickets(store, earlierTiers[0].id, 'Attendee', 2);

  const originalEvents = [...store.events.values()];
  assert.deepEqual(
    searchEvents(store, { sort: 'date' }).map((item) => item.id),
    [noTier.id, earlier.id, ...tiedEvents.map((event) => event.id).sort(), later.id],
  );
  assert.deepEqual(
    searchEvents(store, { sort: 'price' }).map((item) => item.id),
    [...tiedEvents.map((event) => event.id).sort(), earlier.id, later.id, noTier.id],
  );
  assert.deepEqual(
    searchEvents(store, { sort: 'availability' }).map((item) => item.id),
    [later.id, ...tiedEvents.map((event) => event.id).sort(), earlier.id, noTier.id],
  );
  assert.deepEqual([...store.events.values()], originalEvents);
});

test('invalid search dates, prices, ranges and sort options return VALIDATION', () => {
  const store = createStore();
  expectDomainError(() => searchEvents(store, { from: '2026-02-30' }), 'VALIDATION');
  expectDomainError(() => searchEvents(store, { minPriceCents: 10.5 }), 'VALIDATION');
  expectDomainError(() => searchEvents(store, { minPriceCents: 20, maxPriceCents: 10 }), 'VALIDATION');
  expectDomainError(() => searchEvents(store, { from: '2026-08-22', to: '2026-08-20' }), 'VALIDATION');
  expectDomainError(() => searchEvents(store, { sort: 'title' }), 'VALIDATION');
});

test('tickets can only be booked after the event is published', () => {
  const store = createStore();
  const { event, tiers: [tier] } = addEvent(store, {
    title: 'Community Concert',
    date: '2026-08-20',
    tiers: [{ name: 'General', priceCents: 500000, capacity: 3 }],
  });

  expectDomainError(() => bookTickets(store, tier.id, 'Attendee', 1), 'INVALID_STATE');
  publishEvent(store, event.id);
  const booking = bookTickets(store, tier.id, 'Attendee', 2);
  assert.equal(booking.status, 'pending');
  assert.equal(booking.totalPriceCents, 1000000);
  assert.equal(tier.seatsLeft, 1);
  expectDomainError(() => bookTickets(store, tier.id, 'Another Attendee', 2), 'SOLD_OUT');
  for (const quantity of [0, -1, 1.5, 11]) {
    expectDomainError(() => bookTickets(store, tier.id, 'Another Attendee', quantity), 'VALIDATION');
  }
  assert.equal(tier.seatsLeft, 1);
  assert.equal(store.bookings.size, 1);
});
