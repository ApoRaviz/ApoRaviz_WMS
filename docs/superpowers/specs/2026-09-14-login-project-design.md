# WMS Login and Project Prototype

Approved in conversation: a local, clickable Angular 22 + Tailwind prototype in Thai. Node.js 24.21.0 LTS. Existing AdastriaFrontend is reference-only. No backend, database, real authentication, or stock functionality in this slice.

## Flow
Login → choose Project → workspace shell. Always choose a project after login. Projects are Apo, Squ and Mdr, all belonging to the fictional Client บริษัทตัวอย่าง. Search names/codes, select a project, switch projects, logout. No real business counts or misleading operational dashboards.

## Design
Bright working surfaces, navy/blue accent, Thai typography, accessible labels and focus states. A restrained illustrated warehouse on the login side panel, project cards with unique monograms, explicit demo badge. Mobile layout prioritizes form/search and touch targets. No unnecessary menus or nonfunctional actions.

## Demonstration
Demo credentials: demo / demo123. A second account empty / demo123 demonstrates no assigned projects. Login failures, field validation, pending states, no search results, no assigned projects. Keep session in memory only; reload returns to login. Do not store credentials. The mock service will later be replaced by API-backed services; frontend guards are navigation helpers only.

## Acceptance
Build passes. Test login errors, valid login, search, project selection/switch, logout, unauthenticated routes, no assignments. Review desktop and handheld-width layout. Stop for user review after this prototype.
