"""Measured service joinery, supports and usable fixtures after the first pass.

The approved cupboards, appliances and table stay in their original footprints.
This pass closes measured gaps underneath their counters and feet, attaches the
service-cabinet pulls, and replaces the capped laundry cylinder with an open
woven hamper. No wall, window opening, stair, or doorway is altered here.
"""
import math
import bpy

from architecture_service import _mesh, _hang


def _new(ctx, prefix):
    return [obj for obj in ctx.objects
            if obj.name in bpy.data.objects and obj.name.startswith('REN_' + prefix)]


def _remove_new(ctx, *prefixes):
    for obj in list(ctx.objects):
        if obj.name in bpy.data.objects and any(obj.name.startswith('REN_' + p) for p in prefixes):
            ctx.objects.remove(obj)
            bpy.data.objects.remove(obj, do_unlink=True)


def _joinery(ctx):
    # The stone started 9.6 cm above the sink doors. These are actual timber
    # rails supporting the existing open-basin counter, clear of its bowl.
    ctx.box('def_sink_top_apron', (54.35, 1.276, 32.076), (.98, .102, .039), 'wood', .006)
    for x in [53.882, 54.818]:
        ctx.box('def_sink_top_side', (x, 1.252, 31.77), (.036, .150, .56), 'wood', .005)
    ctx.box('def_sink_plinth_sole', (54.35, .403, 31.755), (.94, .026, .51), 'wood_dark', .003)
    ctx.box('def_east_plinth_sole', (57.58, .401, 33.785), (.54, .022, 2.57), 'wood_dark', .003)
    for x, width in [(55.045, .32), (56.255, .38)]:
        ctx.box('def_bridge_plinth_sole', (x, .401, 31.74), (width, .022, .52), 'wood_dark', .003)
    ctx.box('def_cooker_base_sole', (55.65, .401, 31.77), (.67, .022, .49), 'black', .004)
    # Four modest refrigerator feet bear on the tile instead of a hovering
    # full-width enclosure. They stay within the approved refrigerator bounds.
    for x in [56.61, 57.09]:
        for z in [31.52, 31.99]:
            ctx.cylinder('def_fridge_foot', (x, .403, z), .032, .026, 'rubber', 10)

    # The shallow hutch has a complete recessed base and attached metal pulls.
    ctx.box('def_dining_hutch_plinth', (51.55, .435, 31.425), (1.02, .09, .23), 'wood_dark', .005)
    # Domestic table legs ended 2 cm above the same floor. Extend only their
    # bottoms; all tabletop, apron, chair and place-setting dimensions remain.
    for obj in _new(ctx, 'KD_dining_leg_'):
        if '_collar_' in obj.name:
            continue
        obj.scale.z *= .710 / .690
        obj.location.z = .745
    for obj in _new(ctx, 'KD_dining_chair_'):
        if '_leg' not in obj.name:
            continue
        for vertex in obj.data.vertices:
            if vertex.co.z < .50:
                vertex.co.z -= .018

    # The upper-bath and powder-room counters also had unbuilt timber gaps.
    # Front aprons and end rails meet the stone while keeping both bowls open.
    ctx.box('def_bath_vanity_apron', (55.70, 4.590, 32.011), (.98, .092, .039), 'wood', .005)
    for x in [55.23, 56.17]:
        ctx.box('def_bath_vanity_side', (x, 4.587, 31.72), (.035, .10, .56), 'wood', .004)
    ctx.box('def_bath_vanity_sole', (55.70, 3.852, 31.72), (.89, .024, .48), 'wood_dark', .003)
    ctx.box('def_powder_vanity_apron', (57.49, 1.007, 42.337), (.64, .054, .035), 'wood', .004)
    for x in [57.187, 57.793]:
        ctx.box('def_powder_vanity_side', (x, .992, 42.54), (.033, .078, .39), 'wood', .004)
    ctx.box('def_powder_vanity_sole', (57.49, .420, 42.54), (.59, .060, .34), 'wood_dark', .004)

    # _cabinet_front authored each brass grip 26.5 mm forward of its door.
    # Two short posts and escutcheons now physically attach every grip.
    for name, x, y, z, width, facing in [
        ('bath', 55.70, 4.24, 32.014, .92, 1),
        ('powder', 57.49, .72, 42.328, .58, -1),
        ('laundry', 54.77, 2.39, 42.548, 1.40, -1),
    ]:
        for side in [-1, 1]:
            px = x + side * width * .10
            for py in [y - .055, y + .055]:
                ctx.cylinder('def_' + name + '_pull_mount',
                             (px, py, z + facing * .043), .012, .028, 'brass', 8, 'z')
                ctx.cylinder('def_' + name + '_pull_escutcheon',
                             (px, py, z + facing * .030), .017, .005, 'brass', 10, 'z')


