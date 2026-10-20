/* Procedural ink background; no extracted game code or textures. */
'use strict';
const lut=new Float32Array(8192);
for(let i=0;i<8192;i++)lut[i]=Math.sin(i*Math.PI*2/8192);
const sin=v=>lut[(v*1303.7972938)&8191];
const cos=v=>lut[((v*1303.7972938)+2048)&8191];
let width,height,geometry,grain,palette,protection,protectionKey;
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
function prepare(w,h){
 width=w;height=h;
 const count=w*h,diagonal=Math.hypot(w,h);
 geometry=new Float32Array(count*3);grain=new Float32Array(count);protectionKey=null;
 let pos=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const px=(x-w*.56)/diagonal,py=(y-h*.38)/diagonal,r=Math.hypot(px,py);
  // Two local eddies bend the field differently instead of rotating one ring.
  let nx=px,ny=py;
  for(const [cx,cy,force] of [[-.26,.20,2.8],[.23,-.17,-2.5]]){
   const dx=nx-cx,dy=ny-cy,a=force/(1+(dx*dx+dy*dy)*42);
   nx=cx+dx*cos(a)-dy*sin(a);ny=cy+dx*sin(a)+dy*cos(a);
  }
  geometry[pos*3]=nx*9.5;geometry[pos*3+1]=ny*9.5;geometry[pos*3+2]=r;
  const hash=Math.imul(x+37,374761393)^Math.imul(y+71,668265263);
  grain[pos]=((hash>>>10)&255)/255-.5;pos++;
 }
 const stops=[[0,15,44,41],[.18,15,44,41],[.30,34,73,64],[.62,34,73,64],[.68,52,98,82],[.842,52,98,82],[.855,98,90,43],[.861,98,90,43],[.878,32,70,60],[1,15,44,41]];
 palette=new Float32Array(1024*3);
 for(let i=0;i<1024;i++){
  const v=i/1023;let k=0;while(k<stops.length-2&&v>stops[k+1][0])k++;
  const a=stops[k],b=stops[k+1],t=smooth(a[0],b[0],v);
  for(let c=0;c<3;c++)palette[i*3+c]=a[c+1]+(b[c+1]-a[c+1])*t;
 }
}
function prepareProtection(zones){
 const key=JSON.stringify(zones);if(key===protectionKey)return;protectionKey=key;
 protection=new Float32Array(width*height);
 let i=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let strength=1;
  for(const z of zones){
   const dx=(x/width-z.x)/z.rx,dy=(y/height-z.y)/z.ry;
   const distance=Math.hypot(dx,dy);
   strength=Math.min(strength,1-z.amount*(1-smooth(.65,1.65,distance)));
  }
  protection[i++]=strength;
 }
}
function render(data,t){
 const phase=t*.040;let out=0;
 const base=[23,62,57];
 for(let i=0;i<width*height;i++){
  let qx=geometry[i*3],qy=geometry[i*3+1];
  for(let pass=0;pass<5;pass++){
   const a=qx+.52*sin(qy*1.35+phase+pass*1.7);
   const b=qy+.43*cos(qx*1.53-phase*.64+pass*1.2);
   qx=(a*.966-b*.258)*1.055;qy=(a*.258+b*.966)*1.055;
  }
  // Unequal phase spacing gives the ink ribbons wider pools and narrow folds.
  const field=qx*.52+qy*.41+.88*sin(qy*.76-qx*.32-phase*.34);
  const value=.5+.5*sin(field*1.75+.28*sin(qx*1.23+qy*.51));
  const index=Math.round(value*1023)*3;
  const edge=1-.12*smooth(.2,.65,geometry[i*3+2]);
  const noise=grain[i]*1.6,weight=protection[i];
  for(let c=0;c<3;c++)data[out++]=base[c]+(palette[index+c]*edge+noise-base[c])*weight;
  data[out++]=255;
 }
}
self.onmessage=({data:r})=>{
 const started=performance.now();if(width!==r.width||height!==r.height)prepare(r.width,r.height);
 const bytes=new Uint8ClampedArray(width*height*4);
 prepareProtection(r.zones||[]);render(bytes,r.time);
 self.postMessage({bytes:bytes.buffer,width,height,version:r.version,time:r.time,ms:performance.now()-started},[bytes.buffer]);
};
