"""Draft/publish/revision storage shared by services and projects.

Each record has a working `draft` document and a public `published` snapshot (validated JSON), plus relational
columns mirrored from the draft for admin listing. Publishing copies the draft; renaming a published slug keeps
the old URL as a redirect; every save and publish is kept as a revision.
"""
from datetime import datetime, timezone
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import delete, func, or_, select
from common import audit
from service_schema import upgrade
from detail_layout import standard_detail

KEEP_REVISIONS = 60

class DocumentStore:
    def __init__(self, model, revision, foreign_key, schema, entity, mirror):
        self.model, self.revision, self.schema, self.entity, self.mirror = model, revision, schema, entity, mirror
        self.owner = getattr(revision, foreign_key)
        self.foreign_key = foreign_key

    def validated(self, data):
        try:
            validated=self.schema.model_validate(upgrade(data)).model_dump(mode="json")
            return self.schema.model_validate(standard_detail(validated,self.entity)).model_dump(mode="json")
        except ValidationError as error:
            raise HTTPException(422, error.errors(include_context=False, include_input=False)) from None

    def get(self, db, identifier):
        row = db.get(self.model, identifier)
        if not row:
            raise HTTPException(404, f"{self.entity.capitalize()} not found.")
        return row

    def live(self):
        return select(self.model).where(self.model.status == "published", self.model.published.is_not(None))

    def public(self, db, slug):
        """The published record at this slug, or (None, new_slug) when the slug was renamed."""
        row = db.scalar(self.live().where(self.model.live_slug == slug))
        if row:
            return row, None
        moved = db.scalar(self.live().where(self.model.redirects.contains([slug])))
        return None, moved.live_slug if moved else None

    def working(self, db, slug):
        row = db.scalar(select(self.model).where(or_(self.model.slug == slug, self.model.live_slug == slug)))
        if not row:
            raise HTTPException(404, f"{self.entity.capitalize()} not found.")
        return row

    def slug_free(self, db, slug, own=None):
        model = self.model
        if db.scalar(select(model.id).where(model.id != (own or 0), or_(model.slug == slug, model.live_slug == slug,
                                                                         model.redirects.contains([slug])))):
            raise HTTPException(409, f"This URL slug is already used by another {self.entity}.")

    def snapshot(self, db, row, kind, author):
        version = (db.scalar(select(func.max(self.revision.version)).where(self.owner == row.id)) or 0) + 1
        db.add(self.revision(**{self.foreign_key: row.id}, version=version, kind=kind, document=row.draft, author=author))
        db.flush()
        # Draft saves are pruned; published versions are always kept so any live version can be restored.
        stale = select(self.revision.id).where(self.owner == row.id, self.revision.kind != "publish") \
            .order_by(self.revision.version.desc()).offset(KEEP_REVISIONS)
        db.execute(delete(self.revision).where(self.revision.id.in_(stale)))

    def revisions(self, db, row):
        return [{"id": item.id, "version": item.version, "kind": item.kind, "author": item.author, "created": item.created}
                for item in db.scalars(select(self.revision).where(self.owner == row.id)
                                       .order_by(self.revision.version.desc()).limit(KEEP_REVISIONS))]

    def create(self, db, doc, user, sort_order=None):
        row = self.model(status="draft", sort_order=sort_order if sort_order is not None else
                         (db.scalar(select(func.max(self.model.sort_order))) or 0) + 1)
        doc = self.validated(doc)
        self.slug_free(db, doc["slug"])
        self.mirror(row, doc)
        db.add(row)
        db.flush()
        self.snapshot(db, row, "create", user.email)
        audit(db, user, "create", self.entity, doc["slug"])
        return row

    def save(self, db, row, body, user):
        doc = self.validated(body)
        self.slug_free(db, doc["slug"], row.id)
        self.mirror(row, doc)
        self.snapshot(db, row, "draft", user.email)
        audit(db, user, "save_draft", self.entity, doc["slug"])

    def publish(self, db, row, user):
        doc = self.validated(row.draft)
        self.slug_free(db, doc["slug"], row.id)
        redirects = [slug for slug in row.redirects if slug != doc["slug"]]
        if row.live_slug and row.live_slug != doc["slug"]:
            redirects.append(row.live_slug)
        row.published, row.live_slug, row.redirects, row.status = doc, doc["slug"], redirects, "published"
        row.published_at = datetime.now(timezone.utc)
        self.snapshot(db, row, "publish", user.email)
        audit(db, user, "publish", self.entity, doc["slug"])

    def unpublish(self, db, row, user):
        row.status = "draft"
        audit(db, user, "unpublish", self.entity, row.slug)

    def duplicate(self, db, source, user, rename):
        base, number = source.slug[:100], 2
        slug = f"{base}-copy"
        model = self.model
        while db.scalar(select(model.id).where(or_(model.slug == slug, model.live_slug == slug, model.redirects.contains([slug])))):
            slug, number = f"{base}-copy-{number}", number + 1
        row = self.create(db, {**rename(source.draft), "slug": slug, "featured": False}, user, source.sort_order + 1)
        audit(db, user, "duplicate", self.entity, slug, {"from": source.slug})
        return row

    def remove(self, db, row, user):
        audit(db, user, "delete", self.entity, row.slug)
        db.delete(row)

    def reorder(self, db, ids, user):
        rows = {row.id: row for row in db.scalars(select(self.model))}
        if sorted(ids) != sorted(rows):
            raise HTTPException(422, f"Send every {self.entity} exactly once.")
        for position, identifier in enumerate(ids):
            rows[identifier].sort_order = position
        audit(db, user, "reorder", self.entity)

    def revision_of(self, db, row, revision):
        item = db.scalar(select(self.revision).where(self.revision.id == revision, self.owner == row.id))
        if not item:
            raise HTTPException(404, "Version not found.")
        return item

    def restore(self, db, row, revision, user):
        item = self.revision_of(db, row, revision)
        doc = self.validated(item.document)
        self.slug_free(db, doc["slug"], row.id)
        # Restoring only replaces the draft; visitors see it after the next publish.
        self.mirror(row, doc)
        self.snapshot(db, row, "restore", user.email)
        audit(db, user, "restore", self.entity, row.slug, {"version": item.version})

