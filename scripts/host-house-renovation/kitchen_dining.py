"""Period kitchen and dining room assets, in the supplied house's source metres.

Architecture, windows and furniture footprints are intentionally retained.  The
old dining table was 1.125 m tall; its replacement is a domestic 0.77 m table.
All generated artwork, geometry and materials are original to INTERCÂMBIO.
"""
import math
import bpy


def build(ctx):
    # These are furniture / contents only; none of the structural prefixes is
    # selected.  The reused chair children are explicit, to avoid other rooms.
    ctx.remove(
        'furn_dining_table_0', 'furn_dining_chair_',
        'chair_ladder_pine.001', 'chair_ladder_pine.002',
        'chair_ladder_pine.003', 'chair_ladder_pine.004',
        'furn_kitchen_cabinet_', 'furn_wall_cabinet_',
        'furn_sink_PSX_', 'furn_stove_PSX_', 'furn_fridge_PSX_',
        'furn_cozinha_balcao_', 'Armario frontal cozinha', 'Armario pega',
        'Armario moldura madeira', 'Armario painel rebaixado',
        'Armario alto moldura', 'Armario alto painel',
        'Puxador gaveta', 'Puxador armário', 'Coifa caixa', 'Coifa filtro',
        'Cozinha_bancada', 'Cozinha_faixa_azulejos', 'Cozinha_rejunte',
        'Detalhes_cozinha_', 'Vaso bancada cozinha_', 'Ímã geladeira',
        'Jantar_arranjo_', 'seren5_bottle', 'seren5_cap',
        'Luminaria_jantar', 'Plafon jantar aro', 'Plafon jantar vidro',
        'kettle_stove',
    )
    # The generic imported object names are not safe as prefixes.  Hide only
    # these four exact items: they otherwise float above the corrected table.
    for name in ('plate', 'mug', 'mug.002', 'plate.001', 'cereal_corn', 'can_soup'):
        obj = ctx.original.get(name)
        if obj and obj.name in bpy.data.objects:
            bpy.data.objects.remove(obj, do_unlink=True)
            ctx.removed.append(name)
            ctx.original.pop(name, None)

    def box(name, c, s, m='wood', b=.012, yaw=0):
        return ctx.box('KD_'+name, c, s, m, bevel=b, yaw=yaw)

    def cyl(name, c, r, d, m='metal', n=12, axis='y', rt=None):
        return ctx.cylinder('KD_'+name, c, r, d, m, vertices=n,
                            axis=axis, radius_top=rt)

    def ball(name, c, s, m='ceramic', n=12):
        return ctx.sphere('KD_'+name, c, s, m, segments=n, rings=8)

    def tube(name, pts, r=.009, m='chrome', sides=8):
        return ctx.tube('KD_'+name, pts, r, m, sides=sides)

    def ring(name, center, radius, r=.009, m='chrome', axis='y', n=16):
        x,y,z = center
        if axis == 'y':
            pts=[(x+math.cos(a)*radius,y,z+math.sin(a)*radius)
                 for a in [i*2*math.pi/n for i in range(n+1)]]
        elif axis == 'z':
            pts=[(x+math.cos(a)*radius,y+math.sin(a)*radius,z)
                 for a in [i*2*math.pi/n for i in range(n+1)]]
        else:
            pts=[(x,y+math.cos(a)*radius,z+math.sin(a)*radius)
                 for a in [i*2*math.pi/n for i in range(n+1)]]
        return tube(name, pts, r, m)

    # Limited additional colours are used only for tiny food / packaging items.
    # Shared full-size surface materials come from the common textured palette.
    for key, colour in (
        ('kd_apple', (.34,.095,.06,1)),
        ('kd_pear', (.47,.49,.16,1)),
        ('kd_orange', (.72,.34,.065,1)),
        ('kd_coffee', (.075,.035,.018,1)),
    ):
        if key not in ctx.materials:
            mat=bpy.data.materials.new('REN_'+key)
            mat.use_nodes=True
            bsdf=mat.node_tree.nodes.get('Principled BSDF')
            bsdf.inputs['Base Color'].default_value=colour
            bsdf.inputs['Roughness'].default_value=.7
            ctx.materials[key]=mat

    floor=.41
    counter=1.37

    def pull(name, x,y,z, side='north', length=.13, vertical=False):
        if side=='north':
            if vertical:
                pts=[(x,y-length/2,z),(x,y-length/2,z+.028),
                     (x,y+length/2,z+.028),(x,y+length/2,z)]
            else:
                pts=[(x-length/2,y,z),(x-length/2,y,z+.028),
                     (x+length/2,y,z+.028),(x+length/2,y,z)]
        else:
            if vertical:
                pts=[(x,y-length/2,z),(x-.028,y-length/2,z),
                     (x-.028,y+length/2,z),(x,y+length/2,z)]
            else:
                pts=[(x,y,z-length/2),(x-.028,y,z-length/2),
                     (x-.028,y,z+length/2),(x,y,z+length/2)]
        tube(name,pts,.009,'brass')

    def door_north(name,x,y,z,w,h,m='wood'):
        # Raised frame around an inset panel, rather than one featureless cube.
        box(name+'_panel',(x,y,z),(w-.07,h-.07,.028),m,.008)
        for dx in (-w/2+.023,w/2-.023):
            box(name+'_stile',(x+dx,y,z+.012),(.046,h,.035),m,.006)
        for dy in (-h/2+.023,h/2-.023):
            box(name+'_rail',(x,y+dy,z+.012),(w-.07,.046,.035),m,.006)

    def door_east(name,x,y,z,w,h,m='wood'):
        box(name+'_panel',(x,y,z),(.028,h-.07,w-.07),m,.008)
        for dz in (-w/2+.023,w/2-.023):
            box(name+'_stile',(x-.012,y,z+dz),(.035,h,.046),m,.006)
        for dy in (-h/2+.023,h/2-.023):
            box(name+'_rail',(x-.012,y+dy,z),(.035,.046,w-.07),m,.006)

    # East worktop retains the complete original 2.69 m run under the window.
    # A continuous plinth and top makes its three cupboards read as one set.
    box('east_plinth',(57.58,.47,33.785),(.56,.12,2.57),'wood_dark',.009)
    box('east_carcass',(57.565,.91,33.785),(.59,.78,2.59),'wood',.014)
    box('east_worktop',(57.515,1.344,33.785),(.76,.052,2.69),'stone',.018)
    for i,z in enumerate((32.9,33.8,34.7)):
        door_east('east_cupboard_'+str(i),57.235,.883,z,.78,.70)
        pull('east_pull_'+str(i),57.206,1.08,z-.18,'east',.13)
        box('east_drawer_'+str(i),(57.212,1.224,z),(.034,.13,.77),'wood',.007)
        pull('east_drawer_pull_'+str(i),57.189,1.223,z,'east',.18)

    # Tiled backsplash is split around the actual east window opening.  It
    # never fills the glazing or overlays its frame.
    box('backsplash_north',(55.49,1.64,31.082),(3.55,.53,.018),'tile',.002)
    box('backsplash_east_south',(57.916,1.64,34.67),(.018,.53,1.67),'tile',.001)

    # Main sink: the top is four pieces around a genuine open basin.
    sx,sz=54.35,31.78
    box('sink_base',(sx,.825,sz),(.98,.71,.59),'wood',.012)
    box('sink_toe',(sx,.47,sz-.025),(.94,.11,.51),'wood_dark',.006)
    for i,x in enumerate((54.105,54.595)):
        door_north('sink_door_'+str(i),x,.89,32.081,.45,.68)
        pull('sink_pull_'+str(i),x+(.13 if i==0 else -.13),1.05,32.104,
             length=.12,vertical=True)
    box('sink_rim_back',(sx,counter-.022,31.495),(1.02,.044,.10),'stone',.009)
    box('sink_rim_front',(sx,counter-.022,32.049),(1.02,.044,.11),'stone',.009)
    box('sink_rim_left',(53.956,counter-.022,sz),(.23,.044,.46),'stone',.009)
    box('sink_rim_right',(54.744,counter-.022,sz),(.23,.044,.46),'stone',.009)
    box('sink_basin_bottom',(sx,1.208,sz),(.55,.025,.37),'metal',.035)
    box('sink_basin_left',(54.062,1.282,sz),(.025,.13,.42),'metal',.01)
    box('sink_basin_right',(54.638,1.282,sz),(.025,.13,.42),'metal',.01)
    box('sink_basin_rear',(sx,1.282,31.567),(.59,.13,.025),'metal',.01)
    box('sink_basin_front',(sx,1.282,31.993),(.59,.13,.025),'metal',.01)
    tube('sink_lip',[(54.045,1.374,31.553),(54.655,1.374,31.553),
                     (54.655,1.374,32.009),(54.045,1.374,32.009),
                     (54.045,1.374,31.553)],.011,'chrome')
    cyl('sink_drain',(sx,1.224,sz),.034,.005,'black',16)
    ring('sink_drain_trim',(sx,1.227,sz),.035,.004,'chrome')
    tube('faucet_spout',[(sx,1.37,31.50),(sx,1.58,31.50),
                         (sx,1.67,31.55),(sx,1.70,31.65),
                         (sx,1.66,31.74),(sx,1.58,31.77)],.018,'chrome',10)
    for dx in (-.13,.13):
        cyl('faucet_base',(sx+dx,1.388,31.50),.038,.028,'chrome')
        tube('faucet_handle',[(sx+dx,1.405,31.50),(sx+dx,1.445,31.50),
                              (sx+dx+.045,1.445,31.50)],.009,'chrome')
    # A solid, appropriately sized bridge cabinet occupies each original gap.
    for i,(x,w) in enumerate(((55.045,.35),(56.255,.41))):
        box('north_bridge_toe_'+str(i),(x,.47,31.74),(w-.03,.12,.52),'wood_dark',.007)
        box('north_bridge_'+str(i),(x,.87,31.76),(w,.79,.60),'wood',.01)
        box('north_bridge_top_'+str(i),(x,1.346,31.76),(w+.04,.048,.65),'stone',.011)
        door_north('north_bridge_door_'+str(i),x,.89,32.079,w-.04,.66)
        pull('north_bridge_pull_'+str(i),x,1.10,32.101,length=min(.14,w*.5))

    # Cream enamel cooker with four burner grates, an inset oven window and
    # physical controls.  All surfaces remain inside the old cooker footprint.
    ox,oz=55.65,31.77
    box('cooker_body',(ox,.855,oz),(.75,.86,.59),'cream',.025)
    box('cooker_foot',(ox,.455,oz),(.69,.09,.51),'black',.008)
    box('cooker_hob',(ox,1.337,oz),(.76,.066,.62),'cream',.02)
    box('cooker_control',(ox,1.277,32.085),(.735,.113,.035),'cream',.014)
    for i,dx in enumerate((-.25,-.085,.085,.25)):
        cyl('cooker_knob_'+str(i),(ox+dx,1.28,32.113),.025,.026,'black',12,'z')
        box('cooker_knob_mark_'+str(i),(ox+dx,1.292,32.128),(.004,.013,.003),'paper',.001)
    box('oven_seal',(ox,.91,32.077),(.66,.49,.022),'black',.02)
    box('oven_door',(ox,.91,32.098),(.64,.47,.024),'cream',.022)
    box('oven_window_frame',(ox,.91,32.115),(.51,.29,.015),'black',.014)
    box('oven_window',(ox,.915,32.126),(.46,.245,.008),'glass',.01)
    for dx in (-.225,.225):
        box('oven_handle_post',(ox+dx,1.16,32.14),(.025,.025,.05),'metal',.006)
    tube('oven_handle',[(ox-.25,1.16,32.17),(ox+.25,1.16,32.17)],.016,'metal')
    for i,(dx,dz) in enumerate(((-.19,-.14),(.19,-.14),(-.19,.14),(.19,.14))):
        cyl('burner_'+str(i),(ox+dx,1.378,oz+dz),.073,.011,'black',16)
        ring('burner_ring_'+str(i),(ox+dx,1.387,oz+dz),.079,.006,'metal')
        tube('grate_x_'+str(i),[(ox+dx-.105,1.404,oz+dz),(ox+dx+.105,1.404,oz+dz)],.008,'black')
        tube('grate_z_'+str(i),[(ox+dx,1.404,oz+dz-.105),(ox+dx,1.404,oz+dz+.105)],.008,'black')
    # A kettle and small saucepan grounded on the rear burners.
    cyl('kettle',(55.46,1.477,31.63),.087,.14,'metal',16,rt=.075)
    cyl('kettle_lid',(55.46,1.551,31.63),.076,.014,'metal',16)
    cyl('kettle_lid_knob',(55.46,1.574,31.63),.018,.025,'black')
    tube('kettle_handle',[(55.37,1.50,31.63),(55.37,1.67,31.63),
                           (55.55,1.67,31.63),(55.55,1.50,31.63)],.014,'black')
    tube('kettle_spout',[(55.46,1.45,31.56),(55.46,1.50,31.48),(55.46,1.55,31.46)],.025,'metal')
    cyl('saucepan',(55.84,1.456,31.63),.088,.09,'metal',16)
    cyl('saucepan_interior',(55.84,1.504,31.63),.076,.003,'black',16)
    tube('saucepan_handle',[(55.91,1.475,31.63),(56.10,1.475,31.63)],.016,'black')

    # Conventional top-freezer refrigerator; no modern display or stainless
    # giant.  Paper notes are within the surface plane, never floating forward.
    rx,rz=56.85,31.76
    box('fridge_body',(rx,1.26,rz),(.698,1.70,.73),'cream',.045)
    box('fridge_bottom_trim',(rx,.449,32.086),(.66,.06,.046),'metal',.009)
    box('fridge_door_seal',(rx,1.251,32.129),(.659,1.57,.016),'rubber',.022)
    box('fridge_main_door',(rx,1.006,32.15),(.68,1.085,.044),'cream',.028)
    box('fridge_freezer_door',(rx,1.823,32.15),(.68,.49,.044),'cream',.028)
    pull('fridge_main_handle',56.586,1.28,32.17,length=.29,vertical=True)
    pull('fridge_freezer_handle',56.586,1.80,32.17,length=.18,vertical=True)
    box('fridge_brand',(57.035,1.974,32.177),(.13,.026,.006),'metal',.002)
    ctx.plane('KD_fridge_shopping_list',(56.955,1.375,32.174),(.20,.24),'paper',normal='z')
    for i,dy in enumerate((-.065,-.025,.015,.055)):
        box('shopping_list_ink_'+str(i),(56.958,1.375+dy,32.176),(.126-.012*(i%2),.003,.001),'book_blue',.0005)
    for i,(x,y,m) in enumerate(((56.94,1.52,'book_red'),(57.066,1.72,'book_green'),(56.71,1.88,'book_blue'))):
        box('fridge_magnet_'+str(i),(x,y,32.178),(.028,.031,.012),m,.006)

    # Wall cupboards are kept off the existing east glazing.  One old cupboard
    # overlapped that window; the replacement sits on the free north wall.
    for i,(x,w) in enumerate(((54.35,1.02),(55.65,.86))):
        box('north_upper_carcass_'+str(i),(x,2.31,31.28),(w,.70,.34),'wood',.014)
        for j,dx in enumerate((-.25,.25) if w>1 else (-.21,.21)):
            dw=(w-.04)/2
            door_north('north_upper_door_'+str(i)+'_'+str(j),x+dx,2.30,31.468,dw,.65)
            pull('north_upper_pull_'+str(i)+'_'+str(j),x+dx+(.13 if j==0 else -.13),2.105,31.49,
                 length=.11,vertical=True)
        box('north_upper_crown_'+str(i),(x,2.682,31.28),(w+.03,.045,.37),'wood_dark',.009)
        box('north_upper_underside_'+str(i),(x,1.942,31.28),(w-.04,.018,.28),'cream',.004)
    box('east_upper_carcass',(57.69,2.30,34.43),(.34,.70,.83),'wood',.012)
    for j,z in enumerate((34.225,34.635)):
        door_east('east_upper_door_'+str(j),57.50,2.30,z,.39,.65)
        pull('east_upper_handle_'+str(j),57.477,2.09,z+(.105 if j==0 else -.105),'east',.10,True)
    box('east_upper_crown',(57.69,2.682,34.43),(.37,.045,.87),'wood_dark',.008)

    # A period cooker hood is correctly centred over the new hob, not the east
    # window.  Its slim profile leaves the cupboards, wall and approach clear.
    box('hood',(55.65,1.916,31.45),(.77,.08,.50),'cream',.025)
    box('hood_filter',(55.65,1.869,31.48),(.57,.014,.32),'metal',.005)
    box('hood_control',(55.93,1.917,31.711),(.07,.025,.005),'black',.002)

    # Useful objects grouped into breakfast preparation and washing zones.
    # Microwave sits on the east run; all feet rest exactly on its top.
    box('microwave',(57.49,1.55,34.77),(.50,.35,.53),'cream',.025)
    for x in (57.32,57.66):
        for z in (34.58,34.96):
            box('microwave_foot',(x,1.372,z),(.034,.006,.034),'rubber',.002)
    box('microwave_face',(57.228,1.55,34.77),(.024,.298,.47),'black',.012)
    box('microwave_glass',(57.21,1.55,34.73),(.008,.245,.32),'glass',.008)
    box('microwave_controls',(57.207,1.55,34.968),(.008,.245,.066),'cream',.005)
    for i in range(3):
        cyl('microwave_button_'+str(i),(57.198,1.49+i*.044,34.969),.012,.009,'black',8,'x')
    # Coffeemaker stands just south of the window, beside the stored mugs.
    box('coffee_base',(57.45,1.394,34.15),(.30,.044,.26),'black',.016)
    box('coffee_back',(57.56,1.53,34.15),(.075,.26,.24),'black',.015)
    box('coffee_canopy',(57.45,1.67,34.15),(.30,.06,.26),'black',.022)
    cyl('coffee_carafe',(57.391,1.495,34.15),.078,.16,'glass',16)
    cyl('coffee_in_carafe',(57.391,1.458,34.15),.067,.078,'kd_coffee',16)
    cyl('coffee_carafe_lid',(57.391,1.583,34.15),.082,.018,'black',16)
    ring('coffee_handle',(57.295,1.50,34.15),.063,.012,'black','z',12)
    # Two-slice rounded enamel toaster, with genuine slot openings on top.
    box('toaster',(57.45,1.468,33.63),(.28,.19,.23),'cream',.045)
    box('toaster_foot',(57.45,1.378,33.63),(.25,.018,.20),'black',.006)
    for dz in (-.055,.055):
        box('toaster_slot',(57.45,1.567,33.63+dz),(.19,.006,.026),'black',.009)
    tube('toaster_lever',[(57.30,1.49,33.63),(57.27,1.49,33.63)],.009,'metal')
    ball('toaster_lever_grip',(57.265,1.49,33.63),(.04,.025,.03),'black',10)

    def mug(name,x,y,z,m='ceramic'):
        cyl(name+'_body',(x,y+.045,z),.038,.09,m,12)
        cyl(name+'_opening',(x,y+.091,z),.030,.002,'kd_coffee',12)
        ring(name+'_rim',(x,y+.091,z),.035,.004,m,n=12)
        ring(name+'_handle',(x+.047,y+.05,z),.026,.008,m,'z',10)

    mug('counter_mug',57.37,counter,33.25)
    # Dish draining rack plus two plates; steel wire below plates is visible.
    rackx,rackz=57.48,32.72
    box('draining_mat',(rackx,1.375,rackz),(.42,.014,.47),'linen',.008)
    for z in (32.51,32.93):
        tube('rack_long',[(57.29,1.411,z),(57.68,1.411,z)],.005,'chrome',6)
    for i in range(7):
        z=32.53+i*.06
        tube('rack_loop_'+str(i),[(57.30,1.405,z),(57.30,1.505,z),
                                 (57.67,1.505,z),(57.67,1.405,z)],.004,'chrome',6)
    for i,z in enumerate((32.60,32.78)):
        cyl('rack_plate_'+str(i),(57.48,1.51,z),.107,.009,'ceramic',20,'z')
        ring('rack_plate_rim_'+str(i),(57.48,1.51,z+.006),.097,.006,'ceramic','z',20)
    # Mantle-sized pantry jars on top of the microwave, not an unbalanced pile.
    for i,(z,r,h,m) in enumerate(((34.58,.045,.16,'glass'),(34.73,.047,.14,'ceramic'))):
        cyl('pantry_jar_'+str(i),(57.54,1.725+h/2,z),r,h,m,12)
        cyl('pantry_lid_'+str(i),(57.54,1.730+h,z),r+.003,.016,'wood_dark',12)
    # Towel hangs only from the east cabinet pull; it cannot project into route.
    towel=ctx.cloth('KD_tea_towel',(57.16,.81,34.69),(.54,.27),'towel',
                    cols=16,rows=10,amplitude=.008,edge_drop=0)
    towel.rotation_euler.y=math.pi/2
    box('cutting_board',(55.046,1.381,31.79),(.28,.021,.34),'wood_light',.018)
    box('bread',(55.04,1.423,31.82),(.16,.065,.18),'linen',.03)
    tube('bread_knife',[(54.96,1.402,31.65),(55.09,1.402,31.65)],.009,'metal',6)

    # Dining furniture uses the original footprints.  Table top now 0.77 m
    # above floor; four chairs have domestic 0.45 m seat heights.
    tx,tz=50.1,33.35
    box('dining_top',(tx,1.153,tz),(1.20,.054,1.80),'wood',.026)
    for x in (49.59,50.61):
        box('dining_apron_long',(x,1.054,tz),(.045,.145,1.61),'wood_dark',.009)
    for z in (32.55,34.15):
        box('dining_apron_end',(tx,1.054,z),(1.02,.145,.045),'wood_dark',.009)
    for i,(x,z) in enumerate(((49.61,32.56),(50.59,32.56),(49.61,34.14),(50.59,34.14))):
        cyl('dining_leg_'+str(i),(x,.755,z),.045,.69,'wood',10,rt=.055)
        for y,r in ((.49,.048),(.97,.056),(.915,.048)):
            cyl('dining_leg_collar_'+str(i),(x,y,z),r,.036,'wood_dark',10)

    def chair(name,cx,cz,yaw):
        a=math.radians(yaw)
        def p(dx,y,dz):
            return (cx+dx*math.cos(a)+dz*math.sin(a),y,
                    cz-dx*math.sin(a)+dz*math.cos(a))
        def b(n,dx,y,dz,size,mat='wood',bev=.008):
            return box(name+n,p(dx,y,dz),size,mat,bev,yaw)
        b('_seat',0,.862,0,(.43,.064,.43),'wood',.018)
        b('_cushion',0,.905,0,(.382,.036,.37),'sofa_cloth',.021)
        for dx in (-.168,.168):
            for dz in (-.16,.16):
                tube(name+'_leg',[p(dx*.98,.432,dz*.98),p(dx,.83,dz)],.024,'wood',8)
            tube(name+'_backpost',[p(dx,.83,-.18),p(dx,1.365,-.21)],.023,'wood',8)
            tube(name+'_side_stretcher',[p(dx,.61,-.16),p(dx,.61,.16)],.013,'wood_dark',8)
        for y in (1.08,1.23,1.36):
            b('_back_rail',0,y,-.208,(.36,.055,.027),'wood',.008)
        tube(name+'_front_stretcher',[p(-.168,.61,.16),p(.168,.61,.16)],.013,'wood_dark',8)
    chair('dining_chair_north',50.1,32.35,0)
    chair('dining_chair_south',50.1,34.4,180)
    chair('dining_chair_west',49.0,33.35,90)
    chair('dining_chair_east',51.2,33.35,-90)

    # A linen runner and a modest breakfast setting leave most wood visible.
    ctx.cloth('KD_dining_runner',(tx,1.183,tz),(.31,1.64),'linen',cols=8,
              rows=28,amplitude=.002,edge_drop=.018)
    for i,(x,z) in enumerate(((49.73,33.35),(50.47,33.35),(50.10,32.71),(50.10,33.99))):
        # Small placemats soften the table without hiding the timber top.
        box('placemat_'+str(i),(x,1.184,z),(.31,.004,.29),'host_cloth',.008)
        cyl('place_plate_'+str(i),(x,1.194,z),.112,.012,'ceramic',20)
        ring('place_plate_rim_'+str(i),(x,1.202,z),.105,.005,'ceramic',n=20)
        if i<2:
            mug('dining_mug_'+str(i),x,1.186,z-.22)
        tube('place_knife_'+str(i),[(x+.135,1.193,z-.09),(x+.135,1.193,z+.09)],.005,'metal',6)
        tube('place_fork_'+str(i),[(x-.135,1.193,z-.08),(x-.135,1.193,z+.08)],.005,'metal',6)
        for dx in (-.008,0,.008):
            tube('fork_tine',[(x-.135+dx,1.193,z-.08),(x-.135+dx,1.193,z-.115)],.002,'metal',5)
    # Centre fruit bowl, no large flask blocking faces across the table.
    cyl('fruit_bowl',(tx,1.224,tz),.144,.065,'ceramic',20,rt=.175)
    cyl('fruit_bowl_dark',(tx,1.259,tz),.148,.003,'wood_dark',20)
    for i,(dx,dz,m) in enumerate(((-.07,-.03,'kd_apple'),(.065,-.03,'kd_pear'),(0,.075,'kd_orange'))):
        ball('fruit_'+str(i),(tx+dx,1.302,tz+dz),(.092,.094,.092),m,12)
        tube('fruit_stem_'+str(i),[(tx+dx,1.345,tz+dz),(tx+dx+.006,1.362,tz+dz)],.003,'wood_dark',5)

    # Simple wrought-brass pendant; the runtime lighting module owns emission
    # and actual lights, so no imported light affects other scenes.
    cyl('pendant_canopy',(tx,3.457,tz),.105,.035,'brass',16)
    cyl('pendant_cord',(tx,3.126,tz),.010,.63,'black',8)
    cyl('pendant_shade',(tx,2.70,tz),.265,.21,'shade',20,rt=.10)
    cyl('pendant_rim',(tx,2.588,tz),.268,.018,'brass',20)
    ball('pendant_bulb',(tx,2.59,tz),(.075,.085,.075),'bulb',12)

    # Wall art and a shallow hutch occupy the clear north dining wall.  They
    # stay away from the foyer opening at z35.8 and the front wall windows.
    # No new floor collision: its .28m depth lies behind existing table bounds.
    box('dining_hutch',(51.55,.82,31.43),(1.12,.82,.28),'wood',.018)
    box('dining_hutch_top',(51.55,1.244,31.43),(1.18,.044,.32),'wood_dark',.012)
    for i,x in enumerate((51.28,51.82)):
        door_north('hutch_door_'+str(i),x,.85,31.586,.49,.68)
        pull('hutch_handle_'+str(i),x,1.04,31.61,length=.10)
    # Thin objects on the hutch, each grounded at the same top plane.
    for i in range(3):
        cyl('hutch_plate_'+str(i),(51.78,1.279+i*.013,31.42),.115,.01,'ceramic',20)
    box('hutch_frame',(51.25,1.41,31.39),(.22,.28,.032),'wood_dark',.007)
    ctx.plane('KD_hutch_family_photo',(51.25,1.41,31.408),(.18,.235),'photo',normal='z')
    box('dining_art_frame',(51.5,2.18,31.117),(1.05,.66,.04),'wood_dark',.014)
    box('dining_art_mat',(51.5,2.18,31.142),(.96,.58,.012),'paper',.001)
    ctx.plane('KD_dining_landscape',(51.5,2.18,31.151),(.84,.48),'landscape',normal='z')

    # The hutch sits outside existing furniture footprints and gets one simple
    # wall-adjacent collider; all other replacements retain their old blockers.
    ctx.collider('dining_hutch',(50.96,.41,31.27),(52.14,1.28,31.60))
