import asyncio
import os
import warnings
import time
import json
import re
from typing import Optional

# Suppress deprecation warning for google.generativeai until migration to google-genai
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
import google.generativeai as genai


class GeminiCoordinator:
    """
    Orchestrates the Council of Hardware Experts with REAL Gemini Vision.
    """

    def __init__(self):
        self.history = []
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.model = None
        
        # Quota tracking
        self.request_count_today = 0
        self.last_reset_time = time.time()
        self.quota_warnings_shown = set()
        # Approximate free tier limits (conservative estimates)
        self.free_tier_daily_limit = 50  # Conservative estimate
        self.free_tier_warning_threshold = 40  # Warn at 80%
    
    def check_quota_status(self, log_callback=None) -> dict:
        """
        Check current quota usage and return status.
        Returns dict with: usage_percent, warning_level, message
        """
        # Reset counter if it's been more than 24 hours
        current_time = time.time()
        if current_time - self.last_reset_time > 86400:  # 24 hours
            self.request_count_today = 0
            self.last_reset_time = current_time
            self.quota_warnings_shown.clear()
        
        usage_percent = (self.request_count_today / self.free_tier_daily_limit) * 100
        
        if usage_percent >= 100:
            warning_level = "critical"
            message = f"⚠️ Daily quota exceeded ({self.request_count_today}/{self.free_tier_daily_limit} requests)"
        elif usage_percent >= self.free_tier_warning_threshold:
            warning_level = "warning"
            message = f"⚠️ Approaching quota limit ({self.request_count_today}/{self.free_tier_daily_limit} requests)"
        else:
            warning_level = "ok"
            message = f"Quota: {self.request_count_today}/{self.free_tier_daily_limit} requests today"
        
        return {
            "usage_percent": usage_percent,
            "warning_level": warning_level,
            "message": message,
            "requests_today": self.request_count_today,
            "limit": self.free_tier_daily_limit,
        }
    
    def log_quota_warning_if_needed(self, log_callback=None):
        """
        Check quota and log a warning if approaching limits.
        Only shows warning once per threshold to avoid spam.
        """
        if not log_callback:
            return
        
        status = self.check_quota_status()
        
        if status["warning_level"] == "critical" and "critical" not in self.quota_warnings_shown:
            log_callback("SYSTEM", status["message"])
            log_callback(
                "SYSTEM",
                "TIP: Switch to Gemini Flash or disable Thought Stream to reduce usage.",
            )
            self.quota_warnings_shown.add("critical")
        elif status["warning_level"] == "warning" and "warning" not in self.quota_warnings_shown:
            log_callback("SYSTEM", status["message"])
            self.quota_warnings_shown.add("warning")

        if self.api_key:
            genai.configure(api_key=self.api_key)
            # Initialize the Gemini 3.0 Fleet (Preview)
            self.flash_model = genai.GenerativeModel("gemini-3-flash-preview")
            self.pro_model = genai.GenerativeModel("gemini-3-pro-preview")
    
    def _parse_quota_error(self, error: Exception) -> dict:
        """
        Parse Google API quota errors to extract useful information.
        Returns dict with: error_type, retry_after, quota_info, user_message
        """
        error_str = str(error)
        
        # Check for 429/quota errors
        if "429" in error_str or "quota" in error_str.lower() or "rate limit" in error_str.lower():
            # Try to extract retry delay
            retry_match = re.search(r"retry.*?(\d+\.?\d*)\s*(?:s|sec|second)", error_str, re.IGNORECASE)
            retry_after = float(retry_match.group(1)) if retry_match else 60.0
            
            # Extract quota metric info
            quota_info = {}
            if "free_tier" in error_str.lower():
                quota_info["tier"] = "Free Tier"
            if "gemini-3-pro" in error_str:
                quota_info["model"] = "Gemini 3.0 Pro"
            elif "gemini-3-flash" in error_str:
                quota_info["model"] = "Gemini 3.0 Flash"
            
            # Build user-friendly message
            user_message = (
                "⚠️ **Quota Exceeded**\n\n"
                f"You've hit the API rate limit for {quota_info.get('model', 'the selected model')}.\n\n"
            )
            
            if quota_info.get("tier") == "Free Tier":
                user_message += (
                    "**Free Tier Limits:**\n"
                    "- Daily request limits apply\n"
                    "- Try switching to Gemini Flash (lower usage)\n"
                    "- Or wait for quota reset (usually at midnight UTC)\n\n"
                )
            
            user_message += (
                f"**Retry in:** {int(retry_after)} seconds\n\n"
                "💡 **Tips:**\n"
                "- Use Gemini Flash for faster, lower-cost responses\n"
                "- Disable Thought Stream to reduce API calls\n"
                "- Check your usage: https://ai.dev/rate-limit"
            )
            
            return {
                "error_type": "quota_exceeded",
                "retry_after": retry_after,
                "quota_info": quota_info,
                "user_message": user_message,
            }
        
        # Generic API errors
        elif "500" in error_str or "503" in error_str:
            return {
                "error_type": "server_error",
                "retry_after": 5.0,
                "quota_info": {},
                "user_message": (
                    "⚠️ **Server Error**\n\n"
                    "Google's API is temporarily unavailable. "
                    "This is usually a temporary issue.\n\n"
                    "Retrying automatically..."
                ),
            }
        
        # Authentication errors
        elif "401" in error_str or "403" in error_str or "api key" in error_str.lower():
            return {
                "error_type": "auth_error",
                "retry_after": None,
                "quota_info": {},
                "user_message": (
                    "🔐 **Authentication Error**\n\n"
                    "Your API key is invalid or missing.\n\n"
                    "**Fix:**\n"
                    "1. Check your `GEMINI_API_KEY` environment variable\n"
                    "2. Get a key from: https://ai.google.dev/\n"
                    "3. Restart the application"
                ),
            }
        
        # Default error
        return {
            "error_type": "unknown",
            "retry_after": 2.0,
            "quota_info": {},
            "user_message": f"⚠️ **Error**: {error_str[:200]}",
        }
    
    async def _retry_with_backoff(
        self,
        func,
        max_retries: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        log_callback=None,
    ):
        """
        Retry a function with exponential backoff.
        Handles 429/quota errors with intelligent retry logic.
        """
        delay = initial_delay
        
        for attempt in range(max_retries + 1):
            try:
                return await func()
            except Exception as e:
                error_info = self._parse_quota_error(e)
                
                # Don't retry auth errors
                if error_info["error_type"] == "auth_error":
                    raise
                
                # Last attempt - raise the error
                if attempt == max_retries:
                    raise
                
                # Use parsed retry_after if available, otherwise use exponential backoff
                retry_delay = error_info.get("retry_after") or delay
                retry_delay = min(retry_delay, max_delay)
                
                if log_callback:
                    countdown = int(retry_delay)
                    log_callback(
                        "SYSTEM",
                        f"RETRY_{attempt + 1}/{max_retries}: Waiting {countdown}s ({error_info['error_type']})",
                    )
                
                await asyncio.sleep(retry_delay)
                delay = min(delay * 2, max_delay)  # Exponential backoff
        
        raise Exception("Max retries exceeded")

    async def process_query(
        self, query: str, image_data: str | None = None, log_callback=None, preferred_model: str = None
    ):
        """
        Primary chat agent – streams the main response back to the UI.
        
        Args:
            preferred_model: "flash" or "pro" to override automatic routing. If None, uses smart routing.
        """
        if log_callback:
            log_callback("THINKING", "Processing input vector...")

        # 1. REAL AI PATH
        if self.api_key:
            try:
                # Model selection: user preference overrides automatic routing
                if preferred_model == "pro":
                    model_to_use = self.pro_model
                    model_name = "Gemini 3.0 Pro"
                elif preferred_model == "flash":
                    model_to_use = self.flash_model
                    model_name = "Gemini 3.0 Flash"
                else:
                    # Smart Model Routing (fallback if no preference)
                    model_to_use = self.flash_model  # Default to speed
                    model_name = "Gemini 3.0 Flash"

                    # Use Pro for complex reasoning
                    complex_triggers = [
                        "why",
                        "explain",
                        "code",
                        "design",
                        "architect",
                        "debug",
                        "analyze",
                    ]
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

                content: list[object] = [system_prompt, query]
                if image_data:
                    content.append({"mime_type": "image/jpeg", "data": image_data})
                    if log_callback:
                        log_callback("THINKING", "Visual Cortex Active.")

                # Check quota before making request
                self.log_quota_warning_if_needed(log_callback)
                
                # Track request
                self.request_count_today += 1
                
                # STREAMING PATH – primary chat agent with retry logic
                loop = asyncio.get_running_loop()
                
                async def _generate_with_retry():
                    return await loop.run_in_executor(
                        None,
                        lambda: model_to_use.generate_content(content, stream=True),
                    )
                
                response = await self._retry_with_backoff(
                    _generate_with_retry,
                    max_retries=3,
                    initial_delay=1.0,
                    log_callback=log_callback,
                )

                yield f"**[{model_name}]**:\n"

                # Iterate through stream chunks
                for chunk in response:
                    if chunk.text:
                        yield chunk.text

            except Exception as e:
                # Parse error and show user-friendly message
                error_info = self._parse_quota_error(e)
                yield error_info["user_message"]
                
                # Also log technical details for debugging
                if log_callback:
                    log_callback("SYSTEM", f"API_ERROR: {error_info['error_type']}")
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
                yield (
                    "**Council Consensus**:\nCheck 5V rail stability and servo horn alignment."
                )
            elif "led" in query.lower():
                yield "**Electronics Agent**:\nEnsure current-limiting resistor is present (220ohm for red LED)."
            else:
                yield f"**A.R.I.A. Core**: I received '{query}'.\n(Set GEMINI_API_KEY to enable real intelligence)."
            return

    async def generate_thought_stream(
        self, query: str, image_data: str | None = None, log_callback=None
    ):
        """
        Secondary 'Cortex narrator' agent.

        This does NOT expose the model's private chain-of-thought; instead it
        produces a detailed, human-readable explanation of the reasoning
        steps the primary agent is likely taking.

        Designed to feed the THOUGHT STREAM panel without slowing
        down the main chat response.
        """
        # If no real model is available, provide a graceful degradation.
        if not self.api_key:
            if log_callback:
                log_callback("SYSTEM", "THOUGHT_STREAM_DISABLED_NO_API_KEY")
            yield "Thought stream unavailable: set GEMINI_API_KEY to enable detailed reasoning trace."
            return

        try:
            loop = asyncio.get_running_loop()

            # Use the fast model for narration; latency matters less than for chat.
            def _call_model():
                system_prompt = (
                    "You are A.R.I.A.'s Cortex Logger. "
                    "Your only job is to narrate, in clear numbered steps, what the main A.R.I.A. assistant "
                    "is thinking and doing in order to answer the user's question. "
                    "You DO NOT talk to the user directly; you are writing for an internal developer console. "
                    "Be concrete: mention phases like 'understand problem', 'inspect context', 'design approach', "
                    "'plan tool calls', 'execute edits', 'run tests', 'summarize results'. "
                    "Output 8–15 short steps, each on its own line, starting with a timestamp-like tag and "
                    "a bracketed phase name, for example:\n"
                    "[21:41:01] [PLAN] Parsing user intent...\n"
                    "[21:41:02] [SEARCH] Scanning repository for relevant files...\n"
                    "Stay tightly grounded in the user question and domain (robotics / hardware / code). "
                    "Do NOT restate the final answer contents in full; focus on the reasoning and actions."
                )

                content: list[object] = [system_prompt, f"User query: {query}"]
                if image_data:
                    content.append(
                        {
                            "mime_type": "image/jpeg",
                            "data": image_data,
                        }
                    )

                return self.flash_model.generate_content(content, stream=False)

            if log_callback:
                log_callback(
                    "THINKING",
                    "Cortex Narrator online. Generating detailed reasoning trace...",
                )

            # Track request
            self.request_count_today += 1
            
            # Retry logic for thought stream
            async def _call_with_retry():
                return await loop.run_in_executor(None, _call_model)
            
            response = await self._retry_with_backoff(
                _call_with_retry,
                max_retries=2,  # Fewer retries for thought stream (non-critical)
                initial_delay=1.0,
                log_callback=log_callback,
            )
            
            text = getattr(response, "text", "") or ""

            if not text.strip():
                yield "Thought stream: model returned empty narration."
                return

            # Feed each non-empty line as a separate step to the UI.
            for raw_line in text.splitlines():
                line = raw_line.strip()
                if not line:
                    continue
                yield line

        except Exception as e:
            # Parse error but don't break main chat flow
            error_info = self._parse_quota_error(e)
            if log_callback:
                log_callback("SYSTEM", f"THOUGHT_STREAM_ERROR: {error_info['error_type']}")
            yield f"⚠️ Thought stream unavailable: {error_info['error_type']}"

