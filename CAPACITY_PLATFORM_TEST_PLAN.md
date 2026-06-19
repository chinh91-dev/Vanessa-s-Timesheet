# Capacity Platform — Manual Test Plan

> Route: `/capacity-platform`
> Roles needed: **admin** (`chinh@comansservices.com.au`) and a non-admin employee account for access-control tests.

---

## Prerequisites

- [x] App running locally (`npm run dev`) or on deployed Dev URL
- [x] Signed in as admin user
- [x] At least one active employee profile exists in database
- [ ] At least one skill and one work request exist in database

---

## 1. Navigation & Layout

| # | Steps | Expected |
|---|-------|----------|
| N1 | Open `/capacity-platform` | Sidebar visible with: Hub, People, Allocation, Work Intake, Forecast, Skills, Reports, Settings |
| N2 | Click each sidebar item | URL changes, page title updates, no crash |
| N3 | Navigate away and back | Route announcer fires (screen reader) — no visible artifact |
| N4 | Sign in as customer-role user, open `/capacity-platform` | Redirected to `/customer-portal` |
| N5 | Sign out, open `/capacity-platform` directly | Redirected to `/auth` |

---

## 2. Hub Dashboard (`/capacity-platform/hub`)

| # | Steps | Expected |
|---|-------|----------|
| H1 | Load Hub page | RAG Donut renders with green/amber/red segments |
| H2 | Check Utilisation Sparkline | Shows trend data for at least one person |
| H3 | Check Top Overallocated tile | Shows person(s) with highest overallocation |
| H4 | Check Leave Horizon tile | Shows upcoming leave within the configured window |
| H5 | Check SPOF tile | Shows skills covered by only one person |
| H6 | Check Person Capacity Table | Lists active employees with capacity data |
| H7 | Trigger a JavaScript error (DevTools) inside `/hub` | Error boundary catches it — recovery card shows Retry + Reload buttons |
| H8 | Click Retry on error boundary | Page resets and reloads content |

---

## 3. People (`/capacity-platform/people`)

| # | Steps | Expected |
|---|-------|----------|
| P1 | Load People page | Table lists active, non-customer-role employees only |
| P2 | Click a person row | Navigates to `PersonDetailPage` for that person |
| P3 | On PersonDetailPage — Profile tab | Shows employment type, weekly hours, backup assignments, on-call, can-lead-onboarding fields |
| P4 | Edit a profile field (admin) | Save succeeds; only capacity-specific fields editable (not name/email/role) |
| P5 | Check Leave tab | Shows leave records for that person |
| P6 | Check Allocations tab | Shows weekly allocation history |
| P7 | Check Skills tab | Shows skill ratings for that person |
| P8 | Check Audit tab | Shows audit trail of changes |
| P9 | Sign in as employee (non-admin), open a person's detail page | Can view but cannot edit (or edit controls hidden) |

---

## 4. Allocation Grid (`/capacity-platform/allocation`)

| # | Steps | Expected |
|---|-------|----------|
| A1 | Load Allocation page | Grid shows Mon–Fri columns only (no Sat/Sun) |
| A2 | Check person view (default) | Rows grouped by person |
| A3 | Toggle pivot (PivotToggle) to customer | Rows grouped by customer with drilldown arrows |
| A4 | Expand a customer row | Per-person contribution sub-rows appear |
| A5 | Click a cell and enter a valid hours value (e.g. `2`) | Cell updates after ~600ms debounce; headroom row recalculates |
| A6 | Enter value via keyboard, press Enter | Cell commits immediately (no 600ms wait) |
| A7 | Enter `0.1` in a cell | Rounds to nearest `0.25` step |
| A8 | Enter `25` in a cell | Clamped to `24` |
| A9 | Check RAG badges on headroom row | Green = ≥1h headroom, Amber = 0–1h, Red = negative |
| A10 | Click "New Allocation" button | `NewAllocationDialog` opens |
| A11 | Submit new allocation with valid data | Row appears in grid |
| A12 | Click delete on an allocation row | `AlertDialog` confirmation appears |
| A13 | Confirm delete | Row removed from grid |
| A14 | Use WeekNavigator to go to next week | Grid refreshes to show next week's data |
| A15 | Use WeekNavigator to go to previous week | Grid refreshes to show previous week's data |

---

## 5. Work Intake (`/capacity-platform/work-intake`)

