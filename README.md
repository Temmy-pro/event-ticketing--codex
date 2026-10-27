# Event Ticketing and Booking: Course Capstone

Organizers publish events. Attendees buy tickets. Staff check people in with QR codes.

This project is built over nine weekly Builds. The first Build is a terminal-only domain core: no website, API, database, or external packages yet.

## Stack

- Node.js 22.13 or newer
- Plain JavaScript with ES modules
- Node built-ins only; no `npm install` required
- Money stored as whole integer cents/kobo, never decimals

## Build 1: run it

Check Node:

```bash
node --version
```

Run the demo:

```bash
npm run demo
```

Run the automated tests:

```bash
npm test
```

The demo shows Ada booking two of three seats, Bayo being refused for requesting two when only one remains, the last seat selling, two people joining the waitlist, lookup by reference, and cancellation making seats available while preserving waitlist order.

Run the benchmark:

```bash
npm run benchmark
```

It compares 500 lookups among 100,000 bookings using `Array.find` and `Map.get`. Timings vary by machine. `Array.find` is O(n) per lookup in the worst case; `Map.get` is O(1) on average.

## Read the code

1. `src/domain/errors.js` — coded domain errors.
2. `src/domain/ids.js` — cryptographically generated ids and references.
3. `src/domain/inventory.js` — event, tier, booking, cancellation, lookup and waitlist rules.
4. `src/domain/waitlistQueue.js` — O(1) linked-list FIFO queue.
5. `scripts/demo.js` — a runnable story using the domain core.
6. `test/domain.test.js` — Build 2 domain acceptance tests.

Build 2 adds event publishing and `searchEvents`, which filters published events
and sorts them with a stable merge sort.

## Course workflow

Work on a branch named `build-N`, open a pull request into `main`, and merge through review. Do not push directly to `main`. Keep `docs/ai-log.md` updated for every Build. Never commit secrets or `.env` files.

See `docs/milestones.md`, `docs/build-1.md`, `docs/build-2.md`, and `docs/user-stories.md` for course requirements.
