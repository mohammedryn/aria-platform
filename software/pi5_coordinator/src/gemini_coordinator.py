"""
Gemini API Integration for A.R.I.A.
Handles vision analysis, natural language interaction, and scene understanding
"""

import google.generativeai as genai
from PIL import Image
import cv2
import numpy as np
import json
import os
import time
import logging
from typing import Dict, Optional, List
import yaml

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GeminiCoordinator:
    """Gemini API coordinator for vision and natural language tasks."""
    
    def __init__(self, api_key: Optional[str] = None, config_path: Optional[str] = None):
        """
        Initialize Gemini coordinator.
        
        Args:
            api_key: Gemini API key (if None, reads from GEMINI_API_KEY env var)
            config_path: Path to gemini_prompts.yaml config file
        """
        # Get API key
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Gemini API key not found. Set GEMINI_API_KEY environment variable "
                "or pass api_key parameter"
            )
        
        # Configure Gemini
        genai.configure(api_key=self.api_key)
        
        # Initialize models (use currently available models)
        # Note: Model names may change - check https://ai.google.dev/models/gemini
        try:
            # Explicitly use Gemini 3.0 models
            self.model_flash = genai.GenerativeModel('gemini-3-flash')
            self.model_pro = genai.GenerativeModel('gemini-3-pro')
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini 3 models: {e}")
            # Fallback to 2.0 Flash/Pro if 3.0 isn't available in specific regions
            self.model_flash = genai.GenerativeModel('gemini-2.0-flash-latest')
            self.model_pro = genai.GenerativeModel('gemini-2.0-pro-latest')
        
        # Load prompts from config
        self.prompts = self._load_prompts(config_path)
        
        # Response cache (for repeated images)
        self.cache = {}
        self.cache_ttl = 5.0  # seconds
        
        logger.info("Gemini coordinator initialized")
    
    def _load_prompts(self, config_path: Optional[str]) -> Dict:
        """Load prompt templates from YAML config."""
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    prompts = yaml.safe_load(f)
                logger.info(f"Loaded prompts from {config_path}")
                return prompts
            except Exception as e:
                logger.warning(f"Failed to load prompts config: {e}")
        
        # Default prompts
        return {
            'scene_analysis': """Analyze this image from a robotic workspace. 
Provide a detailed description of what you see, including:
- All visible objects (with approximate positions)
- Any safety concerns
- Spatial relationships between objects

Respond in a natural, conversational way.""",
            
            'object_detection': """You are helping a robotic system identify objects.
List all objects visible in this image.
For each object, provide:
- Name (be specific: "blue marker", not just "marker")
- Approximate position (left/center/right, near/far)
- Any notable properties

Respond as JSON:
{
  "objects": [
    {"name": "...", "position": "...", "properties": "..."},
    ...
  ]
}""",
            
            'natural_language': """You are A.R.I.A., an intelligent robotic assistant.
You can see through a camera and help with workspace tasks.
Respond naturally and helpfully to questions about what you see.
If you're unsure about something, say so clearly."""
        }
    
    def chat(self, question: str, image: Optional[np.ndarray] = None, use_flash: bool = True) -> str:
        """
        Natural language chat with Gemini (with optional image).
        
        Args:
            question: User's question
            image: Optional image frame (numpy array, BGR)
            use_flash: Use Flash model (faster) vs Pro (smarter)
        
        Returns:
            Gemini's text response
        """
        model = self.model_flash if use_flash else self.model_pro
        
        try:
            # Build prompt
            prompt = self.prompts.get('natural_language', '') + f"\n\nUser: {question}"
            
            # Generate content
            if image is not None:
                # Convert image to PIL
                pil_image = self._numpy_to_pil(image)
                response = model.generate_content([prompt, pil_image])
            else:
                response = model.generate_content(prompt)
            
            return response.text
            
        except Exception as e:
            logger.error(f"Gemini chat error: {e}")
            return f"Error: {str(e)}"
    
    def analyze_scene(self, image: np.ndarray, use_cache: bool = True) -> Dict:
        """
        Analyze scene and detect objects.
        
        Args:
            image: Camera frame (numpy array, BGR)
            use_cache: Use cached result if available
        
        Returns:
            Dict with scene analysis
        """
        # Check cache
        image_hash = hash(image.tobytes())
        if use_cache and image_hash in self.cache:
            cache_time, result = self.cache[image_hash]
            if time.time() - cache_time < self.cache_ttl:
                logger.info("Using cached result")
                return result
        
        try:
            # Convert to PIL
            pil_image = self._numpy_to_pil(image)
            
            # Use object detection prompt
            prompt = self.prompts.get('object_detection', 'Describe this image.')
            
            # Generate with Flash (faster)
            start_time = time.time()
            response = self.model_flash.generate_content([prompt, pil_image])
            latency = time.time() - start_time
            
            logger.info(f"Gemini analysis latency: {latency:.2f}s")
            
            # Try to parse JSON
            result = self._parse_response(response.text)
            result['latency'] = latency
            
            # Cache result
            self.cache[image_hash] = (time.time(), result)
            
            return result
            
        except Exception as e:
            logger.error(f"Scene analysis error: {e}")
            return {
                'error': str(e),
                'objects': [],
                'latency': 0
            }
    
    def describe_scene(self, image: np.ndarray) -> str:
        """
        Get natural language description of scene.
        
        Args:
            image: Camera frame
        
        Returns:
            Human-readable description
        """
        try:
            pil_image = self._numpy_to_pil(image)
            prompt = self.prompts.get('scene_analysis', 'Describe what you see.')
            
            response = self.model_flash.generate_content([prompt, pil_image])
            return response.text
            
        except Exception as e:
            logger.error(f"Scene description error: {e}")
            return f"Error describing scene: {e}"
    
    def _numpy_to_pil(self, image: np.ndarray) -> Image.Image:
        """Convert numpy array (BGR) to PIL Image (RGB)."""
        # OpenCV uses BGR, PIL uses RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        return Image.fromarray(image_rgb)
    
    def _parse_response(self, text: str) -> Dict:
        """Parse Gemini response, handling JSON or plain text."""
        # Try to extract JSON
        try:
            # Remove markdown code blocks if present
            text = text.replace('```json', '').replace('```', '').strip()
            return json.loads(text)
        except json.JSONDecodeError:
            # Not JSON, return as plain text
            return {
                'response': text,
                'objects': []
            }
    
    def test_connection(self) -> bool:
        """Test if Gemini API is working."""
        try:
            response = self.model_flash.generate_content("Hello, respond with 'OK' if you can hear me.")
            return 'ok' in response.text.lower()
        except Exception as e:
            logger.error(f"API test failed: {e}")
            return False


# Test function
if __name__ == "__main__":
    print("Testing Gemini Coordinator...")
    
    # Check API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not set!")
        print("Set it with: export GEMINI_API_KEY='your-key-here'")
        exit(1)
    
    # Initialize
    gemini = GeminiCoordinator()
    
    # Test connection
    if gemini.test_connection():
        print("✓ Gemini API connected")
        
        # Test chat without image
        response = gemini.chat("Hello! Can you introduce yourself?")
        print(f"\nGemini: {response}")
    else:
        print("✗ Gemini API connection failed")
