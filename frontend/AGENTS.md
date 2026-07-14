<!-- CODEGRAPH_START -->

## CodeGraph

This project has a CodeGraph MCP server (`codegraph_*` tools) configured. CodeGraph is a tree-sitter-parsed knowledge graph of every symbol, edge, and file. Reads are sub-millisecond and return structural information grep cannot.

### When to prefer codegraph over native search

Use codegraph for **structural** questions — what calls what, what would break, where is X defined, what is X's signature. Use native grep/read only for **literal text** queries (string contents, comments, log messages) or after you already have a specific file open.

| Question                                                  | Tool                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| "Where is X defined?" / "Find symbol named X"             | `codegraph_search`                                                                   |
| "What calls function Y?"                                  | `codegraph_callers`                                                                  |
| "What does Y call?"                                       | `codegraph_callees`                                                                  |
| "How does X reach/become Y? / trace the flow from X to Y" | `codegraph_trace` (one call = the whole path, incl. callback/React/JSX dynamic hops) |
| "What would break if I changed Z?"                        | `codegraph_impact`                                                                   |
| "Show me Y's signature / source / docstring"              | `codegraph_node`                                                                     |
| "Give me focused context for a task/area"                 | `codegraph_context`                                                                  |
| "See several related symbols' source at once"             | `codegraph_explore`                                                                  |
| "What files exist under path/"                            | `codegraph_files`                                                                    |
| "Is the index healthy?"                                   | `codegraph_status`                                                                   |

### Rules of thumb

- **Answer directly — don't delegate exploration.** For "how does X work" / architecture questions, answer with 2-3 codegraph calls: `codegraph_context` first, then ONE `codegraph_explore` for the source of the symbols it surfaces. For a specific **flow** ("how does X reach Y") start with `codegraph_trace` from→to — one call returns the whole path with dynamic hops bridged — then ONE `codegraph_explore` for the bodies; don't rebuild the path with `codegraph_search` + `codegraph_callers`. Codegraph IS the pre-built index, so spawning a separate file-reading sub-task/agent — or running a grep + read loop — repeats work codegraph already did and costs more for the same answer.
- **Trust codegraph results.** They come from a full AST parse. Do NOT re-verify them with grep — that's slower, less accurate, and wastes context.
- **Don't grep first** when looking up a symbol by name. `codegraph_search` is faster and returns kind + location + signature in one call.
- **Don't chain `codegraph_search` + `codegraph_node`** when you just want context — `codegraph_context` is one call.
- **Don't loop `codegraph_node` over many symbols** — one `codegraph_explore` call returns several symbols' source grouped in a single capped call, while each separate node/Read call re-reads the whole context and costs far more.
- **Index lag**: the file watcher debounces ~500ms behind writes; don't re-query immediately after editing a file in the same turn.

### If `.codegraph/` doesn't exist

The MCP server returns "not initialized." Ask the user: _"I notice this project doesn't have CodeGraph initialized. Want me to run `codegraph init -i` to build the index?"_

<!-- CODEGRAPH_END -->

<!-- DESIGN_CONTEXT_START -->

## Design Context

**Register:** product — internal warehouse management system.

**Key design decisions:**
- **Font:** IBM Plex Sans (single family, all roles). Inter is banned.
- **Color strategy:** Restrained — tinted neutrals + one cool steel-blue accent (≤10% of any screen).
- **Motion:** State changes only. No decorative animation, no scroll reveals, no parallax.
- **Elevation:** Flat at rest. Shadows only for transient overlays (dropdowns, modals, tooltips).
- **Layout:** Role-appropriate density — sparse + large targets for STOCK, data-dense for MANAGER.

**Anti-references:** No marketing/landing page patterns, no card-ception, no gradients, no glassmorphism, no ERP-classic form-heavy UI, no startup/SaaS aesthetic.

**Design principles:** Thực dụng > hoàn mỹ, tốc độ là tính năng, rõ ràng > trang trí, professional không hào nhoáng, role-appropriate density.

<!-- DESIGN_CONTEXT_END -->

<!-- RUNTIME_CONVENTIONS_START -->

## Runtime Conventions (từ buổi dev ngày 14/07/2026)

### 1. Mock data architecture

```
mock-services/data.ts          ← seed data (thuần data, ko logic)
mock-services/index.ts         ← CRUD functions + business logic mock
features/stock/services/*.ts   ← proxy re-export (swap real API sau)
```

- `data.ts` chỉ chứa seed data, mỗi entity một mảng export
- `index.ts` chứa tất cả async functions, không gọi API thật, các function chậm dùng `await delay(100)`
- Mỗi feature có `services/` dir chứa proxy files re-export từ `@/mock-services`
- Page files **ko bao giờ** import trực tiếp từ `@/mock-services` — phải qua proxy `features/*/services/*`
- Page files **ko bao giờ** có hardcoded mock data arrays — gọi service function để fetch

### 2. UI component conventions

- **Table containers**: Luôn có `overflow-x-auto` trên wrapper `rounded-lg border`
- **Pagination**: Dùng windowed page numbers (current ± 2, first + last, ellipsis), ko render hết `totalPages`
- **Select**: `SelectContent` dùng `max-h-[50vh]` thay vì `--radix-select-content-available-height` (Radix variable unreliable)
- **Toast**: Dùng `sonner` qua wrapper `utils/toast.ts`, `Toaster` trong `App.tsx`

### 3. Types

- `BrandResponse` = `type BrandResponse = CatalogResponse` (cùng shape)
- `CategoryResponse` = `type CategoryResponse = CatalogResponse`
- `InventoryItem` = interface riêng (tổng hợp tồn kho, khác `ProductUnit`)
- Tất cả types phải định nghĩa trong `utils/types.ts` trước khi dùng
- Ko import type undefined — build sẽ fail

<!-- RUNTIME_CONVENTIONS_END -->
