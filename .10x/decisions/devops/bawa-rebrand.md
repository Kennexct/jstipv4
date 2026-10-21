# DevOps — bawa-rebrand (2026-10-21)
Deploy: commit → push → Vercel builds (no env change required; set VITE_PUBLIC_APP_URL for absolute OG links). APK workflow now generates icons/splash; artifact renamed `bawa-android-apk` / `bawa-debug.apk`. No Supabase step.
Rollback: revert the commit; nothing stateful. Users' saved accent survives either way (unknown 'forest' falls back to base accent on old builds).
