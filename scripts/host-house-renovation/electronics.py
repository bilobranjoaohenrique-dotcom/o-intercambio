"""Small period-correct CRT pass; no floor footprint or gameplay changes."""
import math
import bpy


def build(ctx):
    box,cyl=ctx.box,ctx.cylinder
    glass=ctx.material('screen').copy()
    glass.name='HH_CRT_curved_glass'
    bs=glass.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Roughness'].default_value=.22
    bs.inputs['Specular IOR Level'].default_value=.48
    bs.inputs['Metallic'].default_value=.08

    def screen(name,center,width,height,normal='z',curve=.018):
        # Gently convex, genuinely modelled 4:3 CRT glass; UVs cover one image.
        cols,rows=14,10;verts=[];faces=[]
        cx,cy,cz=center
        for j in range(rows+1):
            v=j/rows
            for i in range(cols+1):
                u=i/cols
                bulge=curve*(1-(2*u-1)**2)*(1-(2*v-1)**2)
                if normal=='z':p=(cx+(u-.5)*width,cy+(v-.5)*height,cz-bulge)
                else:p=(cx-bulge,cy+(v-.5)*height,cz+(u-.5)*width)
                verts.append((p[0],-p[2],p[1]))
        for j in range(rows):
            for i in range(cols):
                a=j*(cols+1)+i
                faces.append((a,a+cols+1,a+cols+2,a+1) if normal=='z' else (a,a+1,a+cols+2,a+cols+1))
        data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
        uv=data.uv_layers.new(name='CRT glass')
        for poly in data.polygons:
            poly.use_smooth=True
            for li in poly.loop_indices:
                vi=data.loops[li].vertex_index
                uv.data[li].uv=(vi%(cols+1)/cols,vi//(cols+1)/rows)
        obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
        return ctx._finish(obj,name,glass,uv=False)

    # Living-room TV: the supplied cabinet and its surface height remain.
    # Source front faces -Z; controls are moulded rather than printed onto a box.
    ctx.remove('furn_sala_tv_tv')
    x,z,base=50.31,42.57,.955
    box('CRT_TV_base',(x,base+.018,z),(.57,.036,.36),'black',bevel=.018)
    box('CRT_TV_rear_case',(x,1.21,42.63),(.55,.40,.40),'black',bevel=.060)
    box('CRT_TV_rear_bulge',(x,1.21,42.77),(.39,.30,.14),'black',bevel=.049)
    box('CRT_TV_bezel',(x,1.235,42.369),(.65,.49,.105),'black',bevel=.036)
    # The raised lip surrounds a separate convex dark screen.
    box('CRT_TV_screen_recess',(x-.035,1.255,42.309),(.49,.365,.024),'rubber',bevel=.026)
    screen('CRT_TV_glass',(x-.035,1.255,42.294),.445,.326,'z',.022)
    for y in [1.155,1.217]:
        cyl('CRT_TV_tuning_knob',(x+.264,y,42.296),.020,.024,'metal',vertices=12,axis='z')
        box('CRT_TV_knob_mark',(x+.264,y+.011,42.282),(.003,.014,.003),'cream',bevel=.001)
    for j in range(6):
        box('CRT_TV_speaker',(x+.258,1.298+j*.014,42.310),(.060,.004,.005),'rubber',bevel=.001)
    box('CRT_TV_brand',(x-.047,1.044,42.309),(.093,.009,.006),'metal',bevel=.001)
    cyl('CRT_TV_power',(x-.256,1.052,42.301),.011,.017,'black',vertices=10,axis='z')
    ctx.sphere('CRT_TV_standby',(x-.232,1.052,42.291),(.007,.007,.007),'book_red',segments=8,rings=6)
    for side in [-1,1]:
        for j in range(6):
            box('CRT_TV_side_vent',(x+side*.278,1.18+j*.025,42.65),(.005,.009,.14),'rubber',bevel=.001)
    # Thin telescopic antennas retain the familiar early-2000s silhouette.
    cyl('CRT_TV_antenna_mount',(x,1.49,42.66),.031,.025,'black',vertices=12)
    ctx.tube('CRT_TV_antenna_left',[(x-.012,1.50,42.66),(x-.24,1.83,42.67)],.004,'metal',sides=6)
    ctx.tube('CRT_TV_antenna_right',[(x+.012,1.50,42.66),(x+.23,1.88,42.67)],.004,'metal',sides=6)

    # Student's 16-inch beige monitor. Keep the original keyboard, mouse,
    # telephone, lamp and their positions on the same desktop.
    ctx.remove('computer_monitor','computer_screen','CRT tela bege','CRT indicador')
    x,z=52.0,39.25
    box('CRT_PC_foot',(52.02,4.637,z),(.235,.054,.295),'cream',bevel=.018)
    box('CRT_PC_tilt_stand',(52.02,4.687,z),(.11,.055,.16),'cream',bevel=.015)
    box('CRT_PC_rear_case',(52.055,4.892,z),(.33,.316,.366),'cream',bevel=.043)
    box('CRT_PC_rear_bulge',(52.193,4.889,z),(.093,.248,.277),'cream',bevel=.031)
    box('CRT_PC_front_bezel',(51.805,4.89,z),(.085,.37,.445),'cream',bevel=.021)
    box('CRT_PC_inner_lip',(51.758,4.913,z),(.018,.278,.353),'black',bevel=.013)
    screen('CRT_PC_glass',(51.746,4.913,z),.317,.238,'x',.012)
    # Front controls: power button, tiny LED, tactile brightness/contrast keys.
    cyl('CRT_PC_power',(51.752,4.744,z+.157),.011,.016,'cream',vertices=12,axis='x')
    ctx.sphere('CRT_PC_LED',(51.741,4.744,z+.130),(.006,.006,.006),'leaf',segments=8,rings=6)
    for dz in [-.06,-.025,.01]:
        box('CRT_PC_control',(51.751,4.744,z+dz),(.014,.008,.017),'cream',bevel=.003)
    box('CRT_PC_brand',(51.753,4.746,z-.145),(.007,.008,.052),'metal',bevel=.001)
    for i in range(9):
        box('CRT_PC_top_vent',(51.94+i*.024,5.054,z),(.010,.004,.22),'black',bevel=.001)
    for side in [-1,1]:
        for j in range(5):
            box('CRT_PC_side_vent',(52.07,4.83+j*.025,z+side*.181),(.17,.007,.004),'black',bevel=.001)

    # An orientation map prepared by the hosts replaces the tiny cork board.
    # The existing broad wall remains solid; this introduces no story event.
    ctx.remove('Mural de cortiça')
    px,py,pz=52.864,5.65,39.31
    box('Student_welcome_map_back',(px,py,pz),(.028,.68,.85),'wood_dark',bevel=.008)
    ctx.plane('Student_welcome_map',(px-.018,py,pz),(.77,.60),'map',normal='x')
    for dz in [-.411,.411]:
        box('Student_welcome_map_side',(px-.024,py,pz+dz),(.023,.68,.027),'wood_light',bevel=.004)
    for dy in [-.326,.326]:
        box('Student_welcome_map_edge',(px-.024,py+dy,pz),(.023,.027,.81),'wood_light',bevel=.004)
