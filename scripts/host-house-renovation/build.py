"""Reproducible full GLB renovation. Run: blender -b -t 2 --python .../build.py
Native house shell, openings, WindowView, stairs and dimensions are retained.
The supplied original remains available, byte for byte, for rollback/comparison.
"""
import bpy, sys, json, hashlib, math
from pathlib import Path
from collections import defaultdict
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
sys.path.insert(0,str(HERE))
from common import Context,source_bounds,source,xyz
SOURCE=ROOT/'public/models/daniel_helen_house.glb'
OUTPUT=ROOT/'public/models/daniel_helen_house_renovated.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
ctx=Context()
# Save the exact source shell bounds so export can be checked independently.
structural={name:source_bounds(o) for name,o in ctx.original.items() if o.type=='MESH' and
 (name.startswith(('Wall_','Lintel_','back_ext','left_ext','right_ext','front_ext','ground_','upper_','floor_','stair_','Stair_','Window_','window_')))}
structural_fixes=[]
# The dark panel by the desk was floor wood accidentally assigned to wall
# slabs. Preserve every vertex and the legitimate hall opening; retarget only.
for name,obj in ctx.original.items():
 if obj.type!='MESH':continue
 b=source_bounds(obj)
 if name.startswith(('upper_left_rooms','upper_right_rooms','Wall_bedroom_divider')):
  obj.data.materials.clear();obj.data.materials.append(ctx.material('plaster'));ctx.uv(obj,1.8)
  structural_fixes.append({'name':name,'change':'wall finish corrected from floor wood to plaster'})
 elif name.startswith(('Wall_','Lintel_','back_ext','left_ext','right_ext','ground_','upper_')):
  for slot in obj.material_slots:
   if not slot.material:continue
   n=slot.material.name.lower()
   if any(k in n for k in ['papel creme','beige','cream','azul','verde sálvia']):
    # Keep blue/green accent identity; cream obtains a subtle woven plaster.
    if 'azul' in n:
     slot.material=ctx.material('blue_wall');continue
    slot.material=ctx.material('sage' if 'verde' in n else 'plaster')
  ctx.uv(obj,1.8)
 # Photograph image planes were hidden inside the front wall. Move the image
 # surface only, leaving the already protruding frames in their exact place.
 if name.startswith('five_photos_image_') and b[1][0]<48.13:
  obj.location.x+=48.174-b[0][0]
  structural_fixes.append({'name':name,'change':'photo surface brought in front of wall'})
for name in ('ground_wood_floor','ground_stairs_floor','upper_hall_front','upper_left','upper_right'):
 obj=ctx.original.get(name)
 if obj:
  obj.data.materials.clear();obj.data.materials.append(ctx.material('floor'));ctx.uv(obj,2.0)
for name in ('ground_kitchen_tile','ground_utility_tile'):
 obj=ctx.original.get(name)
 if obj:
  obj.data.materials.clear();obj.data.materials.append(ctx.material('tile'));ctx.uv(obj,.8)
# Turn the texture contrast down on native floors without changing the floor
# geometry, wall boundaries or existing stair tread profile.
# (Furniture is supplied by the dedicated room modules.)
import bedrooms_living,kitchen_dining,architecture_service,electronics,finishing
for module in (bedrooms_living,kitchen_dining,architecture_service,electronics,finishing):
 before=len(ctx.objects);module.build(ctx)
 print('BUILT',module.__name__,len(ctx.objects)-before,flush=True)
bpy.context.view_layer.update()
# New meshes are static. Batch only within a room/floor AND same material so
# local lighting doesn't leak across floors and a one-room change stays local.
# Native meshes/wardrobe names are deliberately untouched by the batcher.
def room_for(obj):
 a,b=source_bounds(obj);x=(a[0]+b[0])/2;y=(a[1]+b[1])/2;z=(a[2]+b[2])/2
 if z<31:return 'garage'
 floor='upper' if y>3.6 else 'ground'
 if z<35.75:r='front_left' if x<53 else 'front_right'
 elif z>38.2:r='rear_left' if x<53 else 'rear_right'
 else:r='hall'
 return floor+'_'+r
batches=defaultdict(list)
for obj in ctx.objects:
 if obj.name in bpy.data.objects and obj.type=='MESH' and not ('mirror' in obj.name.lower() and 'frame' not in obj.name.lower()):
  key=(room_for(obj),tuple(m.name if m else '' for m in obj.data.materials))
  batches[key].append(obj)
batch_count=0
for (room,mats),objects in batches.items():
 if len(objects)<2:continue
 bpy.ops.object.select_all(action='DESELECT')
 for obj in objects:obj.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.object.join()
 obj=bpy.context.object;obj.name='REN_BATCH_'+room+'_'+('_'.join(mats))
 batch_count+=1
# Freeze only new static objects. Source animation tracks are decorative and
# were stopped in the existing runtime; do not export dead camera/action data.
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.objects:
 if obj.type=='MESH':
  if any(not all(math.isfinite(v) for v in vertex.co) for vertex in obj.data.vertices):raise ValueError('Non-finite vertex in '+obj.name)
bpy.context.view_layer.update()
for name,before in structural.items():
 if name in bpy.data.objects:
  after=source_bounds(bpy.data.objects[name]);delta=max(abs(after[i][j]-before[i][j]) for i in range(2) for j in range(3))
  assert delta<.00002,(name,delta)
# Export embeds textures and includes the native punctual lights, keeping a
# single lazy-loaded house asset rather than hundreds of runtime assets.
bpy.ops.export_scene.gltf(filepath=str(OUTPUT),export_format='GLB',export_animations=False,
 export_lights=True,export_cameras=False,export_extras=True,export_yup=True,
 export_apply=True,export_materials='EXPORT',export_image_format='AUTO')
meshes=[o for o in bpy.data.objects if o.type=='MESH']
report={
 'source':str(SOURCE.relative_to(ROOT)),'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
 'output':str(OUTPUT.relative_to(ROOT)),'bytes':OUTPUT.stat().st_size,
 'outputSha256':hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
 'nativeArchitectureChecked':len(structural),'nativeArchitectureBoundsPreserved':True,
 'structuralFinishFixes':structural_fixes,
 'runtimeImageCorrections':['Actual cabinet/basin clearance','Upper bathroom mirror in front of tile','Even stair riser offset','Portraits clear of glass','Guest bookshelf access','CRT proportions'],'removedFurnitureMeshes':sorted(set(ctx.removed)),
 'newObjectsBeforeBatching':len(ctx.objects),'roomMaterialBatches':batch_count,
 'meshObjects':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),
 'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),
 'additionalColliders':ctx.colliders,
 'knownLimits':['Existing isolated interior / exterior floorplan mismatch preserved; entrance still uses original short fade.',
 'Existing static garage has no internal doorway; no invented access or external architecture change.'],
}
(ROOT/'public/models/daniel_helen_house_renovation.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
collider_rows=[[c['min'][0],c['max'][0],c['min'][1],c['max'][1],c['min'][2],c['max'][2],c['name']] for c in ctx.colliders]
(ROOT/'src/game/hostHouseRenovationLayout.ts').write_text('/** Measured source-space furniture bounds emitted by the renovated GLB builder. */\nexport const HOST_HOUSE_RENOVATED_FURNITURE = '+json.dumps(collider_rows,indent=2)+' as const;\n')
print('RENOVATION_REPORT',json.dumps({k:report[k] for k in ['bytes','meshObjects','vertices','triangles','newObjectsBeforeBatching','roomMaterialBatches']}),flush=True)
