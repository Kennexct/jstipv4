# SDE — apk-supabase-config (2026-10-21, small fix, no ADR: no architecture change)
Bug: APK opened on "Connect Supabase" — the APK workflow built Vite without VITE_SUPABASE_* (code-review open item).
Fix: build step reads VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_PUBLIC_APP_URL from GitHub Actions secrets, forces VITE_ENABLE_DEMO=false, and fails with a clear ::error:: if any is missing (no more silently broken APKs).
Also: sign-up confirmation and password-reset links used location.origin (= https://localhost in the APK); now use appBase() (VITE_PUBLIC_APP_URL when set, else current origin — web behaviour unchanged).
Tests: unit 10/10, build, e2e 15/15, integration 3/3 PASS locally.
