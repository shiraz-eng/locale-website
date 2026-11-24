import asyncio
from starlette.responses import JSONResponse


class RequestLimits:
    """Bound mutation bodies before JSON and multipart parsers allocate resources."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in {"POST", "PUT", "PATCH"}:
            return await self.app(scope, receive, send)
        upload = scope["path"] in {"/api/admin/upload", "/api/ai/floor-plan"}
        maximum = 11 * 1024 * 1024 if upload else 1024 * 1024
        headers = dict(scope.get("headers", []))
        try:
            declared = int(headers.get(b"content-length", b"0"))
        except ValueError:
            return await JSONResponse({"detail": "Invalid request length."}, status_code=400)(scope, receive, send)
        if declared < 0 or declared > maximum:
            return await JSONResponse({"detail": "Request body is too large."}, status_code=413)(scope, receive, send)
        chunks = []
        size = 0
        try:
            async with asyncio.timeout(30):
                while True:
                    message = await receive()
                    if message["type"] == "http.disconnect":
                        return
                    body = message.get("body", b"")
                    size += len(body)
                    if size > maximum:
                        return await JSONResponse({"detail": "Request body is too large."}, status_code=413)(scope, receive, send)
                    chunks.append(body)
                    if not message.get("more_body", False):
                        break
        except TimeoutError:
            return await JSONResponse({"detail": "Request body timed out."}, status_code=408)(scope, receive, send)
        body = b"".join(chunks)
        delivered = False

        async def bounded_receive():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {"type": "http.request", "body": body, "more_body": False}

        return await self.app(scope, bounded_receive, send)
