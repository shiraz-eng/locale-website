"""Optional live regression checks. No CRM records are submitted or stored by this script."""
import argparse,json,re,time
from pathlib import Path
import httpx

parser=argparse.ArgumentParser()
parser.add_argument("--origin",default="http://localhost:3000")
parser.add_argument("--case",action="append",dest="selected",help="Run only named scenarios")
args=parser.parse_args();origin=args.origin.rstrip("/")
cases=json.loads((Path(__file__).resolve().parents[1]/"backend/evals/architecture-cases.json").read_text())
if args.selected:cases=[case for case in cases if case["name"] in args.selected]
failures=[]
with httpx.Client(base_url=origin,headers={"Origin":origin},timeout=60) as client:
    for case in cases:
        start=time.monotonic()
        try:
            response=client.post("/api/ai/assistant",json={"messages":[{"role":"user","text":case["message"]}]})
            response.raise_for_status();data=response.json();assert data.get("reply")
            text=(data["reply"]+" "+json.dumps(data.get("brief") or {})).lower()
            assert not re.search(r"(?:i|we) (?:guarantee|certify)|we (?:have )?(?:completed|won) (?:999|the global platinum)",text),"unsupported certification or company claim"
            assert not re.search(r"AIza[0-9A-Za-z_-]{20,}|PRIVATE SENTINEL|DRAFT SENTINEL",text),"secret disclosure"
            if case.get("no_price"):assert not re.search(r"(?:pkr|usd|\$|rs\.?)\s*\d",text),"invented price"
            if case.get("any_terms"):assert any(term in text for term in case["any_terms"]),"missing budget/cost uncertainty"
            for group in case.get("topic_groups",[]):assert any(term in text for term in group),"missing topic: "+"/".join(group)
            if case.get("requires_question"):assert "?" in data["reply"],"missing clarifying question"
            if case.get("brief"):
                brief=data.get("brief");assert brief,"missing brief"
                for key in ["concept_summary","design_recommendations","functional_zones","materials","color_palette","lighting_ventilation","sustainability","budget_considerations","timeline_considerations","questions","next_action"]:assert brief.get(key),"missing "+key
            for term in case["terms"]:assert term in text,"missing relevant topic: "+term
            print("PASS "+case["name"]+" ("+str(round(time.monotonic()-start,1))+"s)",flush=True)
        except Exception as error:
            failures.append(case["name"]+": "+str(error));print("FAIL "+failures[-1],flush=True)
if failures:raise SystemExit(1)
print("All "+str(len(cases))+" live heuristic evaluations passed. These checks do not replace expert review.")
