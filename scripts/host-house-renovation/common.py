"""Source-GLTF Y-up helpers for the original house renovation, metres.
All new geometry is original. Blender maps source (x,y,z) to (x,-z,y).
"""
import bpy, bmesh, math, json, random
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
TEXTURES=ROOT/'public/textures/host-house-renovation'
def xyz(p):return (p[0],-p[2],p[1])
def source(p):return (p[0],p[2],-p[1])
def source_bounds(obj):
 ps=[source(obj.matrix_world@Vector(c)) for c in obj.bound_box]
 return tuple(min(p[i] for p in ps) for i in range(3)),tuple(max(p[i] for p in ps) for i in range(3))
class Context:
 def __init__(self):
  self.original={obj.name:obj for obj in bpy.data.objects}
  self.original_objects=list(self.original.values())
  self.objects=[];self.removed=[];self.colliders=[];self.materials={}
  self.audit=json.loads(Path('/tmp/host-house-renovation-audit.json').read_text()) if Path('/tmp/host-house-renovation-audit.json').exists() else {}
  for path in sorted(TEXTURES.glob('*.png')):
   name=path.stem;m=bpy.data.materials.new('HH_'+name);m.use_nodes=True
   bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.82
   bs.inputs['Specular IOR Level'].default_value=.2
   tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(path));tex.interpolation='Closest'
   m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
   if name in ['brass','chrome','metal']:bs.inputs['Metallic'].default_value=.65;bs.inputs['Roughness'].default_value=.34
   if name=='glass':bs.inputs['Metallic'].default_value=.12;bs.inputs['Roughness'].default_value=.2
   if name=='bulb':bs.inputs['Emission Color'].default_value=(1,.74,.4,1);bs.inputs['Emission Strength'].default_value=.3
   self.materials[name]=m
 def material(self,key):return self.materials[key] if isinstance(key,str) else key
 def _finish(self,obj,name,mat,bevel=0,uv=True):
  obj.name=name if name.startswith('REN_') else 'REN_'+name
  if mat:obj.data.materials.append(self.material(mat))
  if bevel and obj.type=='MESH':
   b=obj.modifiers.new('Soft worn edges','BEVEL');b.width=bevel;b.segments=2;b.affect='EDGES'
   bpy.context.view_layer.objects.active=obj
   try:bpy.ops.object.modifier_apply(modifier=b.name)
   except RuntimeError:pass
   for p in obj.data.polygons:p.use_smooth=False
   n=obj.modifiers.new('Weighted cabinet normals','WEIGHTED_NORMAL');n.keep_sharp=True
   try:bpy.ops.object.modifier_apply(modifier=n.name)
   except RuntimeError:pass
  if uv and obj.type=='MESH':self.uv(obj)
  self.objects.append(obj);return obj
 def uv(self,obj,scale=1):
  uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='Domestic metres')
  for face in obj.data.polygons:
   matrix=obj.matrix_world if obj.parent else obj.matrix_basis
   n=matrix.to_3x3()@face.normal;axis=max(range(3),key=lambda a:abs(n[a]))
   for li in face.loop_indices:
    co=matrix@obj.data.vertices[obj.data.loops[li].vertex_index].co
    # Metre-aligned texture projection on the dominant local face.
    u,v=(co.y,co.z) if axis==0 else (co.x,co.z) if axis==1 else (co.x,co.y)
    uv.data[li].uv=(u/scale,v/scale)
 def _mesh_object(self,name,mesh,center=(0,0,0)):
  obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.location=xyz(center);return obj
 def box(self,name,center,size,mat,bevel=.012,yaw=0):
  bm=bmesh.new();bmesh.ops.create_cube(bm,size=1)
  for v in bm.verts:v.co.x*=size[0];v.co.y*=size[2];v.co.z*=size[1]
  if bevel:
   bmesh.ops.bevel(bm,geom=list(bm.edges),offset=min(bevel,min(size)*.23),segments=2,affect='EDGES',profile=.5)
  bm.normal_update();mesh=bpy.data.meshes.new(name);bm.to_mesh(mesh);bm.free();mesh.update()
  obj=self._mesh_object(name,mesh,center);obj.rotation_euler.z=math.radians(yaw)
  return self._finish(obj,name,mat)
 def cylinder(self,name,center,radius,depth,mat,vertices=12,axis='y',radius_top=None):
  bm=bmesh.new();bmesh.ops.create_cone(bm,cap_ends=True,cap_tris=False,segments=vertices,radius1=radius,radius2=radius if radius_top is None else radius_top,depth=depth,calc_uvs=True)
  mesh=bpy.data.meshes.new(name);bm.to_mesh(mesh);bm.free();mesh.update();obj=self._mesh_object(name,mesh,center)
  if axis=='x':obj.rotation_euler.y=math.pi/2
  if axis=='z':obj.rotation_euler.x=math.pi/2
  for p in mesh.polygons:p.use_smooth=len(p.vertices)==4
  return self._finish(obj,name,mat,uv=False)
 def sphere(self,name,center,size,mat,segments=12,rings=8):
  bm=bmesh.new();bmesh.ops.create_uvsphere(bm,u_segments=segments,v_segments=rings,radius=.5,calc_uvs=True)
  for v in bm.verts:v.co.x*=size[0];v.co.y*=size[2];v.co.z*=size[1]
  mesh=bpy.data.meshes.new(name);bm.to_mesh(mesh);bm.free();mesh.update();obj=self._mesh_object(name,mesh,center)
  for p in mesh.polygons:p.use_smooth=True
  return self._finish(obj,name,mat,uv=False)
 def tube(self,name,points,radius,mat,sides=8):
  ps=[Vector(xyz(p)) for p in points];verts=[];faces=[]
  for i,p in enumerate(ps):
   tangent=(ps[min(i+1,len(ps)-1)]-ps[max(0,i-1)]).normalized()
   if tangent.length<.001:tangent=Vector((0,0,1))
   axis=Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((1,0,0))
   u=tangent.cross(axis).normalized();v=tangent.cross(u).normalized()
   for k in range(sides):
    a=k*2*math.pi/sides;verts.append(p+radius*(u*math.cos(a)+v*math.sin(a)))
  for i in range(len(ps)-1):
   for k in range(sides):
    a=i*sides+k;b=i*sides+(k+1)%sides;faces.append((a,b,b+sides,a+sides))
  faces.extend([tuple(reversed(range(sides))),tuple((len(ps)-1)*sides+k for k in range(sides))])
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();obj=self._mesh_object(name,mesh)
  for p in mesh.polygons:p.use_smooth=len(p.vertices)==4
  return self._finish(obj,name,mat)
 def plane(self,name,center,size,mat,normal='z',yaw=0):
  w,h=size
  if normal=='y':coords=[(-w/2,0,-h/2),(w/2,0,-h/2),(w/2,0,h/2),(-w/2,0,h/2)]
  elif normal=='x':coords=[(0,-h/2,-w/2),(0,-h/2,w/2),(0,h/2,w/2),(0,h/2,-w/2)]
  else:coords=[(-w/2,-h/2,0),(w/2,-h/2,0),(w/2,h/2,0),(-w/2,h/2,0)]
  mesh=bpy.data.meshes.new(name);mesh.from_pydata([xyz(p) for p in coords],[],[(0,3,2,1) if normal=='y' else (0,1,2,3)]);mesh.update()
  uv=mesh.uv_layers.new(name='Artwork');
  for li,co in zip(mesh.polygons[0].loop_indices,[(0,0),(1,0),(1,1),(0,1)]):uv.data[li].uv=co
  o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=xyz(center);o.rotation_euler.z=math.radians(yaw)
  # Two faces make actual cloth/art visible from either side without transparent order artefacts.
  o=self._finish(o,name,mat,uv=False)
  return o
 def cloth(self,name,center,size,mat,cols=24,rows=18,amplitude=.014,edge_drop=.05,yaw=0):
  w,d=size;verts=[];faces=[]
  for j in range(rows+1):
   v=j/rows
   for i in range(cols+1):
    u=i/cols;x=(u-.5)*w;z=(v-.5)*d
    folds=amplitude*(math.sin(u*24+v*7)+.45*math.sin(v*28+u*3))
    sag=-edge_drop*(max(0,abs(u-.5)-.40)*10)**1.8
    y=folds+sag
    verts.append(xyz((x,y,z)))
  for j in range(rows):
   for i in range(cols):a=j*(cols+1)+i;faces.append((a,a+cols+1,a+cols+2,a+1))
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();uv=mesh.uv_layers.new(name='Woven cloth')
  for face in mesh.polygons:
   face.use_smooth=True
   for li in face.loop_indices:
    vi=mesh.loops[li].vertex_index;uv.data[li].uv=(vi%(cols+1)/cols*w*1.5,vi//(cols+1)/rows*d*1.5)
  obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.location=xyz(center);obj.rotation_euler.z=math.radians(yaw)
  return self._finish(obj,name,mat,uv=False)
 def remove(self,*prefixes):
  found=[]
  for name,obj in list(self.original.items()):
   if any(name==prefix or name.startswith(prefix) for prefix in prefixes):
    if name in bpy.data.objects:
     found.append(name);bpy.data.objects.remove(obj,do_unlink=True)
  self.removed.extend(found);return found
 def bounds(self,prefix):
  objs=[o for name,o in self.original.items() if (name==prefix or name.startswith(prefix)) and name in bpy.data.objects and o.type=='MESH']
  if not objs:raise KeyError('No source mesh bounds: '+prefix)
  b=[source_bounds(o) for o in objs]
  return tuple(min(v[0][i] for v in b) for i in range(3)),tuple(max(v[1][i] for v in b) for i in range(3))
 def collider(self,name,minXYZ,maxXYZ):
  self.colliders.append({'name':name,'min':list(minXYZ),'max':list(maxXYZ)})
