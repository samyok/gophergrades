# Schedule Builder Integration
### Features
- Inline grade distribution graphs/info cards
- Class plotter showing days of a weekly schedule on a map

### Reorganization todos
- [ ] well-defined, single entry point
- [ ] separation of "initialization" and "update"
- [ ] separation of logic and DOMming (and event firing)
- [ ] break down MutationObservers to be more efficient/granular
- [ ] operate like isolated "features" (or in a hierarchy) rather than render loop-esque implementation (onChange, onAppChange, etc.)
- [ ] clear "cause and effect" (related to two previous bullets)
- [ ] stricter understanding of shape of schedule builder website
    - querySelectors (which are everywhere) probably aren't fully narrowed down (instead having things like `[0]` or `lastChild` at the end)
    - querySelectors should be relegated to initialization (or state changes, e.g. change of URL)
- [ ] make console output useful
- [ ] apply this to sidebar.js(?)