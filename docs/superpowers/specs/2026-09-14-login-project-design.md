# WMS Login and Project Prototype

Approved in conversation: a local, clickable Angular 22 + Tailwind prototype in Thai. Node.js 24.21.0 LTS. Existing AdastriaFrontend is reference-only. No backend, database, real authentication, or stock functionality in this slice.

## Flow
Login → choose Project → workspace shell. Always choose a project after login. Projects are Apo, Squ and Mdr, all belonging to the fictional Client บริษัทตัวอย่าง. Search names/codes, select a project, switch projects, logout. No real business counts or misleading operational dashboards.

## Design
Bright cool-gray working surfaces, electric violet (#6d4aff) accent and deep indigo (#15132e) login panel (user technology-theme revision on 2026-09-14), Thai typography, accessible labels and focus states. An illustrated warehouse with cool structural colors and small cyan connectivity accents, project cards with unique monograms, explicit demo badge. Mobile layout prioritizes form/search and touch targets. No unnecessary menus or nonfunctional actions.

## Access-model discussion (future implementation; not finalized)
A User may work across multiple Projects. Clarify whether the same Role must apply everywhere or responsibilities differ by Project. Recommended model for differing responsibilities: one Role per (User, Project) membership, with Role → Permissions; no membership means no Project access. A single global Role plus separate Project access would only fit if the user's responsibilities are identical everywhere. Proposed starting role names are Administrator, Manager, Supervisor, Operator, Customer; system-wide Administrator scope still requires definition. Real account/permission administration is not implemented by this visual prototype revision.

## Demonstration
Demo credentials: demo / demo123. A second account empty / demo123 demonstrates no assigned projects. Login failures, field validation, pending states, no search results, no assigned projects. Keep session in memory only; reload returns to login. Do not store credentials. The mock service will later be replaced by API-backed services; frontend guards are navigation helpers only.

## Acceptance
Build passes. Test login errors, valid login, search, project selection/switch, logout, unauthenticated routes, no assignments. Review desktop and handheld-width layout. Stop for user review after this prototype.
# ประวัติการออกแบบ UI

แบบบัญชีและสิทธิ์ฉบับใช้งานจริงอยู่ใน [Module 1 access design](2026-09-14-module1-access-design.md) และแทนที่หัวข้อ access model ที่ยังเป็นข้อเสนอในเอกสารนี้
