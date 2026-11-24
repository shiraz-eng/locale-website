import copy
import unittest
from pydantic import ValidationError
from detail_layout import standard_detail
from project_templates import blank as project_blank
from service_templates import document, INITIAL
from service_schema import ProjectDocument, ServiceDocument

class DetailLayoutTests(unittest.TestCase):
    def project(self):
        return project_blank("An office project","office-project",1,"commercial")

    def test_projects_receive_all_reference_tabs(self):
        result=standard_detail(self.project(),"project")
        ProjectDocument.model_validate(result)
        self.assertEqual([s.get("nav_label") for s in result["sections"] if s.get("nav_label")],
                         ["Overview","Gallery","Drawings","Materials","Video","Process"])
        self.assertEqual(result["sections"][1]["type"],"specs")

    def test_services_receive_the_residential_structure(self):
        result=standard_detail(document(INITIAL[1]),"service")
        ServiceDocument.model_validate(result)
        core=[s["type"] for s in result["sections"] if s["type"] in {"hero","features","process","related_projects","cta"}]
        self.assertEqual(core,["hero","features","process","related_projects","features","cta"])
        self.assertEqual(result["name"],"Commercial Architecture")

    def test_adaptation_preserves_authored_content_and_source(self):
        source=self.project()
        source["location"]="Original location"
        concept=next(s for s in source["sections"] if s["type"]=="image_text")
        concept.update(body="Authored concept text",enabled=True)
        before=copy.deepcopy(source)
        result=standard_detail(source,"project")
        self.assertEqual(source,before)
        self.assertEqual(result["location"],"Original location")
        self.assertIn(concept,result["sections"])

    def test_project_order_is_consistent_even_for_versioned_documents(self):
        original=standard_detail(self.project(),"project")
        result=copy.deepcopy(original)
        result["layout_version"]=1
        result["sections"]=list(reversed(result["sections"]))
        hidden_id=result["sections"][0]["id"]
        result["sections"][0]["enabled"]=False
        adapted=standard_detail(result,"project")
        self.assertEqual([s.get("nav_label") for s in adapted["sections"] if s.get("nav_label")],
                         ["Overview","Gallery","Drawings","Materials","Video","Process"])
        self.assertFalse(next(s for s in adapted["sections"] if s["id"]==hidden_id)["enabled"])
        self.assertEqual(standard_detail(adapted,"project"),adapted)

    def test_saved_project_layout_choices_survive_validation_and_read_adaptation(self):
        result=standard_detail(self.project(),"project")
        self.assertEqual(result["layout_version"],2)
        gallery=next(s for s in result["sections"] if s.get("nav_label")=="Gallery")
        gallery.update(layout="featured",nav_label="Photos",enabled=False)
        hero=next(s for s in result["sections"] if s["type"]=="hero")
        hero.update(layout="split",appearance={**hero["appearance"],"align":"center"})
        result["sections"]=list(reversed(result["sections"]))
        self.assertEqual(standard_detail(result,"project"),result)

    def test_missing_project_assets_do_not_copy_lakeside_facts(self):
        result=standard_detail(self.project(),"project")
        materials=next(s for s in result["sections"] if s["type"]=="materials")
        drawings=next(s for s in result["sections"] if s.get("nav_label")=="Drawings")
        workflow=next(s for s in result["sections"] if s["type"]=="project_process")
        self.assertEqual(materials["items"],[])
        self.assertEqual(drawings["images"],[])
        self.assertEqual(workflow["team"],[])
        self.assertTrue(all(not item["duration"] for item in workflow["items"]))

    def test_existing_semantic_ids_do_not_collide_with_new_sections(self):
        source=self.project()
        source["layout_version"]=1
        source["sections"]=[s for s in source["sections"] if s["type"]!="materials"]
        source["sections"].append({"id":"materials","type":"rich_text","heading":"Original notes","body":"Retain these notes.","layout":"wide"})
        result=standard_detail(source,"project")
        ProjectDocument.model_validate(result)
        ids=[s["id"] for s in result["sections"]]
        self.assertEqual(len(ids),len(set(ids)))
        self.assertIn("materials-2",ids)

    def test_legacy_blank_request_receives_shared_project_layout(self):
        source=project_blank("Blank page","blank-page",1,"commercial","blank")
        self.assertEqual(standard_detail(source,"project"),source)
        self.assertEqual([s.get("nav_label") for s in source["sections"] if s.get("nav_label")],
                         ["Overview","Gallery","Drawings","Materials","Video","Process"])

    def test_legacy_material_notes_do_not_create_duplicate_tabs(self):
        source=self.project()
        notes={"id":"material-notes","type":"rich_text","nav_label":"Materials","heading":"Material notes","body":"Original approved material description.","layout":"wide"}
        source["layout_version"]=1
        source["sections"]=[s for s in source["sections"] if s["type"]!="materials"]
        source["sections"].append(notes)
        result=standard_detail(source,"project")
        ProjectDocument.model_validate(result)
        self.assertEqual(sum(s.get("nav_label")=="Materials" for s in result["sections"]),1)
        self.assertIn(notes,result["sections"])

    def test_process_videos_move_to_a_separate_video_section(self):
        source=self.project()
        source["layout_version"]=1
        source["sections"]=[s for s in source["sections"] if s["type"]!="project_videos"]
        process=next(s for s in source["sections"] if s["type"]=="project_process")
        process["videos"]=[{"image":"/portfolio/villa.webp","alt":"Studio film","video":"https://www.youtube.com/watch?v=abcdefghijk"}]
        result=standard_detail(source,"project")
        ProjectDocument.model_validate(result)
        video=next(s for s in result["sections"] if s["type"]=="project_videos")
        self.assertEqual(video["videos"],process["videos"])
        self.assertFalse(video["inspiration"])
        self.assertEqual(next(s for s in result["sections"] if s["type"]=="project_process")["videos"],[])
        self.assertEqual(len([s for s in result["sections"] if s.get("nav_label")=="Video"]),1)

    def test_video_playlist_uses_the_existing_embed_allowlist(self):
        result=standard_detail(self.project(),"project")
        workflow=next(s for s in result["sections"] if s["type"]=="project_process")
        video=next(s for s in result["sections"] if s["type"]=="project_videos")
        video["videos"]=[{"image":"/portfolio/villa.webp","alt":"Project tour","caption":"Tour","video":"javascript:alert(1)"}]
        with self.assertRaises(ValidationError):
            ProjectDocument.model_validate(result)
        video["videos"][0]["video"]="https://www.youtube.com/watch?v=abcdefghijk"
        ProjectDocument.model_validate(result)

if __name__=="__main__":unittest.main()
