import { useEffect, useRef } from 'react';

// Original, dependency-free WebGL sculpture. No remote models, images or tracking.
const vertex = `attribute vec3 position; attribute vec3 normal;
uniform mat4 viewProjection; uniform float turn; uniform float time;
varying vec3 world; varying vec3 surface;
void main(){float c=cos(turn),s=sin(turn); mat3 r=mat3(c,0.,-s,0.,1.,0.,s,0.,c);
world=r*position; surface=r*normal; gl_Position=viewProjection*vec4(world,1.);}`;
const fragment = `precision mediump float;
varying vec3 world; varying vec3 surface;
uniform vec3 eye; uniform float terrain;
float grain(vec3 p){return fract(sin(dot(floor(p*38.),vec3(12.98,78.23,37.12)))*43758.54);}
void main(){vec3 n=normalize(surface); vec3 l=normalize(vec3(-4.,8.,5.)); vec3 v=normalize(eye-world);
float diffuse=max(dot(n,l),0.); float rim=pow(1.-max(dot(n,v),0.),2.5);
float shine=pow(max(dot(n,normalize(l+v)),0.),70.);
vec3 ice=mix(vec3(.31,.39,.46),vec3(.79,.87,.91),diffuse*.68+.26);
ice+=rim*.21+shine*.45+(grain(world)-.5)*.035;
float glow=pow(max(0.,1.-abs(world.y-1.8)/3.),2.)*.08;
ice+=vec3(.58,.76,.88)*glow;
if(terrain>.5){ice=mix(vec3(.40,.47,.53),vec3(.76,.81,.85),diffuse*.7+.3);
ice+=(grain(world)-.5)*.035;
float shadow=1.-.35*exp(-dot(world.xz,world.xz)*.21);ice*=shadow;}
float fog=1.-exp(-length(eye-world)*.035); ice=mix(ice,vec3(.72,.77,.81),fog);
gl_FragColor=vec4(ice,1.);}`;

function normalize(v: number[]) { const n = Math.hypot(...v) || 1; return v.map(x => x / n); }
function cross(a: number[], b: number[]) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
function projection(eye: number[], aspect: number) {
  const z = normalize([eye[0], eye[1]-1.5, eye[2]]), x = normalize(cross([0,1,0],z)), y = cross(z,x);
  const dot = (a: number[], b: number[]) => a.reduce((n,v,i) => n+v*b[i],0);
  const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
  const f=1/Math.tan(.39),near=.1,far=100;
  const p=[f/aspect,0,0,0,0,f,0,0,aspect>1 ? -.48 : 0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];
  return new Float32Array(Array.from({length:16},(_,i)=>[0,1,2,3].reduce((s,k)=>s+p[(i%4)+k*4]*view[Math.floor(i/4)*4+k],0)));
}

function sculpture() {
  const positions:number[]=[],normals:number[]=[];
  function block(cx:number,cy:number,cz:number,w:number,h:number,d:number,angle:number) {
    const halves=[w/2,h/2,d/2],radius=.075,segments=4;
    const c=Math.cos(angle),s=Math.sin(angle);
    const rotate=(p:number[])=>[p[0]*c+p[2]*s,p[1],-p[0]*s+p[2]*c];
    for(let axis=0;axis<3;axis++) for(const side of [-1,1]) {
      const a=(axis+1)%3,b=(axis+2)%3;
      function point(u:number,v:number){
        const p=[0,0,0];p[axis]=side*halves[axis];p[a]=u*halves[a];p[b]=v*halves[b];
        const core=p.map((n,i)=>Math.max(-halves[i]+radius,Math.min(halves[i]-radius,n)));
        const normal=normalize(p.map((n,i)=>n-core[i]));
        const q=rotate(core.map((n,i)=>n+normal[i]*radius));
        return {p:[q[0]+cx,q[1]+cy,q[2]+cz],n:rotate(normal)};
      }
      for(let i=0;i<segments;i++) for(let j=0;j<segments;j++) {
        const q=[point(i/segments*2-1,j/segments*2-1),point((i+1)/segments*2-1,j/segments*2-1),point((i+1)/segments*2-1,(j+1)/segments*2-1),point(i/segments*2-1,(j+1)/segments*2-1)];
        for(const ix of [0,1,2,0,2,3]){positions.push(...q[ix].p);normals.push(...q[ix].n);}
      }
    }
  }
  const rings=[{r:2.22,n:12},{r:2.17,n:12},{r:1.99,n:11},{r:1.65,n:9},{r:1.16,n:7},{r:.59,n:4}];
  rings.forEach(({r,n},row)=>{
    for(let i=0;i<n;i++){
      const angle=i/n*Math.PI*2+(row%2)*Math.PI/n;
      // A quiet opening in the lower courses echoes the reference's architectural form.
      if(row<2 && Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<.38) continue;
      block(Math.sin(angle)*r,.43+row*.65,Math.cos(angle)*r,2*Math.PI*r/n*.87,.56,.7,angle+(i%3-1)*.035);
    }
  });
  block(0,4.25,0,.78,.5,.78,.1);
  return {positions,normals};
}
function landscape(){
  const positions:number[]=[],normals:number[]=[],n=64,size=36;
  const height=(x:number,z:number)=>{
    const edge=1-Math.exp(-(x*x+z*z)*.023);
    return -.05+edge*(Math.sin(x*.48+z*.25)*.65+Math.sin(z*.67)*.4+Math.cos(x*.9-z*.6)*.19)
      +Math.max(0,-z-4)*.2;
  };
  function add(x:number,z:number){
    const e=.08,y=height(x,z);positions.push(x,y,z);
    normals.push(...normalize([height(x-e,z)-height(x+e,z),e*2,height(x,z-e)-height(x,z+e)]));
  }
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
    const x=(i/n-.5)*size,z=(j/n-.5)*size,k=size/n;
    for(const p of [[x,z],[x+k,z],[x+k,z+k],[x,z],[x+k,z+k],[x,z+k]])add(...p as [number,number]);
  }
  return {positions,normals};
}

