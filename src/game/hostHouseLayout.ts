import type { Point2, Point3 } from './layout';
import { EYE_HEIGHT } from './layout';
import type { Obstacle } from './types';
import { WB_ORIGIN_X } from './westbridgeLayout';

export const HOST_HOUSE_SOURCE = '/models/daniel_helen_house_a01.glb';
export const HOST_HOUSE_ORIGIN_X = WB_ORIGIN_X;
export const HOST_HOUSE_NATIVE_ROOT = { x:15.38, y:0, z:-12.68 } as const;
/** A01 is already authored in the neighbourhood's source coordinates. */
export const hhPoint = (x:number,y:number,z:number):Point3 => ({x:HOST_HOUSE_ORIGIN_X-x,y,z});
export const hhLocalPoint = (x:number,y:number,z:number):Point3 => hhPoint(x+15.38,y,z-12.68);
export const HOST_HOUSE_GROUND = .40;
export const HOST_HOUSE_UPPER = 3.12;
export const HOST_HOUSE_GARAGE_GROUND = .16;
export const HOST_HOUSE_PORTAL_GROUND = .40;
export const HOST_HOUSE_SPAWN = hhLocalPoint(4.68,HOST_HOUSE_GROUND+EYE_HEIGHT,-.48);
export const HOST_HOUSE_YAW = Math.PI;
export const HOST_HOUSE_EXIT = hhLocalPoint(4.68,1.415,-.08);
export const HOST_HOUSE_EXIT_SIZE:[number,number,number] = [1.18,2.03,.055];
export const HOST_HOUSE_NODE_ADJUSTMENTS:readonly {nodeName:string;sourceDelta:Point3;reason:string}[]=[];
/** Only the outer garage extremities shrink to fit the original exterior.
 * Existing shared wall, furniture and compact measuring car remain untouched. */
export const HOST_HOUSE_GEOMETRY_ADJUSTMENTS = {
  names:["ENV_0_06.001", "ENV_0_06_Vao_ombreira.001", "ENV_0_06_Vao_verga", "ENV_0_06_verga", "ENV_0_07", "ENV_0_08", "ENV_0_08.001", "ENV_0_08_abaixo", "ENV_0_08_acima", "ENV_0_08_Janela_ombreira", "ENV_0_08_Janela_ombreira.001", "ENV_0_08_Janela_peitoril", "ENV_0_08_Janela_travessa", "ENV_0_08_Janela_verga", "Forro_garagem", "Piso_garagem"],
  sourceMinX:26.58, deltaX:-.34,
} as const;
export function adjustHostHouseSourceX(name:string,sourceX:number){
  return (HOST_HOUSE_GEOMETRY_ADJUSTMENTS.names as readonly string[]).includes(name) &&
    sourceX>=HOST_HOUSE_GEOMETRY_ADJUSTMENTS.sourceMinX-1e-5 ? sourceX-.34 : sourceX;
}
export type HhRect={minX:number;maxX:number;minZ:number;maxZ:number};
export type HhFloor=HhRect&{height:number;surface:'wood'|'concrete'};
export type HhSolid=Obstacle&{minY:number;maxY:number;name:string;support:boolean};
export const hhRect=(minX:number,maxX:number,minZ:number,maxZ:number):HhRect=>
  ({minX:HOST_HOUSE_ORIGIN_X-maxX,maxX:HOST_HOUSE_ORIGIN_X-minX,minZ,maxZ});
export const hhLocalRect=(minX:number,maxX:number,minZ:number,maxZ:number):HhRect=>
  hhRect(minX+15.38,maxX+15.38,minZ-12.68,maxZ-12.68);
export const withinHhRect=(rect:HhRect,p:Point2)=>p.x>=rect.minX&&p.x<=rect.maxX&&p.z>=rect.minZ&&p.z<=rect.maxZ;
const localFloor=(minX:number,maxX:number,minZ:number,maxZ:number,height:number,surface:'wood'|'concrete'='wood'):HhFloor=>
  ({...hhLocalRect(minX,maxX,minZ,maxZ),height,surface});
