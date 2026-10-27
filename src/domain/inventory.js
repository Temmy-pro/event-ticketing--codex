import { DomainError } from './errors.js';
import { newId, newReference } from './ids.js';
import { Queue } from './waitlistQueue.js';

const fail = (code, message) => { throw new DomainError(code, message); };

function requireStore(store) {
  if (!store || !(store.events instanceof Map) || !(store.tiers instanceof Map) ||
      !(store.bookings instanceof Map) || !(store.bookingsByReference instanceof Map) ||
      !(store.waitlists instanceof Map)) {
    fail('VALIDATION', 'A valid store created by createStore() is required.');
  }
}

function nonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('VALIDATION', `${field} must be a non-empty string.`);
  }
  return value.trim();
}

function positiveInteger(value, field, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    fail('VALIDATION', `${field} must be a whole number between 1 and ${max}.`);
  }
  return value;
}

function validIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value)) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  // Reject impossible calendar dates that Date would otherwise normalize.
  const dateOnly = value.slice(0, 10);
  const [year, month, day] = dateOnly.split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) return false;
  return true;
}

export function createStore() {
  return {
    events: new Map(),
    tiers: new Map(),
    bookings: new Map(),
    bookingsByReference: new Map(),
    waitlists: new Map(),
  };
}

export function createEvent(store, { title, city, venue, date }) {
  requireStore(store);
  title = nonEmptyString(title, 'title');
  city = nonEmptyString(city, 'city');
  venue = nonEmptyString(venue, 'venue');
  if (!validIsoDate(date)) fail('VALIDATION', 'date must be a valid ISO date or date-time string.');

  const event = {
    id: newId(), title, city, venue, date,
    status: 'draft',
    tierIds: [],
  };
  store.events.set(event.id, event);
  return event;
}

export function publishEvent(store, eventId) {
  requireStore(store);
  eventId = nonEmptyString(eventId, 'eventId');
  const event = store.events.get(eventId);
  if (!event) fail('NOT_FOUND', `Event ${eventId} was not found.`);
  if (event.status !== 'draft') {
    fail('INVALID_STATE', 'Only a draft event can be published.');
  }

  event.status = 'published';
  return event;
}

export function unpublishEvent(store, eventId) {
  requireStore(store);
  eventId = nonEmptyString(eventId, 'eventId');
  const event = store.events.get(eventId);
  if (!event) fail('NOT_FOUND', `Event ${eventId} was not found.`);
  if (event.status !== 'published') {
    fail('INVALID_STATE', 'Only a published event can be unpublished.');
  }

  event.status = 'draft';
  return event;
}

export function addTier(store, eventId, { name, priceCents, capacity }) {
  requireStore(store);
  eventId = nonEmptyString(eventId, 'eventId');
  const event = store.events.get(eventId);
  if (!event) fail('NOT_FOUND', `Event ${eventId} was not found.`);
  name = nonEmptyString(name, 'name');
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
    fail('VALIDATION', 'priceCents must be a non-negative whole number of cents.');
  }
  capacity = positiveInteger(capacity, 'capacity');

  const tier = {
    id: newId(), eventId, name, priceCents, capacity,
    sold: 0,
    get seatsLeft() { return this.capacity - this.sold; },
  };
  store.tiers.set(tier.id, tier);
  event.tierIds.push(tier.id);
  store.waitlists.set(tier.id, new Queue());
  return tier;
}

function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareNumbers(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function mergeSort(items, compare) {
  if (items.length < 2) return items.slice();

  const middle = Math.floor(items.length / 2);
  const left = mergeSort(items.slice(0, middle), compare);
  const right = mergeSort(items.slice(middle), compare);
  const result = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (compare(left[leftIndex], right[rightIndex]) <= 0) {
      result.push(left[leftIndex]);
      leftIndex += 1;
    } else {
      result.push(right[rightIndex]);
      rightIndex += 1;
    }
  }

  return result.concat(left.slice(leftIndex), right.slice(rightIndex));
}

function dateBound(value, field, endOfDay = false) {
  if (!validIsoDate(value)) {
    fail('VALIDATION', `${field} must be a valid ISO date or date-time string.`);
  }

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const normalized = isDateOnly
    ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
    : value;
  return new Date(normalized).getTime();
}

function optionalText(value, field) {
  if (value === undefined) return '';
  if (typeof value !== 'string') fail('VALIDATION', `${field} must be a string.`);
  return value.trim().toLocaleLowerCase();
}

function optionalPrice(value, field) {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value < 0) {
    fail('VALIDATION', `${field} must be a non-negative whole number of cents.`);
  }
  return value;
}

function eventPrice(store, event) {
  const prices = event.tierIds
    .map((tierId) => store.tiers.get(tierId))
    .filter(Boolean)
    .map((tier) => tier.priceCents);
  return prices.length === 0 ? undefined : prices.reduce((lowest, price) => Math.min(lowest, price));
}

function eventAvailability(store, event) {
  return event.tierIds.reduce((total, tierId) => {
    const tier = store.tiers.get(tierId);
    return total + (tier ? tier.seatsLeft : 0);
  }, 0);
}

/**
 * Returns published events matching the optional filters, sorted without
 * mutating the store or the event collection.
 */
