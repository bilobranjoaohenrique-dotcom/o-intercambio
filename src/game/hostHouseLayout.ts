import type { Point2, Point3 } from './layout';
import { EYE_HEIGHT } from './layout';
import type { Obstacle } from './types';
import { HOST_HOUSE_RENOVATED_FURNITURE } from './hostHouseRenovationLayout';

export const HOST_HOUSE_SOURCE = '/models/daniel_helen_house_renovated.glb';
export const HOST_HOUSE_ORIGIN_X = 800;
/** Keep the supplied glTF metre scale and its native handedness conversion. */
export const hhPoint = (x:number,y:number,z:number):Point3 => ({x:HOST_HOUSE_ORIGIN_X-x,y,z});
export const HOST_HOUSE_GROUND = .39;
export const HOST_HOUSE_UPPER = 3.84;
export const HOST_HOUSE_SPAWN = hhPoint(48.5,HOST_HOUSE_GROUND+EYE_HEIGHT,37);
export const HOST_HOUSE_YAW = -Math.PI/2;
export const HOST_HOUSE_EXIT = hhPoint(48.11,1.3825,37);
/** World X/Y/Z: the native front opening is normal to X, 1.65m wide in Z. */
export const HOST_HOUSE_EXIT_SIZE:[number,number,number] = [.055,1.985,1.65];
export const HOST_HOUSE_NODE_ADJUSTMENTS = ['furn_hosts_wardrobe_0','furn_hosts_wardrobe_1','furn_hosts_wardrobe_2'].map(nodeName=>({
  nodeName,sourceDelta:{x:0,y:0,z:1.45},reason:'Move the existing wardrobe clear of the supplied upper doorway',
}));
export type HhRect = {minX:number;maxX:number;minZ:number;maxZ:number};
export type HhSolid = Obstacle & {minY:number;maxY:number;name:string};
export const hhRect=(minX:number,maxX:number,minZ:number,maxZ:number):HhRect=>({minX:800-maxX,maxX:800-minX,minZ,maxZ});
export const withinHhRect=(rect:HhRect,p:Point2)=>p.x>=rect.minX&&p.x<=rect.maxX&&p.z>=rect.minZ&&p.z<=rect.maxZ;
export const HOST_HOUSE_GROUND_FLOORS:readonly HhRect[]=[hhRect(48.13,57.93,31.07,42.93)];
export const HOST_HOUSE_UPPER_FLOORS:readonly HhRect[]=[
  hhRect(48.13,53,31.07,42.93),
  hhRect(53,57.93,31.07,35.8),hhRect(53,57.93,38.2,42.93),
  hhRect(53,56.866,35.8,36.82),hhRect(56.866,57.93,35.8,38.2),
];
export const HOST_HOUSE_STAIRS = {sourceStartX:52.78,sourceEndX:56.866,minZ:36.92,maxZ:38.03,steps:18,
  bottom:HOST_HOUSE_GROUND,top:HOST_HOUSE_UPPER,rect:hhRect(52.78,56.866,36.92,38.03)};
export function hostHouseStairHeight(p:Point2){
  const x=800-p.x;
  const index=Math.max(1,Math.min(18,Math.floor((x-52.78+1e-7)/.227)+1));
  return HOST_HOUSE_GROUND+(HOST_HOUSE_UPPER-HOST_HOUSE_GROUND)*index/18;
}
/** Measured per-mesh bounds. Vertical overlap selects the correct floor; never
 * use the broad backdrop or an entire collection of furniture as one blocker.
 * The only moved item uses the same +1.45m source-Z correction as the loader. */
