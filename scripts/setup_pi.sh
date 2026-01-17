#!/bin/bash
# Raspberry Pi 5 Setup Script for Project A.R.I.A.
# Run this on the Pi after cloning the repository

set -e  # Exit on error

echo "=================================="
echo "Project A.R.I.A. - Pi 5 Setup"
echo "=================================="

# Check if running on Raspberry Pi
if [ ! -f /proc/device-tree/model ] || ! grep -q "Raspberry Pi" /proc/device-tree/model; then
    echo "⚠️  Warning: This doesn't appear to be a Raspberry Pi"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Step 1: Updating system packages..."
sudo apt update
sudo apt upgrade -y

echo ""
echo "Step 2: Installing system dependencies..."
sudo apt install -y \
    python3-pip \
    python3-dev \
    python3-opencv \
    git \
    mosquitto \
    mosquitto-clients \
    build-essential \
    cmake \
    libyaml-dev

echo ""
echo "Step 3: Installing ROS2 Humble..."
if ! command -v ros2 &> /dev/null; then
    echo "Installing ROS2 Humble Hawksbill..."
    
    # Add ROS2 apt repository
    sudo apt install -y software-properties-common
    sudo add-apt-repository universe
    sudo apt update && sudo apt install -y curl
    
    sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null
    
    sudo apt update
    sudo apt install -y ros-humble-desktop python3-colcon-common-extensions
    
    # Add to bashrc
    echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc
    source /opt/ros/humble/setup.bash
else
    echo "ROS2 already installed ✓"
fi

echo ""
echo "Step 4: Installing SLAM Toolbox..."
sudo apt install -y ros-humble-slam-toolbox

echo ""
echo "Step 5: Installing Python dependencies..."
cd software/pi5_coordinator
pip3 install -r requirements.txt

echo ""
echo "Step 6: Setting up Gemini API key..."
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  GEMINI_API_KEY not set!"
    echo "Please set it manually:"
    echo "  export GEMINI_API_KEY='your-api-key-here'"
    echo "  echo 'export GEMINI_API_KEY=\"your-api-key-here\"' >> ~/.bashrc"
else
    echo "GEMINI_API_KEY is set ✓"
fi

echo ""
echo "Step 7: Configuring Pi Camera..."
# Enable camera interface
sudo raspi-config nonint do_camera 0

echo ""
echo "Step 8: Configuring MQTT broker..."
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
echo "MQTT broker started on localhost:1883 ✓"

echo ""
echo "Step 9: Setting up udev rules for USB devices..."
# Teensy 4.1
echo 'SUBSYSTEMS=="usb", ATTRS{idVendor}=="16c0", ATTRS{idProduct}=="0483", MODE:="0666"' | sudo tee /etc/udev/rules.d/99-teensy.rules
# LIDAR
echo 'KERNEL=="ttyUSB*", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", MODE="0666", SYMLINK+="lidar"' | sudo tee /etc/udev/rules.d/99-lidar.rules
sudo udevadm control --reload-rules
sudo udevadm trigger

echo ""
echo "Step 10: Creating log directories..."
mkdir -p logs captures calibration_data

echo ""
echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Reboot the Pi: sudo reboot"
echo "2. Set your Gemini API key in ~/.bashrc"
echo "3. Connect hardware (Teensy, Camera, LIDAR)"
echo "4. Run: python3 src/aria_main.py"
echo ""
