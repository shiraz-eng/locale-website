import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock,patch
from fastapi import HTTPException
import ai

class AiLatencyTests(unittest.TestCase):
    def setUp(self):
        self.env=patch.dict(os.environ,{"GEMINI_API_KEY":"test-key","GEMINI_MODEL":"gemini-3.5-flash-lite","GEMINI_FALLBACK_MODELS":"gemini-3.1-flash-lite,gemini-3.8-flash","AI_TIMEOUT_MS":"18000"})
        self.env.start();ai.cooling.clear()
    def tearDown(self):
        self.env.stop();ai.cooling.clear()
    def test_fast_model_uses_minimal_thinking_and_validates_output(self):
        client=Mock()
        client.models.generate_content.return_value=SimpleNamespace(text='{"sections":[{"heading":"Start","text":"Share your project goals."}]}')
        with patch.object(ai,"provider_client",return_value=client):
            result=ai._generate("instruction","visitor",ai.Guidance)
        self.assertEqual(result.sections[0].heading,"Start")
        config=client.models.generate_content.call_args.kwargs["config"]
        self.assertEqual(config.thinking_config.thinking_level.value.lower(),"minimal")
        self.assertEqual(client.models.generate_content.call_count,1)
    def test_fallbacks_share_deadline_and_stop_after_two_models(self):
        clock=[0.0];timeouts=[]
        def provider(key,timeout):
            timeouts.append(timeout)
            def fail(**kwargs):
                clock[0]+=14 if len(timeouts)==1 else 4
                raise TimeoutError()
            return SimpleNamespace(models=SimpleNamespace(generate_content=fail))
        with patch.object(ai.time,"monotonic",side_effect=lambda:clock[0]),patch.object(ai,"provider_client",side_effect=provider):
            with self.assertRaises(HTTPException):ai._generate("instruction","visitor",ai.Guidance)
        self.assertEqual(timeouts,[12000,4000])
    def test_malformed_provider_json_uses_fallback_and_returns_only_validated_data(self):
        client=Mock()
        client.models.generate_content.side_effect=[SimpleNamespace(text="not valid JSON"),SimpleNamespace(text='{"sections":[{"heading":"Start","text":"Share your site and goals."}]}')]
        with patch.object(ai,"provider_client",return_value=client):
            result=ai._generate("instruction","visitor",ai.Guidance)
        self.assertEqual(result.sections[0].heading,"Start")
        self.assertEqual(client.models.generate_content.call_count,2)

    def test_ready_turn_can_carry_its_brief_in_the_same_response(self):
        brief={key:"" for key in ["title","overview","project_type","location","size","budget","timeline"]}
        brief.update({key:[] for key in ["styles","design_preferences","space_requirements","considerations","services","questions"]})
        result=ai.Turn.model_validate({"reply":"Your brief is ready.","ready":True,"projects":[],"services":[],"brief":brief})
        self.assertIsInstance(result.brief,ai.Brief)
