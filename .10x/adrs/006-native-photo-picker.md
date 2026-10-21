# ADR-006: Native photo picker in the Android app

**Status:** Accepted (Kenny, 2026-10-21 16:4x) · **Date:** 2026-10-21 · **Feature:** apk-photo-picker · **Author:** 10x-Team

## Context
In the APK, `<input type="file" capture="environment">` goes through Capacitor's WebView file chooser: with `capture` it can only open the camera (no gallery), and Kenny's QA showed picked/captured photos not appearing. The WebView chooser also returns content URIs whose File may have an empty MIME type, which our `compress()` rejected ("Choose an image file").

## Decision
- In the native app (`Capacitor.isNativePlatform()`), photo inputs open `@capacitor/camera` `getPhoto({ source: Prompt })` — the system sheet "Take photo / Choose from gallery" — and return a data URL; one photo per tap (item photos allow up to 6 by tapping again).
- On the web, the existing `<input type=file>` stays; `capture` is removed so phones offer camera *and* gallery.
- Both paths feed the same `compress()` (≤1000px JPEG 0.76), which now also accepts files with an empty MIME type and reports a clear error if decoding fails.
- No Android permissions needed (plugin docs: none unless saving to gallery). No workflow change: `cap sync` registers the plugin from package.json.

## Alternatives Considered
| Alternative | Why not |
|---|---|
| Keep WebView file input, drop `capture` | Gallery only in the APK, no camera; still subject to WebView quirks |
| Custom native code / manifest patch | More build steps; android/ is generated in CI |
| Multi-select via `pickImages` | Extra UI path; tapping again for each photo is enough for v1 |

## Consequences
+ Camera and gallery both work in the APK with the platform's own UI; web unchanged in behaviour.
− Adds one native dependency (`@capacitor/camera@6.1.2`, matches Capacitor 6). One photo per tap in the APK.
Risk: process death while the camera is open on low-memory phones loses the open dialog; mitigation later via `appRestoredResult` if it shows up in QA.