| # | Steps | Expected |
|---|-------|----------|
| W1 | Load Work Intake page | Queue table visible as default tab |
| W2 | Switch to Kanban view | Kanban board lazy-loads; columns visible (New, In Progress, etc.) |
| W3 | Drag a card to a different column | Status updates; DB persists change |
| W4 | Double-click a card or row | `WorkRequestDialog` opens for editing |
| W5 | Try to change status from New → In Progress without `estimated_hours` | Validation error shown; status not saved |
| W6 | Set `estimated_hours`, then change status | Status change succeeds |
| W7 | Create a new work request via dialog | Assigned REQ-#### ID, appears in queue and kanban |
| W8 | Filter by status or assignee | Table/kanban filters correctly |
| W9 | Check AssigneeSuggestions when editing assignee field | Only non-customer employees shown |

---

## 6. Forecast (`/capacity-platform/forecast`)

| # | Steps | Expected |
|---|-------|----------|
| F1 | Load Forecast page | MonthPicker and ForecastTimeline visible |
| F2 | Change month using MonthPicker | Timeline updates to selected month |
| F3 | Check FTE Loss Panel | Shows planned FTE reductions (leave, departures) |
| F4 | Submit a forecast via ForecastForm | Data saves; timeline reflects changes |
| F5 | Check inline alert banners on ForecastPage | Over-allocation or quarter-rollover nudge shows if conditions met |

---

## 7. Skills (`/capacity-platform/skills`)

| # | Steps | Expected |
|---|-------|----------|
| SK1 | Load Skills page | Defaults to **Matrix** tab |
| SK2 | Check SkillMatrixTable | Rows = employees, columns = skills, cells = proficiency ratings |
| SK3 | Click **Heat-map** tab | SkillHeatMap renders with employee initials as column headers |
| SK4 | Heat-map with data | Cells show colour-coded proficiency; no "No skills or active people" empty state |
| SK5 | Click a cell in SkillMatrixTable | SkillRatingsDrawer opens for that person/skill |
| SK6 | Edit a rating in the drawer (admin) | Save succeeds; matrix updates |
| SK7 | Sign in as non-admin employee | SkillAdminPanel not visible |
| SK8 | Sign in as admin, check SkillAdminPanel | Manage skills (add/edit/deactivate) visible and functional |

---

## 8. Reports (`/capacity-platform/reports`)

| # | Steps | Expected |
|---|-------|----------|
| R1 | Load Reports page | KPI cards display metrics |
| R2 | Use WeekNavigator on reports page | KPIs recalculate for selected week |
| R3 | Click export CSV button | CSV file downloads |
| R4 | Click export PDF/print button | Browser print dialog opens; toolbar hidden in print preview |

---

## 9. Settings (`/capacity-platform/settings`)

| # | Steps | Expected |
|---|-------|----------|
| S1 | Load Settings as **admin** | SettingsForm visible with all 5 editable keys |
| S2 | Editable settings present | FTE basis, Red threshold, Amber threshold, Week-start day, Default holiday state |
| S3 | Change a threshold value and save | Saved; RAG calculations in other pages reflect new thresholds |
| S4 | Check CutOverStatusCard (admin) | Cutover status visible |
| S5 | Load Settings as **non-admin** | AdminGate notice shown instead of form |

---

## 10. Alerts Bell

| # | Steps | Expected |
|---|-------|----------|
| AL1 | Check top bar for bell icon | `CapacityAlertsBell` visible in layout header |
| AL2 | With a Red-status person in system | Bell shows badge count |
| AL3 | Click bell | Dropdown lists active alerts: Red person, over-allocated-on-leave, SPOF skill, quarter rollover nudge |
| AL4 | No alerts active | Bell shows no badge; dropdown shows "No alerts" |

---

## 11. Backup Cycle

| # | Steps | Expected |
|---|-------|----------|
| B1 | On PersonDetailPage, assign a `backup_for` person that creates a cycle (A→B→A) | `BackupCyclePreview` shows cycle warning |
| B2 | DB trigger (backstop) | If UI cycle check missed, DB rejects with error |

---

## 12. Error Handling

| # | Steps | Expected |
|---|-------|----------|
| E1 | Disconnect network, navigate within platform | Error boundary catches fetch failures; Retry button visible |
| E2 | Crash a sub-route, then navigate to another route | Error boundary auto-resets; healthy routes work |

---

## Known Gaps / Not Yet Tested

- Auto-assignment hints in Work Intake (Phase 12 — not implemented)
- Email / weekly digest delivery (deferred — requires Edge Function)
- Contractor employment type missing from `types.ts` — verify it shows in UI dropdowns

---

## Test Sign-off

| Area | Tester | Date | Result |
|------|--------|------|--------|
| Navigation | | | |
| Hub Dashboard | | | |
| People | | | |
| Allocation | | | |
| Work Intake | | | |
| Forecast | | | |
| Skills | | | |
| Reports | | | |
| Settings | | | |
| Alerts | | | |
| Error Handling | | | |
