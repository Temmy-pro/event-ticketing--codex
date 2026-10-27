import {
  addTier,
  bookTickets,
  cancelBooking,
  createEvent,
  createStore,
  findBookingByReference,
  joinWaitlist,
  publishEvent,
} from '../src/domain/inventory.js';
import { DomainError } from '../src/domain/errors.js';

const store = createStore();
const event = createEvent(store, {
  title: 'Abuja JavaScript Night',
  city: 'Abuja',
  venue: 'Community Hall',
  date: '2026-12-05T17:00:00Z',
});
const general = addTier(store, event.id, { name: 'General', priceCents: 5000, capacity: 3 });
publishEvent(store, event.id);

console.log(`Event: ${event.title}`);
const ada = bookTickets(store, general.id, 'Ada', 2);
console.log(`Ada booked ${ada.quantity} tickets. Reference: ${ada.reference}. Seats left: ${general.seatsLeft}.`);

try {
  bookTickets(store, general.id, 'Bayo', 2);
} catch (error) {
  if (!(error instanceof DomainError)) throw error;
  console.log(`Bayo's request for 2 tickets was refused: ${error.code} (${error.message})`);
}

const chidi = bookTickets(store, general.id, 'Chidi', 1);
console.log(`Chidi booked the last seat. Event sold out: ${general.seatsLeft === 0}.`);
const first = joinWaitlist(store, general.id, 'Dara');
const second = joinWaitlist(store, general.id, 'Emeka');
console.log(`${first.attendeeName} joined the waitlist first; ${second.attendeeName} joined second.`);
console.log(`Lookup by reference ${ada.reference}: ${findBookingByReference(store, ada.reference).attendeeName}'s booking found.`);

cancelBooking(store, ada.id);
const next = store.waitlists.get(general.id).peek();
console.log(`Ada cancelled. Seats left: ${general.seatsLeft}. Next person in line: ${next.attendeeName}.`);
// Keep the final booking referenced so the demo explicitly shows the event sold out before cancellation.
void chidi;