class PageStore:
    """A single editable page (e.g. the services or projects overview) with a draft and a published copy."""
    def __init__(self, slug, schema, default):
        self.slug, self.schema, self.default = slug, schema, default

    def read(self, db, slug):
        from models import Content
        row = db.get(Content, ("pages", slug))
        return row.data if row else None

    def write(self, db, slug, data):
        from sqlalchemy.dialects.postgresql import insert
        from models import Content
        db.execute(insert(Content).values(kind="pages", slug=slug, data=data).on_conflict_do_update(
            index_elements=[Content.kind, Content.slug], set_={"data": data, "updated": func.now()}))

    def public(self, db):
        return self.read(db, self.slug) or self.default()

    def state(self, db):
        published, draft = self.read(db, self.slug), self.read(db, self.slug + "-draft")
        return {"draft": draft or published or self.default(), "published": published,
                "unpublished_changes": draft is not None and draft != published}

    def save(self, db, body, user):
        try:
            data = self.schema.model_validate(upgrade(body)).model_dump(mode="json")
        except ValidationError as error:
            raise HTTPException(422, error.errors(include_context=False, include_input=False)) from None
        self.write(db, self.slug + "-draft", data)
        audit(db, user, "save_draft", "pages", self.slug)

    def publish(self, db, user):
        data = self.schema.model_validate(upgrade(self.state(db)["draft"])).model_dump(mode="json")
        self.write(db, self.slug, data)
        audit(db, user, "publish", "pages", self.slug)
