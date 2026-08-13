# Photo Upload UX Audit

## Scope

Mobile photo-to-menu flow: choose a photo, understand the next steps, crop it, and continue to dish detection.

## Step 1 — Upload entry

Health: Improved.

- Before: camera and gallery were two equal buttons with little explanation of what happened next.
- After: the card explains Choose → Crop → Detect, prioritizes the camera, and provides photo-quality and file-format guidance before selection.
- Accessibility: both sources retain distinct accessible names and full-width mobile targets.

## Step 2 — Crop editor

Health: Good.

- The selected photo is visible inside a high-contrast crop frame.
- Corner handles, drag instructions, zoom controls, edge sliders, and Done remain available on a narrow screen.
- The editor is rendered at the page overlay level so app navigation cannot cover its controls.
- Accessibility limit: touch dragging and screen-reader announcements still require physical-device testing.

## Step 3 — Scan and detection

Health: Good.

- Done scans the cropped image rather than the original photo.
- Status copy distinguishes photo reading from dish detection.
- The existing automatic handoff to menu detection is preserved.
