# 🎬 The Perfect ARIA Demo: A Walkthrough

> **Role**: You are a Hardware Engineer demonstrating the future of coding.
> **Context**: You have a buggy Arduino project and a webcam.
> **Goal**: Show how ARIA fixes the gap between code and reality.

---

## 🏗️ Act 1: The "Blind" Coder (Context Awareness)

**Setup**: Open a simple Arduino Sketch (`src/main.cpp`) that blinks an LED on **Pin 13**. But let's say your `platformio.ini` is set for an **ESP32** (where the built-in LED is often Pin 2 or 5, not 13).

1.  **Open `platformio.ini`**: Show the board configuration (e.g., `board = esp32dev`).
2.  **Open `src/main.cpp`**: Show code using `int led = 13;`.
3.  **The Hook**:
    > "Usually, an AI assistant sees code as text. It doesn't know this code will fail on my specific board. Watch this."
4.  **Action**: Open ARIA Chat.
5.  **Prompt**: `"Does this code work?"`
6.  **The Reveal**: ARIA reads `platformio.ini`, sees "ESP32", and immediately warns:
    > *"This code uses Pin 13, but on the ESP32 Dev Module, the onboard LED is typically GPIO 2. You should change it to `LED_BUILTIN` or `2`."*

**Recap**: ARIA has **Hardware Context**. It's not just a chatbot; it's an embedded engineer.

---

## 👁️ Act 2: The "Cursor" for the Physical World (Vision)

**Setup**: You have a real breadboard with an LED connected to **Pin 25**. Your code still thinks it's on **Pin 2**.

1.  **The Problem**: "Okay, I fixed the board type, but now I'm wiring things up. The code says Pin 2. I plugged it into Pin 25 because that was easier."
2.  **Action**: Click the **Camera Icon** 📸 in the ARIA panel (or run `ARIA: Capture Hardware Image`).
3.  **Prompt**: `"Verify my wiring against the code."`
4.  **The Vision**: ARIA analyzes the image.
    > *"I see an LED connected to GPIO 25 on your breadboard. However, your code defines `const int ledPin = 2;`. This will not work."*
5.  **The Fix**: ARIA offers a **Unified Diff** to update the code to match reality.
6.  **Action**: Click **"Apply Fix"**. Watch the code change instantly.

**Recap**: ARIA closes the loop between **Physical Reality** and **Digital Code**.

---


## 🔧 Act 3: The Smart Repair (Build & Fix)

**Setup**: "Wait, I made a mistake."
1.  **The Bug**: Delete a semicolon or add a typo (e.g. `digitalWrite(LED_PIN, HIGH)` -> `digitalWrite(LED_PIN, HIGH` w/o semicolon).
2.  **The Build**: Click **Build Firmware**.
3.  **The Failure**: The build fails. The terminal shows generic error messages.
4.  **The Analysis**: ARIA automatically intercepts the error.
    > *"I detected a compilation error in `src/main.cpp`. It looks like a missing semicolon on line 24."*
5.  **The Magic**: ARIA shows a **Smart Fix** card with a "Preview Diff" button.
6.  **The Fix**: Click **"Apply Fix"**.
    -   *Observe*: ARIA patches *only* the error using a clean Unified Diff. It doesn't rewrite the file or add duplicates.
7.  **The Success**: Build again. It passes.

**Recap**: ARIA is your **Pair Programmer** that fixes tedious syntax errors instantly.

---

## ⚡ Act 4: Action & Verification (Firmware Loop)

**Setup**: The code is now correct.

1.  **The Build**: "Now that the code matches my board, let's flash it."
2.  **Action**: Click **"Build & Flash"** ⚡ (or use the slash command).
3.  **The Result**: ARIA triggers PlatformIO in the background. You see the build output stream in the panel.
4.  **The Verification (Optional)**:
    > "The firmware is uploaded. But did it work?"
    > **Prompt**: `"Watch the video and tell me if the LED is blinking."`
    > **Action**: Switch to **Video Mode** 🎥. ARIA watches the live feed and confirms: *"Yes, the green LED is blinking at approximately 1Hz."*

**Recap**: ARIA handles the entire **Engineering Lifecycle**: Code -> Build -> Flash -> Verify.

---

## 🛠️ Act 5: The Digital Twin (Simulation)

**Setup**: "What if I don't have the hardware right now?"

1.  **The Scenario**: You want to test a Servo motor but don't have one handy.
2.  **Action**: Type `"Simulate this servo circuit for me."`
3.  **The Magic**: ARIA generates a `wokwi.toml` and `diagram.json`.
4.  **The Result**: A link appears. Launch it (or use a Wokwi extension) to see your code running on a virtual ESP32 with a virtual Servo in the browser.

**Recap**: ARIA creates a **Digital Twin** instantly.

---

## 🎨 Act 6: The "Explain Like I'm 5" (Generative UI)

**Setup**: "This logic is getting complex. How does PWM actually control the servo?"

1.  **Action**: Type `"Generate an animation showing how PWM duty cycle moves a servo arm."`
2.  **The Wow Moment**: ARIA doesn't write text. It generates a **Self-Contained SVG/HTML5 Animation** right in the chat.
3.  **The Visual**: You see a slider moving, a PWM waveform changing width, and a servo arm rotating in sync.

**Recap**: ARIA is a **Teacher** that can visualize the invisible.

---

## 🏁 Act 7: The "One More Thing"

**Action**: Summarize the session.
> "We went from buggy code to a verified physical device, simulated it, and visualized the physics—all without leaving the IDE."

**Prompt**: `"Generate a summary of what we just built."`
**Result**: ARIA lists the board, the pin changes, and the successful test.

---

> **Demo Checklist**:
> - [ ] VS Code with ARIA Extension
> - [ ] `platformio.ini` (even a dummy one)
> - [ ] Webcam (or a saved image of a breadboard)
> - [ ] Gemini API Key set
