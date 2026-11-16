"""Focal corrections found in actual runtime images, preserving the floorplan."""
import bpy,math

def build(ctx):
    # Original family portraits were flat colour cards, some mounted across
    # the front glazing. Keep their frames but put them on real wall sections.
    centers=[38.65,39.25,39.85,42.05,42.65]
    for i,z in enumerate(centers):
        name='five_photos_frame_'+str(i)
        obj=ctx.original.get(name)
        if obj and name in bpy.data.objects:
            lo,hi=ctx.bounds(name);obj.location.y-=z-(lo[2]+hi[2])/2
        ctx.remove('five_photos_image_'+str(i))
        picture=ctx.plane('Family_photo_'+str(i),(48.184,2.55,z),(.34,.47),'landscape' if i in [1,4] else 'photo',normal='x')
        picture.data.flip_normals()
    # Guest bed added in the renovation must not hide the existing bookshelf.
    # Shift that complete original furniture group along the same solid wall.
    group=ctx.original.get('furn_flex_estante')
    if group:group.location.x+=2.85
    ctx.collider('Guest_bookcase',(51.587253,3.84,31.3525),(52.292753,5.3955,31.62025))
    # Guest room curtains leave the real glazed centre and daylight clear.
    from architecture_service import _hang
    ctx.tube('Guest_curtain_rod',[(48.22,6.34,31.96),(48.22,6.34,34.04)],.018,'wood_dark')
    for z in [32.14,33.86]:
        _hang(ctx,'Guest_curtain',(48.22,5.46,z),.31,1.61,'curtain',normal='x',folds=5)
    # A basket beside the washer uses wall space, clear of the utility door.
    x,z=53.39,41.65
    ctx.cylinder('Laundry_hamper_inner',(x,.68,z),.212,.53,'linen',20,radius_top=.235)
    for i in range(16):
        a=i*2*math.pi/16
        ctx.tube('Laundry_hamper_weave',[(x+.211*math.cos(a),.42,z+.211*math.sin(a)),(x+.236*math.cos(a),.945,z+.236*math.sin(a))],.009,'wood_light',sides=6)
    for y,r in [(.43,.216),(.58,.222),(.74,.23),(.94,.244)]:
        pts=[(x+r*math.cos(i*2*math.pi/24),y,z+r*math.sin(i*2*math.pi/24)) for i in range(25)]
        ctx.tube('Laundry_hamper_band',pts,.008,'wood_light',sides=6)
    ctx.cloth('Laundry_hamper_towel',(x+.04,.967,z),(.34,.41),'towel',cols=16,rows=12,amplitude=.009,edge_drop=.10)
    ctx.collider('Laundry_hamper',(53.14,.39,41.40),(53.64,1.00,41.90))
    # A few study items on the existing writing surface, with support contact.
    ctx.box('Student_mousepad',(52.39,4.619,39.49),(.23,.008,.23),'book_blue',.004)
    ctx.sphere('Student_mouse',(52.39,4.649,39.50),(.055,.045,.098),'cream',16,8)
    ctx.tube('Student_mouse_cable',[(52.39,4.65,39.455),(52.40,4.626,39.33),(52.34,4.626,39.27),(52.25,4.626,39.30)],.003,'black',sides=5)
    for i in range(2):
        ctx.box('Student_CD_jewel_case',(51.54,4.622+i*.013,39.19),(.14,.012,.142),'glass',.003,yaw=-6+i*3)
        ctx.cylinder('Student_CD_disc',(51.54,4.630+i*.013,39.19),.052,.002,'chrome',24)
        ctx.cylinder('Student_CD_hole',(51.54,4.632+i*.013,39.19),.008,.002,'black',12)
    ctx.cylinder('Student_pen_cup',(52.45,4.669,38.99),.035,.107,'ceramic',12)
    for i in range(4):
        xx=52.435+i*.009
        ctx.tube('Student_pen',[(xx,4.64,38.99),(xx+(i-1)*.008,4.82,38.995)],.0035,'book_red' if i%2 else 'book_blue',sides=5)
    # A family bicycle occupies a wall strip in the existing oversized garage;
    # the central vehicle bay is deliberately left clear, with no new access.
    floor=ctx.original.get('garage_floor')
    if floor:
        floor.data.materials.clear();floor.data.materials.append(ctx.material('concrete'));ctx.uv(floor,2.0)
    z=24.60
    for x in [52.60,53.75]:
        for radius,thickness,mat in [(.315,.032,'rubber'),(.279,.009,'chrome')]:
            ring=[(x+radius*math.cos(i*2*math.pi/32),.675+radius*math.sin(i*2*math.pi/32),z) for i in range(33)]
            ctx.tube('Garage_bicycle_wheel',ring,thickness,mat,sides=6)
        for i in range(12):
            a=i*2*math.pi/12
            ctx.tube('Garage_bicycle_spoke',[(x,.675,z),(x+.275*math.cos(a),.675+.275*math.sin(a),z)],.0028,'metal',sides=4)
        ctx.cylinder('Garage_bicycle_hub',(x,.675,z),.024,.11,'chrome',12,axis='z')
    rear=(52.60,.675,z);seat=(53.00,1.16,z);crank=(53.10,.64,z);head=(53.55,1.15,z);front=(53.75,.675,z)
    for points in [(rear,seat,crank,rear),(seat,head,crank),(crank,head),(front,(53.60,1.28,z),head)]:
        ctx.tube('Garage_bicycle_frame',points,.018,'book_green',sides=8)
    ctx.tube('Garage_bicycle_seatpost',[seat,(53.0,1.27,z)],.012,'chrome')
    ctx.sphere('Garage_bicycle_saddle',(52.98,1.29,z),(.235,.07,.15),'leather')
    ctx.tube('Garage_bicycle_handlebar',[(53.60,1.27,z),(53.63,1.32,z),(53.63,1.32,z-.19),(53.63,1.32,z+.19)],.012,'chrome')
    for zz in [z-.19,z+.19]:ctx.cylinder('Garage_bicycle_grip',(53.63,1.32,zz),.019,.095,'black',10,axis='z')
    ctx.cylinder('Garage_bicycle_chainring',crank,.085,.013,'metal',20,axis='z')
    ctx.tube('Garage_bicycle_chain',[(52.60,.70,z-.02),(53.1,.72,z-.02),(53.14,.60,z-.02),(52.60,.65,z-.02),(52.60,.70,z-.02)],.004,'black',sides=4)
    ctx.tube('Garage_bicycle_crank',[(53.10,.64,z-.05),(53.18,.56,z-.05)],.009,'chrome')
    ctx.box('Garage_bicycle_pedal',(53.18,.56,z-.10),(.085,.03,.10),'black',.006)
    ctx.tube('Garage_bicycle_kickstand',[(53.10,.64,z),(53.16,.36,z-.16)],.009,'metal')
