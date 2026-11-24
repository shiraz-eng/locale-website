"""Apply the requested service copy and imagery through the normal CMS API."""
import copy,json,pathlib,httpx

ROOT=pathlib.Path(__file__).resolve().parents[1]
values={}
for line in (ROOT/'.env').read_text(encoding='utf-8').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key,value=line.split('=',1);values[key.strip()]=value.strip().strip('"').strip("'")
support=json.loads((ROOT/'tmp/service-reference-sections.json').read_text(encoding='utf-8'))
appearance={'background':'white','text':'default','accent':'sage','align':'left','spacing':'normal'}
images={
 'residential-architecture':('residential.webp','villa-detail.webp','Homes shaped around everyday life, natural light, and a strong connection to their setting.'),
 'interior-design':('interior.webp','interior-detail.webp','Thoughtful interiors that bring together circulation, comfort, lighting, and a coherent material palette.'),
 'commercial-architecture':('office.webp','office-detail.webp','Purposeful work and commercial environments planned around people, operations, and a clear identity.'),
 'renovation':('villa-garden.webp','interior-detail.webp','A considered approach to improving existing spaces while understanding what should be retained, adapted, or renewed.'),
 'visualization':('villa.webp','villa-detail.webp','Visual studies that help you understand scale, atmosphere, materials, and design choices before making decisions.'),
 'consultation':('office-lobby.webp','sketch.webp','A focused conversation to clarify your priorities, review the available information, and identify a practical next step.'),
 'urban-planning':('plan.webp','villa-garden.webp','A connected view of land use, movement, public space, and the communities that will use them.')}
backup=ROOT/'tmp/service-enrichment-backup';backup.mkdir(exist_ok=True)
with httpx.Client(base_url='http://127.0.0.1:8010',headers={'Origin':'http://localhost:3000'},timeout=60) as client:
    client.post('/api/admin/login',json={'email':values['ADMIN_EMAIL'],'password':values['ADMIN_PASSWORD']}).raise_for_status()
    rows=client.get('/api/admin/services').json()['items']
    for row in rows:
        if row['slug'] not in images:continue
        state=client.get('/api/admin/services/'+str(row['id'])).json()
        (backup/(row['slug']+'.json')).write_text(json.dumps(state))
        doc=state['draft'];hero,detail,summary=images[row['slug']]
        doc['card_image']='/portfolio/'+hero;doc['card_alt']=doc['name']+' — illustrative design image'
        for section in doc['sections']:
            if section['type']=='hero':
                section['image']=doc['card_image'];section['image_alt']=doc['card_alt'];section['subheading']=summary
            if section['type'] in ['overview','image_text']:
                section['image']='/portfolio/'+detail;section['image_alt']='Illustrative design study for '+doc['name']
            if section['type']=='features':
                for feature in section['items']:
                    if not feature.get('description'):
                        feature['description']='Explore '+feature['title'].lower()+' in relation to the brief, available space, everyday use, and the project’s priorities. The studio confirms the extent of this work in the agreed scope.'
        additions=[{
            'id':'service-preparation','type':'features','enabled':True,'appearance':appearance,'nav_label':'Your Brief',
            'heading':'Preparing for Your First Conversation','intro':'A clear starting point helps us understand your needs and recommend a suitable scope. Share what you have; the brief can develop together.','layout':'grid-3','items':[
                {'title':'Your Space & Location','description':'Share the site location, approximate area, existing drawings, and any known physical or planning constraints.','icon':'map-pin'},
                {'title':'How You Want to Use It','description':'Describe the people, activities, rooms, and day-to-day needs that the design should support.','icon':'users'},
                {'title':'Priorities & Investment','description':'Bring your preferred timeline, a working budget range, references you like, and the decisions that matter most to you.','icon':'file-text'}]},
            {'id':'service-delivery-notes','type':'rich_text','enabled':True,'appearance':appearance,'heading':'A Clear Scope Before Design Begins','body':'Each project starts with a discussion of objectives and the information available. The studio then confirms the services, review stages, responsibilities, and deliverables appropriate to your project.\n\nDepending on the agreed brief, outputs may include concept studies, spatial layouts, material direction, visual presentations, or coordinated drawings. Specialist input, approvals, procurement, and site involvement are discussed separately so that the scope is clear from the outset.','layout':'wide'}]
        for template in support:
            if template['id'] in ['locale-material-story','locale-materials','locale-faq']:
                additions.append(copy.deepcopy(template))
        existing={s['id'] for s in doc['sections']}
        insert=next((i for i,s in enumerate(doc['sections']) if s['type']=='cta'),len(doc['sections']))
        doc['sections'][insert:insert]=[s for s in additions if s['id'] not in existing and not(s['type']=='faq' and any(x['type']=='faq' for x in doc['sections']))]
        r=client.put('/api/admin/services/'+str(row['id']),json=doc);r.raise_for_status()
        if not state['unpublished_changes']:
            client.post('/api/admin/services/'+str(row['id'])+'/publish',json={}).raise_for_status()
            print(row['slug']+': saved and published')
        else:print(row['slug']+': saved in draft; previous unpublished changes retained')
    state=client.get('/api/admin/services-page').json()
    (backup/'overview.json').write_text(json.dumps(state))
    page=state['draft'];page['hero_image']='/portfolio/interior.webp';page['hero_alt']='Warm contemporary interior with considered natural materials'
    after=page.get('after_projects') or []
    for section in after:
        if section['id']=='locale-materials':section.update(copy.deepcopy(next(s for s in support if s['id']=='locale-materials')))
    if not any(s['id']=='locale-material-story' for s in after):
        index=next((i for i,s in enumerate(after) if s['id']=='locale-materials'),len(after))
        after.insert(index,copy.deepcopy(support[0]))
    page['after_projects']=after
    client.put('/api/admin/services-page',json=page).raise_for_status()
    if not state['unpublished_changes']:client.post('/api/admin/services-page/publish',json={}).raise_for_status()
    client.post('/api/admin/logout')