// Ordered high-to-low at overlapping thresholds, matching the exported treads.
export const HOST_HOUSE_GROUND_FLOORS:readonly HhFloor[]=[
  localFloor(0,7.7,-6.28,0,.4), localFloor(.5,2.97,0,.7,.4),
  localFloor(7.7,8.13,-4.62,-3.72,.28,'concrete'),
  localFloor(7.7,11.4,-5.8,-.47,.16,'concrete'),
  localFloor(3.26,6.06,0,1.6,.37),
];
export const HOST_HOUSE_APPROACH_FLOORS:readonly HhFloor[]=[
  {...hhRect(19.4664,20.6466,-11.1414,-10.8582),height:.2777,surface:'concrete'},
  {...hhRect(19.4664,20.6466,-11.0942,-10.6221),height:.1715,surface:'concrete'},
  {...hhRect(19.4,20.7,-11.55,-4.25),height:.1265,surface:'concrete'},
];
export const HOST_HOUSE_UPPER_FLOORS:readonly HhFloor[]=[
  localFloor(0,7.7,-1.65,0,3.12),localFloor(0,7.7,-6.28,-4.3,3.12),
  localFloor(0,2.05,-4.3,-1.65,3.12),localFloor(4.01,7.7,-4.3,-1.65,3.12),
];
export const HOST_HOUSE_STAIRS={steps:16,bottom:HOST_HOUSE_GROUND,top:HOST_HOUSE_UPPER,rise:.17,
  rect:hhLocalRect(2.05,4.01,-4.3,-1.65),
  first:hhLocalRect(2.05,2.99,-3.4,-1.65),second:hhLocalRect(3.07,4.01,-3.4,-1.65),
  landing:hhLocalRect(2.05,4.01,-4.3,-3.4),landingHeight:1.76,
};
export function hostHouseStairHeight(p:Point2):number|null{
  const z=p.z+12.68;
  if(withinHhRect(HOST_HOUSE_STAIRS.landing,p))return 1.76;
  if(withinHhRect(HOST_HOUSE_STAIRS.first,p))return .4+Math.max(1,Math.min(7,Math.floor((-z-1.65+1e-7)/.25)+1))*.17;
  if(withinHhRect(HOST_HOUSE_STAIRS.second,p))return .4+Math.max(9,Math.min(15,Math.floor((z+3.4+1e-7)/.25)+9))*.17;
  return null;
}
/** Source global bounds from the 211 meshes explicitly marked colisao=true.
 * Supports retain their undersides for head clearance; only climbable tops
 * may be ignored within one normal step. Never aggregate furniture groups. */