const measured:readonly (readonly [number,number,number,number,number,number,string])[]=[
  [57.93,58.07,0.39,3.49,31.0,43.0,"back_ext_0"],
  [57.93,58.07,3.84,6.94,31.0,43.0,"back_ext_1"],
  [52.93,53.07,0.39,3.49,41.375,43.0,"ground_cross_left_a"],
  [52.93,53.07,0.39,3.49,38.200001,40.224998,"ground_cross_left_b"],
  [52.93,53.07,2.59,3.49,40.224998,41.375,"ground_cross_left_lintel"],
  [52.93,53.07,0.39,3.49,34.099998,35.799999,"ground_cross_right_a"],
  [52.93,53.07,0.39,3.49,31.0,32.900002,"ground_cross_right_b"],
  [52.93,53.07,2.59,3.49,32.900002,34.099998,"ground_cross_right_lintel"],
  [48.0,50.150002,0.39,3.49,38.130001,38.27,"ground_foyer_partition_-1.2_a"],
  [51.25,53.0,0.39,3.49,38.130001,38.27,"ground_foyer_partition_-1.2_b"],
  [50.150002,51.25,2.59,3.49,38.130001,38.27,"ground_foyer_partition_-1.2_lintel"],
  [48.0,50.150002,0.39,3.49,35.73,35.869999,"ground_foyer_partition_1.2_a"],
  [51.25,53.0,0.39,3.49,35.73,35.869999,"ground_foyer_partition_1.2_b"],
  [50.150002,51.25,2.59,3.49,35.73,35.869999,"ground_foyer_partition_1.2_lintel"],
  [53.0,53.900002,0.39,3.49,38.130001,38.27,"ground_stairs_partition_-1.2_a"],
  [55.099998,58.0,0.39,3.49,38.130001,38.27,"ground_stairs_partition_-1.2_b"],
  [53.900002,55.099998,2.59,3.49,38.130001,38.27,"ground_stairs_partition_-1.2_lintel"],
  [53.0,53.900002,0.39,3.49,35.73,35.869999,"ground_stairs_partition_1.2_a"],
  [55.099998,58.0,0.39,3.49,35.73,35.869999,"ground_stairs_partition_1.2_b"],
  [53.900002,55.099998,2.59,3.49,35.73,35.869999,"ground_stairs_partition_1.2_lintel"],
  [48.0,58.0,0.39,3.49,42.93,43.07,"left_ext_0"],
  [48.0,58.0,3.84,6.94,42.93,43.07,"left_ext_1"],
  [48.0,58.0,0.39,3.49,30.93,31.07,"right_ext_0"],
  [48.0,58.0,3.84,6.94,30.93,31.07,"right_ext_1"],
  [52.93,53.07,3.84,6.94,41.299999,43.0,"upper_left_rooms_a"],
  [52.93,53.07,3.84,6.94,38.200001,40.299999,"upper_left_rooms_b"],
  [52.93,53.07,6.04,6.94,40.299999,41.299999,"upper_left_rooms_lintel"],
  [52.93,53.07,3.84,6.94,33.799999,35.799999,"upper_right_rooms_a"],
  [52.93,53.07,3.84,6.94,31.0,32.799999,"upper_right_rooms_b"],
  [52.93,53.07,6.04,6.94,32.799999,33.799999,"upper_right_rooms_lintel"],
  [47.999999,50.099999,3.84,6.94,38.135001,38.265001,"Wall_upper_left_0"],
  [50.1,51.15,5.99,6.94,38.135001,38.265001,"Lintel_upper_left_0"],
  [51.149999,56.879999,3.84,6.94,38.135001,38.265001,"Wall_upper_left_1"],
  [56.879998,57.819998,5.99,6.94,38.135001,38.265001,"Lintel_upper_left_1"],
  [57.82,58.0,3.84,6.94,38.135001,38.265001,"Wall_upper_left_end"],
  [47.999999,50.099999,3.84,6.94,35.734999,35.864999,"Wall_upper_right_0"],
  [50.1,51.15,5.99,6.94,35.734999,35.864999,"Lintel_upper_right_0"],
  [51.15,55.35,3.84,6.94,35.734999,35.864999,"Wall_upper_right_1"],
  [55.350002,56.450002,5.99,6.94,35.734999,35.864999,"Lintel_upper_right_1"],
  [56.449998,57.999998,3.84,6.94,35.734999,35.864999,"Wall_upper_right_end"],
  [52.93,53.07,3.84,6.94,40.299999,41.299999,"Wall_bedroom_divider_A"],
  [52.93,53.07,3.84,6.94,32.799999,33.799999,"Wall_bedroom_divider_B"],
  [53.0,56.86,3.84,4.84,36.75,36.82,"Wall_guard_upper"],
  [52.94,53.02,3.84,4.84,36.82,38.18,"Wall_guard_front"],
  [57.819998,57.879998,3.84,5.92,38.269999,39.149999,"Door_upper_open"],
  [55.65,55.78,0.39,3.49,39.98,42.95,"Wall_powder_divider"],
  [55.649998,56.049998,0.39,3.49,39.975001,40.105001,"Wall_powder_0"],
  [56.05,56.95,2.54,3.49,39.975001,40.105001,"Lintel_powder_0"],
  [56.950002,57.960002,0.39,3.49,39.975001,40.105001,"Wall_powder_end"],
  [47.999999,48.129999,0.39,3.49,31.000001,36.175002,"Wall_front_ground_0"],
  [47.999999,48.129999,2.375,3.49,36.175,37.825,"Wall_front_ground_1_head"],
  [47.999999,48.129999,0.39,3.49,37.824999,40.274999,"Wall_front_ground_2"],
  [47.999999,48.129999,0.39,1.225,40.275,41.725,"Wall_front_ground_3_sill"],
  [47.999999,48.129999,2.775,3.49,40.275,41.725,"Wall_front_ground_3_head"],
  [47.999999,48.129999,0.39,3.49,41.724999,42.999999,"Wall_front_ground_4"],
  [47.999999,48.129999,3.84,6.94,31.000001,32.275001,"Wall_front_upper_0"],
  [47.999999,48.129999,3.84,4.675,32.275,33.725,"Wall_front_upper_1_sill"],
  [47.999999,48.129999,6.225,6.94,32.275,33.725,"Wall_front_upper_1_head"],
  [47.999999,48.129999,3.84,6.94,33.725,36.275,"Wall_front_upper_2"],
  [47.999999,48.129999,3.84,4.675,36.275,37.725,"Wall_front_upper_3_sill"],
  [47.999999,48.129999,6.225,6.94,36.275,37.725,"Wall_front_upper_3_head"],
  [47.999999,48.129999,3.84,6.94,37.725,40.275,"Wall_front_upper_4"],
  [47.999999,48.129999,3.84,4.675,40.275,41.725,"Wall_front_upper_5_sill"],
  [47.999999,48.129999,6.225,6.94,40.275,41.725,"Wall_front_upper_5_head"],
  [47.999999,48.129999,3.84,6.94,41.724999,42.999999,"Wall_front_upper_6"],
  [55.194,56.206001,3.86,5.071494,31.414,32.060001,"furn_bath_sink_0"],
  [49.5,50.700001,0.41,1.535,32.450001,34.25,"furn_dining_table_0"],
  [56.709999,57.790001,3.86,5.93,39.765,40.4072,"furn_hosts_wardrobe_0"],
  [57.214001,57.860001,0.41,1.37,34.394001,35.006001,"furn_kitchen_cabinet_0_0"],
  [57.214001,57.860001,0.41,1.37,33.493999,34.105999,"furn_kitchen_cabinet_1_0"],
  [57.214001,57.860001,0.41,1.37,32.594002,33.206001,"furn_kitchen_cabinet_2_0"],
  [51.400002,52.599998,3.86,4.61,38.849998,39.650002,"furn_player_desk_0"],
  [51.759998,52.84,3.86,5.93,42.064999,42.707199,"furn_player_wardrobe_0"],
  [57.380001,57.700001,1.86,2.56,34.0,34.599998,"furn_wall_cabinet_0_0"],
  [57.380001,57.700001,1.86,2.56,33.150002,33.75,"furn_wall_cabinet_1_0"],
  [48.232798,50.467198,0.41,1.212866,39.739005,40.605005,"sofa_red.001"],
  [51.222799,52.197199,0.41,1.212866,39.739005,40.605005,"armchair_red.001"],
  [50.45,51.55,0.41,0.83,40.725,41.275,"coffee_table_oak.001"],
  [52.085,52.915,0.41,2.24,42.385,42.7,"bookcase_tall.001"],
  [48.54886,49.009228,0.41,1.986,38.896621,39.420001,"floor_lamp.001"],
  [49.889998,50.309999,0.41,1.39,34.180001,34.620002,"chair_ladder_pine.001"],
  [49.889998,50.309999,0.41,1.39,32.129998,32.569999,"chair_ladder_pine.002"],
  [48.78,49.22,0.41,1.39,33.139998,33.559998,"chair_ladder_pine.003"],
  [50.980001,51.420001,0.41,1.39,33.139998,33.559998,"chair_ladder_pine.004"],
  [48.819997,50.973998,3.86,5.042,41.005003,42.095003,"bed_single_oak.001"],
  [48.687285,49.107286,3.86,4.545,39.859998,40.339999,"nightstand_oak.001"],
  [53.237288,53.657289,3.86,4.545,40.009996,40.489996,"nightstand_oak.002"],
  [54.184998,55.014998,0.41,2.24,42.335001,42.650001,"bookcase_tall.002"],
  [48.893598,49.306398,0.39,0.9791,35.809402,36.170602,"nightstand_oak"],
  [57.140858,57.839138,0.39,1.225931,42.298159,42.743899,"sink_unit_white"],
  [48.737253,49.442753,3.84,5.3955,31.3525,31.62025,"bookcase_tall"],
  [54.025994,54.673994,0.4224,1.254,42.1801,42.8281,"Fixture_Washer_Body"],
  [54.455503,54.568489,1.254,1.443,42.363699,42.482499,"Fixture_Washer_Bottle"],
  [54.865999,55.513999,0.4224,1.254,42.1801,42.8281,"Fixture_Dryer_Body"],
  [56.018999,56.540999,0.39,1.26,42.1491,42.94805,"Fixture_Toilet_Body"],
  [57.099005,57.621005,3.84,4.71,31.6491,32.44805,"Fixture_Toilet_Body.001"],
  [53.545747,55.214247,4.2395,4.404,40.610004,42.090504,"Fixture_Bed_Duvet"],
  [53.557497,55.202497,3.9105,4.122,40.022505,42.137505,"Fixture_Bed_Frame"],
  [53.533998,55.225997,3.84,4.921,39.946129,40.051879,"Fixture_Bed_Headboard"],
  [53.592748,55.167247,4.122,4.31,40.057758,42.055258,"Fixture_Bed_Mattress"],
  [53.651499,54.332999,4.276338,4.461162,40.107143,40.454871,"Fixture_Bed_Pillow_1"],
  [54.427,55.1085,4.276338,4.461162,40.107143,40.454871,"Fixture_Bed_Pillow_2"],
  [56.900001,58.000001,3.906,4.566,42.079999,42.519999,"Fixture_Dresser_Body"],
  [48.132005,48.648806,3.84,4.608,38.815201,39.304801,"base_unit_white"],
  [50.044376,50.576178,0.955,1.718174,42.395999,42.790799,"furn_sala_tv_tv"],
  [49.620001,51.000001,0.415,0.945,42.194999,42.864999,"furn_sala_rack"],
  [53.84,54.860001,0.41,1.37,31.459999,32.093491,"furn_sink_PSX_sink_unit_white"],
  [55.27,56.029999,0.41,1.37,31.460001,32.069973,"furn_stove_PSX_stove_white"],
  [56.50148,57.199135,0.41,2.11,31.380001,32.125107,"furn_fridge_PSX_fridge_white"],
  [56.500778,57.199135,0.47,1.58,32.012676,32.139042,"furn_fridge_PSX_fridge_white_door"],
  [54.869998,55.219998,0.415,1.345,31.45,32.07,"furn_cozinha_balcao_auxiliar"],
  [56.050001,56.460001,0.415,1.345,31.45,32.07,"furn_cozinha_balcao_auxiliar.001"],
  [51.017668,51.482332,4.421939,4.855342,39.506507,39.630947,"furn_player_chair_Chair_Back"],
  [52.778674,56.88133,1.423521,4.746479,38.006001,38.074001,"Corrimao_carvalho"],
];
// Replaced facing/overlap errors must not leave an invisible old blocker.
const replacedSolids = new Set(['Fixture_Washer_Body','Fixture_Washer_Bottle','Fixture_Dryer_Body','Fixture_Toilet_Body','bookcase_tall.002','bookcase_tall']);
export const HOST_HOUSE_SOLIDS:readonly HhSolid[]=[...measured.filter(s=>!replacedSolids.has(s[6])),...HOST_HOUSE_RENOVATED_FURNITURE].map(([minX,maxX,minY,maxY,minZ,maxZ,name])=>({
  x:800-(minX+maxX)/2,z:(minZ+maxZ)/2,halfWidth:(maxX-minX)/2,halfDepth:(maxZ-minZ)/2,minY,maxY,name,
}));
const eye=(x:number,z:number,upper=false)=>hhPoint(x,(upper?HOST_HOUSE_UPPER:HOST_HOUSE_GROUND)+EYE_HEIGHT,z);
export const HOST_HOUSE_ROOM_POINTS={
  foyer:eye(50.7,37),living:eye(50.72,39),dining:eye(51.8,34.7),kitchen:eye(55.2,33.7),utility:eye(54.1,40.8),
  upperLanding:eye(57.35,37.475,true),playerBedroom:eye(50.6,40.4,true),hostsBedroom:eye(55.8,39.4,true),
  upperFrontRoom:eye(50.6,34.6,true),bathroom:eye(55.9,34.4,true),
};
/** Each segment starts at the preceding segment's destination. Reversing the
 * flattened points returns along the same doors, stairs and landing to exit. */
