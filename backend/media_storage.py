"""Persist serverless uploads in the existing private CMS content store."""
import base64
import re
import os
from pathlib import Path
from fastapi import HTTPException
from starlette.responses import FileResponse, Response
from models import Content
from common import media

KIND = "media-file"

def put(db, name, data, content_type):
    db.add(Content(kind=KIND, slug=name, data={"body":base64.b64encode(data).decode("ascii"),"content_type":content_type}))

def remove(db, name):
    row=db.get(Content,(KIND,name))
    if row:db.delete(row)

def response(db, name):
    if not re.fullmatch(r"[a-f0-9]{40}\.(?:png|jpg)",name):
        raise HTTPException(404,"Image not found.")
    # Local files do not need a database round-trip. Serverless instances keep
    # using the shared store, since their filesystem is ephemeral.
    if not os.getenv("VERCEL"):
        for root in (media,Path(__file__).parent/"uploads"):
            path=root/name
            if path.is_file():return FileResponse(path,headers={"X-Content-Type-Options":"nosniff"})
    row=db.get(Content,(KIND,name))
    if row:return Response(base64.b64decode(row.data["body"]),media_type=row.data["content_type"],headers={"Cache-Control":"public, max-age=86400","X-Content-Type-Options":"nosniff"})
    for root in (media,Path(__file__).parent/"uploads"):
        path=root/name
        if path.is_file():return FileResponse(path,headers={"X-Content-Type-Options":"nosniff"})
    raise HTTPException(404,"Image not found.")
