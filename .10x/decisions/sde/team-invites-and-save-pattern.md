# SDE — team-invites-and-save-pattern (2026-10-21)
- Invites: email via Supabase OTP (`sendInviteEmail`), `?invite=` capture, auto-accept, set-password dialog, pending status + Resend email / Copy link (`src/lib/repository.js`, `src/lib/supabase.js`, `src/store.jsx`, `src/dialogs.jsx`, `src/workspaces.jsx`).
- Unsaved guard: `useUnsavedChanges`, `confirmDiscard`, `ConfirmDialog` (blurred backdrop), `beforeunload`, back/forward hash guard, dialog close guard (Cancel/×/backdrop/Esc). Only touched + not-saving forms count.
- One save pattern: `SaveBar` on Settings Workspace/Storefront/Currency/Team & roles; Currency saves all rates once; roles saved together; tab remembered (`sessionStorage['jo-settings-tab']`).
- Stale-form check now per record (only blocks if the edited record changed), not whole-workspace revision.
- Loading: `TopProgress` bar on every route change; skeleton only when switching from storefront data.
- Walkthrough hidden once finished or trip+item exist; removed fake base-currency field.
Tests: unit 10/10, build OK, SQL PASS, e2e 11/11 (new: unsaved guard + save bar + reload keeps rate; loading bar + walkthrough hidden), integration 2/2 (new: invite email → link → join → set password → owner sees Active).
