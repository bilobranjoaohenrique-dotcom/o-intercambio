import type {Scene} from '@babylonjs/core/scene';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture';
import {Texture} from '@babylonjs/core/Materials/Textures/texture';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';

/** Original, deterministic low-resolution surface art. These textures are
 * applied to real meshes; none stands in for a piece of navigable geometry. */
export function homeMaterials(scene:Scene){
 const materials:StandardMaterial[]=[];
 const textures:DynamicTexture[]=[];
 let seed=918273;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function material(name:string,color:string){const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.set(.035,.032,.026);m.specularPower=16;materials.push(m);return m;}
 function painted(name:string,size:number,draw:(c:CanvasRenderingContext2D,size:number)=>void){
  const t=new DynamicTexture('superfície original · '+name,{width:size,height:size},scene,false,Texture.NEAREST_SAMPLINGMODE);
  t.anisotropicFilteringLevel=1;t.wrapU=t.wrapV=Texture.WRAP_ADDRESSMODE;
  draw(t.getContext() as unknown as CanvasRenderingContext2D,size);t.update(true);textures.push(t);
  const m=material(name,'#ffffff');m.diffuseTexture=t;return m;
 }
 function mottled(c:CanvasRenderingContext2D,n:number,color:string,strength:number){c.fillStyle=color;c.fillRect(0,0,n,n);for(let i=0;i<n*n/3;i++){c.fillStyle=`rgba(${random()>.5?'244,235,205':'65,61,49'},${random()*strength})`;c.fillRect(Math.floor(random()*n),Math.floor(random()*n),1+Math.floor(random()*3),1+Math.floor(random()*2));}}
 const plaster=painted('reboco marfim gasto',128,(c,n)=>{mottled(c,n,'#d0cdbb',.035);for(let i=0;i<18;i++){c.fillStyle='rgba(100,95,77,.012)';c.fillRect(random()*n,random()*n,4+random()*17,1+random()*4);}});
 (plaster.diffuseTexture as DynamicTexture).uScale=3;(plaster.diffuseTexture as DynamicTexture).vScale=2;
 const ceiling=painted('teto pintado',128,(c,n)=>mottled(c,n,'#d6d4c3',.028));
 (ceiling.diffuseTexture as DynamicTexture).uScale=3;(ceiling.diffuseTexture as DynamicTexture).vScale=3;
 const wood=painted('carvalho doméstico',128,(c,n)=>{mottled(c,n,'#866b4c',.16);for(let i=0;i<150;i++){c.strokeStyle=i%3?'rgba(53,40,28,.12)':'rgba(194,164,117,.13)';c.lineWidth=.5+random();const y=random()*n;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(n*.3,y+random()*3,n*.6,y-random()*3,n,y+random()*2);c.stroke();}});
 const darkWood=painted('madeira escura usada',128,(c,n)=>{mottled(c,n,'#514535',.15);for(let y=0;y<n;y+=3){c.fillStyle='rgba(182,147,91,.1)';c.fillRect(0,y,n,1);}});
 const floor=painted('tábuas enceradas',256,(c,n)=>{
  c.fillStyle='#756147';c.fillRect(0,0,n,n);
  for(let row=0;row<8;row++)for(let col=-1;col<3;col++){
   const x=col*128+(row%2?64:0),y=row*32;c.fillStyle=['#80694b','#8c7351','#7c6348','#927955'][Math.floor(random()*4)];c.fillRect(x+1,y+1,126,30);
   for(let i=0;i<18;i++){c.fillStyle=i%3?'rgba(48,38,26,.10)':'rgba(186,158,110,.18)';c.fillRect(x+random()*125,y+2+random()*27,6+random()*39,1);}
   c.fillStyle='#514936';for(const xx of[3,123]){c.fillRect(x+xx,y+5,1,1);c.fillRect(x+xx,y+25,1,1);}
  }
 });
 (floor.diffuseTexture as DynamicTexture).uScale=3;(floor.diffuseTexture as DynamicTexture).vScale=3;
 const cloth=(name:string,color:string)=>painted(name,128,(c,n)=>{mottled(c,n,color,.14);for(let x=0;x<n;x+=2){c.fillStyle='rgba(227,220,187,.045)';c.fillRect(x,0,1,n);}for(let y=0;y<n;y+=2){c.fillStyle='rgba(38,48,42,.055)';c.fillRect(0,y,n,1);}});
 const linen=cloth('lençol de algodão','#b7b6a2'),blanket=cloth('cobertor azul desbotado','#566b6c'),curtain=cloth('cortina de linho','#b6b39c'),olive=cloth('mochila de lona','#5c6552'),clothes=cloth('roupas de algodão','#7c8277');
 const rug=painted('tapete tecido',128,(c,n)=>{mottled(c,n,'#7c6b57',.15);for(let i=0;i<5;i++){c.strokeStyle=i%2?'#9a8c6d':'#665e50';c.lineWidth=3;c.strokeRect(6+i*5,6+i*5,n-12-i*10,n-12-i*10);}for(let y=0;y<n;y+=2){c.fillStyle='rgba(216,195,148,.07)';c.fillRect(0,y,n,1);}});
 const plastic=material('plástico grafite','#353d3c'),metal=material('metal pintado','#81867c'),paper=material('papel marfim','#c5c2aa'),rubber=material('borracha usada','#4a4c44'),ivory=material('marfim fosco','#d0cbb5'),brown=material('couro castanho','#5e5343'),navy=material('mala azul petróleo','#405458'),brick=material('telhas vizinhas','#7a5c4b'),grass=material('jardins da rua','#6f7857'),leaf=material('folhas de árvores','#626e4c'),leafShade=material('folhas à sombra','#4c5d45'),concrete=material('calçada distante','#969784'),house=material('reboco vizinho','#b4b3a1'),glass=material('vidro suave','#a8bbb5');
 glass.alpha=.13;glass.backFaceCulling=false;glass.specularColor.set(.2,.21,.2);
 const bookColors=['#6c7767','#80665b','#697780','#a49876','#625f58'].map((col,i)=>material('capa de livro '+i,col));
 const surface=(name:string,size:number,draw:(c:CanvasRenderingContext2D,n:number)=>void)=>painted(name,size,draw);
 const laptop=surface('tela do notebook',128,(c,n)=>{
  c.fillStyle='#375154';c.fillRect(0,0,n,n);c.fillStyle='#55716c';c.fillRect(4,4,120,119);c.fillStyle='#bdc0ae';c.fillRect(21,17,88,83);c.fillStyle='#7f938c';c.fillRect(21,17,88,10);
  c.fillStyle='#606a62';c.font='bold 7px monospace';c.fillText('DOCUMENTOS',28,41);c.font='6px monospace';for(const[y,text]of[[54,'Viagem'],[66,'Passagem'],[78,'Lista de bagagem']]as const)c.fillText(text,28,y);c.fillStyle='#a1aa96';c.fillRect(0,119,n,9);
 });laptop.emissiveColor.set(.12,.17,.16);
 const digital=surface('relógio digital',128,(c,n)=>{c.fillStyle='#1d2521';c.fillRect(0,0,n,n);c.fillStyle='#9aa58a';c.font='bold 47px monospace';c.textAlign='center';c.fillText('07:18',64,86);});digital.emissiveColor.set(.18,.23,.13);
 const calendar=surface('calendário de junho',256,(c,n)=>{
  mottled(c,n,'#d4cfb5',.08);c.fillStyle='#65736d';c.fillRect(0,0,n,39);c.fillStyle='#e5dfc5';c.font='bold 21px sans-serif';c.textAlign='center';c.fillText('JUNHO',n/2,28);
  c.fillStyle='#65695d';c.font='13px sans-serif';for(let col=0;col<7;col++)c.fillText(['D','S','T','Q','Q','S','S'][col],22+col*35,61);
  for(let day=1;day<=30;day++){const col=(day-1)%7,row=Math.floor((day-1)/7),x=22+col*35,y=88+row*32;c.fillStyle='#68695a';c.fillText(String(day),x,y);if(day===13){c.strokeStyle='#995e4b';c.lineWidth=3;c.beginPath();c.ellipse(x,y-5,14,13,-.15,0,Math.PI*2);c.stroke();}}
  c.font='12px monospace';c.fillStyle='#8b644d';c.fillText('viagem',n/2,242);
 });
 const travel=surface('documentos da viagem',256,(c,n)=>{mottled(c,n,'#d4d0b9',.04);c.fillStyle='#6f7e72';c.fillRect(15,15,226,25);c.fillStyle='#dcdac2';c.font='bold 17px sans-serif';c.fillText('INTERCÂMBIO',27,34);c.fillStyle='#656b60';c.font='13px monospace';c.fillText('CONFIRMAÇÃO',24,65);c.fillText('EMBARQUE: 13 JUN',24,94);c.fillText('DOCUMENTOS',24,142);for(let i=0;i<6;i++){c.fillStyle='#999d88';c.fillRect(24,156+i*10,180-i%3*33,2);}c.fillStyle='#8b8f79';c.fillRect(24,225,200,10);});
 const family=surface('fotografia de família original',128,(c,n)=>{
  c.fillStyle='#b1b29a';c.fillRect(0,0,n,n);c.fillStyle='#a5b0a2';c.fillRect(0,0,n,56);c.fillStyle='#7c8c69';for(let i=0;i<25;i++){c.beginPath();c.ellipse(random()*n,50+random()*20,8+random()*13,13+random()*12,0,0,Math.PI*2);c.fill();}
  for(const[x,y,w,color,hair]of[[35,56,30,'#7f7964','#514b3c'],[67,65,25,'#617676','#4a483d'],[96,55,28,'#9a8979','#5e5746']]as const){c.fillStyle=color;c.beginPath();c.moveTo(x-w/2,119);c.lineTo(x-w/2+3,y+16);c.lineTo(x+w/2-3,y+16);c.lineTo(x+w/2,119);c.fill();c.fillStyle='#ba9f80';c.beginPath();c.ellipse(x,y,9,12,0,0,Math.PI*2);c.fill();c.fillStyle=hair;c.beginPath();c.ellipse(x,y-6,9,7,0,Math.PI,Math.PI*2);c.fill();c.fillStyle='#676353';c.fillRect(x-4,y,1,1);c.fillRect(x+3,y,1,1);c.fillRect(x-2,y+6,4,1);}
  for(let i=0;i<900;i++){c.fillStyle=`rgba(211,201,167,${random()*.08})`;c.fillRect(random()*n,random()*n,1,1);}c.strokeStyle='#d1cbb4';c.lineWidth=4;c.strokeRect(1,1,n-2,n-2);
 });
 const posters=[
  surface('pôster orbital original',256,(c,n)=>{c.fillStyle='#394d55';c.fillRect(0,0,n,n);c.fillStyle='#b6ad8b';for(let i=0;i<80;i++)c.fillRect(random()*n,random()*n,1,1);c.strokeStyle='#9eab9d';for(let i=0;i<3;i++){c.beginPath();c.ellipse(127,118,55+i*22,21+i*9,-.6,0,Math.PI*2);c.stroke();}c.fillStyle='#c3b48e';c.beginPath();c.arc(127,118,30,0,Math.PI*2);c.fill();c.font='20px monospace';c.textAlign='center';c.fillText('ÓRBITA',128,231);}),
  surface('pôster de música original',256,(c,n)=>{c.fillStyle='#9a8e76';c.fillRect(0,0,n,n);c.strokeStyle='#57594f';c.lineWidth=5;for(let i=0;i<14;i++){const x=25+i*16;c.beginPath();c.moveTo(x,75+Math.sin(i*.8)*25);c.lineTo(x,181-Math.cos(i*.55)*28);c.stroke();}c.fillStyle='#665f51';c.font='bold 30px sans-serif';c.textAlign='center';c.fillText('LADO B',128,44);c.font='12px monospace';c.fillText('SESSÕES AO VIVO',128,229);}),
  surface('mapa de viagem original',256,(c,n)=>{c.fillStyle='#bdb89d';c.fillRect(0,0,n,n);for(let x=0;x<n;x+=32){c.strokeStyle='#a0a78d';c.lineWidth=1;c.beginPath();c.moveTo(x,0);c.lineTo(x,n);c.stroke();c.beginPath();c.moveTo(0,x);c.lineTo(n,x);c.stroke();}c.fillStyle='#8c9c82';for(const[x,y]of[[51,80],[112,92],[160,74],[182,164]]){c.beginPath();c.ellipse(x,y,20+random()*23,25+random()*29,.4,0,Math.PI*2);c.fill();}c.strokeStyle='#8f6855';c.setLineDash([4,5]);c.lineWidth=2;c.beginPath();c.moveTo(58,180);c.quadraticCurveTo(112,35,194,77);c.stroke();c.setLineDash([]);c.fillStyle='#656f61';c.font='12px monospace';c.fillText('LUGARES PARA CONHECER',15,240);}),
 ];
 return{plaster,ceiling,wood,darkWood,floor,linen,blanket,curtain,olive,clothes,rug,plastic,metal,paper,rubber,ivory,brown,navy,brick,grass,leaf,leafShade,concrete,house,glass,bookColors,laptop,digital,calendar,travel,family,posters,material,
  dispose(){for(const m of materials)m.dispose(false,false);for(const t of textures)t.dispose();}};
}
export type HomeMaterials=ReturnType<typeof homeMaterials>;
