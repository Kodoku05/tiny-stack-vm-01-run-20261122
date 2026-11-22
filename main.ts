import{mkdirSync,readdirSync,readFileSync,writeFileSync}from'node:fs';
import{join}from'node:path';
const IM=new Uint8Array(256),PO=new Uint8Array(256),PU=new Uint8Array(256);
const s=(o,i,p,u)=>{IM[o]=i;PO[o]=p;PU[o]=u};
s(1,1,0,1);s(2,4,0,1);s(3,0,1,0);s(4,0,1,2);s(5,0,2,2);s(6,0,2,3);s(7,0,3,3);
for(let o=16;o<35;o++)s(o,0,2,1);
s(23,0,1,1);s(27,0,1,1);s(48,2,0,0);s(49,2,1,0);s(50,2,1,0);s(51,2,0,0);
s(64,0,1,1);s(65,0,2,0);s(80,0,1,0);s(81,0,1,0);s(82,0,0,1);s(83,0,1,0);
function run(p,g){
 const n=p.length,D=new Int32Array(256);let q=0;
 const C=new Int32Array(64);let z=0;
 const M=new Int32Array(256),o=new Uint8Array(65536);let l=0,i=0,c=0,t=0;
 const T=e=>({o:o.slice(0,l),c:e});
 for(;;){
  if(t===1e6)return T(10);
  if(c<0||c>=n)return T(9);
  const a=p[c],v=a<8||a>15&&a<35&&a!==31||a>47&&a<53||a===64||a===65||a>79&&a<84;
  if(!v)return T(5);
  if(c+IM[a]>=n)return T(9);
  t++;const x=c+1+IM[a];
  if(q<PO[a])return T(2);
  if(q-PO[a]+PU[a]>256)return T(3);
  c=x;
  if(a>15&&a<35&&a!==23&&a!==27&&a!==31){
   const b=D[q-1],d=D[q-2];let r;
   if(a===16)r=(d+b)|0;else if(a===17)r=(d-b)|0;else if(a===18)r=Math.imul(d,b);
   else if(a===19){if(!b)return T(4);r=d===-2147483648&&b===-1?d:(d/b)|0}
   else if(a===20){if(!b)return T(4);r=b===-1?0:(d%b)|0}
   else if(a===21){if(!b)return T(4);r=Math.floor((d>>>0)/(b>>>0))|0}
   else if(a===22){if(!b)return T(4);r=(d>>>0)%(b>>>0)|0}
   else if(a===24)r=d&b;else if(a===25)r=d|b;else if(a===26)r=d^b;
   else if(a===28)r=d<<(b&31);else if(a===29)r=d>>(b&31);else if(a===30)r=(d>>>(b&31))|0;
   else if(a===32)r=d===b?1:0;else if(a===33)r=d<b?1:0;else r=(d>>>0)<(b>>>0)?1:0;
   q-=2;D[q++]=r;continue
  }
  switch(a){
   case 0:return{o:o.slice(0,l),c:0};
   case 1:D[q++]=(p[x-1]<<24)>>24;break;
   case 2:D[q++]=p[x-4]|p[x-3]<<8|p[x-2]<<16|p[x-1]<<24;break;
   case 3:q--;break;
   case 4:D[q]=D[q-1];q++;break;
   case 5:{const e=D[q-1];D[q-1]=D[q-2];D[q-2]=e;break}
   case 6:D[q]=D[q-2];q++;break;
   case 7:{const e=D[q-3];D[q-3]=D[q-2];D[q-2]=D[q-1];D[q-1]=e;break}
   case 23:D[q-1]=-D[q-1]|0;break;
   case 27:D[q-1]=~D[q-1];break;
   case 48:case 49:case 50:{
    const e=((p[x-2]|p[x-1]<<8)<<16)>>16;let f=true;
    if(a!==48){const d=D[--q];f=a===49?d===0:d!==0}
    if(f)c=x+e;break}
   case 51:if(z===64)return T(7);C[z++]=x;c=p[x-2]|p[x-1]<<8;break;
   case 52:if(!z)return T(8);c=C[--z];break;
   case 64:{const e=D[q-1];if(e<0||e>255)return T(6);D[q-1]=M[e];break}
   case 65:{const e=D[q-1],d=D[q-2];if(e<0||e>255)return T(6);q-=2;M[e]=d;break}
   case 80:{const e=String(D[q-1]);if(l+e.length>65536)return T(11);q--;for(let k=0;k<e.length;k++)o[l++]=e.charCodeAt(k);break}
   case 81:if(l+1>65536)return T(11);o[l++]=D[--q]&255;break;
   case 82:D[q++]=i<g.length?g[i++]:-1;break;
   case 83:return{o:o.slice(0,l),c:D[--q]&255}
  }
 }
}
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const d of readdirSync(I).sort()){
 const r=run(new Uint8Array(readFileSync(join(I,d,'program.bin'))),new Uint8Array(readFileSync(join(I,d,'input.bin'))));
 mkdirSync(join(O,d),{recursive:true});
 writeFileSync(join(O,d,'stdout.bin'),r.o);
 writeFileSync(join(O,d,'exit.txt'),r.c+'\n');
}
