#!/bin/bash
# Deploy Latest Code to Raspberry Pi 5
# Run this on your development machine after committing changes

set -e

# Configuration
PI_USER="pi"
PI_HOST="raspberrypi.local"  # Change to your Pi's hostname or IP
REPO_PATH="/home/pi/aria-swarm"

echo "=================================="
echo "Deploying to Raspberry Pi 5"
echo "=================================="

# Check if SSH key is set up
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 $PI_USER@$PI_HOST echo ok 2>&1 | grep -q ok; then
    echo "⚠️  SSH connection failed!"
    echo "Make sure:"
    echo "  1. Pi is powered on and connected to network"
    echo "  2. SSH is enabled on Pi"
    echo "  3. You can connect: ssh $PI_USER@$PI_HOST"
    exit 1
fi

echo "Connected to $PI_HOST ✓"
echo ""

# Push to GitHub first
echo "Step 1: Pushing to GitHub..."
git add -A
read -p "Commit message: " commit_msg
git commit -m "$commit_msg" || echo "No changes to commit"
git push origin main

echo ""
echo "Step 2: Pulling on Pi..."
ssh $PI_USER@$PI_HOST "cd $REPO_PATH && git pull origin main"

echo ""
echo "Step 3: Installing dependencies..."
ssh $PI_USER@$PI_HOST "cd $REPO_PATH/software/pi5_coordinator && pip3 install -r requirements.txt"

echo ""
echo "Step 4: Restarting services..."
# If you have systemd services, restart them here
# ssh $PI_USER@$PI_HOST "sudo systemctl restart aria.service"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "To run manually:"
echo "  ssh $PI_USER@$PI_HOST"
echo "  cd $REPO_PATH/software/pi5_coordinator"
echo "  python3 src/aria_main.py"
echo ""