const measured:readonly(readonly[number,number,number,number,number,number,string])[]=[
  [17.43,18.37,0.38,0.57,-14.58,-14.33,"Degrau_lance_A_01"],
  [17.43,18.37,0.38,0.74,-14.83,-14.58,"Degrau_lance_A_02"],
  [17.43,18.37,0.38,0.91,-15.08,-14.83,"Degrau_lance_A_03"],
  [17.43,18.37,0.38,1.08,-15.33,-15.08,"Degrau_lance_A_04"],
  [17.43,18.37,0.38,1.25,-15.58,-15.33,"Degrau_lance_A_05"],
  [17.43,18.37,0.38,1.42,-15.83,-15.58,"Degrau_lance_A_06"],
  [17.43,18.37,0.38,1.59,-16.08,-15.83,"Degrau_lance_A_07"],
  [18.45,19.39,1.74,1.93,-16.08,-15.83,"Degrau_lance_B_09"],
  [18.45,19.39,1.74,2.1,-15.83,-15.58,"Degrau_lance_B_10"],
  [18.45,19.39,1.74,2.27,-15.58,-15.33,"Degrau_lance_B_11"],
  [18.45,19.39,1.74,2.44,-15.33,-15.08,"Degrau_lance_B_12"],
  [18.45,19.39,1.74,2.61,-15.08,-14.83,"Degrau_lance_B_13"],
  [18.45,19.39,1.74,2.78,-14.83,-14.58,"Degrau_lance_B_14"],
  [18.45,19.39,1.74,2.95,-14.58,-14.33,"Degrau_lance_B_15"],
  [17.43,19.39,1.58,1.76,-16.98,-16.08,"Patamar_U"],
  [15.88,16.185421,0.4,2.9,-12.723367,-12.28,"Bay_face_lateral"],
  [18.035398,18.35,0.4,2.9,-12.724761,-12.28,"Bay_face_lateral.001"],
  [16.11,16.580568,0.4,0.93,-12.350795,-11.98,"Bay_peitoril_angular"],
  [16.53,17.68,0.4,0.93,-12.067,-11.98,"Bay_peitoril_angular.001"],
  [17.63022,18.11,0.4,0.93,-12.351351,-11.98,"Bay_peitoril_angular.002"],
  [16.11,16.580568,2.32,2.9,-12.350795,-11.98,"Bay_verga_angular"],
  [16.53,17.68,2.32,2.9,-12.067,-11.98,"Bay_verga_angular.001"],
  [17.63022,18.11,2.32,2.9,-12.351351,-11.98,"Bay_verga_angular.002"],
  [17.335,17.445,0.4,2.9,-16.98,-14.28,"DIV_0_00"],
  [19.365,19.475,0.4,2.9,-16.98,-14.3,"DIV_0_01"],
  [17.39,19.42,0.4,2.9,-17.075,-16.965,"DIV_0_02"],
  [15.38,15.88,0.4,2.9,-12.88,-12.68,"ENV_0_00"],
  [18.35,19.47,0.4,2.9,-12.88,-12.68,"ENV_0_01"],
  [20.65,21.6,0.4,2.9,-12.88,-12.68,"ENV_0_01.001"],
  [22.76,23.08,0.4,2.9,-12.88,-12.68,"ENV_0_01.002"],
  [21.6,22.76,0.4,1.02,-12.88,-12.68,"ENV_0_01_abaixo"],
  [21.6,22.76,2.41,2.9,-12.88,-12.68,"ENV_0_01_acima"],
  [19.47,20.65,2.43,2.9,-12.88,-12.68,"ENV_0_01_verga"],
  [15.38,16.29,0.4,2.9,-18.960001,-18.76,"ENV_0_03"],
  [17.45,18.65,0.4,2.9,-18.960001,-18.76,"ENV_0_03.001"],
  [19.81,21.01,0.4,2.9,-18.960001,-18.76,"ENV_0_03.002"],
  [22.17,23.08,0.4,2.9,-18.960001,-18.76,"ENV_0_03.003"],
  [16.29,17.45,0.4,1.02,-18.960001,-18.76,"ENV_0_03_abaixo"],
  [18.65,19.81,0.4,1.02,-18.960001,-18.76,"ENV_0_03_abaixo.001"],
  [21.01,22.17,0.4,1.02,-18.960001,-18.76,"ENV_0_03_abaixo.002"],
  [16.29,17.45,2.41,2.9,-18.960001,-18.76,"ENV_0_03_acima"],
  [18.65,19.81,2.41,2.9,-18.960001,-18.76,"ENV_0_03_acima.001"],
  [21.01,22.17,2.41,2.9,-18.960001,-18.76,"ENV_0_03_acima.002"],
  [15.38,15.58,0.4,2.9,-13.88,-12.88,"ENV_0_04"],
  [15.38,15.58,0.4,2.9,-17.66,-14.92,"ENV_0_04.001"],
  [15.38,15.58,0.4,2.9,-18.76,-18.690001,"ENV_0_04.002"],
  [15.38,15.58,0.4,1.02,-14.92,-13.88,"ENV_0_04_abaixo"],
  [15.38,15.58,0.4,1.02,-18.690001,-17.66,"ENV_0_04_abaixo.001"],
  [15.38,15.58,2.41,2.9,-14.92,-13.88,"ENV_0_04_acima"],
  [15.38,15.58,2.41,2.9,-18.690001,-17.66,"ENV_0_04_acima.001"],
  [22.88,23.28,0.4,2.9,-16.4,-12.88,"ENV_0_05"],
  [22.88,23.28,0.4,2.9,-18.76,-17.3,"ENV_0_05.001"],
  [22.88,23.28,2.43,2.9,-17.3,-16.4,"ENV_0_05_verga"],
  [23.08,23.48,0.4,2.9,-13.35,-13.15,"ENV_0_06"],
  [26.79,27.12,0.4,2.9,-13.35,-13.15,"ENV_0_06.001"],
  [23.48,26.79,2.43,2.9,-13.35,-13.15,"ENV_0_06_verga"],
  [24.190001,25.57,0.98,1.47,-16.66,-15.11,"Carro_compacto_cabine"],
  [24.01,25.75,0.44,0.99,-17.74,-13.95,"Carro_compacto_carroceria"],
  [24.01,24.150001,0.14,0.72,-14.79,-14.21,"Carro_compacto_roda"],
  [24.01,24.150001,0.14,0.72,-17.48,-16.9,"Carro_compacto_roda.001"],
  [25.61,25.75,0.14,0.72,-14.79,-14.21,"Carro_compacto_roda.002"],
  [25.61,25.75,0.14,0.72,-17.48,-16.9,"Carro_compacto_roda.003"],
  [24.25,25.51,1.44,1.5,-16.48,-15.24,"Carro_compacto_teto"],
  [23.08,23.51,0.16,0.28,-17.3,-16.4,"Degrau_garagem"],
  [23.08,27.12,0.16,2.67,-18.48,-18.28,"ENV_0_07"],
  [26.92,27.12,0.16,2.67,-15.24,-13.35,"ENV_0_08"],
  [26.92,27.12,0.16,2.67,-18.28,-16.39,"ENV_0_08.001"],
  [26.92,27.12,0.16,1.08,-16.39,-15.24,"ENV_0_08_abaixo"],
  [26.92,27.12,2.12,2.67,-16.39,-15.24,"ENV_0_08_acima"],
  [23.08,27.12,2.67,2.85,-18.48,-13.15,"Forro_garagem"],
  [23.08,27.12,0.04,0.16,-18.48,-13.15,"Piso_garagem"],
  [15.38,23.08,0.18,0.4,-18.960001,-12.68,"Laje_terreo"],
  [15.619997,16.449996,0.4,1.21,-17.070001,-15.109999,"MOV_0_00_Sofá_mesh"],
  [16.860003,17.300001,0.4,0.85,-16.16,-15.309999,"MOV_0_01_Mesa_mesh"],
  [18.495,18.732178,0.95,1.41,-13.555003,-13.015004,"MOV_0_02_TV_CRT_mesh"],
  [18.720882,18.735,1.116575,1.136972,-13.506726,-13.472364,"MOV_0_02_TV_CRT_mesh.001"],
  [18.466004,18.734184,0.4,0.939815,-13.615624,-12.954375,"MOV_0_02_TV_Rack_mesh"],
  [18.46,18.740188,0.905185,0.95,-13.629999,-12.94,"MOV_0_02_TV_Rack_mesh.001"],
  [18.733182,18.747191,0.491667,0.868519,-13.584479,-13.301771,"MOV_0_02_TV_Rack_mesh.002"],
  [18.747393,18.752996,0.753426,0.769722,-13.56052,-13.325729,"MOV_0_02_TV_Rack_mesh.003"],
  [18.749193,18.76,0.645972,0.673472,-13.476666,-13.409583,"MOV_0_02_TV_Rack_mesh.004"],
  [18.733182,18.747191,0.491667,0.868519,-13.268229,-12.985521,"MOV_0_02_TV_Rack_mesh.005"],
  [18.747393,18.752996,0.753426,0.769722,-13.244271,-13.009479,"MOV_0_02_TV_Rack_mesh.006"],
  [18.749193,18.76,0.645972,0.673472,-13.160417,-13.093333,"MOV_0_02_TV_Rack_mesh.007"],
  [16.53,17.269999,0.4,1.19,-13.939999,-13.190002,"MOV_0_03_Poltrona_mesh"],
  [16.530003,17.980001,0.4,1.16,-18.300001,-17.6,"MOV_0_04_Mesa jantar_mesh"],
  [16.16,16.489998,0.4,1.26,-18.070002,-17.730001,"MOV_0_05_Cadeira_mesh"],
  [18.020002,18.350001,0.4,1.26,-18.069999,-17.729997,"MOV_0_06_Cadeira_mesh"],
  [16.709998,17.05,0.4,1.26,-17.569998,-17.24,"MOV_0_07_Cadeira_mesh"],
  [17.449998,17.79,0.4,1.26,-17.569998,-17.24,"MOV_0_08_Cadeira_mesh"],
  [20.56,20.77,0.4,1.24,-18.76,-18.17,"MOV_0_09_Bancada"],
  [21.38,21.82,0.4,1.24,-18.76,-18.17,"MOV_0_09_Bancada.001"],
  [22.43,22.85,0.4,1.24,-18.76,-18.17,"MOV_0_09_Bancada.002"],
  [20.56,22.85,1.24,1.29,-18.76,-18.17,"MOV_0_09_Bancada_tampo"],
  [20.76,21.37,1.285,1.303,-18.66,-18.23,"MOV_0_10_Pia"],
  [21.862896,22.397106,0.52707,0.952066,-18.76,-18.701246,"MOV_0_11_Fogão_mesh"],
  [21.84,22.420002,0.4,1.3,-18.733118,-18.169998,"MOV_0_11_Fogão_mesh.001"],
  [22.172852,22.859999,0.4,2.1,-15.529277,-14.81,"MOV_0_12_Geladeira_mesh"],
  [22.16,22.276537,0.46,1.57,-15.529998,-14.81,"MOV_0_12_Geladeira_mesh.001"],
  [19.92,20.189997,0.4,1.1,-13.960001,-13.541296,"MOV_0_13_Aparador_mesh"],
  [19.939687,20.17031,0.890511,1.043796,-13.864873,-13.500002,"MOV_0_13_Aparador_mesh.001"],
  [15.88,18.35,0.18,0.4,-12.68,-11.98,"Piso_bay_window"],
  [18.64,21.44,0.18,0.37,-12.68,-11.08,"Piso_varanda"],
  [18.315,18.425,3.12,5.62,-13.09,-12.88,"DIV_1_00"],
  [18.315,18.425,3.12,5.62,-14.33,-13.95,"DIV_1_00.001"],
  [18.315,18.425,5.15,5.62,-13.95,-13.09,"DIV_1_00_verga"],
  [19.385,19.495,3.12,5.62,-17.210001,-14.33,"DIV_1_01"],
  [19.44,19.57,3.12,5.62,-17.265,-17.155,"DIV_1_02"],
  [20.43,20.72,3.12,5.62,-17.265,-17.155,"DIV_1_02.001"],
  [19.57,20.43,5.15,5.62,-17.265,-17.155,"DIV_1_02_verga"],
  [20.665,20.775,3.12,5.62,-13.44,-12.88,"DIV_1_03"],
  [20.665,20.775,3.12,5.62,-14.86,-14.26,"DIV_1_03.001"],
  [20.665,20.775,3.12,5.62,-18.76,-15.72,"DIV_1_03.002"],
  [20.665,20.775,5.15,5.62,-14.26,-13.44,"DIV_1_03_verga"],
  [20.665,20.775,5.15,5.62,-15.72,-14.86,"DIV_1_03_verga.001"],
  [20.72,22.88,3.12,5.62,-14.695,-14.585,"DIV_1_04"],
  [15.38,15.88,3.12,5.62,-12.88,-12.68,"ENV_1_00"],
  [18.35,19.48,3.12,5.62,-12.88,-12.68,"ENV_1_01"],
  [20.63,21.6,3.12,5.62,-12.88,-12.68,"ENV_1_01.001"],
  [22.76,23.08,3.12,5.62,-12.88,-12.68,"ENV_1_01.002"],
  [19.48,20.63,3.12,3.74,-12.88,-12.68,"ENV_1_01_abaixo"],
  [21.6,22.76,3.12,3.74,-12.88,-12.68,"ENV_1_01_abaixo.001"],
  [19.48,20.63,5.13,5.62,-12.88,-12.68,"ENV_1_01_acima"],
  [21.6,22.76,5.13,5.62,-12.88,-12.68,"ENV_1_01_acima.001"],
  [15.88,16.53,3.12,5.62,-12.88,-12.68,"ENV_1_02"],
  [17.68,18.35,3.12,5.62,-12.88,-12.68,"ENV_1_02.001"],
  [16.53,17.68,3.12,3.74,-12.88,-12.68,"ENV_1_02_abaixo"],
  [16.53,17.68,5.13,5.62,-12.88,-12.68,"ENV_1_02_acima"],
  [15.38,16.29,3.12,5.62,-18.960001,-18.76,"ENV_1_03"],
  [17.45,18.65,3.12,5.62,-18.960001,-18.76,"ENV_1_03.001"],
  [19.81,21.01,3.12,5.62,-18.960001,-18.76,"ENV_1_03.002"],
  [22.17,23.08,3.12,5.62,-18.960001,-18.76,"ENV_1_03.003"],
  [16.29,17.45,3.12,3.74,-18.960001,-18.76,"ENV_1_03_abaixo"],
  [18.65,19.81,3.12,3.74,-18.960001,-18.76,"ENV_1_03_abaixo.001"],
  [21.01,22.17,3.12,3.74,-18.960001,-18.76,"ENV_1_03_abaixo.002"],
  [16.29,17.45,5.13,5.62,-18.960001,-18.76,"ENV_1_03_acima"],
  [18.65,19.81,5.13,5.62,-18.960001,-18.76,"ENV_1_03_acima.001"],
  [21.01,22.17,5.13,5.62,-18.960001,-18.76,"ENV_1_03_acima.002"],
  [15.38,15.58,3.12,5.62,-13.88,-12.88,"ENV_1_04"],
  [15.38,15.58,3.12,5.62,-17.66,-14.92,"ENV_1_04.001"],
  [15.38,15.58,3.12,5.62,-18.76,-18.690001,"ENV_1_04.002"],
  [15.38,15.58,3.12,3.74,-14.92,-13.88,"ENV_1_04_abaixo"],
  [15.38,15.58,3.12,3.74,-18.690001,-17.66,"ENV_1_04_abaixo.001"],
  [15.38,15.58,5.13,5.62,-14.92,-13.88,"ENV_1_04_acima"],
  [15.38,15.58,5.13,5.62,-18.690001,-17.66,"ENV_1_04_acima.001"],
  [22.88,23.08,3.12,5.62,-13.88,-12.88,"ENV_1_05"],
  [22.88,23.08,3.12,5.62,-16.710001,-14.92,"ENV_1_05.001"],
  [22.88,23.08,3.12,5.62,-18.76,-17.75,"ENV_1_05.002"],
  [22.88,23.08,3.12,3.74,-14.92,-13.88,"ENV_1_05_abaixo"],
  [22.88,23.08,3.12,3.74,-17.75,-16.710001,"ENV_1_05_abaixo.001"],
  [22.88,23.08,5.13,5.62,-14.92,-13.88,"ENV_1_05_acima"],
  [22.88,23.08,5.13,5.62,-17.75,-16.710001,"ENV_1_05_acima.001"],
  [15.38,23.08,5.62,5.84,-18.960001,-12.68,"Forro_superior_teto_sotao"],
  [17.43,19.39,3.12,4.17,-16.99,-16.940001,"Guarda_corpo_superior_fundos"],
  [17.43,18.37,3.12,4.17,-14.34,-14.295,"Guarda_corpo_superior_lance_baixo"],
  [17.39,17.44,3.12,4.17,-16.98,-14.33,"Guarda_corpo_superior_lateral"],
  [19.39,23.08,2.9,3.12,-16.98,-14.33,"Laje_superior_direita"],
  [15.38,17.43,2.9,3.12,-16.98,-14.33,"Laje_superior_esquerda"],
  [15.38,23.08,2.9,3.12,-14.33,-12.68,"Laje_superior_frente"],
  [15.38,23.08,2.9,3.12,-18.960001,-16.98,"Laje_superior_fundos"],
  [15.745361,17.674641,3.643304,3.714261,-17.565576,-17.313994,"MOV_1_00_Cama casal_mesh"],
  [15.740001,17.680001,3.641087,3.716478,-17.465683,-17.413887,"MOV_1_00_Cama casal_mesh.001"],
  [15.758758,17.661244,3.496956,3.652173,-18.20193,-17.269597,"MOV_1_00_Cama casal_mesh.002"],
  [15.752059,17.667943,3.557935,3.679891,-18.246325,-18.142732,"MOV_1_00_Cama casal_mesh.003"],
  [15.772156,17.647846,3.186521,3.386087,-18.571902,-17.239999,"MOV_1_00_Cama casal_mesh.004"],
  [15.745361,17.674641,3.12,4.14,-18.62,-18.553405,"MOV_1_00_Cama casal_mesh.005"],
  [15.906134,17.513868,3.563478,4.006957,-18.557105,-18.539346,"MOV_1_00_Cama casal_mesh.006"],
  [15.812354,15.946332,3.12,3.190956,-18.549704,-18.475709,"MOV_1_00_Cama casal_mesh.007"],
  [15.812354,15.946332,3.12,3.190956,-17.336192,-17.262197,"MOV_1_00_Cama casal_mesh.008"],
  [17.473674,17.607652,3.12,3.190956,-18.549704,-18.475709,"MOV_1_00_Cama casal_mesh.009"],
  [17.473674,17.607652,3.12,3.190956,-17.336192,-17.262197,"MOV_1_00_Cama casal_mesh.010"],
  [15.812349,17.607653,3.386087,3.563478,-18.549704,-17.291795,"MOV_1_00_Cama casal_mesh.011"],
  [15.879338,16.65641,3.531716,3.70611,-18.518604,-18.299625,"MOV_1_00_Cama casal_mesh.012"],
  [16.763592,17.540664,3.531716,3.70611,-18.518604,-18.299625,"MOV_1_00_Cama casal_mesh.013"],
  [15.629999,15.984989,3.12,3.7,-17.179999,-16.840001,"MOV_1_01_Criado_mesh"],
  [15.710654,16.020002,3.526423,3.65343,-17.155208,-16.864793,"MOV_1_01_Criado_mesh.001"],
  [15.802407,15.838609,3.603,3.827,-16.246349,-16.210387,"MOV_1_02_Cômoda_mesh"],
  [16.090381,16.120001,3.2208,3.2572,-16.192409,-16.149909,"MOV_1_02_Cômoda_mesh.001"],
  [16.090381,16.120001,3.2208,3.2572,-15.800098,-15.757598,"MOV_1_02_Cômoda_mesh.002"],
  [16.068165,16.092848,3.183,3.295,-16.350962,-15.599037,"MOV_1_02_Cômoda_mesh.003"],
  [16.090381,16.120001,3.3538,3.3902,-16.192409,-16.149909,"MOV_1_02_Cômoda_mesh.004"],
  [16.090381,16.120001,3.3538,3.3902,-15.800098,-15.757598,"MOV_1_02_Cômoda_mesh.005"],
  [16.009747,16.059114,3.12,3.1648,-16.359138,-16.310099,"MOV_1_02_Cômoda_mesh.006"],
  [15.762911,15.812278,3.12,3.1648,-16.359138,-16.310099,"MOV_1_02_Cômoda_mesh.007"],
  [15.762911,15.812278,3.12,3.1648,-15.639903,-15.590865,"MOV_1_02_Cômoda_mesh.008"],
  [15.836962,15.843544,3.687,4.065,-16.195673,-15.754326,"MOV_1_02_Cômoda_mesh.009"],
  [15.746457,16.07557,3.162,3.582,-16.383654,-15.566345,"MOV_1_02_Cômoda_mesh.010"],
  [15.802407,15.838609,3.652,4.1,-16.236539,-15.71346,"MOV_1_02_Cômoda_mesh.011"],
  [16.068165,16.092848,3.449,3.561,-16.350962,-15.599037,"MOV_1_02_Cômoda_mesh.012"],
  [15.802407,15.838609,3.603,3.827,-15.739619,-15.703658,"MOV_1_02_Cômoda_mesh.013"],
  [16.068165,16.092848,3.316,3.428,-16.350962,-15.599037,"MOV_1_02_Cômoda_mesh.014"],
  [16.090381,16.120001,3.4868,3.5232,-16.192409,-16.149909,"MOV_1_02_Cômoda_mesh.015"],
  [16.090381,16.120001,3.4868,3.5232,-15.800098,-15.757598,"MOV_1_02_Cômoda_mesh.016"],
  [15.730001,16.092026,3.582,3.61,-16.4,-15.549998,"MOV_1_02_Cômoda_mesh.017"],
  [16.009747,16.059114,3.12,3.1648,-15.639903,-15.590865,"MOV_1_02_Cômoda_mesh.018"],
  [15.760946,16.370001,3.12,4.97,-13.660001,-12.98,"MOV_1_03_Armário_mesh"],
  [15.76,15.803625,3.200435,4.880628,-13.31685,-13.008336,"MOV_1_03_Armário_mesh.001"],
  [15.76,15.803625,3.200435,4.880628,-13.631665,-13.323148,"MOV_1_03_Armário_mesh.002"],
  [21.880001,22.789998,3.12,4.14,-17.900001,-16.000003,"MOV_1_04_Cama solteiro_mesh"],
  [20.880001,21.360001,3.12,3.87,-18.679998,-17.76,"MOV_1_05_Escrivaninha_mesh"],
  [20.940001,21.25,3.87,4.2,-18.389999,-18.046577,"MOV_1_06_CRT_mesh"],
  [20.97965,21.210348,3.9525,4.1505,-18.040443,-18.02,"MOV_1_06_CRT_mesh.001"],
  [21.502052,22.82,3.12,4.97,-15.23,-14.83,"MOV_1_07_Armário_mesh"],
  [21.5,21.594406,3.200435,4.880628,-15.028147,-14.846666,"MOV_1_07_Armário_mesh.001"],
  [21.5,21.594406,3.200435,4.880628,-15.213331,-15.031851,"MOV_1_07_Armário_mesh.002"],
  [21.96,22.85,3.12,3.21,-13.74,-12.9,"MOV_1_08_Chuveiro_base"],
  [22.390002,22.76,3.12,3.88,-14.39,-13.813559,"MOV_1_09_Vaso_mesh"],
  [22.422891,22.727111,3.525333,3.558267,-14.212568,-13.810001,"MOV_1_09_Vaso_mesh.001"],
  [22.422891,22.727111,3.497467,3.527867,-14.212568,-13.810001,"MOV_1_09_Vaso_mesh.002"],
  [21.270632,21.540987,3.206257,3.645385,-13.280001,-13.253654,"MOV_1_10_Lavatório_mesh"],
  [20.98,21.549999,3.12,4.07,-13.280001,-12.91,"MOV_1_10_Lavatório_mesh.001"],
];
export const HOST_HOUSE_SOLIDS:readonly HhSolid[]=measured.filter(row=>!row[6].startsWith('Carro_compacto_')).map(([minX,maxX,minY,maxY,minZ,maxZ,name])=>{
  const a=adjustHostHouseSourceX(name,minX),b=adjustHostHouseSourceX(name,maxX);
  return{x:500-(a+b)/2,z:(minZ+maxZ)/2,halfWidth:(b-a)/2,halfDepth:(maxZ-minZ)/2,minY,maxY,name,
    support:/^(Degrau_|Patamar_|Piso_|Laje_|Forro_)/.test(name)};
});
// The existing exterior garage gate stays closed and has no new interaction.
const garageGate={...hhLocalRect(8.1,11.07,-.67,-.47)};
export const HOST_HOUSE_GARAGE_GATE_SOLID:HhSolid={x:(garageGate.minX+garageGate.maxX)/2,z:(garageGate.minZ+garageGate.maxZ)/2,
  halfWidth:(garageGate.maxX-garageGate.minX)/2,halfDepth:.1,minY:.16,maxY:2.43,name:'existing-garage-gate',support:false};
