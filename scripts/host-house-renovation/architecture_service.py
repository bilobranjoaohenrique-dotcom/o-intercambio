"""Measured, nonstructural finishing of the supplied house's circulation/services.

All coordinates are the original glTF metres (Y up). No wall, opening, window,
flight or floor is moved. New geometry is kept against walls or within existing
furniture footprints. The garage remains the source's decorative garage.
"""
import math
import bpy
from mathutils import Vector, Matrix


def _mesh(ctx, name, verts, faces, material, uv=None):
    mesh = bpy.data.meshes.new('REN_' + name)
    mesh.from_pydata([(x, -z, y) for x, y, z in verts], [], [tuple(reversed(face)) for face in faces])
    mesh.materials.append(ctx.material(material))
    mesh.update()
    obj = bpy.data.objects.new('REN_' + name, mesh)
    bpy.context.collection.objects.link(obj)
    ctx.objects.append(obj)
    layer = mesh.uv_layers.new(name='UVMap')
    if uv:
        for polygon in mesh.polygons:
            for li in polygon.loop_indices:
                layer.data[li].uv = uv[mesh.loops[li].vertex_index]
    else:
        for polygon in mesh.polygons:
            for li in polygon.loop_indices:
                x, y, z = verts[mesh.loops[li].vertex_index]
                layer.data[li].uv = (x * 2, z * 2 + y * 2)
    # Ring surfaces face the room and bowl interiors rather than the shell.
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def _hang(ctx, name, center, width, height, material='linen', normal='z', folds=6):
    """A hanging textile with actual pleats, a gently irregular bottom and UVs."""
    cx, cy, cz = center
    cols, rows = 30, 12
    verts, uv, faces = [], [], []
    for row in range(rows + 1):
        v = row / rows
        for col in range(cols + 1):
            u = col / cols
            across = (u - .5) * width
            pleat = .018 * math.sin(u * math.pi * folds * 2) + .006 * math.sin(u * 31 + v * 4)
            y = cy + (.5 - v) * height + .009 * v * math.sin(u * 17)
            verts.append((cx + pleat, y, cz + across) if normal == 'x' else (cx + across, y, cz + pleat))
            uv.append((u, 1 - v))
    for row in range(rows):
        for col in range(cols):
            a = row * (cols + 1) + col
            faces.append((a, a + 1, a + cols + 2, a + cols + 1))
    return _mesh(ctx, name, verts, faces, material, uv)


def _picture(ctx, name, center, width, height, material='photo', normal='z', facing=-1):
    x, y, z = center
    d = .047
    if normal == 'x':
        ctx.box(name + '_back', (x, y, z), (d, height, width), 'wood_dark', .009)
        ctx.box(name + '_mat', (x + facing * .026, y, z), (.01, height - .05, width - .05), 'paper', .002)
        art = ctx.plane(name + '_image', (x + facing * .033, y, z), (width - .13, height - .13), material, normal='x')
        if facing > 0:
            art.data.flip_normals()
    else:
        ctx.box(name + '_back', (x, y, z), (width, height, d), 'wood_dark', .009)
        ctx.box(name + '_mat', (x, y, z + facing * .026), (width - .05, height - .05, .01), 'paper', .002)
        art = ctx.plane(name + '_image', (x, y, z + facing * .033), (width - .13, height - .13), material)
        if facing < 0:
            art.data.flip_normals()


def _cabinet_front(ctx, name, x, y, z, width, height, facing=-1):
    """Raised panel doors, separate stiles and modest metal pulls."""
    for side in [-1, 1]:
        cx = x + side * width * .25
        ctx.box(name + '_door', (cx, y, z), (width * .48, height, .035), 'wood_light', .009)
        ctx.box(name + '_panel', (cx, y, z + facing * .023), (width * .35, height - .12, .015), 'wood', .007)
        px = cx - side * width * .15
        ctx.tube(name + '_pull', [(px, y - .055, z + facing * .057), (px, y + .055, z + facing * .057)], .009, 'brass', 8)


