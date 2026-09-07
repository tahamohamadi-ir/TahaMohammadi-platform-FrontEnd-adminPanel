# PU-12-graph Handoff

- Packet: `PU-12-graph` (ADMIN)
- Status: `PU-12-graph_HANDOFF_READY`
- Repository: `Front-End/admin-panel`

## Summary of Changes

1. `src/lib/api/graph.ts`:
   - Updated TypeScript definitions for `GraphNode`, `GraphEdge`, and `GraphGroup`.
   - Exported `GRAPH_RELATED_FAMILIES` and `GRAPH_RELATION_TYPES` constants matching backend specifications.

2. `src/pages/GraphEditPage.tsx`:
   - Implemented an accessible node table and keyboard positioning interface as a WCAG-compliant alternative to drag-and-drop operations.
   - Added direct numeric coordinate editing (X, Y, optional Z) and directional keyboard nudge buttons (← Left, → Right, ↑ Up, ↓ Down) with 10px increments.
   - Implemented record relation management and validation on nodes (`relatedRecords: Array<{ family, id }>`):
     - View attached record relations per node.
     - Add new relation with family selector and record ID.
     - Client validation preventing duplicates and empty fields.
     - Remove relation functionality.
   - Added complete node and edge management (add node, remove node, add edge with relation type, remove edge, reverse edge direction).
   - Display structured validation issues (`BROKEN_RELATED`, `MISSING_POSITION`, `MISSING_ACCESSIBLE_LABEL`, `BAD_WEIGHT`, `SELF_EDGE`, `DUPLICATE_EDGE`) with targeted node and edge badges.
   - Safe version lifecycle with optimistic locking (`If-Match: updatedAt`) and activation workflow.

3. `src/pages/GraphEditPage.test.tsx`:
   - Added focused failing tests for keyboard/table positioning controls and node related-records management before implementation.
   - Verified that all 6 test cases pass (node editing, edge reversal, validation reporting, keyboard positioning, related record validation).

## Verification

- `npm test -- src/pages/GraphEditPage.test.tsx`: 6/6 tests passed.
- `npm test`: 44 test files, 179 tests passed.
- `npm run lint`: 0 errors.
- `npm run build`: built cleanly in 959ms.
