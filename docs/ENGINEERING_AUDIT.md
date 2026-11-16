# Engineering audit

Reviewed current application modules, route handlers, database/session/client modules, styles, and browser/unit tests. This is a maintainability audit, not a security or licensing clearance. No application code was changed in this pass.

## Follow-up

The collection/module and styling cleanup, ordered migrations, focused year-data functions, browser fixture reuse, and shared year cache are now implemented. See CLEANUP_STATUS.md. Findings below describe the pre-cleanup state.

## Findings and recommended order

1. **Collection orchestration is the first refactoring target.** `app/collection.tsx` is approximately 17.6KB of densely formatted code. Collection import, snapshot expiry, master-year lookup/recovery, personal corrections, selection/dialog behavior, filters, and all rendering share one component. Extract collection loading and year resolution into focused hooks, then filters, cards, details, and lookup status into cohesive components. Keep the parent responsible for composition and shared selection/filter state. Preserve existing recovery behavior with regression checks.
2. **Format before expanding.** Short line counts disguise substantial complexity throughout components, routes, tests, and CSS. Establish readable formatting; avoid combining a broad behavior change with mechanical formatting so review stays practical.
3. **Consolidate styles.** `app/style.css` is approximately 12.6KB with successive overrides of header, toolbar, search, and control rules. Consolidate active rules and move feature styles alongside their components when those are extracted. Keep the small existing palette rather than inventing a styling framework.
4. **Move feature SQL out of HTTP handlers.** The years route reads/writes corrections directly; database initialization also includes OAuth attempt operations. Introduce focused data functions as these features are touched, keeping authorization decisions at the route boundary and explicit user IDs in private-data queries. Use dedicated ordered migrations as schema changes grow, without a generic repository layer.
5. **Keep existing pure domain logic.** `lib/collection.ts` already separates filtering, grouping, and year precedence from rendering. Preserve that boundary and its tests. The Discogs transport and session modules are already separate, though feature caching should not become another concern in the transport module.
6. **Reuse test setup when it helps.** Browser scripts duplicate fixture sessions, route interception, and record construction. Share a small fixture helper when extending those tests. Keep scenario assertions explicit and avoid inventing a full test framework.

## Next focused change

Before adding the agreed shared master-year SQLite cache, extract year-resolution orchestration from the collection component. Add focused metadata persistence functions and expiry policy alongside that work. Keep personal corrections independent and user-scoped. The shared cache is agreed but is **not implemented yet**; current automatic lookup results remain transient. Simultaneous-request deduplication remains intentionally out of scope.

The guidelines in AGENTS.md describe boundaries and decision rules rather than a mandatory directory tree or line-count limits. No broad repository reorganization is needed before this incremental cleanup.