def _bottle(ctx, name, x, y, z, height=.19, material='cream'):
    ctx.cylinder(name + '_body', (x, y + height * .38, z), height * .21, height * .76, material, 12, 'y', height * .18)
    ctx.cylinder(name + '_neck', (x, y + height * .84, z), height * .10, height * .18, material, 10)
    ctx.cylinder(name + '_cap', (x, y + height * .96, z), height * .115, height * .08, 'cream', 10)
    ctx.box(name + '_label', (x, y + height * .39, z - height * .195), (height * .26, height * .30, .003), 'paper', .002)


def _rotate_group(ctx, name, x, z):
    group = ctx.original.get(name)
    if group:
        pivot = Vector((x, -z, 0))
        transform = Matrix.Translation(pivot) @ Matrix.Rotation(math.pi, 4, 'Z') @ Matrix.Translation(-pivot)
        group.matrix_world = transform @ group.matrix_world


def _architectural_trim(ctx):
    originals = list(ctx.original.items())
    seen = set()
    for name, obj in originals:
        if name not in bpy.data.objects or obj.type != 'MESH':
            continue
        structural = (name.startswith(('back_ext_', 'left_ext_', 'right_ext_', 'ground_cross_', 'ground_foyer_partition_',
                                       'ground_stairs_partition_', 'upper_left_rooms_', 'upper_right_rooms_',
                                       'Wall_upper_', 'Wall_front_', 'Wall_powder_')))
        if not structural or 'lintel' in name.lower() or '_head' in name:
            continue
        lo, hi = ctx.bounds(name)
        if not lo or hi[1] - lo[1] < .65:
            continue
        floor = 3.84 if lo[1] >= 3.7 else .39
        if abs(lo[1] - floor) > .05:
            continue
        dx, dz = hi[0] - lo[0], hi[2] - lo[2]
        # The original front is normal to X; its sill sections keep their trim.
        normal = 'x' if dx < .22 else 'z' if dz < .22 else None
        if normal is None:
            continue
        interior = [1] if name.startswith('Wall_front_') or name.startswith('right_ext_') else [-1] if name.startswith(('back_ext_', 'left_ext_')) else [-1, 1]
        # Exterior right/left are normal to Z; keep only the actual inner face.
        for sign in interior:
            if normal == 'x':
                edge = hi[0] if sign == 1 else lo[0]
                center = (edge + sign * .017, floor + .065, (lo[2] + hi[2]) * .5)
                size = (.034, .13, dz)
            else:
                edge = hi[2] if sign == 1 else lo[2]
                center = ((lo[0] + hi[0]) * .5, floor + .065, edge + sign * .017)
                size = (dx, .13, .034)
            key = tuple(round(v, 3) for v in center + size)
            if key in seen:
                continue
            seen.add(key)
            ctx.box('service_baseboard_' + name, center, size, 'paint', .006)
            # A separate small bead casts a readable edge against plaster.
            beadcenter = (center[0], floor + .133, center[2])
            beadsize = (.04, .018, dz) if normal == 'x' else (dx, .018, .04)
            ctx.box('service_baseboard_bead', beadcenter, beadsize, 'paint', .004)
            if hi[1] - floor > 2.8:
                ceiling = 6.94 if floor > 3 else 3.49
                crown = (center[0], ceiling - .055, center[2])
                crownsize = (.07, .11, dz) if normal == 'x' else (dx, .11, .07)
                ctx.box('service_crown_' + name, crown, crownsize, 'paint', .012)
    # Openings are framed outside their audited edges; clear widths stay intact.
    for name, obj in originals:
        if name not in bpy.data.objects or obj.type != 'MESH' or 'lintel' not in name.lower():
            continue
        if name.startswith(('upper_left_rooms_', 'upper_right_rooms_')):
            # These native old divider openings have since been closed by walls.
            continue
        lo, hi = ctx.bounds(name)
        if not lo:
            continue
        floor = 3.84 if lo[1] > 4 else .39
        height = lo[1] - floor
        if not 1.85 <= height <= 2.3:
            continue
        dx, dz = hi[0] - lo[0], hi[2] - lo[2]
        normal = 'x' if dx < .22 else 'z' if dz < .22 else None
        if not normal:
            continue
        for sign in [-1, 1]:
            if normal == 'z':
                z = (hi[2] if sign == 1 else lo[2]) + sign * .018
                for x in [lo[0] - .035, hi[0] + .035]:
                    ctx.box('service_door_jamb', (x, floor + height * .5, z), (.07, height, .036), 'paint', .006)
                ctx.box('service_door_header', ((lo[0] + hi[0]) * .5, lo[1] + .035, z), (dx + .14, .07, .036), 'paint', .006)
            else:
                x = (hi[0] if sign == 1 else lo[0]) + sign * .018
                for z in [lo[2] - .035, hi[2] + .035]:
                    ctx.box('service_door_jamb', (x, floor + height * .5, z), (.036, height, .07), 'paint', .006)
                ctx.box('service_door_header', (x, lo[1] + .035, (lo[2] + hi[2]) * .5), (.036, .07, dz + .14), 'paint', .006)


