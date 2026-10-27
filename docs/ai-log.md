# AI log

## Build 1 — initial domain core

- **Prompt:** Implement the Build 1 terminal domain core from `README.md` and `docs/build-1.md`, with crypto-generated identifiers, coded domain errors, atomic capacity checks, cancellation, a linked-list FIFO waitlist, O(1) reference lookup, a demo and a benchmark.
- **What came back:** Domain modules, demo and benchmark using only Node.js built-ins.
- **Review / changes:** Initial implementation created in this workspace. Run the demo and benchmark and review the code before treating this entry as final. Any defects found during review should be recorded here before merging.

## Build 2 — event search and first tests

- **Prompt:** Implement Build 2 event publication, search, filtering and stable sorting; add acceptance criteria and a Node.js test command.
- **What came back:** Publication transitions, published-event discovery with merge-sort ordering, domain tests and `npm test`.
- **Review / changes:** The first test run revealed an incorrect expected availability order in a new test. The expected order was corrected to match most-seats-left-first; the final test run passed all 9 tests, and `npm run demo` passed.
