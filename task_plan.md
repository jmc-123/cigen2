## Goal
Enhance the existing roots/affixes learning app with word-level search & detail views, a clearer 3-section UI (Search Home, Learning, About), and one-click Vercel deployment from GitHub, while keeping code changes minimal and aligned with the current architecture.

## Current Phase
Phase 1

## Phases

### Phase 1: Requirements & Discovery
- [ ] Explore current features and data model in `index.html`, `app.js`, and `data/roots_affixes.json`
- [ ] Precisely capture current search modes (roots/affixes/中文提示) and any existing detail views
- [ ] Confirm where to hook in word-level search and detail panels with minimal disruption
- **Status:** in_progress

### Phase 2: Planning & Structure
- [ ] Define data contract for "word detail" (definition, example sentence, pronunciation, linked roots/affixes)
- [ ] Decide how to extend existing search pipeline to support word search with minimal refactor
- [ ] Design lightweight navigation structure for Search Home / Learning / About within current single-page app
- **Status:** pending

### Phase 3: Implementation
- [ ] Implement word-based search path reusing existing render/search helpers where possible
- [ ] Implement word detail view (definition, example sentence, pronunciation audio, linked roots/affixes)
- [ ] Wire clickable roots/affixes in word detail back into existing root/affix views
- [ ] Refactor UI sections into Search Home, Learning page, and About page without breaking existing behavior
- [ ] Add Vercel configuration files and README deploy button for one-click GitHub → Vercel deploy
- **Status:** pending

### Phase 4: Testing & Verification
- [ ] Manually test all search modes (roots, affixes, 中文提示, words) for correctness and regressions
- [ ] Test word detail view content, audio playback, and root/affix linking
- [ ] Test navigation between Search Home, Learning, and About sections
- [ ] Test local static build behavior vs. Vercel expectations
- **Status:** pending

### Phase 5: Delivery
- [ ] Review code changes for minimal-diff, readability, and consistency with existing style
- [ ] Ensure planning files (`task_plan.md`, `findings.md`, `progress.md`) are up to date
- [ ] Summarize implementation details and usage notes for the user
- **Status:** pending

## Key Questions
1. How are words currently represented in `roots_affixes.json`, and what metadata (roots, affixes, meanings) can be reused for word detail views?
2. What is the cleanest way to layer word search and detail views on top of the existing search/result rendering without a full refactor?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use Manus-style planning files in project root | Keeps multi-step feature work organized and recoverable across sessions |
| Keep architecture as a single-page static app | Aligns with current codebase and simplifies Vercel deployment |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `session-catchup.py` missing from global planning-with-files skill install | 1 | Proceeded without catchup; logged error here and continued with fresh planning state |

## Notes
- Update phase status as you progress: pending → in_progress → complete
- Re-read this plan before major decisions (attention manipulation)
- Log ALL errors - they help avoid repetition