def _hall_and_stairs(ctx):
    # Finish the native front portal without narrowing its original opening.
    for z in [36.14, 37.86]:
        ctx.box('service_entry_portal_jamb', (48.166, 1.3825, z), (.055, 1.985, .07), 'paint', .006)
    ctx.box('service_entry_portal_header', (48.166, 2.410, 37), (.055, .07, 1.79), 'paint', .006)
    ctx.box('service_entry_threshold', (48.155, .393, 37), (.15, .012, 1.65), 'wood_dark', .003)
    # Preserve all eighteen original treads and their collision heights.
    for i in range(18):
        start = 52.78 + .227 * i
        top = .39 + (3.84 - .39) * (i + 1) / 18
        ctx.box('service_stair_nosing', (start + .025, top - .001, 37.475), (.052, .018, 1.10), 'wood_light', .006)
        ctx.box('service_stair_riser', (start - .007, top - .10, 37.475), (.004, .14, 1.09), 'paint', .002)
    ctx.remove('Corrimao_carvalho')
    p0, p1 = (52.80, 1.446, 38.04), (56.86, 4.73, 38.04)
    ctx.tube('service_rounded_oak_handrail', [p0, p1], .034, 'wood', 12)
    for t in [.08, .37, .68, .94]:
        x, y = p0[0] + t * (p1[0] - p0[0]), p0[1] + t * (p1[1] - p0[1])
        ctx.tube('service_rail_bracket', [(x, y - .05, 38.12), (x, y - .08, 38.04), (x, y, 38.04)], .012, 'brass', 8)
    ctx.box('service_gallery_cap', (54.93, 4.87, 36.785), (3.88, .065, .115), 'wood', .018)
    ctx.box('service_gallery_front_cap', (52.98, 4.87, 37.50), (.12, .065, 1.37), 'wood', .018)
    ctx.box('service_upper_hall_runner_edge', (50.05, 3.851, 37.0), (2.9, .018, .78), 'linen', .008)
    ctx.plane('service_upper_hall_runner', (50.05, 3.861, 37.0), (2.9, .78), 'rug', normal='y')
    ctx.box('service_gallery_runner_edge', (54.7, 3.851, 36.28), (2.6, .018, .60), 'linen', .008)
    ctx.plane('service_gallery_runner', (54.7, 3.861, 36.28), (2.6, .60), 'rug', normal='y')
    _picture(ctx, 'service_hall_family', (52.12, 2.12, 38.095), .55, .67, 'photo')
    _picture(ctx, 'service_hall_landscape', (52.02, 2.08, 35.905), .68, .49, 'landscape', facing=1)
    _picture(ctx, 'service_gallery_landscape', (54.3, 5.58, 35.915), .78, .55, 'landscape', facing=1)
    _picture(ctx, 'service_upper_family_1', (51.95, 5.57, 38.10), .42, .53, 'photo')
    _picture(ctx, 'service_upper_family_2', (52.50, 5.57, 38.10), .38, .48, 'photo')
    # Flush switches/outlets, no floor-space encroachment.
    for x, y, z, facing in [(50.0, 1.62, 38.10, -1), (51.35, 1.62, 35.90, 1),
                              (57.68, 5.06, 35.90, 1), (51.30, 5.06, 38.10, -1)]:
        ctx.box('service_switch_plate', (x, y, z), (.078, .12, .014), 'paint', .007)
        ctx.box('service_switch_rocker', (x, y, z + facing * .012), (.026, .055, .01), 'cream', .003)
    for x, y, z, facing in [(52.56, .69, 38.10, -1), (52.23, 4.15, 35.90, 1)]:
        ctx.box('service_socket_plate', (x, y, z), (.08, .12, .012), 'paint', .006)
        for ox in [-.013, .013]:
            ctx.box('service_socket_slot', (x + ox, y, z + facing * .008), (.005, .021, .003), 'black', .001)
    # Mail and keys live on the existing entry console, not the floor.
    ctx.box('service_entry_mail', (49.08, .989, 35.99), (.21, .012, .12), 'paper', .002, yaw=7)
    ctx.cylinder('service_entry_keydish', (49.17, 1.006, 35.98), .065, .025, 'ceramic', 16)
    ctx.tube('service_entry_keys', [(49.14, 1.023, 35.97), (49.20, 1.023, 35.97)], .007, 'brass', 8)
    # One lightweight hanging outer shirt suggests the hosts use this hall daily.
    cx, cy, cz = 49.13, 1.32, 38.03
    outline = [(-.10, .30), (-.21, .25), (-.32, .05), (-.24, -.01), (-.17, .10),
               (-.16, -.31), (.16, -.31), (.17, .10), (.24, -.01), (.32, .05), (.21, .25), (.10, .30)]
    verts = [(cx + x, cy + y, cz - .015 - .016 * math.sin(x * 29)) for x, y in outline]
    _mesh(ctx, 'service_hanging_jacket', verts, [tuple(range(len(verts)))], 'host_cloth')
    ctx.tube('service_jacket_buttonline', [(cx, cy - .28, cz - .035), (cx, cy + .25, cz - .035)], .003, 'linen', 6)