def _bathroom_and_task_fixtures(ctx):
    # Obsolete source cups sat inside the new bowls; the soap, lotion and
    # toothbrushes already supplied by architecture_service replace them.
    ctx.remove('mug.003', 'mug.004', 'Banheiro_porta_escovas', 'Lavabo_porta_sabonete')
    # The old freestanding detergent hovered 76 mm above the washer. The
    # washer's grounded bottle and new shelf detergents already serve the room.
    ctx.remove('milk', 'Lavanderia_detergente')

    # The complete washday picture had been mounted across the native living /
    # utility opening (Z40.225..41.375). Move every generated frame, mat and
    # image component together onto the solid X53 partition at Z39.30. The
    # frame's rear moves X53.1565 -> 53.0705, flush to its X53.07 wall face.
    # Blender stores source Z on negative Y, so this is a +1.50 Y translation.
    for obj in _new(ctx, 'service_laundry_washday_'):
        obj.location.x -= .086
        obj.location.y += 1.50

    # Small, period fluorescent-style fixtures correspond to actual scoped
    # runtime lights; they provide readable mirrors and sink task illumination.
    for name, x, y, z, facing, width in [
        ('bath', 55.70, 6.100, 31.085, 1, .67),
        ('powder', 57.48, 2.290, 42.915, -1, .52),
    ]:
        ctx.box('def_' + name + '_mirror_light_back', (x, y, z), (width, .095, .025), 'brass', .009)
        for dx in [-width * .37, width * .37]:
            ctx.tube('def_' + name + '_mirror_light_arm',
                     [(x + dx, y, z), (x + dx, y, z + facing * .075)], .009, 'brass', 8)
        ctx.cylinder('def_' + name + '_mirror_light_diffuser',
                     (x, y, z + facing * .078), .030, width - .06, 'bulb', 16, 'x')
        for dx in [-width / 2 + .027, width / 2 - .027]:
            ctx.cylinder('def_' + name + '_mirror_light_cap',
                         (x + dx, y, z + facing * .078), .035, .035, 'brass', 12, 'x')

    ctx.box('def_sink_task_light_housing', (54.35, 1.928, 31.30), (.70, .024, .11), 'cream', .006)
    ctx.box('def_sink_task_light_diffuser', (54.35, 1.913, 31.30), (.61, .009, .072), 'bulb', .003)

    # The native tile face sits 14 cm off the wall. Close its open sides with
    # an actual plumbing chase and a bullnose; the approved face stays put.
    ctx.box('def_bath_tile_chase_backing', (56.215, 4.930, 31.140), (2.97, 2.18, .14), 'plaster', .002)
    ctx.box('def_bath_tile_top_cap', (56.215, 6.030, 31.154), (3.01, .035, .18), 'cream', .007)
    for x in [54.714, 57.716]:
        ctx.box('def_bath_tile_edge', (x, 4.932, 31.154), (.032, 2.18, .18), 'cream', .005)


def _open_hamper(ctx):
    # The former cylinder had a solid white lid; the draped sheet could reach
    # the floor. Use a real hollow liner below a visible woven rim instead.
    _remove_new(ctx, 'Laundry_hamper_')
    x, z = 53.39, 41.65
    ctx.cylinder('def_laundry_hamper_base', (x, .408, z), .207, .026, 'wood', 24)
    sides = 32
    # Double-sided linen bag with an open top, safely inset behind the wicker.
    rings = [(.187, .427), (.218, .918), (.211, .916), (.181, .441)]
    verts, faces, uv = [], [], []
    for ri, (radius, y) in enumerate(rings):
        for i in range(sides):
            a = i * 2 * math.pi / sides
            verts.append((x + radius * math.cos(a), y, z + radius * math.sin(a)))
            uv.append((i / sides, ri / 3))
    for ri in range(len(rings) - 1):
        for i in range(sides):
            a, b = ri * sides + i, ri * sides + (i + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.append(tuple(range(3 * sides, 4 * sides)))
    _mesh(ctx, 'def_laundry_hamper_open_liner', verts, faces, 'linen', uv)

    for i in range(24):
        a = i * 2 * math.pi / 24
        pts = []
        for j in range(7):
            t = j / 6
            radius = .210 + t * .025 + .002 * math.sin(t * math.pi * 6 + i * math.pi)
            pts.append((x + radius * math.cos(a), .410 + t * .535, z + radius * math.sin(a)))
        ctx.tube('def_laundry_hamper_wicker_upright', pts, .007, 'wood_light', 5)
    for j in range(11):
        t = j / 10
        radius = .213 + .026 * t
        pts = [(x + radius * math.cos(i * 2 * math.pi / 32), .412 + .533 * t,
                z + radius * math.sin(i * 2 * math.pi / 32)) for i in range(33)]
        ctx.tube('def_laundry_hamper_wicker_band', pts, .006, 'wood_light', 5)
    for y, radius in [(.409, .209), (.946, .240)]:
        pts = [(x + radius * math.cos(i * 2 * math.pi / 32), y,
                z + radius * math.sin(i * 2 * math.pi / 32)) for i in range(33)]
        ctx.tube('def_laundry_hamper_bound_rim', pts, .011, 'wood', 7)
    # Two proper carry loops terminate on the basket rim.
    for sign in [-1, 1]:
        pts = [(x + sign * .237, .925 + .105 * math.sin(i * math.pi / 12),
                z - .075 + .15 * i / 12) for i in range(13)]
        ctx.tube('def_laundry_hamper_handle', pts, .010, 'wood', 7)
    # Linen is contained below the rim; one small towel folds over its side.
    ctx.box('def_laundry_hamper_folded_linen', (x - .035, .842, z), (.27, .085, .26), 'host_cloth', .022)
    _hang(ctx, 'def_laundry_hamper_handtowel', (x + .242, .812, z + .025),
          .22, .268, 'towel', normal='x', folds=4)
    ctx.cloth('def_laundry_hamper_towel_fold', (x + .172, .950, z + .025),
              (.15, .22), 'towel', cols=8, rows=10, amplitude=.004, edge_drop=0)
    # Retain the former wall-adjacent collider, now covering the carry loops.
    for collider in ctx.colliders:
        if collider['name'] == 'Laundry_hamper':
            collider['min'] = [53.13, .39, 41.39]
            collider['max'] = [53.65, 1.05, 41.91]
            break
    else:
        ctx.collider('Laundry_hamper', (53.13, .39, 41.39), (53.65, 1.05, 41.91))


def build(ctx):
    _joinery(ctx)
    _bathroom_and_task_fixtures(ctx)
    _open_hamper(ctx)