export const HOST_HOUSE_QA_TOUR=[
  {id:'living-room',points:[HOST_HOUSE_SPAWN,eye(50.7,37),eye(50.7,38.5),HOST_HOUSE_ROOM_POINTS.living],lookAt:hhPoint(50.4,1.35,41.8)},
  {id:'kitchen',points:[eye(50.7,38.5),eye(50.7,37),eye(50.7,35.4),HOST_HOUSE_ROOM_POINTS.dining,
    eye(52.3,33.5),eye(53.5,33.5),HOST_HOUSE_ROOM_POINTS.kitchen],lookAt:hhPoint(55.8,1.5,31.85)},
  {id:'player-bedroom',points:[eye(54.5,34.8),eye(54.5,36.3),eye(52.45,36.3),eye(52.45,37.475),eye(52.8,37.475),
    eye(56.95,37.475,true),HOST_HOUSE_ROOM_POINTS.upperLanding,eye(57.35,36.3,true),eye(52.5,36.3,true),
    eye(50.625,36.9,true),eye(50.625,38.5,true),HOST_HOUSE_ROOM_POINTS.playerBedroom],lookAt:hhPoint(50.1,4.5,41.5)},
] as const;
export const HOST_HOUSE_UPPER_BRANCHES={
  hostsBedroom:[HOST_HOUSE_ROOM_POINTS.upperLanding,eye(57.35,38.5,true),eye(55.8,39.4,true)],
  bathroom:[HOST_HOUSE_ROOM_POINTS.upperLanding,eye(57.35,36.3,true),eye(55.9,36.3,true),eye(55.9,35.3,true),HOST_HOUSE_ROOM_POINTS.bathroom],
  frontRoom:[eye(50.625,36.9,true),eye(50.625,35.4,true),HOST_HOUSE_ROOM_POINTS.upperFrontRoom],
} as const;
export const HOST_HOUSE_COLLISION_PROBE={approach:HOST_HOUSE_ROOM_POINTS.living,target:hhPoint(49.4,1,40.1),solidName:'sofa_red.001'};
