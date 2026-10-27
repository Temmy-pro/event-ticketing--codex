import { performance } from 'node:perf_hooks';

const BOOKINGS = 100_000;
const LOOKUPS = 500;
const bookings = Array.from({ length: BOOKINGS }, (_, index) => ({
  id: `booking-${index}`,
  reference: `REF-${String(index).padStart(6, '0')}`,
}));
const byReference = new Map(bookings.map((booking) => [booking.reference, booking]));
const targets = Array.from({ length: LOOKUPS }, (_, index) =>
  bookings[BOOKINGS - 1 - (index % 100)].reference,
);

let foundByArray = 0;
const arrayStart = performance.now();
for (const reference of targets) {
  if (bookings.find((booking) => booking.reference === reference)) foundByArray += 1;
}
const arrayMs = performance.now() - arrayStart;

let foundByMap = 0;
const mapStart = performance.now();
for (const reference of targets) {
  if (byReference.get(reference)) foundByMap += 1;
}
const mapMs = performance.now() - mapStart;

console.log(`Bookings: ${BOOKINGS.toLocaleString()}; lookups: ${LOOKUPS.toLocaleString()}`);
console.log(`Array.find: ${arrayMs.toFixed(3)} ms (${foundByArray} found)`);
console.log(`Map.get:    ${mapMs.toFixed(3)} ms (${foundByMap} found)`);
console.log(`Map speedup: ${mapMs > 0 ? (arrayMs / mapMs).toFixed(1) : 'n/a'}x`);