def _basin(ctx, name, center, rx, rz, depth, material='ceramic'):
    cx, cy, cz = center
    rings = [(1, 0), (.91, -.015), (.78, -depth * .68), (.30, -depth)]
    verts, uv, faces = [], [], []
    sides = 24
    for ring, (r, y) in enumerate(rings):
        for i in range(sides):
            t = 2 * math.pi * i / sides
            verts.append((cx + rx * r * math.cos(t), cy + y, cz + rz * r * math.sin(t)))
            uv.append((i / sides, ring / (len(rings) - 1)))
    for ring in range(len(rings) - 1):
        for i in range(sides):
            a, b = ring * sides + i, ring * sides + (i + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.append(tuple(range((len(rings) - 1) * sides, len(rings) * sides)))
    _mesh(ctx, name, verts, faces, material, uv)
    ctx.cylinder(name + '_drain', (cx, cy - depth + .004, cz), .021, .006, 'chrome', 12)


def _bathrooms(ctx):
    ctx.remove('furn_bath_sink_', 'bath_mirror', 'bath_tub', 'Banheiro_cortina', 'Banheiro_varao', 'Vaso banheiro_', 'sink_unit_white', 'furn_lavabo_pia')
    ctx.box('service_bath_floor', (55.50, 3.844, 33.40), (4.86, .008, 4.66), 'tile', .001)
    ctx.box('service_powder_floor', (56.855, .394, 41.5175), (2.15, .008, 2.825), 'tile', .001)
    # Upper bathroom, panelled vanity within the former sink's measured bounds.
    ctx.box('service_bath_vanity_body', (55.70, 4.205, 31.72), (.98, .67, .56), 'wood', .012)
    ctx.box('service_bath_vanity_toe', (55.70, 3.905, 31.72), (.89, .11, .48), 'wood_dark', .005)
    _cabinet_front(ctx, 'service_bath_vanity', 55.70, 4.24, 32.014, .92, .62, 1)
    # Four actual stone strips surround the basin opening instead of a slab
    # intersecting a fake flat sink.
    ctx.box('service_bath_counter_back', (55.70, 4.663, 31.465), (1.05, .06, .13), 'stone', .008)
    ctx.box('service_bath_counter_front', (55.70, 4.663, 31.995), (1.05, .06, .13), 'stone', .008)
    for x in [55.27, 56.13]:
        ctx.box('service_bath_counter_side', (x, 4.663, 31.73), (.19, .06, .40), 'stone', .008)
    _basin(ctx, 'service_bath_oval_basin', (55.70, 4.695, 31.73), .34, .205, .125)
    ctx.tube('service_bath_faucet', [(55.70, 4.69, 31.48), (55.70, 4.92, 31.48), (55.70, 4.97, 31.57), (55.70, 4.94, 31.69)], .019, 'chrome', 12)
    for x in [55.59, 55.81]:
        ctx.cylinder('service_bath_tap', (x, 4.72, 31.49), .024, .055, 'chrome', 12)
        ctx.tube('service_bath_tap_cross', [(x - .025, 4.755, 31.49), (x + .025, 4.755, 31.49)], .007, 'chrome', 8)
    ctx.box('service_bath_mirror_frame', (55.70, 5.45, 31.245), (.87, .95, .055), 'wood', .012)
    ctx.box('service_bath_mirror', (55.70, 5.45, 31.28), (.75, .83, .014), 'glass', .006)
    ctx.box('service_bath_soapdish', (55.30, 4.705, 31.73), (.12, .022, .08), 'ceramic', .006)
    ctx.box('service_bath_soap', (55.30, 4.724, 31.73), (.081, .028, .051), 'cream', .009)
    _bottle(ctx, 'service_bath_lotion', 56.10, 4.696, 31.60, .17, 'book_green')
    ctx.cylinder('service_toothbrush_cup', (56.10, 4.75, 31.87), .036, .105, 'ceramic', 12)
    for x in [56.085, 56.11]:
        ctx.tube('service_toothbrush', [(x, 4.78, 31.87), (x + .01, 4.94, 31.87)], .005, 'book_blue', 6)
    ctx.tube('service_bath_towelrail', [(54.45, 5.10, 31.22), (54.45, 5.10, 31.30), (55.00, 5.10, 31.30), (55.00, 5.10, 31.22)], .012, 'chrome', 8)
    _hang(ctx, 'service_bath_handtowel', (54.72, 4.85, 31.31), .36, .50, 'linen', folds=4)
    # Rounded bathtub shell/rim/interior. The original box footprint is retained.
    cx, cz = 56.70, 33.80
    rings = [(.94, 1.90, 3.89), (1.05, 2.10, 4.46), (.88, 1.89, 4.46), (.72, 1.68, 4.02)]
    verts, faces, uv = [], [], []
    sides = 40
    for ri, (sx, sz, y) in enumerate(rings):
        for i in range(sides):
            a = i * 2 * math.pi / sides
            # Superellipse gives a softly rounded rectangular household bath.
            c, s = math.cos(a), math.sin(a)
            xx = math.copysign(abs(c) ** .48, c)
            zz = math.copysign(abs(s) ** .48, s)
            verts.append((cx + xx * sx / 2, y, cz + zz * sz / 2))
            uv.append((i / sides, ri / 3))
    for ri in range(3):
        for i in range(sides):
            a, b = ri * sides + i, ri * sides + (i + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.append(tuple(range(3 * sides, 4 * sides)))
    _mesh(ctx, 'service_bath_tub_shell', verts, faces, 'ceramic', uv)
    ctx.cylinder('service_tub_drain', (56.7, 4.025, 33.05), .035, .008, 'chrome', 12)
    ctx.cylinder('service_tub_filler_foot', (57.30, 3.88, 32.96), .060, .060, 'chrome', 16)
    ctx.tube('service_tub_mixer', [(57.30, 3.89, 32.96), (57.30, 4.78, 32.96), (57.16, 4.78, 32.96), (57.16, 4.66, 32.96)], .021, 'chrome', 12)
    ctx.tube('service_bath_curtain_rod', [(56.04, 6.13, 32.86), (56.04, 6.13, 34.86)], .016, 'chrome', 10)
    _hang(ctx, 'service_bath_pleated_curtain', (56.04, 5.23, 34.22), 1.10, 1.73, 'curtain', normal='x', folds=9)
    for i in range(9):
        z = 33.69 + i * .131
        ring = [(56.04 + .028 * math.cos(a * math.pi / 8), 6.10 + .028 * math.sin(a * math.pi / 8), z) for a in range(17)]
        ctx.tube('service_shower_curtain_ring', ring, .004, 'chrome', 6)
    # Existing modelled toilets are retained; only the ground one faced the wall.
    _rotate_group(ctx, 'Kit_Toilet_0', 56.28, 42.5)
    ctx.collider('service_powder_toilet', (56.019, .39, 42.05), (56.541, 1.26, 42.95))
    # Powder-room mirror, warm wooden cabinet fronts and folded hand towel.
    ctx.box('service_powder_mirror_frame', (57.48, 1.79, 42.88), (.67, .81, .048), 'wood', .01)
    ctx.box('service_powder_mirror', (57.48, 1.79, 42.85), (.56, .70, .012), 'glass', .005)
    ctx.box('service_powder_vanity_body', (57.49, .675, 42.54), (.64, .54, .39), 'wood', .01)
    _cabinet_front(ctx, 'service_powder_vanity', 57.49, .72, 42.328, .58, .53, -1)
    for x in [57.18, 57.80]:
        ctx.box('service_powder_counter_side', (x, 1.05, 42.53), (.09, .04, .47), 'stone', .006)
    for z in [42.335, 42.725]:
        ctx.box('service_powder_counter_edge', (57.49, 1.05, z), (.70, .04, .08), 'stone', .006)
    _basin(ctx, 'service_powder_basin', (57.49, 1.073, 42.53), .245, .15, .085)
    ctx.tube('service_powder_faucet', [(57.49, 1.07, 42.73), (57.49, 1.27, 42.73), (57.49, 1.31, 42.65), (57.49, 1.27, 42.55)], .014, 'chrome', 10)
    _bottle(ctx, 'service_powder_soap', 57.78, 1.073, 42.60, .14, 'cream')
    ctx.tube('service_powder_towelrail', [(55.80, 1.65, 41.60), (55.87, 1.65, 41.60), (55.87, 1.65, 42.02), (55.80, 1.65, 42.02)], .010, 'brass', 8)
    _hang(ctx, 'service_powder_handtowel', (55.89, 1.40, 41.81), .30, .48, 'host_cloth', normal='x', folds=4)
    for x, y, z in [(57.86, 4.36, 32.60), (55.83, .95, 42.29)]:
        # Horizontal roll with visible cardboard core; thin enough for the wall.
        ctx.cylinder('service_toilet_paper', (x, y, z), .052, .13, 'paper', 16, 'z')
        ctx.cylinder('service_toilet_paper_core', (x, y, z - .067), .016, .008, 'cardboard', 12, 'z')


def _laundry(ctx):
    ctx.remove('furn_utility_bookcase_reused', 'bookcase_tall.002', 'wall_cabinet_white')
    _rotate_group(ctx, 'Kit_Washer_0', 54.35, 42.5)
    _rotate_group(ctx, 'Kit_Dryer_0', 55.19, 42.5)
    # Shared footprint, models now face the open service room rather than wall.
    ctx.collider('service_washer_front', (54.02, .39, 42.10), (54.68, 1.49, 42.83))
    ctx.collider('service_dryer_front', (54.86, .39, 42.10), (55.52, 1.38, 42.83))
    ctx.box('service_laundry_wall_cabinet', (54.77, 2.39, 42.73), (1.49, .74, .32), 'wood', .01)
    _cabinet_front(ctx, 'service_laundry_wall_cabinet', 54.77, 2.39, 42.548, 1.40, .65, -1)
    ctx.box('service_laundry_shelf', (54.77, 1.61, 42.70), (1.49, .045, .39), 'wood_light', .007)
    for x in [54.13, 55.40]:
        ctx.tube('service_laundry_bracket', [(x, 1.39, 42.91), (x, 1.59, 42.55), (x, 1.59, 42.91)], .012, 'metal', 8)
    for i, mat in enumerate(['book_blue', 'cream', 'book_green']):
        _bottle(ctx, 'service_laundry_detergent', 54.21 + i * .23, 1.635, 42.70, .27 + .025 * i, mat)
    for i in range(3):
        ctx.box('service_laundry_folded_towel', (55.22, 1.66 + i * .045, 42.68), (.37, .045, .25), 'linen' if i % 2 == 0 else 'host_cloth', .015)
    # A wall-mounted broom remains clear of the doorway at Z38.2.
    ctx.tube('service_laundry_broom_handle', [(53.19, .67, 41.37), (53.19, 1.95, 41.37)], .014, 'wood_light', 10)
    ctx.box('service_laundry_broom_head', (53.19, .56, 41.37), (.06, .21, .28), 'wood', .018)
    for i in range(8):
        ctx.tube('service_laundry_broom_bristle', [(53.18, .55, 41.27 + .029 * i), (53.18, .405, 41.25 + .034 * i)], .007, 'cream', 6)
    ctx.box('service_laundry_rug_edge', (54.75, .401, 41.93), (1.45, .018, .55), 'linen', .008)
    ctx.plane('service_laundry_rug', (54.75, .411, 41.93), (1.45, .55), 'rug_blue', normal='y')
    _picture(ctx, 'service_laundry_washday', (53.18, 2.16, 40.8), .36, .46, 'landscape', normal='x', facing=1)


def _garage(ctx):
    # Source garage is deliberately still static: there is no exported doorway
    # or navigable path from the house, and this pass invents neither.
    ctx.remove('furn_garagem_estante', 'bookcase_tall.003')
    for z in [28.78, 30.28]:
        for x in [57.18, 57.63]:
            ctx.box('service_garage_shelf_upright', (x, 1.32, z), (.035, 1.93, .035), 'metal', .005)
    for y in [.44, 1.04, 1.65, 2.24]:
        ctx.box('service_garage_shelf', (57.40, y, 29.53), (.51, .045, 1.58), 'wood', .005)
    for x, y, z, sx, sy, sz in [(57.41, .64, 29.06, .36, .35, .44), (57.40, .63, 29.75, .37, .33, .52),
                                (57.4, 1.26, 29.87, .35, .39, .46), (57.41, 1.84, 29.17, .34, .34, .43)]:
        ctx.box('service_garage_cardboard_box', (x, y, z), (sx, sy, sz), 'cardboard', .007)
        ctx.box('service_garage_box_tape', (x, y + sy * .5 + .002, z), (sx + .002, .004, .053), 'paper', .001)
        ctx.box('service_garage_box_label', (x - sx * .5 - .002, y, z), (.004, sy * .34, sz * .40), 'paper', .001)
    for z in [29.03, 29.35]:
        ctx.cylinder('service_garage_paintcan', (57.37, 1.17, z), .089, .22, 'cream', 14)
        ctx.cylinder('service_garage_paintcan_lid', (57.37, 1.285, z), .094, .014, 'metal', 14)
    ctx.box('service_garage_pegboard', (57.73, 2.06, 26.61), (.045, 1.12, 1.58), 'wood_light', .009)
    # Tools are recognizable silhouettes, mounted at the back wall.
    for z in [26.12, 26.50, 26.90, 27.23]:
        ctx.tube('service_garage_peg', [(57.69, 2.37, z), (57.62, 2.37, z)], .008, 'metal', 6)
    ctx.tube('service_garage_hammer_handle', [(57.62, 1.80, 26.12), (57.62, 2.36, 26.12)], .022, 'wood', 10)
    ctx.box('service_garage_hammer_head', (57.62, 2.36, 26.12), (.07, .075, .24), 'metal', .016)
    ctx.tube('service_garage_screwdriver_shaft', [(57.62, 1.77, 26.50), (57.62, 2.13, 26.50)], .008, 'chrome', 8)
    ctx.cylinder('service_garage_screwdriver_grip', (57.62, 2.24, 26.50), .031, .23, 'book_red', 10)
    ctx.tube('service_garage_spanner', [(57.62, 1.84, 26.90), (57.62, 2.34, 26.90)], .022, 'chrome', 10)
    for y in [1.84, 2.34]:
        ctx.tube('service_garage_spanner_jaw', [(57.62, y + .03, 26.87), (57.62, y, 26.84), (57.62, y - .035, 26.87), (57.62, y - .035, 26.94)], .013, 'chrome', 8)
    ctx.tube('service_garage_pliers', [(57.62, 1.82, 27.18), (57.62, 2.12, 27.25), (57.62, 2.36, 27.16)], .019, 'metal', 8)
    ctx.tube('service_garage_pliers', [(57.62, 1.82, 27.30), (57.62, 2.12, 27.23), (57.62, 2.36, 27.31)], .019, 'metal', 8)
    for i in range(3):
        loop = [(57.69 - .025 * i, 1.62 + (.26 + i * .009) * math.cos(a * math.pi / 24), 25.25 + (.26 + i * .009) * math.sin(a * math.pi / 24)) for a in range(49)]
        ctx.tube('service_garage_hose_loop', loop, .018, 'leaf_dark', 8)
    ctx.box('service_garage_worktop', (56.55, 1.375, 24.98), (.72, .045, .75), 'wood', .009)
    ctx.box('service_garage_toolcase', (56.56, 1.49, 24.99), (.40, .19, .23), 'book_red', .018)
    ctx.tube('service_garage_toolcase_handle', [(56.44, 1.59, 24.99), (56.44, 1.67, 24.99), (56.67, 1.67, 24.99), (56.67, 1.59, 24.99)], .012, 'metal', 8)


def _fixtures(ctx):
    ctx.remove('Luminaria_hall', 'Luminaria_corredor', 'Luminaria_banheiro')
    for name, x, y, z in [('hall', 49, 3.49, 37), ('gallery', 55.5, 6.94, 36.25),
                           ('bath', 55.6, 6.94, 33.45), ('laundry', 54.65, 3.49, 40.8),
                           ('powder', 56.8, 3.49, 41.5), ('garage', 54, 4.03, 27.4)]:
        ctx.cylinder('service_' + name + '_ceiling_rose', (x, y - .035, z), .10, .055, 'brass', 16)
        ctx.tube('service_' + name + '_stem', [(x, y - .06, z), (x, y - .19, z)], .018, 'brass', 10)
        ctx.cylinder('service_' + name + '_shade_rim', (x, y - .22, z), .235, .042, 'brass', 20)
        ctx.sphere('service_' + name + '_opal_diffuser', (x, y - .255, z), (.43, .19, .43), 'bulb', 20, 10)


def build(ctx):
    _architectural_trim(ctx)
    _hall_and_stairs(ctx)
    _bathrooms(ctx)
    _laundry(ctx)
    _garage(ctx)
    _fixtures(ctx)
