import json
import os
from pathlib import Path
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert
from db import Session
from models import Content, MediaAsset, User
from service_templates import ensure_initial_services
from project_templates import ensure_initial_projects
from PIL import Image
from security import hasher

with Session.begin() as db:
    email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD", "")
    if email and db.get(User, email) is None:
        if len(password) < 14 or password.startswith("replace-"):
            raise RuntimeError("Set a unique ADMIN_PASSWORD with at least 14 characters.")
        db.execute(insert(User).values(email=email, password=hasher.hash(password), role="owner").on_conflict_do_nothing())
    seed = Path(__file__).parent / "studio.json"
    if not seed.exists():
        seed = Path(__file__).parent.parent / "data" / "studio.json"
    if db.scalar(select(func.count()).select_from(Content).where(Content.kind == "settings")) == 0:
        for kind, records in json.loads(seed.read_text(encoding="utf-8")).items():
            if kind in ("services", "projects"):
                continue  # these live in their own tables
            for item in records:
                slug = item.pop("slug")
                db.execute(insert(Content).values(kind=kind, slug=slug, data=item).on_conflict_do_nothing())

    ensure_initial_services(db.connection())
    starter = json.loads(seed.read_text(encoding="utf-8")).get("projects", [])
    ensure_initial_projects(db.connection(), {item["slug"]: {key: value for key, value in item.items() if key != "slug"} for item in starter})
    # Register uploads made before the media library existed so they can be reused and safely deleted.
    uploads = Path(os.getenv("UPLOAD_DIR", "uploads"))
    known = set(db.scalars(select(MediaAsset.url)))
    for path in sorted(uploads.glob("*")) if uploads.exists() else []:
        if path.suffix in (".jpg", ".png") and f"/media/{path.name}" not in known:
            with Image.open(path) as image:
                db.add(MediaAsset(url=f"/media/{path.name}", name=path.name, content_type="image/png" if path.suffix == ".png" else "image/jpeg",
                                  width=image.width, height=image.height, size=path.stat().st_size, uploaded_by="imported"))
