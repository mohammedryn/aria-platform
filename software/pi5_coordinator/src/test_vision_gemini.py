#!/usr/bin/env python3
"""
Interactive Vision + Gemini Test for A.R.I.A.
Test camera and Gemini vision capabilities with natural language chat
"""

import sys
import os
import argparse
import time

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from utils.camera_interface import CameraInterface
from gemini_coordinator import GeminiCoordinator


def print_banner():
    """Print welcome banner."""
    print("""
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         A.R.I.A. Vision + Gemini Test Interface          ║
║    Natural Language Vision Testing for Robotic System    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
""")


def main():
    """Main interactive loop."""
    parser = argparse.ArgumentParser(description="Test A.R.I.A. vision + Gemini integration")
    parser.add_argument('--camera', type=str, default='auto', 
                       choices=['auto', 'webcam', 'picamera2'],
                       help='Camera source (default: auto-detect)')
    parser.add_argument('--test-image', type=str,
                       help='Use a static image file instead of camera (for WSL/testing)')
    parser.add_argument('--no-display', action='store_true',
                       help='Disable image display (for headless Pi)')
    parser.add_argument('--save-images', action='store_true',
                       help='Save captured images to captures/ directory')
    
    args = parser.parse_args()
    
    print_banner()
    
    # Check API key
    if not os.getenv("GEMINI_API_KEY"):
        print("❌ ERROR: GEMINI_API_KEY environment variable not set!")
        print("\nPlease set it with:")
        print("  export GEMINI_API_KEY='your-api-key-here'")
        print("\nGet your key at: https://makersuite.google.com/app/apikey")
        return 1
    
    try:
        # Initialize camera or load test image
        if args.test_image:
            print(f"📸 Loading test image: {args.test_image}...")
            import cv2
            current_image = cv2.imread(args.test_image)
            if current_image is None:
                print(f"✗ Failed to load image: {args.test_image}")
                return 1
            print(f"✓ Test image loaded ({current_image.shape})\n")
            camera = None
        else:
            print(f"📸 Initializing camera ({args.camera})...")
            camera = CameraInterface(source=args.camera)
            print(f"✓ Camera ready: {camera.source}\n")
            
            # Capture initial image
            print("📸 Capturing initial image...")
            current_image = camera.capture()
            
            if current_image is None:
                print("✗ Failed to capture image. Check camera connection.")
                return 1
            
            print("✓ Image captured!\n")
        
        # Initialize Gemini
        print("🤖 Connecting to Gemini API...")
        config_path = os.path.join(os.path.dirname(__file__), '../config/gemini_prompts.yaml')
        gemini = GeminiCoordinator(config_path=config_path)
        
        # Test connection
        if gemini.test_connection():
            print("✓ Gemini API connected\n")
        else:
            print("✗ Gemini API connection failed\n")
            return 1
        
        # Create captures directory if saving
        if args.save_images:
            os.makedirs('captures', exist_ok=True)
        
        print("=" * 63)
        print("READY! You can now chat with Gemini about what it sees.")
        print("\nCommands:")
        print("  • Type your question and press Enter")
        print("  • Type 'capture' to take a new photo")
        print("  • Type 'analyze' for detailed scene analysis")
        print("  • Type 'help' for more commands")
        print("  • Type 'exit' or 'quit' to exit")
        print("=" * 63)
        print()
        
        # Capture initial image

        
        if args.save_images:
            filename = f"captures/capture_{int(time.time())}.jpg"
            camera.save_image(current_image, filename)
            print(f"💾 Saved to {filename}\n")
        
        # Interactive loop
        conversation_count = 0
        
        while True:
            try:
                # Get user input
                user_input = input("\n💬 You: ").strip()
                
                if not user_input:
                    continue
                
                # Handle commands
                if user_input.lower() in ['exit', 'quit', 'q']:
                    print("\n👋 Goodbye!")
                    break
                
                elif user_input.lower() == 'help':
                    print("""
Available commands:
  capture  - Take a new photo
  analyze  - Detailed scene analysis (structured JSON)
  describe - Natural language scene description
  objects  - List all detected objects
  help     - Show this help
  exit     - Exit the program

Or just ask any natural language question about what the camera sees!
Examples:
  "Can you see me?"
  "What objects are on my desk?"
  "Describe what you see in detail"
  "How many cups do you see?"
""")
                    continue
                
                elif user_input.lower() == 'capture':
                    if camera is None:
                        print("⚠️  Running in test-image mode - using same static image")
                        continue
                    print("📸 Capturing new image...")
                    current_image = camera.capture()
                    if current_image is not None:
                        print("✓ New image captured!")
                        if args.save_images:
                            filename = f"captures/capture_{int(time.time())}.jpg"
                            camera.save_image(current_image, filename)
                            print(f"💾 Saved to {filename}")
                    else:
                        print("✗ Failed to capture image")
                    continue
                
                elif user_input.lower() == 'analyze':
                    print("🔍 Analyzing scene (this may take 1-2 seconds)...")
                    result = gemini.analyze_scene(current_image)
                    
                    print(f"\n📊 Analysis (latency: {result.get('latency', 0):.2f}s):")
                    if 'objects' in result and result['objects']:
                        print(f"\nDetected {len(result['objects'])} objects:")
                        for i, obj in enumerate(result['objects'], 1):
                            print(f"  {i}. {obj.get('name', 'Unknown')}")
                            if 'position' in obj:
                                print(f"     Position: {obj['position']}")
                            if 'properties' in obj:
                                print(f"     Properties: {obj['properties']}")
                    else:
                        print("\nNo objects detected or plain text response:")
                        print(result.get('response', 'No response'))
                    continue
                
                elif user_input.lower() == 'describe':
                    print("🔍 Describing scene...")
                    description = gemini.describe_scene(current_image)
                    print(f"\n🤖 Gemini: {description}")
                    continue
                
                elif user_input.lower() == 'objects':
                    print("🔍 Detecting objects...")
                    result = gemini.analyze_scene(current_image)
                    if 'objects' in result and result['objects']:
                        print(f"\n📦 Found {len(result['objects'])} objects:")
                        for obj in result['objects']:
                            print(f"  • {obj.get('name', 'Unknown')}")
                    else:
                        print("\n📦 No objects detected")
                    continue
                
                # Natural language question
                print("🤖 Gemini is thinking...")
                start_time = time.time()
                
                response = gemini.chat(user_input, image=current_image)
                
                latency = time.time() - start_time
                print(f"\n🤖 Gemini ({latency:.2f}s): {response}")
                
                conversation_count += 1
                
            except KeyboardInterrupt:
                print("\n\n👋 Interrupted. Goodbye!")
                break
            except Exception as e:
                print(f"\n❌ Error: {e}")
                import traceback
                traceback.print_exc()
    
    finally:
        # Cleanup
        if 'camera' in locals() and camera is not None:
            camera.release()
            print("\n📸 Camera released")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
