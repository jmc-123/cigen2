## Requirements
- Support searching **by word** in addition to existing modes (词根 / 词缀 / 中文提示), ideally reusing the existing search pipeline.
- When clicking a **word** in search results, show a detail view that includes:
  - A concise **definition** in simple English
  - An **example sentence** in simple, easy grammar
  - A **pronunciation audio** player using a URL like `https://dict.youdao.com/dictvoice?audio=hello&type=2`
  - The word’s **roots and affixes**, each rendered as a hyperlink that navigates to the corresponding root/affix view.
- Keep definitions and examples in a **Simple English style** (Simple Wikipedia-like) as much as practical within a static client-only app.
- Restructure the UI into three conceptual sections:
  - **Search Home**: all search inputs, options, and result lists.
  - **Learning Page**: more systematic study views (e.g., grouped roots/affixes, learning flows) built from existing features.
  - **About Page**: description of the tool, data source, and usage tips.
- Add **Vercel-related config files** so the project can be deployed as a static site with one click from GitHub.
- Add a **Deploy to Vercel** button to `README.md` that links to a Vercel clone-and-deploy URL for this repo.

## Research Findings
- Manus planning skill is installed globally under `C:\Users\Charles\.cursor\skills\planning-with-files`, but the `session-catchup.py` script path used in the skill appears missing on this machine; planning will start from a fresh state for this session.
- Planning templates (`task_plan.md`, `findings.md`, `progress.md`) are available and have been instantiated in the project root for this task.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Keep everything as a static SPA (no backend) | Matches current repo structure and makes Vercel deployment trivial (static hosting only). |
| Implement navigation as client-side tab/section switching instead of real routing | Minimal change to existing HTML/JS; avoids introducing a router. |
| Derive word → root/affix links from existing JSON structure where possible | Avoids duplicating data and keeps changes to `data/roots_affixes.json` minimal or zero. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Global `session-catchup.py` script not found when invoked | Logged the error in `task_plan.md` and proceeded without previous-session catchup. |

## Resources
- Vercel static site deployment docs (for reference): `https://vercel.com/docs/deployments/static-sites`
- Example Vercel deploy button pattern (for README): `https://vercel.com/docs/deployments/overview#deploy-button`

## Visual/Browser Findings
- (To be filled in as we inspect `index.html` UI structure and any live preview behavior.)

---
*Update this file after every 2 view/browser/search operations so visual and exploratory findings are persisted.* 
