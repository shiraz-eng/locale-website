import unittest
from unittest.mock import patch
from fastapi import HTTPException
from starlette.requests import Request
import ai
import security
from security import same_origin, origin, can


class SecurityTests(unittest.TestCase):
    def test_editor_cannot_manage_users(self):
        user=type("User", (), {"role":"editor"})()
        self.assertFalse(can(user,"team"))
        self.assertTrue(can(user,"content"))

    def test_cross_origin_mutation_rejected(self):
        request=Request({"type":"http","headers":[(b"origin",b"https://untrusted.example")]})
        with self.assertRaises(HTTPException) as error:
            same_origin(request)
        self.assertEqual(error.exception.status_code,403)

    def test_explicit_production_alias_is_allowed_without_trusting_other_hosts(self):
        with patch.object(security,"allowed_origins",{"https://site.vercel.app","https://alias.vercel.app"}):
            same_origin(Request({"type":"http","headers":[(b"origin",b"https://alias.vercel.app")]}))
            with self.assertRaises(HTTPException):
                same_origin(Request({"type":"http","headers":[(b"origin",b"https://alias.vercel.app.attacker.example")]}))

    def test_ai_busy_returns_retry_after(self):
        with patch.object(ai,"_slots") as slots:
            slots.acquire.return_value=False
            with self.assertRaises(HTTPException) as error:
                ai.generate("instruction","message")
            self.assertEqual(error.exception.status_code,503)
            self.assertEqual(error.exception.headers["Retry-After"],"10")
            slots.release.assert_not_called()

    def test_ai_slot_released_on_failure(self):
        with patch.object(ai,"_slots") as slots, patch.object(ai,"_generate",side_effect=RuntimeError):
            slots.acquire.return_value=True
            with self.assertRaises(RuntimeError):
                ai.generate("instruction","message")
            slots.release.assert_called_once()
