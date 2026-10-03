# Project Setup folder organization

Scope: organize the existing feature by screen and editor section, following the structure discussed with the owner. No feature behavior, API, database schema or CSS change.

## Layout

```text
project-setup/
├── project-list/          # list screen and template
├── reference-data/        # central Client/Warehouse screen and template
├── project-editor/
│   ├── setup-page.ts / setup-page.html
│   ├── setup-draft.ts / setup-draft.spec.ts
│   ├── general/
│   ├── warehouses/
│   ├── rules/
│   ├── members/
│   └── history/
├── setup-dialog/          # dialog used by list and editor
├── setup-api.service.ts / setup-api.spec.ts
├── setup.model.ts
├── setup.guard.ts
└── setup.css
```

Moved 18 files and updated relative dependencies and three lazy route imports. Templates remain adjacent to their components. Shared API/models/guards remain inside the feature; draft helpers/tests remain inside the editor. Existing scoped CSS stays at the feature root because multiple screens consume it through the global styles import.

## Verification

- Compared all frontend source against the pre-change Git revision, normalizing relative import targets and line endings: no changes beyond relocation/import paths; templates/styles unchanged.
- Frontend 26/26 tests passed across eight files after relocation, including relocated draft tests.
- Production build passed, including all three Project Setup lazy screen chunks.
- Source-boundary check passed; reviewed imports to confirm section components still depend on models, and only the feature API owns HTTP access.
- Edge 11/11 browser regressions passed after relocation: Login, Project selection/reload, role access, Users/memberships, passwords/session revocation, Project list/reference creation, draft editor/activation, dirty decisions and cross-editor conflicts. Used isolated schema `test_browser_6dd19b93bcecd9f4` (cleaned by the runner) and API3002/UI4202; owner's real database and ports3000/4200 remain untouched.

No new behavioral tests were needed for a pure relocation; existing tests and browser flows verify the affected paths. Folder conventions are now recorded in AGENTS.md for future features. The current checkout and local branch are preserved for the owner's next session; frontend/angular.json remains an unrelated owner change.
