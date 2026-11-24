import copy
import os
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

for line in Path(".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        key,value=line.split("=",1)
        os.environ[key]=value.strip().strip('"').strip("'")
import sys
sys.path.insert(0,"backend")
from starlette.testclient import TestClient
from sqlalchemy import func,select
from sqlalchemy.orm import Session
from db import engine,database
from security import staff
from models import Inquiry, ProjectCategory
import main
from forms import version

connection=engine.connect()
transaction=connection.begin()
session=Session(bind=connection,join_transaction_mode="create_savepoint")
owner=SimpleNamespace(email=os.environ["ADMIN_EMAIL"],role="owner",name="CMS verification")
main.app.dependency_overrides[database]=lambda:session
main.app.dependency_overrides[staff]=lambda:owner
client=TestClient(main.app)
headers={"Origin":os.getenv("PUBLIC_ORIGIN","http://localhost:3000")}
initial_count=session.scalar(select(func.count()).select_from(Inquiry))
try:
    initial=client.get("/api/admin/forms/contact").json()
    published=client.get("/api/forms/contact").json()
    draft=copy.deepcopy(initial["draft"])
    draft["fields"].append({"key":"test_preference","label":"Test preference","type":"select",
        "placeholder":"","required":False,"visible":True,"options":["Garden","Terrace"],
        "min_length":0,"max_length":160,"width":"half"})
    response=client.put("/api/admin/forms/contact",headers=headers,json=draft)
    assert response.status_code==200,response.text
    assert client.get("/api/forms/contact").json()==published,"Draft leaked publicly"
    response=client.post("/api/admin/forms/contact/publish",headers=headers)
    assert response.status_code==200,response.text
    form=client.get("/api/forms/contact").json()
    assert form["version"]!=published["version"]
    identifier=str(uuid4())
    payload={"name":"CMS integration verification","email":"cms-check@example.com",
        "description":"A temporary integration check.","consent":True,"form_id":"contact","form_version":form["version"],
        "submission_id":identifier,"answers":{"name":"CMS integration verification","email":"cms-check@example.com",
        "description":"A temporary integration check.","test_preference":"Garden"}}
    with patch.object(main,"limit"):
        for _ in range(2):
            response=client.post("/api/inquiries",headers=headers,json=payload)
            assert response.status_code==201,response.text
    assert session.scalar(select(func.count()).select_from(Inquiry))==initial_count+1,"Duplicate created"
    row=session.scalar(select(Inquiry).where(Inquiry.data["submission_id"].as_string()==identifier))
    detail=client.get(f"/api/admin/messages/{row.id}").json()
    assert detail["data"]["answers"]["test_preference"]=="Garden"
    assert detail["data"]["form_definition"]["fields"][-1]["label"]=="Test preference"
    response=client.patch(f"/api/admin/messages/{row.id}",headers=headers,json={"status":"In Progress"})
    assert response.status_code==200,response.text
    response=client.post(f"/api/admin/messages/{row.id}/notes",headers=headers,json={"text":"Internal verification note"})
    assert response.status_code==200 and response.json()["notes"][0]["text"]=="Internal verification note"
    response=client.get("/api/admin/messages/export",params={"q":identifier})
    assert response.status_code==200 and "text/csv" in response.headers["content-type"]
    response=client.delete(f"/api/admin/messages/{row.id}",headers=headers)
    assert response.status_code==200,response.text
    assert client.get(f"/api/admin/messages/{row.id}").status_code==404
    page_before=client.get("/api/pages/team").json()
    page_draft=client.get("/api/admin/page-content/team").json()["draft"]
    page_draft["team_content"]={
        **{key:"Verification heading" for key in ["directory_heading","directory_intro","leadership_heading","leadership_intro","culture_heading","cta_heading","cta_text","careers_heading","careers_text"]},
        "culture":[{"title":"Collaboration","description":"A shared design process.","icon":"users"}],
        "team_image":"/portfolio/team/studio-team.png","team_image_alt":"Studio culture illustration","team_image_caption":"Illustrative team photo",
    }
    response=client.put("/api/admin/page-content/team",headers=headers,json=page_draft)
    assert response.status_code==200,response.text
    assert client.get("/api/pages/team").json()==page_before
    assert client.post("/api/admin/page-content/team/publish",headers=headers).status_code==200
    assert client.get("/api/pages/team").json()["team_content"]["team_image"]=="/portfolio/team/studio-team.png"
    unsafe=copy.deepcopy(page_draft)
    unsafe["team_content"]["team_image"]="javascript:alert(1)"
    assert client.put("/api/admin/page-content/team",headers=headers,json=unsafe).status_code==422
    service_slug="verify-service-"+uuid4().hex[:10]
    created_service=client.post("/api/admin/services",headers=headers,json={"name":"Verification Service","slug":service_slug}).json()
    service_doc=created_service["draft"]
    assert service_doc["layout_version"]==1
    assert {"features","process","related_projects","cta"}.issubset({s["type"] for s in service_doc["sections"]})
    assert client.get("/api/services/"+service_slug).status_code==404
    assert client.post(f"/api/admin/services/{created_service['id']}/publish",headers=headers).status_code==200
    assert client.get("/api/services/"+service_slug).json()["layout_version"]==1
    category=session.scalar(select(ProjectCategory).limit(1))
    project_slug="verify-project-"+uuid4().hex[:10]
    created_project=client.post("/api/admin/projects",headers=headers,json={"title":"Verification Project","slug":project_slug,"category_id":category.id}).json()
    project_doc=created_project["draft"]
    assert [s["nav_label"] for s in project_doc["sections"] if s.get("nav_label")]==["Overview","Gallery","Drawings","Materials","Process"]
    assert client.post(f"/api/admin/projects/{created_project['id']}/publish",headers=headers).status_code==200
    before_live=client.get("/api/projects/"+project_slug).json()
    next(s for s in project_doc["sections"] if s.get("nav_label")=="Drawings")["enabled"]=False
    project_doc["sections"]=list(reversed(project_doc["sections"]))
    saved=client.put(f"/api/admin/projects/{created_project['id']}",headers=headers,json=project_doc)
    assert saved.status_code==200,saved.text
    assert saved.json()["draft"]["sections"]==project_doc["sections"]
    assert client.get("/api/projects/"+project_slug).json()==before_live
    main.app.dependency_overrides[staff]=lambda:SimpleNamespace(email=owner.email,role="editor")
    assert client.get("/api/admin/messages").status_code==403
    assert client.get("/api/admin/forms/contact").status_code==200
    print("Verified draft isolation, publication, custom answers, retry deduplication, status, notes, export, deletion, role checks, Team page image/content publication, and default service/project draft-publish layouts.")
finally:
    main.app.dependency_overrides.clear()
    session.close()
    transaction.rollback()
    connection.close()
print("Verification transaction rolled back.")
