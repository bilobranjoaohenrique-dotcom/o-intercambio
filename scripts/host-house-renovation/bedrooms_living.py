"""Furniture pass for the restored Daniel/Helen interior.

The source metre scale and circulation remain unchanged. All replacements keep
their measured footprints; only the previously empty guest room and the second
bedside table add navigation footprints, recorded through ctx.collider.
"""
import math


def build(ctx):
    box, cyl, sphere, tube, cloth = ctx.box, ctx.cylinder, ctx.sphere, ctx.tube, ctx.cloth

    def knob(name, p, radius=.015):
        sphere(name, p, (radius*2, radius*2, radius*2), 'brass', segments=8, rings=6)

    def turned_leg(name, x, y0, z, height, radius=.036):
        # A restrained turned profile reads as an older domestic wooden leg.
        rings = [(0, .82), (.08, 1), (.16, .92), (.28, .64), (.43, .73),
                 (.56, 1.08), (.66, .91), (.82, .76), (1, .9)]
        for i in range(len(rings)-1):
            a, ra = rings[i]; b, rb = rings[i+1]
            cyl(name+'_%02d'%i, (x, y0+(a+b)*height/2, z), radius*ra,
                (b-a)*height+.001, 'wood_dark', vertices=8, radius_top=radius*rb)

    def cushion(name, p, size, mat='sofa_cloth', yaw=0):
        # Bevelled separate upholstery volumes, not one solid furniture block.
        obj = box(name, p, size, mat, bevel=min(size)*.25, yaw=yaw)
        return obj

    def lamp(name, x, base, z, scale=1):
        cyl(name+'_foot', (x,base+.017*scale,z), .105*scale,.034*scale,'brass',vertices=16)
        sphere(name+'_ceramic', (x,base+.14*scale,z),(.13*scale,.22*scale,.13*scale),'ceramic')
        cyl(name+'_stem',(x,base+.25*scale,z),.012*scale,.10*scale,'brass',vertices=8)
        sphere(name+'_bulb',(x,base+.325*scale,z),(.045*scale,.060*scale,.045*scale),'bulb',segments=8,rings=6)
        cyl(name+'_shade',(x,base+.34*scale,z),.145*scale,.20*scale,'shade',vertices=16,radius_top=.083*scale)
        cyl(name+'_rim',(x,base+.242*scale,z),.146*scale,.009*scale,'cream',vertices=16)
        cyl(name+'_cap',(x,base+.442*scale,z),.085*scale,.009*scale,'cream',vertices=16)
        knob(name+'_finial',(x,base+.455*scale,z),.014*scale)

    def nightstand(name,x,z,base,width=.42,depth=.48):
        top=base+.685
        for dx in [-width/2+.04,width/2-.04]:
            for dz in [-depth/2+.045,depth/2-.045]:
                box(name+'_leg',(x+dx,base+.11,z+dz),(.055,.22,.055),'wood_dark',bevel=.008)
        box(name+'_case',(x,base+.40,z),(width-.035,.53,depth-.025),'wood',bevel=.015)
        box(name+'_top',(x,top-.024,z),(width+.018,.048,depth+.018),'wood_dark',bevel=.012)
        # Front faces towards +X, as on the supplied nightstands.
        for h in [.37,.54]:
            box(name+'_drawer',(x+width/2-.012,base+h,z),(.028,.145,depth-.07),'wood_light',bevel=.006)
            knob(name+'_pull',(x+width/2+.010,base+h,z),.013)
        return top

    def book(name,p,size,cover='book_red',yaw=0):
        x,y,z=p; w,h,d=size
        box(name+'_pages',(x,y,z),(w*.96,h*.76,d*.94),'paper',bevel=.002,yaw=yaw)
        for sign in [-1,1]:
            box(name+'_cover',(x,y+sign*h*.43,z),(w,h*.12,d),cover,bevel=.002,yaw=yaw)

    def framed(name,x,y,z,w,h,art='photo',normal='z',yaw=0):
        # 3D frame with the picture surface inset into the frame.
        if normal == 'z':
            box(name+'_back',(x,y,z),(w,h,.028),'wood_dark',bevel=.006,yaw=yaw)
            sign=-1 if yaw==180 else 1
            ctx.plane(name+'_print',(x,y,z+sign*.016),(w-.065,h-.065),art,normal='z',yaw=yaw)
            for dx in [-w/2+.015,w/2-.015]:
                box(name+'_side',(x+dx,y,z+sign*.019),(.025,h,.022),'wood_light',bevel=.003)
            for dy in [-h/2+.015,h/2-.015]:
                box(name+'_edge',(x,y+dy,z+sign*.019),(w-.04,.025,.022),'wood_light',bevel=.003)
        else:
            box(name+'_back',(x,y,z),(.028,h,w),'wood_dark',bevel=.006)
            ctx.plane(name+'_print',(x+.016,y,z),(w-.06,h-.06),art,normal='x')

    def sofa(name,cx,cz,width,seats):
        base=.41; depth=.85
        for x in [cx-width/2+.13,cx+width/2-.13]:
            for z in [cz-depth/2+.12,cz+depth/2-.12]:
                box(name+'_foot',(x,base+.055,z),(.075,.11,.075),'wood_dark',bevel=.014)
        cushion(name+'_lower',(cx,base+.235,cz),(width-.055,.29,depth-.045))
        box(name+'_front_piping',(cx,base+.335,cz+.411),(width-.15,.012,.012),'linen',bevel=.005)
        seat_width=(width-.39)/seats
        for i in range(seats):
            x=cx-width/2+.195+seat_width*(i+.5)
            cushion(name+'_seat_%d'%i,(x,base+.43,cz+.09),(seat_width-.018,.18,.58))
            cushion(name+'_back_%d'%i,(x,base+.64,cz-.275),(seat_width+.005,.43,.20))
            # A visibly separate welt on each seat front/side.
            tube(name+'_seat_welt_%d'%i,[(x-seat_width/2+.035,base+.48,cz-.12),
                 (x-seat_width/2+.035,base+.48,cz+.34),
                 (x+seat_width/2-.035,base+.48,cz+.34),
                 (x+seat_width/2-.035,base+.48,cz-.12)],.003,'linen',sides=5)
        for side in [-1,1]:
            cushion(name+'_rolled_arm',(cx+side*(width/2-.105),base+.49,cz),(.21,.49,.78))
            tube(name+'_arm_welt',[(cx+side*(width/2-.10),base+.714,cz-.30),
                 (cx+side*(width/2-.10),base+.738,cz+.22),
                 (cx+side*(width/2-.10),base+.68,cz+.36)],.003,'linen',sides=5)
        pillow_x=cx-width*.24 if seats>1 else cx+.10
        cushion(name+'_scatter',(pillow_x,base+.63,cz+.10),(.32,.33,.13),'host_cloth',yaw=-12)

    # ---- Living room: keep the existing seating and entertainment footprints.
    ctx.remove('sofa_red.001','armchair_red.001','coffee_table_oak.001')
    sofa('Living_sofa',49.35,40.172,2.22,3)
    sofa('Living_armchair',51.71,40.172,.96,1)
    throw=cloth('Living_throw', (48.70,1.0,40.08),(.43,.64),'blue_plaid',cols=16,rows=24,amplitude=.007,edge_drop=.018)
    # Follow the actual back and seat heights. A planar throw would hover over
    # the seat or disappear into the back cushion.
    profile=[(39.76,1.04),(39.84,1.283),(39.97,1.283),(40.07,1.02),(40.17,.948),(40.40,.946)]
    for vert in throw.data.vertices:
        z=40.08-vert.co.y
        height=profile[-1][1]
        for a,b in zip(profile,profile[1:]):
            if a[0]<=z<=b[0]:
                t=(z-a[0])/(b[0]-a[0]);height=a[1]+(b[1]-a[1])*t;break
        vert.co.z+=height-1.0
    throw.data.update()

    for x in [50.51,51.49]:
        for z in [40.785,41.215]:
            turned_leg('Living_coffee_leg',x,.41,z,.335,.027)
    box('Living_coffee_apron',(51,.735,41),(1.025,.105,.485),'wood_dark',bevel=.009)
    box('Living_coffee_lower_shelf',(51,.52,41),(.91,.025,.40),'wood',bevel=.008)
    box('Living_coffee_top',(51,.803,41),(1.10,.055,.55),'wood',bevel=.018)
    # Existing books, remote and cups remain on their original table surface.

    ctx.remove('furn_sala_rack')
    x,z=50.31,42.53
    for dx in [-.61,.61]:
        for dz in [-.245,.245]:
            box('Living_console_foot',(x+dx,.46,z+dz),(.075,.10,.075),'wood_dark',bevel=.01)
    box('Living_console_base',(x,.535,z),(1.38,.065,.65),'wood_dark',bevel=.012)
    box('Living_console_top',(x,.931,z),(1.44,.048,.70),'wood',bevel=.012)
    for dx in [-.665,.665,-.255,.255]:
        box('Living_console_upright',(x+dx,.723,z),(.04,.34,.63),'wood',bevel=.007)
    box('Living_console_back',(x,.723,z+.303),(1.30,.34,.025),'wood_dark',bevel=.003)
    box('Living_console_shelf',(x,.70,z),(.49,.025,.60),'wood',bevel=.004)
    for dx in [-.47,.47]:
        box('Living_console_door',(x+dx,.723,z-.329),(.37,.305,.032),'wood_light',bevel=.009)
        box('Living_console_panel',(x+dx,.723,z-.349),(.28,.22,.012),'wood',bevel=.007)
        knob('Living_console_pull',(x+dx+(-.11 if dx<0 else .11),.73,z-.361))
    box('Living_VHS',(x,.758,z-.06),(.44,.077,.34),'black',bevel=.012)
    box('Living_VHS_slot',(x-.065,.759,z-.235),(.235,.014,.006),'rubber',bevel=.002)
    box('Living_VHS_display',(x+.14,.759,z-.236),(.075,.023,.006),'screen',bevel=.002)
    for dx in [.14,.17,.20]:
        cyl('Living_VHS_button',(x+dx,.739,z-.24),.006,.007,'metal',vertices=8,axis='z')
    for i,col in enumerate(['book_blue','book_red','book_green']):
        box('Living_tape_case',(x-.14+i*.14,.59,z-.02),(.115,.075,.27),col,bevel=.004)
        box('Living_tape_label',(x-.14+i*.14,.59,z-.159),(.080,.034,.004),'paper',bevel=.001)
    # A restrained upright photo on the cabinet, clear of the original CRT.
    framed('Living_console_photo',49.79,1.105,42.60,.22,.28,'photo',yaw=180)

    # ---- Student's room: retain the hosts' prepared room, with travel items.
    ctx.remove('bed_single_oak.001','Manta xadrez ajustada à cama')
    def single_bed(name,head_x,cz,base,linen_mat='blue_plaid',guest=False):
        length=2.10;width=1.04;foot_x=head_x+length-.10
        # Posts and narrow rails preserve empty space under the frame.
        for xx in [head_x,foot_x]:
            for zz in [cz-width/2+.045,cz+width/2-.045]:
                box(name+'_post',(xx,base+(.58 if xx==head_x else .29),zz),(.065,1.16 if xx==head_x else .58,.065),'wood',bevel=.012)
                sphere(name+'_post_cap',(xx,base+(1.17 if xx==head_x else .59),zz),(.085,.06,.085),'wood_dark',segments=8,rings=6)
        for zz in [cz-width/2+.035,cz+width/2-.035]:
            box(name+'_rail',(head_x+1.0,base+.28,zz),(2.04,.20,.065),'wood',bevel=.013)
        for xx in [head_x,foot_x]:
            box(name+'_crossrail',(xx,base+.31,cz),(.07,.22,width-.04),'wood_dark',bevel=.012)
        box(name+'_head_top',(head_x,base+1.07,cz),(.075,.105,width-.015),'wood',bevel=.019)
        box(name+'_head_bottom',(head_x,base+.52,cz),(.06,.075,width-.04),'wood',bevel=.009)
        for k in range(8):
            zz=cz-width/2+.115+k*(width-.23)/7
            box(name+'_head_spindle',(head_x,base+.79,zz),(.035,.47,.032),'wood_light',bevel=.009)
        box(name+'_mattress',(head_x+1.0,base+.48,cz),(1.94,.24,width-.10),'linen',bevel=.065)
        tube(name+'_mattress_welt',[(head_x+.12,base+.49,cz-.465),(head_x+1.91,base+.49,cz-.465),
            (head_x+1.91,base+.49,cz+.465),(head_x+.12,base+.49,cz+.465)],.005,'cream',sides=6)
        # Turn the helper's hanging cross-edge across the single bed, so the
        # blanket drops down the two long sides rather than down the pillows.
        cloth(name+'_duvet',(head_x+1.24,base+.645,cz),(1.055,1.55),linen_mat,
              cols=22,rows=28,amplitude=.021,edge_drop=.13,yaw=90)
        cloth(name+'_folded_sheet',(head_x+.49,base+.68,cz),(1.01,.22),'linen',cols=20,rows=8,amplitude=.01,edge_drop=.075,yaw=90)
        cushion(name+'_pillow',(head_x+.23,base+.67,cz),(.36,.14,.67),'linen')
        tube(name+'_pillow_seam',[(head_x+.07,base+.69,cz-.29),(head_x+.39,base+.69,cz-.29),
             (head_x+.39,base+.69,cz+.29),(head_x+.07,base+.69,cz+.29)],.0025,'cream',sides=5)
        if not guest:
            cushion(name+'_small_pillow',(head_x+.31,base+.72,cz+.29),(.25,.10,.23),'sofa_cloth',yaw=7)
        return (head_x-.05,base,cz-.54),(head_x+2.055,base+1.21,cz+.54)

    single_bed('Student_bed',48.90,41.55,3.84)

    # New desk joinery stays exactly inside the old desk collider.
    ctx.remove('furn_player_desk_0')
    box('Student_desk_top',(52,4.582,39.25),(1.20,.056,.80),'wood',bevel=.015)
    box('Student_desk_edge',(51.414,4.562,39.25),(.028,.06,.76),'wood_dark',bevel=.007)
    for zz in [38.91,39.59]:
        box('Student_desk_back_leg',(52.53,4.18,zz),(.075,.64,.075),'wood_dark',bevel=.011)
        box('Student_desk_front_leg',(51.47,4.18,zz),(.075,.64,.075),'wood_dark',bevel=.011)
    box('Student_desk_rear_rail',(52.53,4.30,39.25),(.035,.28,.67),'wood',bevel=.008)
    box('Student_desk_drawer_case',(52.10,4.30,39.54),(.84,.50,.20),'wood_dark',bevel=.012)
    for y in [4.16,4.40]:
        box('Student_desk_drawer',(51.675,y,39.54),(.035,.205,.18),'wood_light',bevel=.007)
        cyl('Student_desk_drawer_pull',(51.65,y,39.54),.016,.025,'brass',vertices=10,axis='x')
    # The supplied CRT, keyboard, telephone, mug, school books and chair are kept.
    tube('Student_CRT_power',[(52.12,4.72,39.44),(52.31,4.62,39.59),(52.45,4.42,39.61),
         (52.5,3.99,39.62)],.004,'black',sides=5)
    tube('Student_mouse_wire',[(52.38,4.645,39.17),(52.35,4.63,39.26),(52.25,4.632,39.35),
         (52.18,4.635,39.39)],.0025,'black',sides=5)
    # Replace the flat grey chair upholstery while keeping the rigging-free
    # five-caster office chair's measured geometry and wheel positions.
    for part in ['furn_player_chair_Chair_Back','furn_player_chair_Chair_Seat']:
        obj=ctx.original.get(part)
        if obj and obj.type=='MESH':
            obj.data.materials.clear();obj.data.materials.append(ctx.material('sofa_cloth'))
            bevel=obj.modifiers.new('Soft upholstered edge','BEVEL');bevel.width=.018;bevel.segments=2

    ctx.remove('nightstand_oak.001','nightstand_oak_drawer.001','table_lamp_jar')
    ns_top=nightstand('Student_nightstand',48.897,40.10,3.86)
    lamp('Student_bedside_lamp',48.89,ns_top,40.10,.85)
    box('Student_alarm_clock',(49.04,4.605,39.95),(.13,.095,.07),'black',bevel=.015)
    ctx.plane('Student_alarm_face',(49.108,4.608,39.95),(.09,.045),'screen',normal='x')

    # Existing suitcase and backpack retain position and footprint. Soft cases
    # gain stitched edging, a shoulder strap and a small Brazilian luggage tag.
    tube('Student_backpack_zip',[(51.30,3.96,42.357),(51.30,4.16,42.357),(51.54,4.16,42.357),
         (51.54,3.96,42.357)],.004,'cream',sides=5)
    tube('Student_backpack_strap',[(51.30,4.28,42.56),(51.22,4.12,42.67),(51.30,3.91,42.66)],.014,'leather',sides=6)
    box('Student_luggage_tag',(50.98,4.11,42.62),(.025,.10,.065),'book_green',bevel=.007)
    diamond=box('Student_Brazil_tag_diamond',(50.994,4.11,42.62),(.004,.036,.036),'brass',bevel=.001)
    diamond.rotation_euler.x=math.pi/4
    sphere('Student_Brazil_tag_globe',(50.998,4.11,42.62),(.006,.021,.021),'book_blue',segments=10,rings=6)
    tube('Student_suitcase_zip',[(50.445,4.14,42.535),(50.97,4.14,42.535),(50.97,4.14,42.83),
         (50.445,4.14,42.83),(50.445,4.14,42.535)],.003,'cream',sides=5)
    # A Portuguese pocket dictionary and travel papers are recently unpacked.
    book('Student_dictionary',(50.66,4.194,42.69),(.23,.042,.17),'book_green',yaw=-7)
    box('Student_travel_envelope',(50.77,4.22,42.70),(.16,.006,.105),'paper',bevel=.002,yaw=9)
    for xx in [52.05,52.55]:
        box('Student_wardrobe_inset',(xx,4.92,42.052),(.39,1.43,.018),'wood_dark',bevel=.012)
        box('Student_wardrobe_inset_inner',(xx,4.92,42.039),(.33,1.35,.012),'wood',bevel=.008)

    # ---- Hosts: adult linen, walnut panels, paired reading lamps and a dresser.
    ctx.remove('Fixture_Bed_','Manta dobrada casal')
    cx,cz,base=54.38,41.04,3.84
    for xx in [53.64,55.12]:
        for zz in [40.10,42.04]:
            turned_leg('Hosts_bed_leg',xx,base,zz,.21,.036)
    for xx in [53.59,55.17]:
        box('Hosts_bed_rail',(xx,4.09,cz),(.075,.22,2.09),'wood_dark',bevel=.018)
    box('Hosts_bed_foot',(cx,4.11,42.10),(1.63,.24,.07),'wood',bevel=.018)
    box('Hosts_bed_head',(cx,4.44,40.0),(1.69,1.08,.095),'wood_dark',bevel=.035)
    for xx in [53.98,54.78]:
        box('Hosts_bed_head_panel',(xx,4.57,40.055),(.67,.55,.023),'wood',bevel=.025)
        box('Hosts_bed_head_inset',(xx,4.57,40.071),(.57,.43,.018),'wood_light',bevel=.018)
    box('Hosts_bed_crown',(cx,4.94,40.0),(1.74,.075,.135),'wood',bevel=.022)
    box('Hosts_mattress',(cx,4.35,41.05),(1.56,.27,1.98),'linen',bevel=.075)
    cloth('Hosts_duvet',(cx,4.53,41.31),(1.68,1.56),'host_cloth',cols=30,rows=28,amplitude=.024,edge_drop=.16)
    cloth('Hosts_fold',(cx,4.585,40.60),(1.63,.23),'linen',cols=25,rows=8,amplitude=.008,edge_drop=.10)
    for xx in [53.98,54.78]:
        cushion('Hosts_pillow',(xx,4.58,40.33),(.68,.17,.35),'linen')
        cushion('Hosts_small_pillow',(xx,4.62,40.51),(.39,.13,.23),'host_cloth')
    cloth('Hosts_foot_throw',(cx,4.58,41.89),(1.67,.33),'linen',cols=26,rows=10,amplitude=.013,edge_drop=.15)

    ctx.remove('nightstand_oak.002','nightstand_oak_drawer.002')
    top=nightstand('Hosts_left_nightstand',53.447,40.25,3.86)
    lamp('Hosts_left_lamp',53.447,top,40.25,.83)
    top_right=nightstand('Hosts_right_nightstand',55.54,40.25,3.86,width=.38)
    lamp('Hosts_right_lamp',55.54,top_right,40.25,.83)
    ctx.collider('Hosts_right_nightstand',(55.341,3.86,39.998),(55.739,4.986,40.502))
    book('Hosts_bedside_reading',(55.54,4.576,40.09),(.22,.045,.15),'book_red',yaw=6)

    # The source dresser drawer fronts pointed at the wall. Rebuild the same
    # footprint with fronts towards the room and leave its top props in place.
    ctx.remove('Fixture_Dresser_')
    x,z=57.45,42.30
    for xx in [56.96,57.94]:
        for zz in [42.13,42.47]:
            box('Hosts_dresser_foot',(xx,3.93,zz),(.065,.18,.065),'wood_dark',bevel=.011)
    box('Hosts_dresser_case',(x,4.28,z),(1.10,.55,.44),'wood_dark',bevel=.013)
    box('Hosts_dresser_top',(x,4.588,z),(1.144,.044,.484),'wood',bevel=.014)
    for y in [4.10,4.28,4.46]:
        box('Hosts_dresser_drawer',(x,y,42.067),(1.01,.153,.033),'wood',bevel=.009)
        for xx in [57.19,57.71]:
            knob('Hosts_dresser_pull',(xx,y,42.043),.016)
    box('Hosts_dresser_mirrorframe',(x,5.05,42.49),(.70,.73,.045),'wood',bevel=.025)
    ctx.plane('Hosts_dresser_mirror',(x,5.05,42.462),(.60,.63),'glass',normal='z',yaw=180)
    framed('Hosts_wedding_photo',57.76,4.73,42.18,.18,.24,'photo',yaw=180)
    box('Hosts_jewellery_box',(57.01,4.665,42.33),(.21,.105,.14),'leather',bevel=.017)
    knob('Hosts_jewellery_clasp',(57.01,4.66,42.25),.009)

    # ---- Unassigned upstairs front room: a quiet flexible guest room.
    lo,hi=single_bed('Guest_bed',49.0,32.40,3.84,'linen',guest=True)
    cloth('Guest_bed_runner',(50.61,4.55,32.40),(1.04,.35),'host_cloth',cols=22,rows=10,amplitude=.012,edge_drop=.12,yaw=90)
    ctx.collider('Guest_bed',lo,hi)
    # A small writing table, never a new mission or a new story location.
    x,z=52.20,34.68
    for dx in [-.34,.34]:
        for dz in [-.25,.25]:
            turned_leg('Guest_writing_leg',x+dx,3.84,z+dz,.68,.023)
    box('Guest_writing_apron',(x,4.45,z),(.75,.12,.58),'wood_dark',bevel=.009)
    box('Guest_writing_top',(x,4.566,z),(.80,.052,.64),'wood',bevel=.014)
    ctx.collider('Guest_writing_table',(51.80,3.84,34.36),(52.60,4.592,35.00))
    book('Guest_reading_book',(52.30,4.62,34.70),(.25,.055,.19),'book_blue',yaw=-4)
    box('Guest_writing_pad',(51.99,4.598,34.63),(.22,.012,.29),'paper',bevel=.003,yaw=7)
    tube('Guest_pencil',[(52.05,4.61,34.55),(52.12,4.61,34.72)],.004,'wood',sides=6)
    lamp('Guest_reading_lamp',52.35,4.592,34.47,.7)
    framed('Guest_landscape',50.35,5.43,31.125,.79,.52,'landscape')
    framed('Hosts_landscape',55.65,5.66,42.87,.70,.48,'landscape',yaw=180)
