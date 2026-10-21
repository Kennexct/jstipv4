# SDE — apk-photo-picker (2026-10-21)
- Added `@capacitor/camera@6.1.2`; `src/lib/photos.js` (dynamic import, so the web bundle doesn't load it until used in the app).
- `src/dialogs.jsx`: 4 photo inputs use `photoInputProps`; handlers take a file list; input value resets so the same file can be picked twice; removed `capture="environment"`; `compress()` accepts empty/octet-stream MIME and gives a readable error when decoding fails.
- No Android permissions or workflow change (plugin needs none; `cap sync` registers it — verified locally: ":capacitor-camera" included).
- Tests: unit 10/10, build, e2e 16/16 (new: preview for normal + no-type files, rejects text file, no capture attr).
- Not verifiable here: real camera/gallery on a device (needs Kenny's APK QA).
