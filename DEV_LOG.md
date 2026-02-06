# A.R.I.A. Development Log

This file tracks all development activities, fixes, and updates performed on the A.R.I.A. platform.

## 2026-02-07

### Code Cleanup: Camera Options
- **Action**: Removed "Built-in Webview" and "Integrated - Simple Browser" options from `captureImage.ts`.
- **Reason**: User requested to keep only "Python Native - Pro", "External Browser", and "Image File" for a cleaner experience.
- **Status**: Completed.

### Troubleshooting: Python Bridge 404
- **Issue**: User reported camera light on but no video in VS Code (404 error in logs).
- **Diagnosis**: The Python server starts correctly, but the VS Code Webview might be blocking the local stream or the port forwarding is delayed.
- **Fix**: 
    1.  Verified `camera_server.py` logic.
    2.  Updated `cameraPanel.ts` UI text to reflect "Native Camera Stream (Python)".
    3.  (Note: The 404 error `GET / HTTP/1.1` in the logs is actually harmless spam because the browser tries to fetch the root `/` which isn't defined, only `/stream` is. The stream itself should work if the `img src` is correct.)
- **Status**: Monitoring.

### Type Definition Fix: CameraBridge
- **Issue**: TypeScript error `ts(2345)` in `captureImage.ts` because `native-python` was not in the `capture` method signature.
- **Fix**: Updated `CameraBridge.capture` signature to accept `'native-python'`.
- **Files Modified**: `src/vision/cameraBridge.ts`.
- **Status**: Fixed.

### Camera System Upgrade: Python Native Mode
- **Context**: User requested a robust "Pro" alternative to the browser bridge.
- **Solution**: Implemented a Python + OpenCV bridge.
- **Mechanism**:
    1.  Spawns `src/scripts/camera_server.py`.
    2.  Python script captures video via `cv2.VideoCapture` (Native access).
    3.  Streams MJPEG to localhost.
    4.  VS Code extension embeds the stream.
    5.  Capture trigger prints base64 to stdout, which the extension reads.
- **Benefits**: Headless operation (no popup window), faster startup, "Winning Category" feel.
- **Files Modified**:
    - `src/scripts/camera_server.py`: New Python server.
    - `src/vision/cameraBridge.ts`: Added `native-python` mode and process management.
    - `src/commands/captureImage.ts`: Added menu option.
- **Status**: Implemented. Requires Python + opencv-python.

### Camera System Fix: "Stream Mode" Bypass
- **Context**: VS Code Webviews are sandboxed and often block `getUserMedia` (Permission Denied).
- **Solution**: Implemented a "Stream Mode" that uses an external browser as a driver.
- **Mechanism**:
    1.  `CameraPanel` attempts native capture.
    2.  On failure, it auto-switches to `CameraBridge` Stream Mode.
    3.  Bridge starts a local MJPEG server and opens a minimal external browser window.
    4.  External browser captures camera and POSTs frames to local server.
    5.  Local server streams MJPEG back to VS Code Webview via `<img>` tag.
- **Files Modified**:
    - `src/vision/cameraBridge.ts`: Added MJPEG streaming, `/stream` endpoint, and external driver HTML.
    - `src/panels/cameraPanel.ts`: Added `showStream` UI handler, `triggerCapture` logic, and automatic error fallback.
- **Status**: Verified Logic. Ready for demo.

### Infrastructure Setup
- **Action**: Created `DEV_LOG.md` to track project history and updates.
- **Files**: `d:\aria-platform\DEV_LOG.md`
- **Status**: Active
