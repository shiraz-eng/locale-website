import unittest
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
from starlette.testclient import TestClient
from request_limits import RequestLimits


async def echo(request):
    return JSONResponse({"size": len(await request.body())})


class RequestLimitTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(RequestLimits(Starlette(routes=[Route("/", echo, methods=["POST"])])))

    def test_preserves_normal_body(self):
        response = self.client.post("/", content=b"example")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"size": 7})

    def test_rejects_declared_oversize(self):
        response = self.client.post("/", content=b"x", headers={"content-length": "1048577"})
        self.assertEqual(response.status_code, 413)

    def test_rejects_chunked_oversize(self):
        response = self.client.post("/", content=iter([b"x" * 600000, b"x" * 600000]))
        self.assertEqual(response.status_code, 413)

    def test_rejects_invalid_length(self):
        response = self.client.post("/", content=b"x", headers={"content-length": "invalid"})
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
