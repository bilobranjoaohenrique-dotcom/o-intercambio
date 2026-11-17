"""Final measured shell and source-prop repairs, applied after finishing.

Source-space metres are Y up. The original outer shell bounds, stair flight,
floor slabs and all circulation openings remain in place. Rear window cards
become glazed openings; the new residential basement door remains closed.
"""
import bpy
from mathutils import Vector
from common import source, source_bounds, xyz


# These are the audited native rear-card edges, rather than guessed centres.
REAR_WINDOWS = (
    ('rear_ground_kitchen', 1.275, 2.625, 32.325, 33.675),
    ('rear_ground_powder', 1.275, 2.625, 40.325, 41.675),
    ('rear_upper_bathroom', 4.725, 6.075, 32.325, 33.675),
    ('rear_upper_hosts', 4.725, 6.075, 40.325, 41.675),
)
FRONT_WINDOWS = (
    ('front_ground_living', 1.225, 2.775, 40.275, 41.725),
    ('front_upper_guest', 4.675, 6.225, 32.275, 33.725),
    ('front_upper_hall', 4.675, 6.225, 36.275, 37.725),
    ('front_upper_student', 4.675, 6.225, 40.275, 41.725),
)
BASEMENT_OPENING = (.39, 2.49, 36.55, 37.45)


def _remove_exact(ctx, names):
    removed = []
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)
            removed.append(name)
    ctx.removed.extend(removed)
    return removed


def _cut_wall(ctx, name, openings):
    """Replace a solid native cuboid with cells around true rectangular holes.

    Keeping the existing object and its complete outer bounds preserves the
    source-coordinate contract. Cells meet at exact edges; every reveal has
    thickness, including the window heads/sills and the closed door jambs.
    """
    obj = bpy.data.objects[name]
    lo, hi = source_bounds(obj)
    ys = sorted({lo[1], hi[1], *(v for hole in openings for v in hole[:2])})
    zs = sorted({lo[2], hi[2], *(v for hole in openings for v in hole[2:])})
    verts, faces = [], []
    inverse = obj.matrix_world.inverted()
    for y0, y1 in zip(ys, ys[1:]):
        for z0, z1 in zip(zs, zs[1:]):
            cy, cz = (y0 + y1) / 2, (z0 + z1) / 2
            if any(a < cy < b and c < cz < d for a, b, c, d in openings):
                continue
            base = len(verts)
            corners = [(x, y, z) for x, y, z in (
                (lo[0], y0, z0), (hi[0], y0, z0),
                (hi[0], y1, z0), (lo[0], y1, z0),
                (lo[0], y0, z1), (hi[0], y0, z1),
                (hi[0], y1, z1), (lo[0], y1, z1),
            )]
            verts.extend(inverse @ Vector(xyz(p)) for p in corners)
            for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
                      (3, 7, 6, 2), (0, 4, 7, 3), (1, 2, 6, 5)):
                faces.append(tuple(base + i for i in f))
    mesh = bpy.data.meshes.new(name + '_real_openings')
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(ctx.material('plaster'))
    mesh.update()
    obj.data = mesh
    ctx.uv(obj, 1.8)
    obj['hostHouseArchitecturalOpenings'] = True
    obj['hostHouseOpeningCount'] = len(openings)
    bpy.context.view_layer.update()
    after = source_bounds(obj)
    assert max(abs(after[i][j] - (lo, hi)[i][j])
               for i in range(2) for j in range(3)) < .00002, name


def _clear_glass():
    mat = bpy.data.materials.new('HH_clear_window_glazing')
    mat.use_nodes = True
    mat.diffuse_color = (.68, .82, .90, .075)
    bs = mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (.68, .82, .90, 1)
    bs.inputs['Alpha'].default_value = .075
    bs.inputs['Roughness'].default_value = .14
    bs.inputs['Metallic'].default_value = 0
    bs.inputs['IOR'].default_value = 1.45
    # Alpha blending keeps the actual neighborhood visible without an opaque
    # blue card or a refractive second image of the street.
    if hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'DITHERED'
    elif hasattr(mat, 'blend_method'):
        mat.blend_method = 'BLEND'
    mat.use_backface_culling = False
    return mat


