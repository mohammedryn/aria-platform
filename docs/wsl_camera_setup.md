# 📸 Enabling Camera Access on WSL (Windows Subsystem for Linux)

**Note:** WSL runs in a virtual machine and **does not have access to your laptop's camera** by default. This is why you see "Camera index out of range" or "No device found".

To fix this, you have two options:

---

## Option 1: The "Simple" Workaround (File Drop)
If you just want to test Gemini with your own photos without complex setup:

1. Take a photo on your Windows machine.
2. Save it as `capture.jpg` inside the `aria-swarm/software/pi5_coordinator` folder (using Windows File Explorer).
3. Run the test with the image:
   ```bash
   ./test_no_camera.sh --test-image capture.jpg
   ```
4. Gemini will analyze *your* photo!

---

## Option 2: The "Real" Fix (USB Passthrough)
To stream live video from a USB webcam to WSL, you need `usbipd-win`.
**Note:** This works best with **external USB webcams**. Integrated laptop cameras often cannot be passed through.

### Step 1: Install usbipd-win (on Windows)
1. Open Windows PowerShell as **Administrator**.
2. Run: 
   ```powershell
   winget install gwdd.usbipd
   ```
3. Restart your computer if prompted.

### Step 2: Install Linux Tools (in WSL)
Run this inside your Ubuntu terminal:
```bash
sudo apt install linux-tools-virtual hwdata
sudo update-alternatives --install /usr/local/bin/usbip usbip `ls /usr/lib/linux-tools/*/usbip | tail -n1` 20
```

### Step 3: Attach the Camera
1. Plug in your USB webcam.
2. Open Windows PowerShell as **Administrator**.
3. List devices:
   ```powershell
   usbipd list
   ```
4. Find your camera's BUSID (e.g., `1-2`).
5. Attach it:
   ```powershell
   usbipd bind --busid <BUSID>
   usbipd attach --wsl --busid <BUSID>
   ```

### Step 4: Verify in WSL
Back in your Ubuntu terminal:
```bash
ls -l /dev/video*
```
If you see `/dev/video0`, you succeeded! 🎉

Now you can run the standard test:
```bash
./run_vision_test.sh
```

---

## Option 3: Deploy to Raspberry Pi (Recommended)
Project A.R.I.A. is designed for the Raspberry Pi. The Pi's camera interface is native and much simpler.

1. Push your code to GitHub.
2. Clone it on your Raspberry Pi 5.
3. Run the same test script there.
4. It will work automatically with the Pi Camera!