export function IceScene(){
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const element=canvas.current!;
    const gl=element.getContext('webgl',{antialias:true,alpha:false,powerPreference:'low-power'});
    if(!gl) return;
    const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);return s;};
    const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram()!;
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);return;}
    gl.useProgram(program);gl.enable(gl.DEPTH_TEST);
    const attribute=(name:string,values:number[])=>{const buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);return {buffer,index:gl.getAttribLocation(program,name)};};
    const meshes=[landscape(),sculpture()].map(mesh=>({count:mesh.positions.length/3,p:attribute('position',mesh.positions),n:attribute('normal',mesh.normals)}));
    const vp=gl.getUniformLocation(program,'viewProjection'),eyeUniform=gl.getUniformLocation(program,'eye'),turn=gl.getUniformLocation(program,'turn'),terrain=gl.getUniformLocation(program,'terrain');
    let frame=0,px=0,py=0,sx=0,sy=0,visible=true,lastDraw=0;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const move=(e:PointerEvent)=>{const r=element.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;};
    element.parentElement?.addEventListener('pointermove',move);
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(element);
    function draw(){
      if(!gl) return;
      const tick=performance.now();
      const dpr=Math.min(devicePixelRatio,1.25),w=Math.round(element.clientWidth*dpr),h=Math.round(element.clientHeight*dpr);
      const resized=element.width!==w||element.height!==h;
      if(visible && !document.hidden && (resized || (!reduced && tick-lastDraw>65))){
        lastDraw=tick;
        if(element.width!==w||element.height!==h){element.width=w;element.height=h;gl.viewport(0,0,w,h);}
        if(!reduced){sx+=(px-sx)*.025;sy+=(py-sy)*.025;}
        const eye=[6+sx*1.6,4+sy*.65,9];
        gl.clearColor(.72,.77,.81,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(vp,false,projection(eye,w/Math.max(h,1)));gl.uniform3fv(eyeUniform,new Float32Array(eye));
        meshes.forEach((mesh,i)=>{gl.uniform1f(terrain,i===0?1:0);gl.uniform1f(turn,i===0?0:-.18+sx*.15+(reduced?0:Math.sin(tick*.0001)*.035));
          for(const a of [mesh.p,mesh.n]){gl.bindBuffer(gl.ARRAY_BUFFER,a.buffer);gl.enableVertexAttribArray(a.index);gl.vertexAttribPointer(a.index,3,gl.FLOAT,false,0,0);}
          gl.drawArrays(gl.TRIANGLES,0,mesh.count);
        });
      }
      frame=requestAnimationFrame(draw);
    }
    draw();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();element.parentElement?.removeEventListener('pointermove',move);meshes.forEach(m=>{gl.deleteBuffer(m.p.buffer);gl.deleteBuffer(m.n.buffer);});gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);};
  },[]);
  return <canvas className="ice-canvas" ref={canvas} aria-hidden="true"/>;
}