def _window(ctx, anchor, x, y0, y1, z0, z1, glass, rear):
    cy, cz = (y0 + y1) / 2, (z0 + z1) / 2
    h, w, t = y1 - y0, z1 - z0, .055
    prefix = 'HH_window_' + anchor
    # Native front windows already have a sill and a centre stile. Add the
    # missing jamb/head profiles inside those same opening edges.
    for z in (z0 + t / 2, z1 - t / 2):
        ctx.box(prefix + '_jamb', (x, cy, z), (.16, h, t), 'paint', .004)
    ctx.box(prefix + '_head', (x, y1 - t / 2, cz), (.16, t, w - t * 2), 'paint', .004)
    if rear:
        ctx.box(prefix + '_bottom', (x, y0 + t / 2, cz), (.16, t, w - t * 2), 'paint', .004)
        ctx.box(prefix + '_centre_stile', (x, cy, cz), (.14, h - t * 2, .042), 'paint', .004)
        ctx.box(prefix + '_sill', (57.87, y0 - .018, cz), (.30, .055, w + .10), 'wood_light', .006)
        # Casings sit against the real room-side wall, outside the clear hole.
        for z in (z0 - .025, z1 + .025):
            ctx.box(prefix + '_casing', (57.918, cy, z), (.035, h + .10, .065), 'paint', .004)
        ctx.box(prefix + '_casing_head', (57.918, y1 + .025, cz), (.035, .065, w + .115), 'paint', .004)
    obj = ctx.plane(prefix + '_glass', (x, cy, cz), (w - t * 2, h - t * 2), glass, normal='x')
    obj['hostHouseWindow'] = anchor
    obj['hostHouseWindowGlass'] = True
    obj['hostHouseNoBatch'] = True
    obj['sourceWindowCentre'] = [x, cy, cz]
    return {'id': anchor, 'planeX': x, 'min': [x, y0, z0], 'max': [x, y1, z1],
            'clearWidth': w - t * 2, 'clearHeight': h - t * 2}


def _closed_basement_door(ctx):
    # The earlier trim pass saw a solid rear wall. Butt its skirting/bead to
    # the new door casing, so a white strip does not run across the door leaf.
    for obj in list(ctx.objects):
        if obj.name not in bpy.data.objects or not obj.name.startswith('REN_service_baseboard'):
            continue
        lo, hi = source_bounds(obj)
        if not (57.87 < lo[0] < hi[0] < 57.95 and hi[1] < .60 and lo[2] < 36.48 and hi[2] > 37.52):
            continue
        name, material = obj.name, obj.data.materials[0]
        ctx.objects.remove(obj)
        bpy.data.objects.remove(obj, do_unlink=True)
        for side, a, b in (('left', lo[2], 36.48), ('right', 37.52, hi[2])):
            ctx.box(name + '_' + side, ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (a + b) / 2),
                    (hi[0] - lo[0], hi[1] - lo[1], b - a), material, .004)
    before = len(ctx.objects)
    z, floor, height, width = 37., .39, 2.10, .90
    cy = floor + height / 2
    # A real wall hole, full-depth jambs and a separately modelled closed leaf.
    for edge in (z - width / 2 + .012, z + width / 2 - .012):
        ctx.box('HH_basement_door_jamb', (58., cy, edge), (.14, height, .024), 'wood_light', .003)
    ctx.box('HH_basement_door_jamb_head', (58., floor + height - .012, z), (.14, .024, width), 'wood_light', .003)
    for edge in (z - width / 2 - .035, z + width / 2 + .035):
        ctx.box('HH_basement_door_casing', (57.918, cy + .02, edge), (.040, height + .04, .070), 'paint', .005)
    ctx.box('HH_basement_door_casing_head', (57.918, floor + height + .035, z), (.040, .070, width + .14), 'paint', .005)
    leaf = ctx.box('HH_basement_door_leaf', (57.992, cy, z), (.045, height - .024, width - .032), 'wood', .006)
    # Familiar six-panel household door with visible rails and recessed panels.
    for dz in (-.222, .222):
        for py, ph in ((.80, .53), (1.43, .53), (2.07, .54)):
            ctx.box('HH_basement_door_raised_panel', (57.963, py, z + dz), (.012, ph, .314), 'wood_light', .007)
    for edge in (z - .411, z, z + .411):
        ctx.box('HH_basement_door_stile', (57.963, cy, edge), (.012, height - .035, .052), 'wood', .004)
    for y in (.454, 1.112, 1.755, 2.421):
        ctx.box('HH_basement_door_rail', (57.962, y, z), (.014, .070, width - .035), 'wood', .004)
    # One practical knob, latch escutcheon and three hinge knuckles.
    ctx.cylinder('HH_basement_door_knob_plate', (57.951, 1.39, 37.322), .034, .010, 'brass', 16, 'x')
    ctx.cylinder('HH_basement_door_knob_spindle', (57.929, 1.39, 37.322), .012, .040, 'brass', 12, 'x')
    ctx.sphere('HH_basement_door_knob', (57.901, 1.39, 37.322), (.053, .055, .055), 'brass', 16, 8)
    for y in (.65, 1.44, 2.23):
        ctx.cylinder('HH_basement_door_hinge', (57.969, y, 36.571), .012, .095, 'brass', 12)
    ctx.box('HH_basement_door_threshold', (58., .396, z), (.15, .012, width - .02), 'wood_dark', .002)
    parent = bpy.data.objects.new('REN_HH_BasementDoor', None)
    bpy.context.collection.objects.link(parent)
    parent.location = xyz((57.992, cy, z))
    bpy.context.view_layer.update()
    for obj in ctx.objects[before:]:
        world = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_world = world
        obj['hostHouseBasementDoor'] = True
        obj['hostHouseBasementDoorClosed'] = True
        obj['hostHouseNoBatch'] = True
    parent['hostHouseBasementDoor'] = True
    parent['hostHouseBasementDoorClosed'] = True
    parent['hostHouseNoBatch'] = True
    parent['sourceCentre'] = [57.992, cy, z]
    leaf['hostHouseBasementDoorLeaf'] = True
    ctx.collider('HH_basement_door_closed', (57.964, floor, z - width / 2), (58.015, floor + height, z + width / 2))
    return {'parent': parent.name, 'leaf': leaf.name, 'closed': True,
            'openingMin': [57.93, floor, z - width / 2],
            'openingMax': [58.07, floor + height, z + width / 2],
            'newRoomConstructed': False}


