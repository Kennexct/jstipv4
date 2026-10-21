# DevOps — bawa-rebrand (2026-10-21)
Deploy: commit → push → Vercel builds (no env change required; set VITE_PUBLIC_APP_URL for absolute OG links). APK workflow now generates icons/splash; artifact renamed `bawa-android-apk` / `bawa-debug.apk`. No Supabase step.
Rollback: revert the commit; nothing stateful. Users' saved accent survives either way (unknown 'forest' falls back to base accent on old builds).

## 2026-10-21 15:10 — APK job fix
Every APK run failed at `android-actions/setup-android@v3` (logs not downloadable from the session). Fix: pin `runs-on: ubuntu-24.04` (ubuntu-latest → Ubuntu 26 since 2026-10-19), drop setup-android, use the runner's preinstalled SDK and accept licences with its sdkmanager; bump checkout/setup-node/setup-java to v5 (clears Node 20 deprecation warnings). If it still fails, paste the failing step's log.
