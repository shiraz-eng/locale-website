import copy
import unittest
from fastapi import HTTPException
from pydantic import ValidationError, TypeAdapter
from forms import ContactDefinition, default, validate_answers, version
from schemas import Href
from inquiries import LEGACY

class FormDefinitionTests(unittest.TestCase):
    def test_default_schema_and_valid_submission(self):
        doc=default()
        values=validate_answers(doc,{"name":"Example visitor","email":"visitor@example.com","description":"A small house with a garden."})
        self.assertEqual(values["name"],"Example visitor")
        self.assertEqual(values["requirements"],[])

    def test_required_custom_fields_are_enforced(self):
        doc=default()
        doc["fields"].append({"key":"plot_size","label":"Plot size","type":"text","placeholder":"",
            "required":True,"visible":True,"options":[],"min_length":1,"max_length":160,"width":"half"})
        ContactDefinition.model_validate(doc)
        with self.assertRaises(HTTPException):
            validate_answers(doc,{"name":"Visitor","email":"visitor@example.com","description":"A home on a sloping site."})

    def test_published_dropdown_options_are_enforced(self):
        with self.assertRaises(HTTPException):
            validate_answers(default(),{"name":"Visitor","email":"visitor@example.com","description":"A garden-facing home.","project_type":"Invented option"})

    def test_hidden_fields_cannot_be_submitted(self):
        doc=default()
        next(field for field in doc["fields"] if field["key"]=="location")["visible"]=False
        with self.assertRaises(HTTPException):
            validate_answers(doc,{"name":"Visitor","email":"visitor@example.com","description":"A garden-facing home.","location":"Unexpected"})

    def test_core_fields_cannot_be_removed(self):
        doc=default()
        doc["fields"]=[field for field in doc["fields"] if field["key"]!="email"]
        with self.assertRaises(ValidationError):
            ContactDefinition.model_validate(doc)

    def test_form_revision_changes_with_option_order(self):
        doc=default()
        original=version(doc)
        doc["fields"][4]["options"].reverse()
        self.assertNotEqual(original,version(doc))

    def test_old_snapshot_keeps_its_labels(self):
        doc=default()
        snapshot=copy.deepcopy(doc)
        doc["fields"][0]["label"]="Your full name"
        self.assertEqual(snapshot["fields"][0]["label"],"Name")

    def test_navigation_rejects_protocol_relative_links(self):
        with self.assertRaises(ValidationError):
            TypeAdapter(Href).validate_python("//untrusted.example")
        self.assertEqual(TypeAdapter(Href).validate_python("/"),"/")

    def test_legacy_inquiries_have_basic_status_mapping(self):
        self.assertEqual(LEGACY["Contract Won"],"Completed")
        self.assertEqual(LEGACY["New Inquiry"],"New")
