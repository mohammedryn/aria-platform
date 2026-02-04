import asyncio
import os
import google.generativeai as genai
from datetime import datetime

class GeminiCoordinator:
    """
    Orchestrates the Council of Hardware Experts with REAL Gemini Vision.
    """
    def __init__(self):
        self.history = []
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.model = None
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
            # Initialize the Gemini 3.0 Fleet (Preview)
            self.flash_model = genai.GenerativeModel('gemini-3-flash-preview')
            self.pro_model = genai.GenerativeModel('gemini-3-pro-preview')

    async def process_query(self, query: str, image_data: str = None, log_callback=None):
        """
        Processes a user query through the Council using Real AI if available.
        """
        if log_callback:
            log_callback("THINKING", "Processing input vector...")

        # 1. REAL AI PATH
        if self.api_key:
            try:
                # Smart Model Routing
                model_to_use = self.flash_model # Default to speed
                model_name = "Gemini 3.0 Flash"
                
                # Use Pro for complex reasoning
                complex_triggers = ["why", "explain", "code", "design", "architect", "debug", "analyze"]
                if any(trigger in query.lower() for trigger in complex_triggers):
                    model_to_use = self.pro_model
                    model_name = "Gemini 3.0 Pro"

                if log_callback:
                    log_callback("THINKING", f"Routing to {model_name}...")
                
                # SYSTEM PROMPT (Injected into context)
                system_prompt = (
                    "You are A.R.I.A (Autonomous Robotic Intelligence Agent), a senior hardware engineer and expert coder. "
                    "Your goal is to build hardware with the user. "
                    "DO NOT behave like a generic AI assistant. DO NOT give generic tutorials unless asked. "
                    "Instead, act like a co-worker sitting next to the user. "
                    "If the user wants to work on a board (like Arduino Nano), say, 'Great. I can write the firmware for that. Connect it and let's flash it.' "
                    "Always offer direct code solutions that you can 'theoretically' flash. "
                    "Keep responses concise, professional, and action-oriented. "
                    "You have vision capabilities (you can see the user's board)."
                )
                
                content = [system_prompt, query]
                if image_data:
                    content.append({"mime_type": "image/jpeg", "data": image_data})
                    if log_callback:
                        log_callback("THINKING", "Visual Cortex Active.")
                
                # STREAMING PATH
                loop = asyncio.get_running_loop()
                response = await loop.run_in_executor(
                    None, 
                    lambda: model_to_use.generate_content(content, stream=True)
                )
                
                yield f"**[{model_name}]**:\n"
                
                # Iterate through stream chunks
                for chunk in response:
                     if chunk.text:
                         yield chunk.text
                         
            except Exception as e:
                yield f"**SYSTEM ERROR**: Cortex Link Failed.\n{str(e)}"
                return

        # 2. SIMULATION PATH (Fallback if no key)
        # FAST RESPONSE - INSTANT YIELD
        else:
            if log_callback:
                 log_callback("SYSTEM", "NO_API_KEY_FOUND")
                 
            if image_data:
                 yield "**Visual Signal Received**.\n\n"
                 yield "However, I cannot analyze it because the **GEMINI_API_KEY** is missing from the environment.\n"
                 yield "Please set your API key to enable semantic vision analysis.\n\n"
                 yield "*Simulated Analysis*: The image appears to contain hardware components, but I am blind to specifics without the Cortex Link."
                 return
            
            # Keyword Fallback (Instant Yield)
            if "servo" in query.lower():
                yield "**Council Consensus**:\nCheck 5V rail stability and servo horn alignment."
            elif "led" in query.lower():
                 yield "**Electronics Agent**:\nEnsure current-limiting resistor is present (220ohm for red LED)."
            else:
                yield f"**A.R.I.A. Core**: I received '{query}'.\n(Set GEMINI_API_KEY to enable real intelligence)."
