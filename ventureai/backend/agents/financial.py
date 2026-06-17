import asyncio
import json
import logging
import os
from typing import Optional

from band import AgentRuntime, AgentTools, BandLink, ExecutionContext
from band.platform.event import MessageEvent

from ventureai.backend.agents.base_agent import BaseAgent
from ventureai.backend.models import FinancialAnalysis, StartupProfile
import ventureai.backend.mock_data as mock_data

logger = logging.getLogger("ventureai.financial")


class FinancialAgent(BaseAgent):

    def __init__(self, name, role, api_key, band_api_key, room_id=None):
        super().__init__(name, role, api_key, band_api_key, room_id)
        self._band_link: Optional[BandLink] = None
        self._runtime_task: Optional[asyncio.Task] = None

    async def connect_to_band_sdk(self):
        """Connect to the Band platform via the Band SDK and listen for startup_profile events."""
        agent_id = os.environ.get("FINANCIAL_AGENT_ID")
        agent_key = os.environ.get("BAND_API_KEY")
        if not agent_id or not agent_key:
            logger.warning("FINANCIAL_AGENT_ID or BAND_API_KEY not set — skipping Band SDK connection")
            return

        self._band_link = BandLink(agent_id=agent_id, api_key=agent_key)
        runtime = AgentRuntime(
            self._band_link,
            agent_id=agent_id,
            on_execute=self._on_band_event,
        )
        self._runtime_task = asyncio.create_task(runtime.run())
        logger.info("FinancialAgent registered on Band as %s", agent_id)

    async def _on_band_event(self, ctx: ExecutionContext, event):
        """Triggered by Band when another agent sends a startup_profile event to this room."""
        if not isinstance(event, MessageEvent):
            return
        payload = event.payload
        if not payload or payload.message_type != "startup_profile":
            return

        logger.info("FinancialAgent: received startup_profile from Band")
        try:
            data = json.loads(payload.content)
            session_id = data.pop("session_id", None)
            profile = StartupProfile.parse_obj(data)
            analysis = await self.process(profile, session_id=session_id)

            tools = AgentTools.from_context(ctx)
            out = analysis.dict()
            if session_id:
                out["session_id"] = session_id
            await tools.send_event(content=json.dumps(out), message_type="financial_analysis")

        except Exception:
            logger.exception("FinancialAgent: failed handling Band event")

    async def process(self, profile: StartupProfile, session_id: Optional[str] = None) -> FinancialAnalysis:
        system_prompt = (
            "You are a VC financial analyst at a top-tier venture firm. "
            "Evaluate this startup's business model and financial prospects. "
            "Assess revenue model viability, unit economics, funding requirements, "
            "burn rate, and path to profitability. Identify any financial red flags. "
            "Return ONLY valid JSON. No markdown, no preamble, no explanation."
        )
        user_prompt = (
            f"Startup profile:\n{json.dumps(profile.dict(), indent=2)}\n\n"
            "Return ONLY valid JSON with these exact fields: "
            "revenue_model (string), unit_economics (object with string values), "
            "raise_amount (string), burn_assessment (string), "
            "path_to_profitability (string), financial_score (integer 0-100), "
            "red_flags (list of strings), summary (string)."
        )

        try:
            resp = await self.call_llm(system_prompt, user_prompt)

            candidate = resp
            if isinstance(resp, dict):
                if "result" in resp and isinstance(resp["result"], dict):
                    candidate = resp["result"]
                elif "data" in resp and isinstance(resp["data"], dict):
                    candidate = resp["data"]

            analysis = FinancialAnalysis.parse_obj(candidate)

            payload = analysis.dict()
            if session_id:
                payload["session_id"] = session_id
            await self.publish_to_band("financial_analysis", payload)
            logger.info("FinancialAgent published financial_analysis for %s", profile.company_name)
            return analysis

        except Exception as e:
            logger.exception("FinancialAgent LLM call failed: %s", e)
            fallback = mock_data.MOCK_FINANCIAL_ANALYSIS
            payload = fallback.dict()
            if session_id:
                payload["session_id"] = session_id
            try:
                await self.publish_to_band("financial_analysis", payload)
            except Exception:
                logger.exception("Failed to publish fallback financial_analysis")
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
