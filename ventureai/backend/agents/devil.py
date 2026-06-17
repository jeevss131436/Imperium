import asyncio
import json
import logging
import os
from typing import Optional, Dict

from ventureai.backend.agents.base_agent import BaseAgent
from ventureai.backend.models import MarketAnalysis, FounderAnalysis, FinancialAnalysis, BearCase
import ventureai.backend.mock_data as mock_data

logger = logging.getLogger("ventureai.devil")


class DevilAgent(BaseAgent):
    def __init__(self, name, role, api_key, band_api_key, room_id=None):
        super().__init__(name, role, api_key, band_api_key, room_id)
        self._band_link = None
        self._runtime_task: Optional[asyncio.Task] = None
        
        # Dictionary to store intermediate results per session_id
        self._session_cache: Dict[str, dict] = {}

    async def connect_to_band_sdk(self):
        """Connect to the Band platform via the Band SDK and listen for analysis events."""
        from band import AgentRuntime, BandLink

        agent_key = os.environ.get("DEVIL_AGENT_API_KEY")
        if not agent_key:
            logger.warning("DEVIL_AGENT_API_KEY not set — skipping Band SDK connection")
            return
        parts = agent_key.split("_")
        agent_id = parts[2] if len(parts) >= 4 else agent_key

        self._band_link = BandLink(agent_id=agent_id, api_key=agent_key)
        runtime = AgentRuntime(
            self._band_link,
            agent_id=agent_id,
            on_execute=self._on_band_event,
        )
        self._runtime_task = asyncio.create_task(runtime.run())
        logger.info("DevilAgent registered on Band as %s", agent_id)

    async def _on_band_event(self, ctx, event):
        """Triggered when another agent sends an analysis event to this room."""
        from band import AgentTools
        from band.platform.event import MessageEvent
        if not isinstance(event, MessageEvent):
            return
        payload = event.payload
        if not payload or payload.message_type not in ["market_analysis", "founder_analysis", "financial_analysis"]:
            return

        try:
            data = json.loads(payload.content)
            session_id = data.get("session_id")
            if not session_id:
                return

            logger.info("DevilAgent: received %s from Band for session %s", payload.message_type, session_id)
            
            if session_id not in self._session_cache:
                self._session_cache[session_id] = {}
                
            # Store the specific analysis
            if payload.message_type == "market_analysis":
                data.pop("session_id", None)
                self._session_cache[session_id]["market"] = MarketAnalysis.parse_obj(data)
            elif payload.message_type == "founder_analysis":
                data.pop("session_id", None)
                self._session_cache[session_id]["founder"] = FounderAnalysis.parse_obj(data)
            elif payload.message_type == "financial_analysis":
                data.pop("session_id", None)
                self._session_cache[session_id]["financial"] = FinancialAnalysis.parse_obj(data)

            cache = self._session_cache[session_id]
            # Check if we have all 3 analyses
            if "market" in cache and "founder" in cache and "financial" in cache:
                logger.info("DevilAgent: all analyses received for session %s, processing...", session_id)
                
                analysis = await self.process(
                    cache["market"], 
                    cache["founder"], 
                    cache["financial"], 
                    session_id=session_id
                )

                # Publish result back to Band
                tools = AgentTools.from_context(ctx)
                out = analysis.dict()
                out["session_id"] = session_id
                await tools.send_event(content=json.dumps(out), message_type="bear_case")
                
                # Clean up cache
                del self._session_cache[session_id]

        except Exception:
            logger.exception("DevilAgent: failed handling Band event")

    async def process(
        self, 
        market: MarketAnalysis, 
        founder: FounderAnalysis, 
        financial: FinancialAnalysis, 
        session_id: Optional[str] = None
    ) -> BearCase:
        
        system_prompt = (
            "You are a highly skeptical VC partner acting as the 'Devil\'s Advocate'. "
            "Your job is to challenge every positive finding in the provided market, founder, and financial analyses. "
            "Identify weaknesses, steelman the bear case, and highlight failure modes. "
            "Return ONLY valid JSON. No markdown, no preamble, no explanation."
        )
        
        inputs = {
            "market_analysis": market.dict(),
            "founder_analysis": founder.dict(),
            "financial_analysis": financial.dict()
        }
        
        user_prompt = (
            f"Diligence inputs:\n{json.dumps(inputs, indent=2)}\n\n"
            "Return ONLY valid JSON with these exact fields: "
            "market_challenges (list of strings), founder_challenges (list of strings), "
            "financial_challenges (list of strings), failure_modes (list of strings), "
            "bear_case_score (integer 0-100 indicating severity of risks, 100=highest risk), summary (string)."
        )

        try:
            resp = await self.call_llm(system_prompt, user_prompt)

            candidate = resp
            if isinstance(resp, dict):
                if "result" in resp and isinstance(resp["result"], dict):
                    candidate = resp["result"]
                elif "data" in resp and isinstance(resp["data"], dict):
                    candidate = resp["data"]

            analysis = BearCase.parse_obj(candidate)

            payload = analysis.dict()
            if session_id:
                payload["session_id"] = session_id
            await self.publish_to_band("bear_case", payload)
            logger.info("DevilAgent published bear_case")
            await self.notify_band_platform(
                f"[Devil's Advocate] Bear Case | Risk Score: {analysis.bear_case_score}/100\n{analysis.summary}"
            )
            return analysis

        except Exception as e:
            logger.exception("DevilAgent LLM call failed: %s", e)
            fallback = mock_data.MOCK_BEAR_CASE
            payload = fallback.dict()
            if session_id:
                payload["session_id"] = session_id
            try:
                await self.publish_to_band("bear_case", payload)
            except Exception:
                logger.exception("Failed to publish fallback bear_case")
            await self.notify_band_platform(
                f"[Devil's Advocate] Bear Case | Risk Score: {fallback.bear_case_score}/100\n{fallback.summary}"
            )
            return fallback

    async def close(self):
        if self._runtime_task:
            self._runtime_task.cancel()
        if self._band_link:
            try:
                self._band_link.disconnect()
            except Exception:
                pass
        await super().close()
