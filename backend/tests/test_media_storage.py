import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch,Mock
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from models import Content
import media_storage

class MediaStorageTests(unittest.TestCase):
    def test_local_image_does_not_need_a_database_connection(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);name="b"*40+".jpg";(root/name).write_bytes(b"local-image")
            db=Mock()
            with patch.dict(media_storage.os.environ,{"VERCEL":""}),patch.object(media_storage,"media",root):
                result=media_storage.response(db,name)
            self.assertEqual(Path(result.path),root/name)
            db.get.assert_not_called()

    def test_upload_survives_a_new_database_session_and_can_be_deleted(self):
        engine=create_engine("sqlite://")
        Content.__table__.create(engine)
        name="a"*40+".png"
        with Session(engine) as db:
            media_storage.put(db,name,b"verified-image","image/png")
            db.commit()
        with Session(engine) as db:
            result=media_storage.response(db,name)
            self.assertEqual(result.body,b"verified-image")
            self.assertEqual(result.media_type,"image/png")
            media_storage.remove(db,name)
            db.commit()
        with Session(engine) as db:
            with self.assertRaises(HTTPException):media_storage.response(db,name)
        engine.dispose()

    def test_rejects_path_traversal_before_reading_database_or_disk(self):
        with self.assertRaises(HTTPException) as error:
            media_storage.response(None,"../.env")
        self.assertEqual(error.exception.status_code,404)
