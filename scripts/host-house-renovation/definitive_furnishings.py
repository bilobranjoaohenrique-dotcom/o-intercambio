"""Final domestic furniture corrections, appended after the approved room passes.

All coordinates use the original GLTF Y-up metre space.  In particular, the
three native hosts' wardrobe nodes retain their transforms: the runtime still
owns their one and only +1.45 m Z clearance adjustment.
"""
import math

import bpy
from mathutils import Vector

from common import source, source_bounds, xyz


def _islands(mesh):
    """Connected vertex islands also identify pieces in native joined props."""
    neighbours = [[] for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        neighbours[a].append(b)
        neighbours[b].append(a)
    unseen = set(range(len(mesh.vertices)))
    while unseen:
        todo = [unseen.pop()]
        island = []
        while todo:
            i = todo.pop()
            island.append(i)
            for j in neighbours[i]:
                if j in unseen:
                    unseen.remove(j)
                    todo.append(j)
        yield island


def build(ctx):
    box, cyl, tube = ctx.box, ctx.cylinder, ctx.tube
    bpy.context.view_layer.update()

    def remove_new(*prefixes):
        for obj in list(ctx.objects):
            if any(obj.name.startswith(p) for p in prefixes):
                name = obj.name
                ctx.objects.remove(obj)
                if name in bpy.data.objects:
                    bpy.data.objects.remove(obj, do_unlink=True)
                ctx.removed.append(name)

    def translate_source(obj, delta):
        # Some native prop groups have scaled parents (the hosts' books use
        # .74). Apply metre deltas in world space rather than their local scale.
        matrix = obj.matrix_world.copy()
        matrix.translation += Vector(xyz(delta))
        obj.matrix_world = matrix

    def soft(name, center, size, mat, yaw=0, lean=0, exponent=3.5):
        """Low-poly upholstered volume with curved faces and a full soft edge.

        A superellipsoid gives each cushion a broad, gently inflated surface;
        a bevelled cube alone leaves nearly all of its face perfectly flat.
        """
        w, h, d = size
        around, levels = 24, 12
        verts = [xyz((0, -h / 2, 0))]
        faces = []

        def power(n, p):
            return math.copysign(abs(n) ** p, n)

        for j in range(1, levels):
            phi = -math.pi / 2 + math.pi * j / levels
            radius = abs(math.cos(phi)) ** (2 / exponent)
            yy = power(math.sin(phi), 2 / exponent) * h / 2
            for i in range(around):
                theta = i * 2 * math.pi / around
                xx = power(math.cos(theta), 2 / exponent) * radius * w / 2
                zz = power(math.sin(theta), 2 / exponent) * radius * d / 2
                verts.append(xyz((xx, yy, zz)))
        top = len(verts)
        verts.append(xyz((0, h / 2, 0)))
        for i in range(around):
            faces.append((0, 1 + (i + 1) % around, 1 + i))
        for j in range(levels - 2):
            a = 1 + j * around
            b = a + around
            for i in range(around):
                k = (i + 1) % around
                faces.append((a + i, a + k, b + k, b + i))
        last = 1 + (levels - 2) * around
        for i in range(around):
            faces.append((last + i, last + (i + 1) % around, top))
        # Reversing the theta/latitude order gives outward-facing upholstery.
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(verts, [], [tuple(reversed(face)) for face in faces])
        mesh.update()
        for polygon in mesh.polygons:
            polygon.use_smooth = True
        obj = ctx._mesh_object(name, mesh, center)
        obj.rotation_euler.x = math.radians(lean)
        obj.rotation_euler.z = math.radians(yaw)
        return ctx._finish(obj, name, mat)

    def book(name, center, size, cover='book_red', yaw=0):
        x, y, z = center
        w, h, d = size
        box(name + '_pages', (x, y, z), (w * .94, h * .73, d * .94),
            'paper', bevel=.002, yaw=yaw)
        for sign in [-1, 1]:
            box(name + '_cover', (x, y + sign * h * .435, z),
                (w, h * .13, d), cover, bevel=.003, yaw=yaw)

    def knob(name, center, radius=.014):
        ctx.sphere(name, center, (radius * 2,) * 3, 'brass', 10, 6)

    # ---- Living room: replace the overlapping original/new cloth pile once.
    ctx.remove('Almofada_sala', 'Manta sobre braço do sofá')
    remove_new('REN_Living_throw', 'REN_Living_sofa_lower',
               'REN_Living_sofa_seat_', 'REN_Living_sofa_back_',
               'REN_Living_sofa_rolled_arm', 'REN_Living_sofa_arm_welt',
               'REN_Living_sofa_scatter', 'REN_Living_sofa_front_piping',
               'REN_Living_armchair_lower', 'REN_Living_armchair_seat_',
               'REN_Living_armchair_back_', 'REN_Living_armchair_rolled_arm',
               'REN_Living_armchair_arm_welt', 'REN_Living_armchair_scatter',
               'REN_Living_armchair_front_piping')

    def seating(name, cx, width, count):
        z = 40.172
        soft(name + '_upholstered_base', (cx, .656, z),
             (width - .06, .29, .80), 'sofa_cloth', exponent=5.5)
        sw = (width - .39) / count
        for i in range(count):
            x = cx - width / 2 + .195 + sw * (i + .5)
            soft(name + '_loose_seat', (x, .846, z + .080),
                 (sw - .013, .182, .588), 'sofa_cloth', exponent=3.6)
            soft(name + '_loose_back', (x, 1.073, z - .268),
                 (sw + .011, .435, .235), 'sofa_cloth', lean=-6,
                 exponent=3.7)
            # A single thin welt follows the actual rounded seat front.
            pts = []
            for j in range(17):
                theta = math.pi * j / 16
                c, s = math.cos(theta), math.sin(theta)
                # Same superellipse as the cushion, just above its skin.
                xx = math.copysign(abs(c) ** (2 / 3.6), c)
                zz = math.copysign(abs(s) ** (2 / 3.6), s)
                pts.append((x + (sw - .013) * .5 * .998 * xx, .872,
                            z + .080 + .294 * .998 * zz))
            tube(name + '_tailored_seam', pts, .0025, 'linen', sides=5)
        for side in [-1, 1]:
            soft(name + '_rounded_arm', (cx + side * (width / 2 - .107),
                                        .901, z),
                 (.214, .493, .784), 'sofa_cloth', exponent=3.2)

    seating('Def_living_sofa', 49.35, 2.22, 3)
    seating('Def_living_armchair', 51.71, .96, 1)
    # Both cushions contact the seat, with their upper halves against the back.
    soft('Def_living_cream_pillow', (48.69, 1.102, 40.085),
         (.36, .34, .155), 'linen', yaw=-8, lean=-13, exponent=2.8)
    soft('Def_living_plaid_pillow', (50.04, 1.097, 40.075),
         (.33, .33, .155), 'host_cloth', yaw=9, lean=-11, exponent=2.8)

    # One continuous throw crosses the left sofa arm and drapes down its outer
    # face. The path follows the real upholstery instead of stacking flat boxes.
    path = [(48.65, .951), (48.53, .982), (48.43, 1.102),
            (48.34, 1.148), (48.25, 1.114), (48.239, .94),
            (48.239, .72), (48.246, .565)]
    verts, faces = [], []
    across = 16
    for j, (x, y) in enumerate(path):
        for i in range(across + 1):
            u = i / across
            z = 40.10 + (u - .5) * .49
            fold = .006 * math.sin(u * 22 + j * .6)
            verts.append(xyz((x + fold * .4, y + fold, z)))
    for j in range(len(path) - 1):
        for i in range(across):
            a = j * (across + 1) + i
            faces.append((a, a + 1, a + across + 2, a + across + 1))
    mesh = bpy.data.meshes.new('Def_single_sofa_throw')
    mesh.from_pydata(verts, [], [tuple(reversed(face)) for face in faces])
    mesh.update()
    uv = mesh.uv_layers.new(name='Continuous woven throw')
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        for li in polygon.loop_indices:
            vi = mesh.loops[li].vertex_index
            uv.data[li].uv = (vi % (across + 1) / across,
                              vi // (across + 1) / (len(path) - 1) * 1.6)
    throw = ctx._mesh_object('Def_single_sofa_throw', mesh)
    ctx._finish(throw, 'Def_single_sofa_throw', 'blue_plaid', uv=False)

    # ---- Hosts: use the exact native wardrobe geometry and required names.
    # No added trim is left at the old position when the runtime shifts it.
    for name in ('furn_hosts_wardrobe_0', 'furn_hosts_wardrobe_1',
                 'furn_hosts_wardrobe_2'):
        obj = ctx.original.get(name)
        if not obj or name not in bpy.data.objects:
            continue
        obj.data.materials.clear()
        for mat in ('wood', 'wood_dark', 'wood_light', 'brass'):
            obj.data.materials.append(ctx.material(mat))
        piece_for_vertex = {}
        for island in _islands(obj.data):
            points = [source(obj.matrix_world @ obj.data.vertices[i].co)
                      for i in island]
            lo = tuple(min(p[a] for p in points) for a in range(3))
            hi = tuple(max(p[a] for p in points) for a in range(3))
            size = [hi[a] - lo[a] for a in range(3)]
            material = 0
            if name.endswith(('_1', '_2')):
                material = 2
                if max(size) < .18:
                    material = 3
                elif lo[1] < 4.04 or hi[1] > 5.75:
                    material = 0
            elif hi[1] < 4.06 or lo[1] > 5.78:
                material = 1
            for i in island:
                piece_for_vertex[i] = material
        for polygon in obj.data.polygons:
            polygon.material_index = piece_for_vertex[polygon.vertices[0]]
        ctx.uv(obj, .85)

    # Dresser props now rest on the current 4.610 m surface and within its edge.
    for name, obj in ctx.original.items():
        if name not in bpy.data.objects:
            continue
        if name.startswith('Anfitrioes_vaso_'):
            translate_source(obj, (.64, -.060, -.13))
        elif name == 'book_stack.004':
            translate_source(obj, (0, -.010, .12))

    # A small twin-bell clock shares the bedside top with the existing lamp.
    # Its feet touch the 4.545 m tabletop; it adds no floor obstruction.
    x, z = 53.56, 40.40
    for dx in [-.033, .033]:
        ctx.sphere('Def_hosts_alarm_foot', (x + dx, 4.557, z),
                   (.024, .024, .024), 'brass', 8, 6)
    cyl('Def_hosts_alarm_case', (x, 4.622, z), .061, .041,
        'brass', 20, axis='z')
    cyl('Def_hosts_alarm_face', (x, 4.622, z + .022), .052, .004,
        'paper', 20, axis='z')
    for i in range(12):
        a = i * math.pi / 6
        tube('Def_hosts_alarm_tick',
             [(x + .043 * math.sin(a), 4.622 + .043 * math.cos(a), z + .025),
              (x + .047 * math.sin(a), 4.622 + .047 * math.cos(a), z + .025)],
             .0017, 'wood_dark', sides=4)
    tube('Def_hosts_alarm_hands', [(x - .020, 4.646, z + .027),
         (x, 4.622, z + .027), (x + .029, 4.633, z + .027)],
         .0025, 'wood_dark', sides=5)
    for dx in [-.039, .039]:
        ctx.sphere('Def_hosts_alarm_bell', (x + dx, 4.694, z),
                   (.055, .028, .049), 'brass', 12, 6)
    tube('Def_hosts_alarm_handle', [(x - .026, 4.687, z),
         (x - .019, 4.722, z), (x + .019, 4.722, z),
         (x + .026, 4.687, z)], .003, 'brass', sides=5)

    # ---- Old family guest room: modest mixed timber furniture, not a new set.
    x, z, floor = 48.55, 31.59, 3.84
    for dx in [-.18, .18]:
        for dz in [-.18, .18]:
            box('Def_guest_nightstand_leg', (x + dx, floor + .15, z + dz),
                (.046, .30, .046), 'wood_dark', bevel=.007)
    box('Def_guest_nightstand_shelf', (x, 4.025, z),
        (.415, .029, .415), 'wood', bevel=.008)
    box('Def_guest_nightstand_case', (x, 4.352, z),
        (.43, .30, .43), 'wood', bevel=.015)
    box('Def_guest_nightstand_drawer', (x + .222, 4.36, z),
        (.025, .214, .36), 'wood_light', bevel=.009)
    knob('Def_guest_nightstand_pull', (x + .243, 4.36, z))
    box('Def_guest_nightstand_top', (x, 4.518, z),
        (.48, .044, .48), 'wood_dark', bevel=.013)
    book('Def_guest_nightstand_old_book', (x, 4.067, z),
         (.25, .055, .20), 'book_green', yaw=-5)
    ctx.collider('Def_guest_nightstand', (48.31, 3.84, 31.35),
                 (48.80, 4.54, 31.83))
    # Ceramic table lamp with a pleated shade and a visible cloth-covered cord.
    cyl('Def_guest_bedside_lamp_foot', (48.52, 4.556, 31.60),
        .082, .032, 'brass', 16)
    ctx.sphere('Def_guest_bedside_lamp_body', (48.52, 4.654, 31.60),
               (.13, .19, .13), 'ceramic', 16, 10)
    cyl('Def_guest_bedside_lamp_neck', (48.52, 4.755, 31.60),
        .013, .075, 'brass', 10)
    cyl('Def_guest_bedside_lamp_shade', (48.52, 4.865, 31.60),
        .14, .19, 'shade', 24, radius_top=.082)
    cyl('Def_guest_bedside_lamp_bottom_rim', (48.52, 4.774, 31.60),
        .141, .009, 'cream', 24)
    knob('Def_guest_bedside_lamp_finial', (48.52, 4.972, 31.60), .012)
    tube('Def_guest_lamp_cord', [(48.52, 4.54, 31.60),
         (48.39, 4.54, 31.45), (48.31, 4.45, 31.40),
         (48.31, 3.91, 31.40)], .003, 'black', sides=5)

    # Narrow dresser faces the room (-X), tucked behind the side doorway line.
    x, z = 52.50, 32.30
    for dx in [-.18, .18]:
        for dz in [-.35, .35]:
            box('Def_guest_dresser_foot', (x + dx, 3.925, z + dz),
                (.065, .17, .065), 'wood_dark', bevel=.011)
    box('Def_guest_dresser_case', (x, 4.435, z),
        (.43, .91, .85), 'wood_dark', bevel=.019)
    box('Def_guest_dresser_top', (x, 4.918, z),
        (.50, .055, .92), 'wood', bevel=.017)
    for yy in [4.108, 4.355, 4.602, 4.802]:
        height = .20 if yy < 4.7 else .14
        box('Def_guest_dresser_drawer', (52.271, yy, z),
            (.029, height, .765), 'wood', bevel=.011)
        for zz in [32.075, 32.525]:
            knob('Def_guest_dresser_pull', (52.245, yy, zz))
    ctx.collider('Def_guest_dresser', (52.23, 3.84, 31.84),
                 (52.75, 4.946, 32.76))
    # A folded spare blanket and one photograph sit on the dresser, grounded.
    soft('Def_guest_spare_blanket', (52.49, 4.982, 32.11),
         (.29, .072, .34), 'host_cloth', exponent=5)
    box('Def_guest_photo_frame', (52.54, 5.07, 32.54),
        (.035, .24, .18), 'wood_dark', bevel=.008)
    photo = ctx.plane('Def_guest_family_photo', (52.519, 5.07, 32.54),
                      (.142, .202), 'photo', normal='x')
    photo.data.flip_normals()
    tube('Def_guest_photo_easel', [(52.56, 5.15, 32.54),
         (52.65, 4.95, 32.54)], .009, 'wood_dark', sides=6)

    # A visibly usable reading chair: separate slats, rails and padded seat.
    x, z = 49.02, 34.91
    for xx in [48.80, 49.24]:
        for zz in [34.70, 35.12]:
            box('Def_guest_reading_chair_leg', (xx, 4.055, zz),
                (.05, .43, .05), 'wood_dark', bevel=.009)
    box('Def_guest_reading_chair_seat_rail', (x, 4.245, z),
        (.53, .095, .52), 'wood', bevel=.017)
    soft('Def_guest_reading_chair_cushion', (x, 4.325, z),
         (.47, .102, .455), 'host_cloth', exponent=3.5)
    for zz in [34.68, 35.14]:
        box('Def_guest_reading_chair_backpost', (48.79, 4.58, zz),
            (.05, .72, .05), 'wood', bevel=.010)
    for yy in [4.59, 4.76, 4.92]:
        box('Def_guest_reading_chair_slat', (48.78, yy, z),
            (.055, .067, .47), 'wood_light', bevel=.014)
    for zz in [34.68, 35.14]:
        box('Def_guest_reading_chair_arm', (49.02, 4.57, zz),
            (.54, .047, .065), 'wood', bevel=.014)
        box('Def_guest_reading_chair_arm_post', (49.23, 4.435, zz),
            (.035, .26, .035), 'wood_dark', bevel=.007)
    ctx.collider('Def_guest_reading_chair', (48.745, 3.84, 34.647),
                 (49.29, 4.954, 35.173))
    # Thin rugs remain walkable floor dressing, never a navigation obstacle.
    box('Def_guest_faded_rug', (49.55, 3.846, 34.10),
        (1.15, .012, .95), 'rug', bevel=.003)
    for side in [-1, 1]:
        for i in range(14):
            xx = 49.04 + i * .078
            tube('Def_guest_rug_fringe', [(xx, 3.849, 34.10 + side * .475),
                 (xx + .006, 3.847, 34.10 + side * .52)],
                 .0025, 'linen', sides=4)

    # The native abandoned-looking floor books are now on the writing table.
    obj = ctx.original.get('book_stack.001')
    if obj and obj.name in bpy.data.objects:
        translate_source(obj, (.68, .752, 1.08))
    # Retain the approved table and lamp while clearing space for that stack.
    remove_new('REN_Guest_reading_book')

    # ---- Student: move the complete native shelf contents out of the wardrobe.
    # Keep the source mouse on its own pad. The late extra mouse was placed on
    # the mug at the other corner; the approved CRT and source peripherals stay.
    for obj in list(ctx.objects):
        if obj.name in ('REN_Student_mousepad', 'REN_Student_mouse',
                        'REN_Student_mouse_cable'):
            ctx.objects.remove(obj)
            ctx.removed.append(obj.name)
            bpy.data.objects.remove(obj, do_unlink=True)
    for name, obj in ctx.original.items():
        if name not in bpy.data.objects or obj.type != 'MESH':
            continue
        if name == 'Prateleira_quarto':
            # Local source mesh already has metre coordinates; scale about its
            # measured centre, not the house origin.
            inv = obj.matrix_world.inverted()
            for vert in obj.data.vertices:
                p = list(source(obj.matrix_world @ vert.co))
                p[0] = 50.93 + (p[0] - 51.945) * .73
                vert.co = inv @ Vector(xyz(p))
            obj.data.update()
        elif name == 'Quarto_livro_0':
            translate_source(obj, (-1.015, 0, 0))
        elif name.startswith('Detalhes_quarto_'):
            inv = obj.matrix_world.inverted()
            for island in _islands(obj.data):
                points = [source(obj.matrix_world @ obj.data.vertices[i].co)
                          for i in island]
                if (min(p[1] for p in points) >= 5.48 - .005
                        and min(p[2] for p in points) > 42.60
                        and min(p[0] for p in points) > 51.2):
                    for i in island:
                        world = obj.matrix_world @ obj.data.vertices[i].co
                        obj.data.vertices[i].co = inv @ (world + Vector(xyz((-1.015, 0, 0))))
            obj.data.update()
    for x in [50.53, 51.32]:
        tube('Def_student_shelf_bracket', [(x, 5.469, 42.89),
             (x, 5.27, 42.89), (x, 5.469, 42.665)],
             .013, 'wood_dark', sides=6)
    box('Def_student_shelf_bookend_base', (51.33, 5.543, 42.77),
        (.12, .025, .20), 'brass', bevel=.004)
    box('Def_student_shelf_bookend_back', (51.378, 5.646, 42.77),
        (.025, .225, .20), 'brass', bevel=.004)
    # Two supported school binders fit in the free end of the same shelf.
    for i, mat in enumerate(['book_green', 'book_red']):
        x = 51.16 + i * .055
        box('Def_student_school_binder', (x, 5.667, 42.78),
            (.045, .274, .19), mat, bevel=.005)
        box('Def_student_binder_label', (x, 5.695, 42.681),
            (.028, .055, .005), 'paper', bevel=.001)

    # Give each original student poster its own full-image UVs. The source art
    # is a three-panel atlas; copying its thirds preserves the approved artwork
    # and pixel style without resampling or generating replacement graphics.
    for i in range(3):
        obj = ctx.original.get('Poster_original_' + str(i))
        if not obj or obj.name not in bpy.data.objects:
            continue
        original_mat = obj.data.materials[0]
        tex = next((n for n in original_mat.node_tree.nodes
                    if n.type == 'TEX_IMAGE' and n.image), None)
        if not tex:
            continue
        atlas = tex.image
        width, height = atlas.size
        part = width // 3
        pixels = list(atlas.pixels)
        cropped = []
        for row in range(height):
            start = (row * width + i * part) * 4
            cropped.extend(pixels[start:start + part * 4])
        art = bpy.data.images.new('HH_original_poster_' + str(i),
                                  width=part, height=height, alpha=True)
        art.pixels = cropped
        art.pack()
        mat = original_mat.copy()
        mat.name = 'HH_original_poster_full_' + str(i)
        for node in mat.node_tree.nodes:
            if node.type == 'TEX_IMAGE':
                node.image = art
                node.interpolation = 'Closest'
        obj.data.materials.clear()
        obj.data.materials.append(mat)
        lo, hi = source_bounds(obj)
        uv = obj.data.uv_layers.active or obj.data.uv_layers.new(name='Full original artwork')
        for polygon in obj.data.polygons:
            for li in polygon.loop_indices:
                p = source(obj.matrix_world @ obj.data.vertices[obj.data.loops[li].vertex_index].co)
                # Interior runtime X is 800-sourceX; compensate so the original
                # lettering reads left-to-right from inside the student's room.
                uv.data[li].uv = (1 - (p[0] - lo[0]) / (hi[0] - lo[0]),
                                  (p[1] - lo[1]) / (hi[1] - lo[1]))
        for dx in [.022, hi[0] - lo[0] - .022]:
            box('Def_student_poster_tape', (lo[0] + dx, hi[1] - .015, 42.914),
                (.033, .039, .006), 'cream', bevel=.001, yaw=0)
