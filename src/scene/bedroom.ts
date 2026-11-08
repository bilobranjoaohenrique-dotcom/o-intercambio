import type {Scene} from '@babylonjs/core/scene';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {Color3} from '@babylonjs/core/Maths/math.color';
import type {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight';
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight';
import {PointLight} from '@babylonjs/core/Lights/pointLight';
import {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import {RenderTargetTexture} from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import {ROOM,DOOR,FURNITURE,OBJECTS} from '../game/layout';
import {HomeGeometry} from './props';
import {bedroomMaterials} from './bedroomMaterials';

/** All views are observations of this one physical room. Architecture, props,
 * materials and light are authored here; interaction rules stay in the game. */
export function buildBedroom(scene:Scene){
 const m=bedroomMaterials(scene),g=new HomeGeometry(scene),f=ROOM.floor;
 const b=g.box.bind(g),c=g.cylinder.bind(g),s=g.sphere.bind(g),rod=g.rod.bind(g);
 const width=ROOM.maxX-ROOM.minX,depth=ROOM.maxZ-ROOM.minZ,height=ROOM.ceiling-f;
 const cx=(ROOM.minX+ROOM.maxX)/2,cz=(ROOM.minZ+ROOM.maxZ)/2;

 // Per-face metric UVs are baked before material batching. Walls cut around
 // an opening therefore retain the same wallpaper pattern and physical scale.
 function metric(mesh:Mesh,scale=1){
  const p=mesh.getVerticesData('position')!,normals=mesh.getVerticesData('normal')!,uv:number[]=[];
  for(let i=0;i<p.length;i+=3){const x=p[i]+mesh.position.x,y=p[i+1]+mesh.position.y,z=p[i+2]+mesh.position.z;
   if(Math.abs(normals[i+1])>.7)uv.push(x*scale,z*scale);
   else if(Math.abs(normals[i])>.7)uv.push(z*scale,y*scale);
   else uv.push(x*scale,y*scale);
  }mesh.setVerticesData('uv',uv);return mesh;
 }
 // Cloth UVs follow measured lengths along the deformed grid rather than
 // stretching one square texture over a long curtain or a bed-sized rectangle.
 function woven(mesh:Mesh,cols:number,rows:number,period=.6){
  const p=mesh.getVerticesData('position')!,uv:number[]=[],vertical=Array(cols+1).fill(0) as number[];
  for(let row=0;row<=rows;row++){
   let horizontal=0;
   for(let col=0;col<=cols;col++){
    const at=(row*(cols+1)+col)*3;
    if(col){const prev=at-3;horizontal+=Math.hypot(p[at]-p[prev],p[at+1]-p[prev+1],p[at+2]-p[prev+2]);}
    if(row){const prev=at-(cols+1)*3;vertical[col]+=Math.hypot(p[at]-p[prev],p[at+1]-p[prev+1],p[at+2]-p[prev+2]);}
    uv.push(horizontal/period,vertical[col]/period);
   }
  }mesh.setVerticesData('uv',uv);return mesh;
 }
 function board(name:string,w:number,h:number,d:number,x:number,y:number,z:number,mat:StandardMaterial=m.wood,target?:string){
  return metric(b(name,w,h,d,x,y,z,mat,target),1.45);
 }
 function wall(name:string,x0:number,x1:number,y0:number,y1:number,z0:number,z1:number){
  return metric(b(name,x1-x0,y1-y0,z1-z0,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,m.plaster),2.1);
 }
 // A compact bevelled prism, using local vertices so rotations stay centred.
 function softBox(name:string,w:number,h:number,d:number,x:number,y:number,z:number,mat:StandardMaterial,r=.015,target?:string){
  const mesh=new Mesh(name,scene),positions:number[]=[],uv:number[]=[],indices:number[]=[],normals:number[]=[];
  const bevel=Math.min(r,w/5,h/5,d/5),ringY=[-h/2,-h/2+bevel,h/2-bevel,h/2];
  for(let row=0;row<4;row++){
   const inset=row===0||row===3?bevel:0,hw=w/2-inset,hd=d/2-inset,corner=Math.min(bevel,hw/3,hd/3);
   const ring=[[-hw+corner,-hd],[hw-corner,-hd],[hw,-hd+corner],[hw,hd-corner],[hw-corner,hd],[-hw+corner,hd],[-hw,hd-corner],[-hw,-hd+corner]];
   for(let i=0;i<8;i++){positions.push(ring[i][0],ringY[row],ring[i][1]);uv.push(i/8,row/3);}
  }
  for(let row=0;row<3;row++)for(let i=0;i<8;i++){const a=row*8+i,bb=row*8+(i+1)%8,cc=a+8,dd=bb+8;indices.push(a,bb,cc,bb,dd,cc);}
  for(let i=1;i<7;i++){indices.push(0,i+1,i);indices.push(24,24+i,24+i+1);}
  VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=uv;data.applyToMesh(mesh);mesh.position.set(x,y,z);return g.add(mesh,mat,target);
 }
 // The floor and ceiling enclose precisely the collision layout, in metres.
 metric(b('quarto · piso de taco',width,.12,depth,cx,f-.06,cz,m.floor),1.22);
 metric(b('quarto · teto envelhecido',width+.24,.12,depth+.24,cx,ROOM.ceiling+.06,cz,m.ceiling),1.2);
 wall('quarto · parede esquerda',ROOM.maxX,ROOM.maxX+.12,f,ROOM.ceiling,ROOM.minZ,ROOM.maxZ);
 wall('quarto · parede direita',ROOM.minX-.12,ROOM.minX,f,ROOM.ceiling,ROOM.minZ,ROOM.maxZ);
 const window={x:FURNITURE.desk.x,y:f+1.55,w:1.4,h:1.2,z:ROOM.minZ};
 const wx0=window.x-window.w/2,wx1=window.x+window.w/2,wy0=window.y-window.h/2,wy1=window.y+window.h/2;
 wall('quarto · parede à direita da janela',ROOM.minX,wx0,f,ROOM.ceiling,ROOM.minZ-.12,ROOM.minZ);
 wall('quarto · parede à esquerda da janela',wx1,ROOM.maxX,f,ROOM.ceiling,ROOM.minZ-.12,ROOM.minZ);
 wall('quarto · parede abaixo da janela',wx0,wx1,f,wy0,ROOM.minZ-.12,ROOM.minZ);
 wall('quarto · parede acima da janela',wx0,wx1,wy1,ROOM.ceiling,ROOM.minZ-.12,ROOM.minZ);
 wall('quarto · parede ao lado esquerdo da porta',ROOM.minX,DOOR.hingeX,f,ROOM.ceiling,ROOM.maxZ,ROOM.maxZ+.12);
 wall('quarto · parede ao lado direito da porta',DOOR.hingeX+DOOR.width,ROOM.maxX,f,ROOM.ceiling,ROOM.maxZ,ROOM.maxZ+.12);
 wall('quarto · verga sobre a porta',DOOR.hingeX,DOOR.hingeX+DOOR.width,f+DOOR.height,ROOM.ceiling,ROOM.maxZ,ROOM.maxZ+.12);
 for(const x of[ROOM.minX+.014,ROOM.maxX-.014]){
  board('quarto · rodapé lateral',.029,.085,depth,x,f+.0425,cz,m.darkWood);
  board('quarto · remate do teto',.032,.033,depth,x,ROOM.ceiling-.016,cz,m.darkWood);
 }
 board('quarto · rodapé do fundo',width,.085,.03,cx,f+.0425,ROOM.minZ+.015,m.darkWood);
 for(const [x0,x1] of [[ROOM.minX,DOOR.hingeX],[DOOR.hingeX+DOOR.width,ROOM.maxX]])
  board('quarto · rodapé junto à porta',x1-x0,.085,.03,(x0+x1)/2,f+.0425,ROOM.maxZ-.015,m.darkWood);

 // Real framed opening and glazing; outside is modelled, not a room photo.
 for(const x of[wx0-.025,wx1+.025])board('janela · marco vertical',.065,window.h+.12,.10,x,window.y,window.z+.025,m.darkWood);
 for(const y of[wy0-.02,wy1+.02])board('janela · marco horizontal',window.w+.12,.065,.10,window.x,y,window.z+.025,m.darkWood);
 board('janela · peitoril',window.w+.19,.045,.22,window.x,wy0-.04,window.z+.055,m.wood);
 board('janela · montante central',.046,window.h,.055,window.x,window.y,window.z+.055,m.wood);
 for(const x of[window.x-window.w/4,window.x+window.w/4])board('janela · montante fino',.023,window.h,.038,x,window.y,window.z+.061,m.darkWood);
 board('janela · travessa',window.w,.033,.045,window.x,window.y+.03,window.z+.058,m.darkWood);
 const glass=g.plane('janela · vidro',window.w,window.h,window.x,window.y,window.z-.015,m.glass,Math.PI);glass.isPickable=false;
 for(const x of[window.x-.045,window.x+.045])board('janela · fecho',.014,.075,.035,x,window.y-.10,window.z+.092,m.metal);
 rod('cortina · varão',{x:wx0-.21,y:wy1+.13,z:window.z+.17},{x:wx1+.21,y:wy1+.13,z:window.z+.17},.012,m.darkWood);
 for(const side of[-1,1]){
  const start=side<0?wx0-.18:wx1-.16;
  woven(g.cloth('cortina · tecido xadrez pregueado',16,23,(u,v)=>({x:start+u*.36+Math.sin(v*4)*.006,y:wy1+.10-v*1.55+Math.sin(u*Math.PI*8)*.008,z:window.z+.16+Math.cos(u*Math.PI*8)*.035}),m.curtain),16,23);
  for(let i=0;i<5;i++)c('cortina · argola',.025,.028,.028,start+.018+i*.073,wy1+.106,window.z+.17,m.metal,undefined,6);
 }

 const bed=FURNITURE.bed;
 board('cama · estrutura',bed.width,.16,bed.depth,bed.x,f+.27,bed.z,m.darkWood);
 for(const side of[-1,1])for(const end of[-1,1])board('cama · pé',.065,.28,.065,bed.x+side*(bed.width/2-.055),f+.14,bed.z+end*(bed.depth/2-.07),m.wood);
 board('cama · cabeceira maciça',bed.width+.035,.91,.05,bed.x,f+.49,bed.z-bed.depth/2+.025,m.darkWood);
 board('cama · painel da cabeceira',bed.width-.10,.70,.018,bed.x,f+.51,bed.z-bed.depth/2+.061,m.wood);
 for(const x of[bed.x-bed.width/2+.025,bed.x+bed.width/2-.025])board('cama · montante da cabeceira',.058,.99,.07,x,f+.51,bed.z-bed.depth/2+.021,m.wood);
 board('cama · remate da cabeceira',bed.width+.055,.047,.075,bed.x,f+1.02,bed.z-bed.depth/2+.025,m.wood);
 softBox('cama · colchão',bed.width-.025,.21,bed.depth-.06,bed.x,f+.425,bed.z,m.linen,.045);
 woven(g.cloth('cama · colcha xadrez com peso',24,30,(u,v)=>{
  const xx=u-.5,side=Math.max(0,(Math.abs(xx)-.405)/.095),foot=Math.max(0,(v-.92)/.08);
  return{x:bed.x+Math.max(-.405,Math.min(.405,xx))*1.08+Math.sign(xx)*Math.max(0,Math.abs(xx)-.405)*.37,
   y:f+.555+.011*Math.sin(v*16+u*12)+.005*Math.cos(u*27)-side*.31-foot*.24,
   z:bed.z-bed.depth/2+.055+Math.min(v,.92)/.92*(bed.depth-.065)+foot*.028};
 },m.blanket,undefined,true),24,30);
 metric(softBox('cama · travesseiro xadrez',.66,.13,.34,bed.x,f+.625,bed.z-bed.depth/2+.30,m.blanket,.06),1/.6).rotation.y=-.025;
 // The central rug is a thin, textured object, with no artificial floor blocker.
 b('quarto · tapete central',1.48,.009,1.88,1.31,f+.007,1.94,m.rug);

 const desk=FURNITURE.desk,top=f+desk.height;
 board('escrivaninha · tampo',desk.width,.055,desk.depth,desk.x,top-.0275,desk.z,m.wood);
 for(const x of[desk.x-desk.width/2+.028,desk.x+desk.width/2-.028])board('escrivaninha · lateral',.055,desk.height-.06,desk.depth-.035,x,f+(desk.height-.06)/2,desk.z,m.darkWood);
 board('escrivaninha · saia do fundo',desk.width-.08,.20,.025,desk.x,top-.17,desk.z-desk.depth/2+.035,m.darkWood);
 const drawersX=desk.x-.50;
 board('escrivaninha · gaveteiro',.33,.69,.52,drawersX,f+.345,desk.z+.015,m.darkWood);
 for(let i=0;i<4;i++){
  board('escrivaninha · frente da gaveta',.31,.142,.022,drawersX,f+.13+i*.159,desk.z+.284,m.wood);
  rod('escrivaninha · puxador',{x:drawersX-.055,y:f+.14+i*.159,z:desk.z+.306},{x:drawersX+.055,y:f+.14+i*.159,z:desk.z+.306},.005,m.metal);
 }
 const monitor={x:desk.x+.06,y:top+.265,z:desk.z-.075};
 softBox('computador · pedestal do CRT',.22,.04,.20,monitor.x,top+.02,monitor.z+.015,m.plastic,.012);
 b('computador · coluna do CRT',.12,.055,.12,monitor.x,top+.060,monitor.z-.025,m.plastic);
 softBox('computador · gabinete do CRT',.455,.355,.32,monitor.x,monitor.y,monitor.z,m.plastic,.025);
 softBox('computador · contorno do vidro',.377,.278,.025,monitor.x,monitor.y+.022,monitor.z+.164,m.rubber,.021);
 softBox('computador · vidro convexo escuro',.345,.247,.023,monitor.x,monitor.y+.022,monitor.z+.180,m.screen,.020);
 c('computador · botão do monitor',.009,.013,.013,monitor.x-.153,monitor.y-.137,monitor.z+.166,m.ivory,undefined,8).rotation.x=Math.PI/2;
 b('computador · indicação de espera',.008,.004,.004,monitor.x+.157,monitor.y-.135,monitor.z+.165,m.bulb);
 for(let i=0;i<6;i++)b('computador · ventilação do monitor',.002,.014,.055,monitor.x+.229,monitor.y-.08+i*.027,monitor.z-.02,m.rubber);
 const towerX=desk.x+.50;
 softBox('computador · torre bege',.24,.57,.43,towerX,f+.29,desk.z+.025,m.plastic,.008);
 for(const y of[f+.39,f+.46])b('computador · unidade de disco',.19,.045,.004,towerX,y,desk.z+.243,m.ivory);
 b('computador · abertura de disquete',.125,.005,.006,towerX,f+.46,desk.z+.247,m.rubber);
 for(let i=0;i<7;i++)b('computador · ventilação da torre',.15,.004,.005,towerX,f+.08+i*.016,desk.z+.243,m.rubber);
 c('computador · botão da torre',.007,.014,.014,towerX-.07,f+.32,desk.z+.247,m.metal,undefined,8).rotation.x=Math.PI/2;
 softBox('computador · teclado',.41,.022,.13,desk.x+.04,top+.013,desk.z+.218,m.plastic,.006);
 for(let row=0;row<4;row++)for(let col=0;col<14;col++)b('computador · tecla',.019,.005,.019,desk.x-.139+col*.027,top+.026,desk.z+.174+row*.027,m.ivory);
 b('computador · barra de espaço',.12,.006,.016,desk.x+.05,top+.027,desk.z+.258,m.ivory);
 softBox('computador · mouse pad',.135,.003,.15,desk.x+.38,top+.002,desk.z+.21,m.navy,.007);
 s('computador · mouse',.052,.026,.082,desk.x+.38,top+.017,desk.z+.21,m.plastic);
 rod('computador · cabo do mouse',{x:desk.x+.38,y:top+.009,z:desk.z+.17},{x:monitor.x+.19,y:top+.009,z:monitor.z+.05},.002,m.rubber);
 c('escrivaninha · porta-lápis',.083,.058,.053,desk.x+.60,top+.043,desk.z-.17,m.metal,undefined,10);
 for(let i=0;i<4;i++)rod('escrivaninha · lápis',{x:desk.x+.585+i*.008,y:top+.015,z:desk.z-.17},{x:desk.x+.585+i*.011,y:top+.15-(i%2)*.02,z:desk.z-.168},.0025,m.bookColors[i%3]);
 board('escrivaninha · caderno',.17,.017,.22,desk.x-.47,top+.011,desk.z+.10,m.bookColors[2]);
 const doc=g.plane('escrivaninha · papéis da viagem',.13,.19,desk.x-.45,top+.022,desk.z+.12,m.travel);doc.rotation.x=Math.PI/2;
 for(let i=0;i<3;i++){
  board('escrivaninha · livro empilhado',.18,.024,.24,desk.x-.53,top+.023+i*.026,desk.z-.15,m.bookColors[i]);
  b('escrivaninha · páginas',.17,.016,.235,desk.x-.53,top+.025+i*.026,desk.z-.15,m.paper);
 }

 const chair=FURNITURE.chair;
 metric(softBox('cadeira · assento estofado',.47,.070,.43,chair.x,f+.47,chair.z,m.clothes,.026),2.5);
 const back=metric(softBox('cadeira · encosto',.43,.40,.065,chair.x,f+.77,chair.z+.22,m.clothes,.027),2.5);back.rotation.x=.11;
 rod('cadeira · suporte do encosto',{x:chair.x,y:f+.35,z:chair.z+.17},{x:chair.x,y:f+.72,z:chair.z+.25},.019,m.rubber);
 c('cadeira · pistão',.36,.039,.055,chair.x,f+.22,chair.z,m.metal,undefined,8);
 for(let i=0;i<5;i++){
  const a=i*Math.PI*2/5,x=chair.x+Math.cos(a)*.225,z=chair.z+Math.sin(a)*.225;
  rod('cadeira · raio da base',{x:chair.x,y:f+.13,z:chair.z},{x,y:f+.052,z},.013,m.rubber);
  const wheel=c('cadeira · rodinha',.035,.052,.052,x,f+.028,z,m.rubber,undefined,8);wheel.rotation.z=Math.PI/2;
 }

 const wardrobe=FURNITURE.wardrobe,face=wardrobe.x+wardrobe.width/2;
 board('roupeiro · corpo',wardrobe.width,wardrobe.height,wardrobe.depth,wardrobe.x,f+wardrobe.height/2,wardrobe.z,m.darkWood);
 for(const z of[wardrobe.z-wardrobe.depth/2+.025,wardrobe.z+wardrobe.depth/2-.025])board('roupeiro · montante vertical',.045,wardrobe.height,.058,face+.009,f+wardrobe.height/2,z,m.wood);
 for(const side of[-1,1]){
  const z=wardrobe.z+side*wardrobe.depth/4;
  board('roupeiro · porta de madeira fechada',.027,wardrobe.height-.10,wardrobe.depth/2-.065,face+.016,f+wardrobe.height/2,z,m.wood);
  board('roupeiro · painel rebaixado',.009,wardrobe.height-.28,wardrobe.depth/2-.16,face+.033,f+wardrobe.height/2,z,m.wood);
  for(const zz of[z-(wardrobe.depth/2-.13)/2,z+(wardrobe.depth/2-.13)/2])board('roupeiro · moldura do painel',.014,wardrobe.height-.20,.018,face+.041,f+wardrobe.height/2,zz,m.darkWood);
  const handleZ=wardrobe.z+side*.065;
  for(const y of[f+1.01,f+1.17])c('roupeiro · base do puxador',.024,.018,.018,face+.055,y,handleZ,m.metal,undefined,8).rotation.z=Math.PI/2;
  rod('roupeiro · puxador metálico',{x:face+.071,y:f+1.01,z:handleZ},{x:face+.071,y:f+1.17,z:handleZ},.007,m.metal);
 }
 board('roupeiro · cornija superior',wardrobe.width+.055,.075,wardrobe.depth+.08,wardrobe.x+.005,f+wardrobe.height-.017,wardrobe.z,m.wood);
 board('roupeiro · rodapé',wardrobe.width+.015,.085,wardrobe.depth+.025,wardrobe.x+.005,f+.0425,wardrobe.z,m.wood);
 for(let i=0;i<2;i++)board('roupeiro · caixa sobre o móvel',.34,.09,.42,wardrobe.x+.035,f+wardrobe.height+.075+i*.10,wardrobe.z+.43,m.bookColors[4]);

 const bedside=FURNITURE.bedside,nightTop=f+bedside.height;
 board('criado-mudo · tampo',bedside.width,.044,bedside.depth,bedside.x,nightTop-.022,bedside.z,m.wood);
 for(const x of[bedside.x-bedside.width/2+.025,bedside.x+bedside.width/2-.025])board('criado-mudo · lateral',.05,bedside.height-.04,bedside.depth-.025,x,f+(bedside.height-.04)/2,bedside.z,m.wood);
 board('criado-mudo · prateleira',bedside.width-.04,.032,bedside.depth-.025,bedside.x,f+.12,bedside.z,m.darkWood);
 board('criado-mudo · fundo',bedside.width-.05,bedside.height-.08,.025,bedside.x,f+bedside.height/2,bedside.z-bedside.depth/2+.02,m.darkWood);
 for(let i=0;i<2;i++)board('criado-mudo · livro',.26,.035,.22,bedside.x-.025,f+.151+i*.037,bedside.z+.025,m.bookColors[i]);
 const lampPosition=new Vector3(bedside.x+.025,nightTop+.30,bedside.z-.07);
 c('abajur · base',.018,.15,.16,lampPosition.x,nightTop+.009,lampPosition.z,m.brown,undefined,12);
 c('abajur · haste',.19,.024,.029,lampPosition.x,nightTop+.11,lampPosition.z,m.darkWood,undefined,10);
 const shade=MeshBuilder.CreateLathe('abajur · cúpula aberta',{shape:[new Vector3(.085,.12,0),new Vector3(.15,-.12,0)],tessellation:16,sideOrientation:Mesh.DOUBLESIDE,cap:Mesh.NO_CAP},scene);
 shade.position.set(lampPosition.x,nightTop+.32,lampPosition.z);g.add(shade,m.lampShade);
 s('abajur · lâmpada',.057,.08,.057,lampPosition.x,nightTop+.25,lampPosition.z,m.bulb);
 const clockX=bedside.x-.025,clockZ=bedside.z+.131,clockYaw=-.40;
 softBox('relógio · gabinete',.22,.085,.082,clockX,nightTop+.046,clockZ,m.rubber,.007).rotation.y=clockYaw;
 g.plane('relógio · seis e meia',.193,.057,clockX+Math.sin(clockYaw)*.042,nightTop+.051,clockZ+Math.cos(clockYaw)*.042,m.digital,Math.PI+clockYaw);

 const bag=FURNITURE.backpack,target='suitcase';
 softBox('mochila · corpo de lona',bag.width,.40,bag.depth-.025,bag.x,f+.235,bag.z,m.navy,.06,target);
 softBox('mochila · bolso frontal',.255,.20,.045,bag.x,f+.18,bag.z+.114,m.olive,.026,target);
 for(const side of[-1,1]){
  rod('mochila · alça',{x:bag.x+side*.10,y:f+.43,z:bag.z-.10},{x:bag.x+side*.12,y:f+.09,z:bag.z-.13},.014,m.navy,target);
  rod('mochila · costura lateral',{x:bag.x+side*.14,y:f+.10,z:bag.z+.085},{x:bag.x+side*.14,y:f+.35,z:bag.z+.085},.0025,m.metal,target);
 }
 rod('mochila · pega',{x:bag.x-.042,y:f+.44,z:bag.z},{x:bag.x+.042,y:f+.44,z:bag.z},.008,m.rubber,target);
 rod('mochila · zíper',{x:bag.x-.11,y:f+.28,z:bag.z+.14},{x:bag.x+.11,y:f+.28,z:bag.z+.14},.002,m.metal,target);
 b('mochila · puxador do zíper',.009,.022,.004,bag.x+.06,f+.265,bag.z+.145,m.metal,target);

 // Two shallow wall shelves, with books and a trailing real-mesh houseplant.
 for(const [row,y] of [[0,f+1.60],[1,f+1.96]]){
  board('prateleira · tábua',.88,.034,.235,2.49,y,ROOM.minZ+.13,m.wood);
  for(const x of[2.20,2.77]){
   board('prateleira · suporte vertical',.035,.14,.025,x,y-.075,ROOM.minZ+.03,m.darkWood);
   rod('prateleira · escora',{x,y:y-.125,z:ROOM.minZ+.038},{x,y:y-.022,z:ROOM.minZ+.19},.008,m.darkWood);
  }
  if(row===1){
   for(const x of[2.18,2.79])for(let i=0;i<3;i++){
    board('prateleira · livro deitado',.24,.026,.17,x,y+.029+i*.028,ROOM.minZ+.13,m.bookColors[(i+2)%m.bookColors.length]);
    b('prateleira · miolo do livro',.228,.017,.16,x,y+.029+i*.028,ROOM.minZ+.135,m.paper);
   }
  }else for(let i=0;i<8;i++){
   const x=2.14+i*.075,h=.16+(i%3)*.025,book=board('prateleira · livro',.041,h,.16,x,y+.018+h/2,ROOM.minZ+.13,m.bookColors[(i+row)%m.bookColors.length]);
   if(i===6)book.rotation.z=-.08;
   b('prateleira · etiqueta da lombada',.026,.009,.002,x,y+.07,ROOM.minZ+.212,m.paper);
  }
 }
 c('planta · vaso',.13,.15,.11,2.50,f+2.045,ROOM.minZ+.14,m.brown,undefined,10);
 c('planta · terra',.006,.124,.124,2.50,f+2.113,ROOM.minZ+.14,m.darkWood,undefined,10);
 m.leaf.backFaceCulling=false;m.leaf.twoSidedLighting=true;
 function leaf(x:number,y:number,z:number,angle:number,size=1,yaw=0){
  const mesh=new Mesh('planta · folha dobrada',scene),positions=[0,-.045*size,0,-.030*size,-.008*size,0,0,.054*size,0,.030*size,-.008*size,0,0,.003*size,.010*size];
  const indices=[0,1,4,1,2,4,2,3,4,3,0,4],normals:number[]=[];
  VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=[.5,0,0,.4,.5,1,1,.4,.5,.5];data.applyToMesh(mesh);
  mesh.position.set(x,y,z);mesh.rotation.set(.1,yaw,angle);g.add(mesh,m.leaf);
 }
 for(let i=0;i<14;i++){
  const a=i*2.4,r=.055+(i%3)*.035;
  leaf(2.50+Math.cos(a)*r,f+2.14+Math.sin(i*1.8)*.075,ROOM.minZ+.17+Math.sin(a)*.05,Math.sin(i)*.75,1.1+(i%3)*.13,Math.cos(i)*.6);
 }
 for(let branch=0;branch<4;branch++){
  const bx=2.50+(branch-1.5)*.04,startY=f+2.13,bz=ROOM.minZ+.17;
  const length=.47+(branch%2)*.19;
  for(let i=0;i<6;i++){
   const t=i/5,x=bx+Math.sin(t*4+branch)*.07,y=startY-t*length,z=bz+.07+Math.sin(t*2)*.04;
   if(i>0)rod('planta · ramo',{x:bx+Math.sin((t-.2)*4+branch)*.07,y:startY-(t-.2)*length,z:bz+.07+Math.sin((t-.2)*2)*.04},{x,y,z},.002,m.leafShade);
   leaf(x+(i%2?.031:-.031),y,z,(i%2?1:-1)*.65,.85+(i%3)*.10,Math.sin(branch+i)*.3);
  }
 }

 // Original fictional wall art replaces copyrighted bands, while retaining
 // the paper size, aged photographic treatment and placement of the brief.
 function sidePicture(name:string,y:number,z:number,w:number,h:number,mat:StandardMaterial){
  const frame=b(name+' · suporte',.012,h+.02,w+.02,ROOM.maxX-.01,y,z,m.darkWood);frame.metadata.castShadow=false;
  g.plane(name,w,h,ROOM.maxX-.019,y,z,mat,Math.PI/2);
 }
 sidePicture('parede · pôster da banda',f+1.67,1.36,.68,.92,m.posters[0]);
 sidePicture('parede · bandeira brasileira',f+1.92,.10,.58,.40,m.brazilFlag);
 sidePicture('parede · pôster pequeno',f+1.35,-.19,.21,.39,m.posters[1]);
 sidePicture('parede · retrato pequeno',f+1.30,.79,.17,.22,m.family);
 sidePicture('parede · retrato da família',f+1.15,.48,.14,.18,m.family);
 const photo=OBJECTS.photo;
 board('fotografia · moldura',.018,.25,.20,photo.x,photo.y,photo.z,m.darkWood,'photo');
 g.plane('fotografia · lembrança dos pais',.178,.227,photo.x+.011,photo.y,photo.z,m.family,-Math.PI/2,'photo');
 for(const [y,z] of [[f+1.63,1.22],[f+1.43,1.02],[f+1.42,1.95]]){
  b('roupeiro · fotografia colada',.003,.13,.10,face+.047,y,z,m.paper);
  g.plane('roupeiro · foto pequena',.09,.115,face+.050,y,z,m.family,-Math.PI/2);
 }
 const calendar=OBJECTS.calendar;
 b('calendário · suporte',.29,.37,.018,calendar.x,calendar.y,calendar.z,m.darkWood,'calendar');
 g.plane('calendário · dia da viagem',.275,.354,calendar.x,calendar.y,calendar.z-.011,m.calendar,0,'calendar');
 rod('calendário · espiral',{x:calendar.x-.11,y:calendar.y+.178,z:calendar.z-.014},{x:calendar.x+.11,y:calendar.y+.178,z:calendar.z-.014},.004,m.metal,'calendar');
 const sw=OBJECTS.switch;
 softBox('interruptor · placa',.078,.115,.018,sw.x,sw.y,sw.z,m.ivory,.005,'switch');
 const rocker=b('interruptor · tecla',.039,.065,.014,sw.x,sw.y,sw.z-.016,m.paper,'switch');
 board('porta · cabideiro',.26,.05,.026,2.78,f+1.88,ROOM.maxZ-.035,m.wood);
 for(const x of[2.71,2.78,2.85])rod('porta · gancho',{x,y:f+1.87,z:ROOM.maxZ-.051},{x,y:f+1.825,z:ROOM.maxZ-.105},.006,m.metal);
 g.cloth('porta · casaco pendurado',10,13,(u,v)=>({x:2.78+(u-.5)*(.15+v*.05),y:f+1.82-v*.48,z:ROOM.maxZ-.11+Math.cos(u*20)*.014}),m.navy);

 // Pendant light and bedside lamp belong to the same room, but only the
 // ceiling circuit responds to the wall switch; the bedside lamp stays on.
 rod('teto · fio da luminária',{x:cx,y:ROOM.ceiling,z:1.3},{x:cx,y:ROOM.ceiling-.20,z:1.3},.004,m.rubber);
 c('teto · canopla',.025,.09,.09,cx,ROOM.ceiling-.015,1.3,m.darkWood,undefined,10);
 const pendantShade=MeshBuilder.CreateLathe('teto · cúpula de tecido',{shape:[new Vector3(.06,.095,0),new Vector3(.19,-.095,0)],tessellation:16,sideOrientation:Mesh.DOUBLESIDE,cap:Mesh.NO_CAP},scene);
 pendantShade.position.set(cx,ROOM.ceiling-.29,1.3);g.add(pendantShade,m.linen);
 const pendantMaterial=m.material('quarto · lâmpada do teto','#b7a68c');
 s('teto · lâmpada fosca',.085,.11,.085,cx,ROOM.ceiling-.33,1.3,pendantMaterial);

 // A quiet residential exterior, visible from the actual window opening.
 const sky=g.plane('exterior · céu distante',90,40,1,11,-35,m.sky,Math.PI);sky.isPickable=false;sky.metadata.castShadow=false;
 b('exterior · jardim',24,.12,25,1,-.08,-13,m.grass);
 b('exterior · calçada',20,.06,1.4,1,.015,-5,m.concrete);
 b('exterior · rua',24,.03,3,1,.005,-3,m.rubber);
 function roof(name:string,x:number,z:number,w:number,d:number,base:number,rise:number){
  const mesh=new Mesh(name,scene),positions=[-w/2,0,-d/2,w/2,0,-d/2,0,rise,-d/2,-w/2,0,d/2,w/2,0,d/2,0,rise,d/2],indices=[0,1,2,3,5,4,0,2,5,0,5,3,1,4,5,1,5,2],normals:number[]=[];
  VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.uvs=[0,0,1,0,.5,1,0,0,1,0,.5,1];data.applyToMesh(mesh);mesh.position.set(x,base,z);g.add(mesh,m.brick);
 }
 for(const [x,z,w,d,h] of [[.85,-9,4.2,4.3,3.8],[-5.5,-13,4.8,5.4,4.0],[7.5,-15,5.3,5.1,3.6]]){
  board('exterior · casa vizinha',w,h,d,x,h/2,z,m.house);roof('exterior · telhado de cerâmica',x,z,w+.4,d+.4,h,.92);
  board('exterior · beiral',w+.4,.13,.12,x,h-.03,z+d/2+.12,m.darkWood);
  for(const dx of[-.95,.95]){
   board('exterior · janela da casa',.78,1.05,.08,x+dx,h-.95,z+d/2+.045,m.darkWood);
   b('exterior · vidro da casa',.62,.87,.02,x+dx,h-.95,z+d/2+.095,m.rubber);
   for(const dd of[-.17,.17])board('exterior · divisória da janela',.024,.90,.025,x+dx+dd,h-.95,z+d/2+.111,m.wood);
   board('exterior · peitoril da casa',.88,.07,.19,x+dx,h-1.52,z+d/2+.09,m.concrete);
  }
  board('exterior · calha',w+.35,.045,.055,x,h-.05,z+d/2+.15,m.metal);
 }
 for(const [x,z,h] of [[-3.1,-6.4,3.9],[4.2,-8.2,4.8],[6.1,-16,4.7],[-6.3,-17,4.5]]){
  c('exterior · tronco',h,.12,.23,x,h/2,z,m.darkWood,undefined,7);
  for(let i=0;i<5;i++){
   const a=i*2.4,r=.25+(i%2)*.4;
   s('exterior · folhagem',1.65,1.8,1.55,x+Math.cos(a)*r,h+.3+(i%2)*.4,z+Math.sin(a)*r,i%2?m.leaf:m.leafShade);
  }
 }

 const staticMeshes=g.merge(),meshes=[...staticMeshes,...[...g.targets.values()].flat()];
 for(const mesh of meshes){mesh.name='quarto · '+mesh.name;mesh.metadata={...mesh.metadata,bedroom:true};}
 const ambient=new HemisphericLight('quarto · luz ambiente',new Vector3(0,1,0),scene);ambient.diffuse=new Color3(.88,.83,.89);ambient.groundColor=new Color3(.24,.20,.19);ambient.intensity=.32;
 const sun=new DirectionalLight('quarto · luz dourada da janela',new Vector3(.14,-.35,1).normalize(),scene);sun.position.set(.10,8.0,-8);sun.diffuse=new Color3(1,.73,.46);sun.intensity=1.25;sun.shadowMinZ=.1;sun.shadowMaxZ=35;sun.shadowFrustumSize=12;
 const lampLight=new PointLight('quarto · luz do abajur',lampPosition,scene);lampLight.diffuse=new Color3(1,.65,.28);lampLight.intensity=1.1;lampLight.range=4.2;
 const ceilingLight=new PointLight('quarto · luz do teto',new Vector3(cx,ROOM.ceiling-.40,1.3),scene);ceilingLight.diffuse=new Color3(1,.82,.59);ceilingLight.intensity=.48;ceilingLight.range=6;
 const lights=[ambient,sun,lampLight,ceilingLight];
 for(const mesh of meshes)if(mesh.material)(mesh.material as StandardMaterial).maxSimultaneousLights=4;
 for(const light of lights)light.includedOnlyMeshes=[...meshes];
 const shadowGenerator=new ShadowGenerator(1024,sun);shadowGenerator.useBlurExponentialShadowMap=true;shadowGenerator.blurScale=1;shadowGenerator.blurKernel=4;shadowGenerator.bias=.0007;shadowGenerator.normalBias=.012;
 const nonCasters=new Set([m.glass,m.sky,m.screen,m.digital,m.bulb]);
 for(const mesh of meshes)if(mesh.metadata?.castShadow&&!nonCasters.has(mesh.material as StandardMaterial))shadowGenerator.addShadowCaster(mesh);
 const shadowMap=shadowGenerator.getShadowMap()!;shadowMap.refreshRate=RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
 let lightOn=false,disposed=false;
 function refreshShadows(){if(!disposed)shadowMap.resetRefreshCounter();}
 function setRoomLight(on:boolean){lightOn=on;ceilingLight.setEnabled(on);rocker.rotation.x=on?-.12:.12;pendantMaterial.emissiveColor.set(on?.8:.01,on?.63:.009,on?.39:.006);}
 function addShadowMeshes(extra:readonly AbstractMesh[]){for(const light of lights)light.includedOnlyMeshes.push(...extra);for(const mesh of extra)shadowGenerator.addShadowCaster(mesh);refreshShadows();}
 setRoomLight(false);
 // The first cached shadow frame must wait until material shader variants are
 // ready; warming up a static map avoids an empty first render being retained.
 void Promise.allSettled(meshes.filter(mesh=>mesh.material).map(mesh=>(mesh.material as StandardMaterial).forceCompilationAsync(mesh,{useInstances:false}))).then(refreshShadows);
 return{meshes,targets:g.targets,shadowGenerator,setRoomLight,get roomLightOn(){return lightOn;},refreshShadows,addShadowMeshes,
  dispose(){disposed=true;shadowGenerator.dispose();for(const light of lights)light.dispose();for(const mesh of meshes)if(!mesh.isDisposed())mesh.dispose();m.dispose();}};
}