const eye=(x:number,z:number,upper=false)=>hhLocalPoint(x,(upper?HOST_HOUSE_UPPER:HOST_HOUSE_GROUND)+EYE_HEIGHT,z);
export const HOST_HOUSE_ROOM_POINTS={foyer:HOST_HOUSE_SPAWN,living:eye(1.5,-1.85),dining:eye(3.3,-5.3),
  kitchen:eye(6.2,-4.7),upperLanding:eye(3.54,-1.38,true),playerBedroom:eye(6.19,-3.16,true),
  hostsBedroom:eye(1.64,-4.13,true),bathroom:eye(6.02,-1.19,true),
  garage:hhLocalPoint(8.38,.16+EYE_HEIGHT,-4.17),utility:hhLocalPoint(8.38,.16+EYE_HEIGHT,-4.17)};
const route=(points:readonly(readonly[number,number,number])[])=>points.map(([x,y,z])=>hhLocalPoint(x,y+EYE_HEIGHT,z));
const livingRoute=route([[4.68, 0.4, -0.48], [4.1, 0.4, -0.5], [3.5, 0.4, -1.2], [2.5, 0.4, -1.2], [2.5, 0.4, -0.25], [0.9, 0.4, -0.25], [0.9, 0.4, -1.7], [1.5, 0.4, -1.85]]);
const kitchenRoute=route([[4.68, 0.4, -0.48], [5.1, 0.4, -0.48], [5.1, 0.4, -4.7], [6.2, 0.4, -4.7]]);
const diningRoute=route([[6.2, 0.4, -4.7], [4.5, 0.4, -4.75], [3.3, 0.4, -5.3]]);
const stairEntryRoute=route([[4.68, 0.4, -0.48], [4.1, 0.4, -0.5], [3.5, 0.4, -1.2], [2.51, 0.4, -1.37]]);
const hostsRoute=route([[3.52, 3.12, -1.38], [3.52, 3.12, -0.85], [2.5, 3.12, -0.85], [1.5, 3.12, -1.3], [1.5, 3.12, -4.13], [1.64, 3.12, -4.13]]);
const playerRoute=route([[3.52, 3.12, -1.38], [4.65, 3.12, -1.38], [4.65, 3.12, -2.6], [5.7, 3.12, -2.6], [5.7, 3.12, -3.2], [6.19, 3.12, -3.16]]);
const bathRoute=route([[3.52, 3.12, -1.38], [4.65, 3.12, -1.17], [5.75, 3.12, -1.17], [6.02, 3.12, -1.19]]);
const garageLoop=route([[8.38, 0.16, -4.17], [8.38, 0.16, -0.9], [10.8, 0.16, -0.9], [10.8, 0.16, -5.33], [8.38, 0.16, -5.33], [8.38, 0.16, -4.17]]);
const staircaseRoute=route([[2.52, 0.4, -1.37], [2.52, 0.57, -1.775], [2.52, 0.74, -2.025], [2.52, 0.9099999999999999, -2.275], [2.52, 1.08, -2.525], [2.52, 1.25, -2.775], [2.52, 1.42, -3.025], [2.52, 1.5899999999999999, -3.275], [2.52, 1.76, -3.65], [2.52, 1.76, -3.85], [3.54, 1.76, -3.85], [3.54, 1.76, -3.65], [3.54, 1.93, -3.275], [3.54, 2.1, -3.025], [3.54, 2.27, -2.775], [3.54, 2.44, -2.525], [3.54, 2.61, -2.275], [3.54, 2.7800000000000002, -2.025], [3.54, 2.95, -1.775], [3.54, 3.12, -1.38]]);
export const HOST_HOUSE_QA_TOUR=[
  {id:'living-room',points:livingRoute,lookAt:hhLocalPoint(.65,1.15,-3.4)},
  {id:'kitchen',points:[...livingRoute.slice(0,-1).reverse(),...kitchenRoute,...diningRoute,...diningRoute.slice(0,-1).reverse()],lookAt:hhLocalPoint(6.4,1.4,-5.85)},
  {id:'player-bedroom',points:[...kitchenRoute.slice(0,-1).reverse(),...stairEntryRoute,...staircaseRoute,...playerRoute],lookAt:hhLocalPoint(7,3.8,-4.2)},
]as const;
export const HOST_HOUSE_UPPER_BRANCHES={hostsBedroom:hostsRoute,bathroom:bathRoute}as const;
export const HOST_HOUSE_GARAGE_TOUR=[HOST_HOUSE_ROOM_POINTS.kitchen,eye(6.3,-4.17),eye(7.25,-4.17),
  hhLocalPoint(7.92,.28+EYE_HEIGHT,-4.17),...garageLoop];
export const HOST_HOUSE_COLLISION_PROBE={approach:HOST_HOUSE_ROOM_POINTS.living,target:hhLocalPoint(.65,1,-3.3),solidName:'MOV_0_00_Sofá_mesh'};