def _move_vertices(obj, predicate, delta):
    inverse = obj.matrix_world.inverted()
    changed = 0
    for vertex in obj.data.vertices:
        p = source(obj.matrix_world @ vertex.co)
        if predicate(p):
            vertex.co = inverse @ Vector(xyz(tuple(p[i] + delta[i] for i in range(3))))
            changed += 1
    obj.data.update()
    return changed


def _native_props(ctx):
    changes = []
    art = bpy.data.objects.get('picture_landscape')
    if art:
        lo, hi = source_bounds(art)
        centre = tuple((lo[i] + hi[i]) / 2 for i in range(3))
        target = (51.45, 2.65, 42.918875)
        delta = tuple(target[i] - centre[i] for i in range(3))
        _move_vertices(art, lambda p: True, delta)
        changes.append({'name': art.name, 'change': 'low picture behind CRT rehung on solid rear wall',
                        'sourceDelta': list(delta), 'sourceCentre': list(target)})
    # Source details are merged by material, not by prop. Move only measured
    # disconnected shelf/book and portrait vertices, preserving table objects.
    for name in sorted(ctx.original):
        if not name.startswith('Detalhes_sala_') or name not in bpy.data.objects:
            continue
        obj = bpy.data.objects[name]
        portrait = _move_vertices(obj, lambda p: p[1] > 2.09 and 42.7 < p[2] < 42.86,
                                  (0, 0, .0775))
        # The blue/oak books were sunk 22.5 mm into their little shelves;
        # the cream/red books had a 2.5 mm gap. Contact their existing tops.
        book_y = .0225 if name in ('Detalhes_sala_05', 'Detalhes_sala_07') else -.0025 if name in ('Detalhes_sala_00', 'Detalhes_sala_01') else 0
        shelf = _move_vertices(obj, lambda p: p[1] > 1.7 and 42.0 < p[2] < 42.4,
                               (0, book_y, .565))
        if shelf:
            changes.append({'name': name, 'change': 'native floating shelf/book components anchored to rear wall',
                            'vertices': shelf, 'sourceDelta': [0, book_y, .565]})
        if portrait:
            changes.append({'name': name, 'change': 'native portrait components flush against rear wall',
                            'vertices': portrait, 'sourceDelta': [0, 0, .0775]})
    for name in ('Sala planta baixa', 'Detalhes_sala_03', 'Detalhes_sala_09'):
        obj = bpy.data.objects.get(name)
        if obj:
            _move_vertices(obj, lambda p: True, (.50, -.0245, 0))
            changes.append({'name': name, 'change': 'coffee-table plant placed on supported tabletop',
                            'sourceDelta': [.50, -.0245, 0]})
    ghosts = ('chair_broken.001', 'box_open_flap_back.001', 'box_open_flap_front.001',
              'box_open_flap_left.001', 'box_open_flap_right.001', 'box_open.001')
    removed = _remove_exact(ctx, ghosts)
    return changes, removed


def build(ctx):
    # The old disconnected city was a source backdrop. Runtime windows now use
    # the actual supplied Westbridge mesh in its measured rigid alignment.
    backdrop = _remove_exact(ctx, [name for name in list(bpy.data.objects.keys())
                                  if name.startswith(('WindowView', 'nativeWindowView'))])
    cards = _remove_exact(ctx, [name for name in list(bpy.data.objects.keys())
                               if name.startswith('back_window_')])
    _cut_wall(ctx, 'back_ext_0', [v[1:] for v in REAR_WINDOWS[:2]] + [BASEMENT_OPENING])
    _cut_wall(ctx, 'back_ext_1', [v[1:] for v in REAR_WINDOWS[2:]])
    glass = _clear_glass()
    windows = [_window(ctx, n, 58., a, b, c, d, glass, True)
               for n, a, b, c, d in REAR_WINDOWS]
    windows += [_window(ctx, n, 48.06, a, b, c, d, glass, False)
                for n, a, b, c, d in FRONT_WINDOWS]
    door = _closed_basement_door(ctx)
    props, ghosts = _native_props(ctx)
    ctx.definitive_architecture_report = {
        'changedNativeShellMeshes': ['back_ext_0', 'back_ext_1'],
        'nativeShellOuterBoundsPreserved': True,
        'preservedNativeStairsAndCirculation': True,
        'removedOpaqueRearWindowCards': cards,
        'removedSourceWindowBackdropObjects': backdrop,
        'windows': windows, 'basementDoor': door,
        'sourcePropCorrections': props, 'removedOutOfEnvelopeProps': ghosts,
    }
    bpy.context.view_layer.update()
    return ctx.definitive_architecture_report