export function searchEvents(store, {
  text,
  city,
  from,
  to,
  minPriceCents,
  maxPriceCents,
  sort = 'date',
} = {}) {
  requireStore(store);

  const searchText = optionalText(text, 'text');
  const searchCity = optionalText(city, 'city');
  const fromTime = from === undefined ? undefined : dateBound(from, 'from');
  const toTime = to === undefined ? undefined : dateBound(to, 'to', true);
  const minimumPrice = optionalPrice(minPriceCents, 'minPriceCents');
  const maximumPrice = optionalPrice(maxPriceCents, 'maxPriceCents');

  if (fromTime !== undefined && toTime !== undefined && fromTime > toTime) {
    fail('VALIDATION', 'from must be earlier than or equal to to.');
  }
  if (minimumPrice !== undefined && maximumPrice !== undefined && minimumPrice > maximumPrice) {
    fail('VALIDATION', 'minPriceCents must be less than or equal to maxPriceCents.');
  }

  if (!['date', 'price', 'availability'].includes(sort)) {
    fail('VALIDATION', 'sort must be date, price, or availability.');
  }

  const hasPriceFilter = minimumPrice !== undefined || maximumPrice !== undefined;
  const events = [...store.events.values()].filter((event) => {
    if (event.status !== 'published') return false;
    const searchableText = `${event.title} ${event.venue}`.toLocaleLowerCase();
    if (searchText && !searchableText.includes(searchText)) return false;
    if (searchCity && event.city.toLocaleLowerCase() !== searchCity) return false;

    const eventTime = new Date(event.date).getTime();
    if (fromTime !== undefined && eventTime < fromTime) return false;
    if (toTime !== undefined && eventTime > toTime) return false;

    if (hasPriceFilter) {
      const price = eventPrice(store, event);
      if (price === undefined) return false;
      if (minimumPrice !== undefined && price < minimumPrice) return false;
      if (maximumPrice !== undefined && price > maximumPrice) return false;
    }
    return true;
  });

  const compareByTitleAndId = (left, right) =>
    compareStrings(left.title, right.title) || compareStrings(left.id, right.id);

  return mergeSort(events, (left, right) => {
    let comparison = 0;
    if (sort === 'date') {
      comparison = compareNumbers(new Date(left.date).getTime(), new Date(right.date).getTime());
    } else if (sort === 'price') {
      const leftPrice = eventPrice(store, left);
      const rightPrice = eventPrice(store, right);
      if (leftPrice === undefined && rightPrice !== undefined) return 1;
      if (leftPrice !== undefined && rightPrice === undefined) return -1;
      if (leftPrice !== undefined && rightPrice !== undefined) {
        comparison = compareNumbers(leftPrice, rightPrice);
      }
    } else {
      comparison = compareNumbers(eventAvailability(store, right), eventAvailability(store, left));
    }
    return comparison || compareByTitleAndId(left, right);
  });
}

export function bookTickets(store, tierId, attendeeName, quantity) {
  requireStore(store);
  tierId = nonEmptyString(tierId, 'tierId');
  attendeeName = nonEmptyString(attendeeName, 'attendeeName');
  quantity = positiveInteger(quantity, 'quantity', 10);

  const tier = store.tiers.get(tierId);
  if (!tier) fail('NOT_FOUND', `Ticket tier ${tierId} was not found.`);
  const event = store.events.get(tier.eventId);
  if (!event) fail('NOT_FOUND', `Event ${tier.eventId} was not found.`);
  if (event.status !== 'published') {
    fail('INVALID_STATE', 'Tickets can only be booked for a published event.');
  }
  if (tier.seatsLeft < quantity) {
    fail('SOLD_OUT', `Only ${tier.seatsLeft} seat(s) remain; ${quantity} requested.`);
  }

  // Generate a unique reference before changing inventory, preserving atomicity.
  let reference;
  do { reference = newReference(); } while (store.bookingsByReference.has(reference));

  const booking = {
    id: newId(), reference, eventId: event.id, tierId,
    attendeeName, quantity,
    totalPriceCents: tier.priceCents * quantity,
    status: 'pending',
  };

  tier.sold += quantity;
  store.bookings.set(booking.id, booking);
  store.bookingsByReference.set(booking.reference, booking);
  return booking;
}

export function cancelBooking(store, bookingId) {
  requireStore(store);
  bookingId = nonEmptyString(bookingId, 'bookingId');
  const booking = store.bookings.get(bookingId);
  if (!booking) fail('NOT_FOUND', `Booking ${bookingId} was not found.`);
  if (booking.status === 'cancelled') fail('INVALID_STATE', 'This booking has already been cancelled.');

  const tier = store.tiers.get(booking.tierId);
  if (!tier) fail('NOT_FOUND', `Ticket tier ${booking.tierId} was not found.`);
  if (tier.sold < booking.quantity) fail('INVALID_STATE', 'Inventory is inconsistent; cancellation was not applied.');

  tier.sold -= booking.quantity;
  booking.status = 'cancelled';
  return booking;
}

export function findBookingByReference(store, reference) {
  requireStore(store);
  reference = nonEmptyString(reference, 'reference');
  const booking = store.bookingsByReference.get(reference);
  if (!booking) fail('NOT_FOUND', `Booking reference ${reference} was not found.`);
  return booking;
}

export function joinWaitlist(store, tierId, attendeeName) {
  requireStore(store);
  tierId = nonEmptyString(tierId, 'tierId');
  attendeeName = nonEmptyString(attendeeName, 'attendeeName');
  const tier = store.tiers.get(tierId);
  if (!tier) fail('NOT_FOUND', `Ticket tier ${tierId} was not found.`);
  if (tier.seatsLeft > 0) fail('INVALID_STATE', 'The waitlist is only available when the tier is sold out.');

  const queue = store.waitlists.get(tierId);
  if (!(queue instanceof Queue)) fail('INVALID_STATE', 'Waitlist queue is missing for this tier.');
  const entry = { id: newId(), tierId, attendeeName, joinedAt: new Date().toISOString() };
  queue.enqueue(entry);
  return entry;
}
