"""Original deterministic, tileable 256px PS2 domestic surface art. Pillow only."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import random, math
OUT=Path(__file__).resolve().parents[2]/'public/textures/host-house-renovation'
OUT.mkdir(parents=True,exist_ok=True)
R=random.Random(21032003)
PALETTE={
 'wood':(113,74,44),'wood_dark':(69,48,33),'wood_light':(151,112,70),
 'paint':(214,206,181),'cream':(226,218,197),'plaster':(197,184,157),
 'sage':(143,153,133),'wallpaper':(205,191,165),'linen':(213,205,184),
 'blue_plaid':(54,72,92),'host_cloth':(130,146,136),'sofa_cloth':(139,124,94),
 'curtain':(225,218,199),'rug':(105,50,40),'rug_blue':(47,64,73),
 'metal':(99,101,96),'brass':(148,116,62),'chrome':(156,163,159),'black':(33,35,33),
 'rubber':(44,43,39),'paper':(223,215,190),'book_red':(114,61,49),
 'book_blue':(55,74,86),'book_green':(73,88,64),'ceramic':(222,216,199),
 'glass':(86,113,117),'screen':(26,37,39),'tile':(207,205,188),'stone':(143,139,119),
 'concrete':(136,131,117),'leaf':(81,104,53),'leaf_dark':(49,70,37),
 'leather':(97,70,46),'cardboard':(151,122,78),'photo':(153,156,134),
 'landscape':(139,149,125),'poster':(50,62,73),'calendar':(223,216,193),'map':(199,197,166),
 'floor':(128,93,61),'blue_wall':(139,157,163),
 'bulb':(246,220,159),'shade':(223,203,163),'towel':(158,177,164),
}
def noisy(base,strength=5,n=256):
 im=Image.new('RGB',(n,n));p=im.load()
 for y in range(n):
  for x in range(n):
   v=R.randint(-strength,strength);p[x,y]=tuple(max(0,min(255,c+v)) for c in base)
 return im
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(size=14):
 try:return ImageFont.truetype(fontpath,size)
 except:return ImageFont.load_default()
def save(key):
 base=PALETTE[key];im=noisy(base,4);d=ImageDraw.Draw(im)
 if key=='floor':
  for row in range(8):
   y=row*32
   for col in range(-1,3):
    x=col*128+(64 if row%2 else 0);v=R.randint(-10,10);c=tuple(max(0,min(255,k+v)) for k in base)
    d.rectangle((x+1,y+1,x+127,y+31),fill=c)
    for _ in range(33):
     xx=x+R.randrange(126);yy=y+R.randrange(2,30);vv=R.choice([-13,-7,10]);d.line((xx,yy,min(x+127,xx+R.randrange(12,66)),yy),fill=tuple(max(0,min(255,k+vv)) for k in c))
  for y in range(0,256,32):d.line((0,y,255,y),fill=(81,64,44),width=1)
 elif key.startswith('wood'):
  # Long broken grain, not high contrast parallel black lines.
  for i in range(220):
   y=R.randrange(256);x=R.randrange(256);length=R.randint(18,150)
   shade=R.choice([-18,-10,9,14]);col=tuple(max(0,min(255,c+shade)) for c in base)
   d.line([(x,y),(min(255,x+length),y+R.choice([-1,0,1]))],fill=col,width=1)
  for x,y in [(73,61),(195,184)]:
   for r in range(2,14,3):d.ellipse((x-r*2,y-r//2,x+r*2,y+r//2),outline=tuple(max(0,c-12) for c in base))
 elif key in ['linen','host_cloth','sofa_cloth','curtain','towel','shade']:
  for y in range(0,256,2):d.line((0,y,255,y),fill=tuple(max(0,c-5) for c in base))
  for x in range(0,256,3):d.line((x,0,x,255),fill=tuple(min(255,c+5) for c in base))
  if key=='sofa_cloth':
   for x in range(0,256,32):
    for y in range(0,256,32):
     d.line([(x+16,y+6),(x+24,y+16),(x+16,y+26),(x+8,y+16),(x+16,y+6)],fill=(119,104,79),width=1)
  if key=='host_cloth':
   for y in range(0,256,32):d.rectangle((0,y,255,y+3),fill=(172,180,162));d.line((0,y+6,255,y+6),fill=(104,126,115))
 elif key=='blue_plaid':
  for k in range(-1,5):
   x=k*64;d.rectangle((x+4,0,x+21,255),fill=(92,109,125));d.rectangle((0,x+4,255,x+21),fill=(82,98,115))
   d.line((x+27,0,x+27,255),fill=(180,167,133),width=3);d.line((0,x+27,255,x+27),fill=(180,167,133),width=3)
   d.line((x+44,0,x+44,255),fill=(35,48,64),width=4);d.line((0,x+44,255,x+44),fill=(35,48,64),width=4)
  for y in range(0,256,3):d.line((0,y,255,y),fill=(62,76,90),width=1)
 elif key in ['rug','rug_blue']:
  alt=(189,157,107);dark=(53,51,43)
  for inset,w in [(3,3),(11,2),(18,6),(29,2),(34,2)]:d.rectangle((inset,inset,255-inset,255-inset),outline=alt if inset%2 else dark,width=w)
  for x in range(48,225,32):
   for y in range(47,225,32):d.polygon([(x,y-9),(x+10,y),(x,y+9),(x-10,y)],outline=alt)
  d.polygon([(128,63),(172,128),(128,193),(84,128)],outline=alt,width=3)
  for y in range(0,256,2):
   for x in range(0,256,4):
    if R.random()<.35:d.point((x,y),fill=dark)
 elif key=='tile':
  for i in [0,127,255]:d.line((i,0,i,255),fill=(145,146,133),width=3);d.line((0,i,255,i),fill=(145,146,133),width=3)
  for x,y in [(64,64),(192,192)]:
   d.polygon([(x,y-8),(x+8,y),(x,y+8),(x-8,y)],fill=(135,151,141));d.ellipse((x-3,y-3,x+3,y+3),fill=(211,197,157))
 elif key=='wallpaper':
  for x in range(16,256,48):
   for y in range(18,256,48):
    d.line((x,y-7,x,y+9),fill=(167,172,146));d.ellipse((x-5,y-5,x+1,y+2),fill=(177,180,150));d.ellipse((x,y,x+6,y+7),fill=(183,160,135))
 elif key=='stone':
  for _ in range(1800):
   x,y=R.randrange(256),R.randrange(256);s=R.choice([-26,-12,13,30]);d.ellipse((x,y,x+1,y+1),fill=tuple(max(0,min(255,c+s)) for c in base))
 elif key=='cardboard':
  d.rectangle((104,0,126,255),fill=(174,147,99));d.line((115,0,115,255),fill=(129,108,74),width=2)
  d.rectangle((17,31,83,73),outline=(96,83,60),width=2);d.text((23,39),'HOME',font=font(12),fill=(83,75,56))
 elif key in ['photo','landscape','poster','calendar','map']:
  if key=='photo':
   d.rectangle((0,0,255,140),fill=(143,167,166));d.rectangle((0,140,255,255),fill=(99,123,78))
   for x,y,col in [(74,114,(93,113,126)),(156,117,(153,110,100)),(121,153,(180,157,106))]:
    d.ellipse((x-16,y-30,x+16,y+13),fill=(195,164,132));d.rectangle((x-23,y+9,x+23,248),fill=col);d.pieslice((x-17,y-34,x+17,y-1),180,360,fill=(61,50,37))
   for _ in range(3000):
    x,y=R.randrange(256),R.randrange(256);p=im.getpixel((x,y));d.point((x,y),fill=tuple(min(255,c+R.randrange(0,13)) for c in p))
   d.rectangle((0,0,255,255),outline=(224,213,183),width=11)
  elif key=='landscape':
   d.rectangle((0,0,255,147),fill=(155,177,177));d.polygon([(0,153),(58,64),(128,153),(182,83),(255,153)],fill=(106,129,125));d.polygon([(0,170),(72,135),(142,181),(255,138),(255,255),(0,255)],fill=(104,124,75));d.polygon([(82,255),(133,159),(147,159),(145,255)],fill=(156,164,139))
   for x,y in [(31,147),(190,151),(220,141)]:d.rectangle((x,y-17,x+3,y+45),fill=(74,65,43));d.ellipse((x-16,y-33,x+20,y+7),fill=(75,103,67))
  elif key=='poster':
   d.text((18,17),'NORTHBOUND',font=font(24),fill=(223,198,139));d.text((21,222),'SESSIONS / 2003',font=font(15),fill=(208,194,157))
   for r in range(26,97,13):d.ellipse((128-r,126-r//2,128+r,126+r//2),outline=(138,158,160),width=2)
   d.ellipse((111,108,145,142),fill=(191,132,82))
  elif key=='calendar':
   d.rectangle((0,0,255,68),fill=(107,125,120));d.text((27,12),'WELCOME',font=font(25),fill=(232,224,192));d.text((55,43),'JUNE 2003',font=font(14),fill=(232,224,192))
   for day in range(1,31):
    x=20+(day-1)%7*33;y=91+(day-1)//7*28;d.text((x,y),str(day),font=font(14),fill=(91,90,75))
   d.ellipse((45,113,69,136),outline=(145,78,61),width=2)
  else:
   for x in range(0,256,32):d.line((x,0,x,255),fill=(167,173,147))
   for y in range(0,256,32):d.line((0,y,255,y),fill=(167,173,147))
   d.polygon([(48,29),(90,44),(91,72),(115,100),(86,134),(77,171),(58,143),(66,96),(40,69)],fill=(117,143,110));d.polygon([(174,61),(199,78),(184,103),(210,137),(172,172),(143,125),(154,92)],fill=(117,143,110));d.line([(84,152),(93,129),(99,92),(181,84)],fill=(155,85,59),width=2)
 elif key=='screen':
  for y in range(0,256,3):d.line((0,y,255,y),fill=(23,31,32))
  d.polygon([(20,18),(73,18),(39,151),(20,151)],fill=(37,48,46))
 elif key in ['leaf','leaf_dark']:
  d.line((125,0,129,255),fill=(138,145,87),width=3)
  for y in range(16,256,23):d.line((127,y,35,y+31),fill=(105,125,67));d.line((127,y,222,y+31),fill=(105,125,67))
 im.save(OUT/(key+'.png'),optimize=True)
for key in PALETTE:save(key)
print('Original texture sheets:',len(PALETTE),OUT)
