import './register-typescript.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {selectHostHouseExteriorPortals:select,hostHouseExteriorBoundsVisible:visible,
  exteriorBoundsIntersectPlanes:intersects}=await import('../src/game/hostHouseExteriorPortals.ts');

const point=(x,y,z)=>({x,y,z});
const box=(x,y,z,r=.1)=>({min:point(x-r,y-r,z-r),max:point(x+r,y+r,z+r)});
const interior={min:point(0,0,-5),max:point(10,8,5)};
function aperture(id,x,outward,z=0){
  return{id,center:point(x,2,z),outward:point(outward,0,0),bounds:{min:point(x-.02,1,z-1),max:point(x+.02,3,z+1)},
    corners:[point(x,1,z-1),point(x,3,z-1),point(x,3,z+1),point(x,1,z+1)]};
}
const panes=[aperture('front',10,1),aperture('rear',0,-1)];
// Six inward planes of a real 90-degree perspective frustum, near .1/far50.
function frustum(camera,direction){
  const forward=direction==='front'?point(1,0,0):direction==='rear'?point(-1,0,0):point(0,0,1);
  const right=direction==='front'?point(0,0,1):direction==='rear'?point(0,0,-1):point(1,0,0);
  const up=point(0,1,0),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const plane=(normal,offset=0)=>({normal,d:-dot(normal,camera)+offset});
  const sum=(a,b,sign=1)=>point((a.x+b.x*sign)/Math.sqrt(2),(a.y+b.y*sign)/Math.sqrt(2),(a.z+b.z*sign)/Math.sqrt(2));
  return[plane(forward,-.1),plane(point(-forward.x,-forward.y,-forward.z),50),
    plane(sum(forward,right)),plane(sum(forward,right,-1)),plane(sum(forward,up)),plane(sum(forward,up,-1))];
}

test('exterior portals: front and rear views retain true outward geometry and reject the opposite street',()=>{
  const camera=point(5,2,0),front=select(camera,frustum(camera,'front'),panes,interior);
  assert.deepEqual(front.visibleApertures,['front']);assert.equal(front.fallback,false);assert.equal(front.cones[0].length,5);
  assert.equal(visible(box(20,2,0),front),true);assert.equal(visible(box(-10,2,0),front),false);
  assert.equal(visible(box(7,2,0),front),false,'outward plane rejects geometry between camera and window');
  assert.equal(visible(box(20,2,8),front),false,'side planes reject off-window geometry');
  const rear=select(camera,frustum(camera,'rear'),panes,interior);
  assert.deepEqual(rear.visibleApertures,['rear']);assert.equal(visible(box(-10,2,0),rear),true);
  assert.equal(visible(box(20,2,0),rear),false);
});

test('exterior portals: a camera facing a wall submits no exterior, including its sky',()=>{
  const camera=point(5,2,0),selection=select(camera,frustum(camera,'wall'),panes,interior);
  assert.equal(selection.fallback,false);assert.deepEqual(selection.visibleApertures,[]);
  assert.equal(visible(box(20,2,0),selection),false);assert.equal(visible(box(5,2,0,350),selection,true),false);
});

test('exterior portals: off-axis window rays, intersecting slivers and sky remain conservative',()=>{
  const camera=point(5,2,2),selection=select(camera,frustum(camera,'front'),panes,interior);
  assert.deepEqual(selection.visibleApertures,['front']);
  assert.equal(visible(box(20,2,-4),selection),true,'ray through off-axis aperture centre');
  assert.equal(visible(box(20,2,-7.01,.02),selection),true,'boundary sliver survives epsilon');
  assert.equal(visible(box(-1000,1000,1000),selection,true),true,'actual sky is kept for any visible aperture');
  assert.equal(intersects({min:point(9.99,0,0),max:point(10.01,1,1)},[{normal:point(1,0,0),d:-10}]),true);
});

test('exterior portals: close-plane, outside-interior and missing-data fallbacks keep original rendering',()=>{
  for(const [camera,apertures,reason] of [[point(9.9,2,0),panes,'near-aperture-plane'],
    [point(10.2,2,0),panes,'outside-interior'],[point(5,2,0),[],'missing-apertures']]){
    const selection=select(camera,frustum(camera,'front'),apertures,interior);
    assert.equal(selection.fallback,true);assert.equal(selection.reason,reason);assert.equal(visible(box(-100,50,100),selection),true);
  }
  const invalid=select(point(5,2,0),[],panes,interior);assert.equal(invalid.fallback,true);assert.equal(invalid.reason,'invalid-planes');
});

test('exterior portals: a union of apertures keeps either cone without joining the solid wall between',()=>{
  const camera=point(5,2,0),two=[aperture('left',10,1,-2),aperture('right',10,1,2)];
  const selection=select(camera,frustum(camera,'front'),two,interior);
  assert.equal(selection.cones.length,2);assert.equal(visible(box(20,2,-6),selection),true);
  assert.equal(visible(box(20,2,6),selection),true);assert.equal(visible(box(20,2,0),selection),false);
});
