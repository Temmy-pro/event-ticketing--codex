# Build 2: Event search, sorting, backlog, first tests

Week 5 of the course. Starts from the finished state of Build 1.

**Deliver:** search and filter events by text, city, date range and price; sort by date, price or availability using a merge sort you write yourself; the backlog written as user stories; your first automated tests.

**Practise:** sorting algorithms, stability, Big O, Agile and Scrum, writing user stories with acceptance criteria.

## Done when

- Search, filter and sort work and never change the original list.
- Every user story you are building has acceptance criteria.
- `npm test` runs and passes.

## User stories in this build

### S02: Create an event

- **Given** an organizer, **when** they create an event with a title, city, venue and valid date, **then** the event is saved as a draft with a new id and is not on the public list.
- **Given** a missing title or city, or a date that is not a real date, **when** the organizer creates the event, **then** the request is rejected with `VALIDATION` and nothing is saved.

### S03: Add ticket tiers

- **Given** a draft event, **when** the organizer adds a tier “General” at 500000 kobo with capacity 100, **then** the tier is saved with 0 sold and 100 seats left.
- **Given** any event, **when** price is not a whole number or capacity is less than 1, **then** the request is rejected with `VALIDATION`.
- **Given** an event id that does not exist, **when** the organizer adds a tier, **then** the request is rejected with `NOT_FOUND`.

### S04: Publish and unpublish an event

- **Given** a draft event, **when** the organizer publishes it, **then** it is marked published and appears in public event search.
- **Given** a published event, **when** the organizer unpublishes it, **then** it returns to draft and no longer appears in public event search.
- **Given** an event in the wrong state for the requested transition, **when** the organizer publishes or unpublishes it, **then** the request is rejected with `INVALID_STATE` and its state is unchanged.

### S05: Search, filter and sort published events

- Search matches title or venue ignoring case; city matches exactly ignoring case.
- Price filtering compares the cheapest tier; events with no tiers are excluded from price filters.
- Date range bounds are inclusive; a date-only `to` includes the whole day.
- Sort by date earliest first, price cheapest first (no price last), or availability most seats left first. Break ties by title then id.
- Bad dates, non-whole-number prices, and unknown sort options produce `VALIDATION`.
- Filtering and sorting do not mutate the original list; sorting uses a stable merge sort.

### S06: Book tickets

- **Given** a published event with 3 seats left in General, **when** an attendee books 2, **then** a pending booking is created for 2 seats, priced in whole cents, and 1 seat is left.
- **Given** 1 seat left, **when** an attendee books 2, **then** booking is rejected with `SOLD_OUT` and nothing changes.
- **Given** any tier, **when** quantity is 0, negative, fractional or more than 10, **then** request is rejected with `VALIDATION`.

### S16: Automated tests

- **Given** the project, **when** someone runs `npm test`, **then** every test runs and the command fails if any test fails (Build 2).
- **Given** a push to GitHub, **when** the workflow runs, **then** `npm test` runs automatically and a failing test shows as a failed check (Build 9).

See `user-stories.md`, `build-1.md`, and `milestones.md`.
