import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const diagnosticMeshes=[];let manual=false,scrollBlend=0,carCentreZ=0,baseY=0;
const journey=document.querySelector(".journey"),heroCopy=document.querySelector(".journey-hero"),pilotCopy=document.querySelector(".journey-pilot");
const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t,smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const host=document.querySelector('#studio'),notice=document.querySelector('#loading');
const motion=new THREE.Group();
const scene=new THREE.Scene();scene.add(motion);scene.background=new THREE.Color(0x030405);scene.fog=new THREE.FogExp2(0x030405,.035);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(32,1,.1,80);camera.position.set(10.3,2.8,0);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.addEventListener("start",()=>manual=true);controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=.8;controls.maxPolarAngle=1.5;
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.setViewOffset(w,h,w<800?0:-w*.21,w<800?-h*.13:0,w,h);camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
// The same physical floor receives both the spotlight and the model's shadows.
const cn=document.createElement('canvas');cn.width=cn.height=256;const ctx=cn.getContext('2d'),pixels=ctx.createImageData(256,256);let seed=42;for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const c=105+(seed%18);pixels.data.set([c,c,c,255],i)}ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(cn);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(20,20);texture.colorSpace=THREE.SRGBColorSpace;
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x3b3e43,map:texture,roughness:.87,metalness:.03,envMapIntensity:.08}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x74777c,map:texture,roughness:.94,metalness:0,envMapIntensity:.03,transparent:true,opacity:0,depthWrite:false}));
ceiling.material.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec3 ceilingWorld;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nceilingWorld=(modelMatrix*vec4(position,1.0)).xyz;');
 shader.fragmentShader='varying vec3 ceilingWorld;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a *= 1.0-smoothstep(7.0,19.0,length(ceilingWorld.xz));\n#include <opaque_fragment>');
};
ceiling.rotation.x=Math.PI/2;ceiling.receiveShadow=true;ceiling.visible=false;scene.add(ceiling);
const ceilingBeam=new THREE.SpotLight(0xfff1d7,0,30,.72,.8,2);
ceilingBeam.position.set(3,1,6);ceilingBeam.castShadow=true;ceilingBeam.shadow.mapSize.set(1024,1024);ceilingBeam.shadow.radius=5;ceilingBeam.shadow.blurSamples=12;ceilingBeam.shadow.bias=-.0001;ceilingBeam.shadow.normalBias=.012;scene.add(ceilingBeam,ceilingBeam.target);

scene.add(new THREE.HemisphereLight(0xb9c9df,0x090909,.07));
const beam=new THREE.SpotLight(0xfff5e3,950);beam.position.set(7,5,5);beam.target.position.set(-1,0,0);beam.angle=.33;beam.penumbra=.38;beam.decay=2;beam.distance=25;beam.castShadow=true;beam.shadow.mapSize.set(1024,1024);beam.shadow.radius=5;beam.shadow.blurSamples=16;beam.shadow.bias=-.00015;beam.shadow.normalBias=.025;beam.shadow.camera.near=.5;beam.shadow.camera.far=25;beam.shadow.focus=1;scene.add(beam,beam.target);
const key=new THREE.SpotLight(0xe9edf5,120);key.position.set(5,5,4);key.target.position.set(0,.7,0);key.angle=.52;key.penumbra=.9;key.decay=2;scene.add(key,key.target);
const rim=new THREE.DirectionalLight(0xbacbe0,2.3);rim.position.set(-3,3,-5);rim.layers.set(1);key.layers.set(1);camera.layers.enable(1);scene.add(rim);
camera.layers.enable(2);
const tyreFills=[];for(const sign of [-1,1]){const light=new THREE.DirectionalLight(0xc4ceda,.55);light.position.set(5,2,sign*5);light.layers.set(2);scene.add(light);tyreFills.push(light)}

// Turbulent cloud variants with irregular transparent margins and internal self-shadow.
function cloudTexture(variant){
 const n=256,c=document.createElement('canvas');c.width=c.height=n;
 const cx=c.getContext('2d'),im=cx.createImageData(n,n);
 const hash=(x,y)=>{const v=Math.sin(x*127.1+y*311.7+variant*74.7)*43758.5453;return v-Math.floor(v)};
 const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y);let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);return mix(mix(hash(ix,iy),hash(ix+1,iy),u),mix(hash(ix,iy+1),hash(ix+1,iy+1),u),v)};
 const fbm=(x,y)=>{let v=0,w=.55;for(let k=0;k<5;k++){v+=noise(x,y)*w;x=x*2.07+13;y=y*2.03+7;w*=.48}return v};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=x/n,v=y/n,warp=fbm(u*4,v*4);
  const field=fbm(u*7+warp*2.7,v*7-warp*2.1);
  const radius=Math.hypot((u-.5)*2,(v-.5)*2);
  const edge=1-smooth((radius+.22*(warp-.5)-.48)/.5);
  const density=smooth((field-.23)/.49)*edge*(1-smooth((radius-.78)/.2));
  const lit=fbm(u*7+.13+warp*2.7,v*7-.15-warp*2.1);
  const shade=Math.max(95,Math.min(238,155+field*82+(field-lit)*280));
  const i=(y*n+x)*4;im.data[i]=shade;im.data[i+1]=shade+2;im.data[i+2]=Math.min(255,shade+5);im.data[i+3]=Math.round(density*240);
 }
 cx.putImageData(im,0,0);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
const smokeTextures=[0,1,2,3].map(cloudTexture),smokeTexture=smokeTextures[0];
const smokePuffs=[];
for(let i=0;i<84;i++){
 const material=new THREE.SpriteMaterial({map:smokeTextures[i%4],color:i%3===0?0x9ba4af:0xe0e3e7,transparent:true,opacity:0,depthWrite:false,rotation:i*2.39996});
 const puff=new THREE.Sprite(material);puff.visible=false;scene.add(puff);smokePuffs.push(puff);
}

const landingPlumes=[-1,1].map(side=>{
 const plume=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTexture,color:0xe6e8e7,transparent:true,opacity:0,depthWrite:false}));
 plume.visible=false;scene.add(plume);return {plume,side};
});
const pmrem=new THREE.PMREMGenerator(renderer);let environment;
new RGBELoader().load('assets/roadster-studio-v2.hdr',hdr=>{environment=pmrem.fromEquirectangular(hdr).texture;scene.environment=environment;scene.environmentIntensity=.22;hdr.dispose();pmrem.dispose()});
new GLTFLoader().load('assets/roadster.glb',gltf=>{
 const car=gltf.scene;

// Locally relax tiny roof-edge ridges along their surface normal, then blend shading.
 // Displacement is capped; wheels, body panels and glass outline are preserved.
 car.traverse(mesh=>{
  if(!mesh.isMesh||!/Meshy.body/i.test(mesh.name))return;
  const geo=mesh.geometry,pos=geo.attributes.position,norm=geo.attributes.normal;if(!norm)return;
  const cell=.028,buckets=new Map(),selected=[];
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
   if(x<-.65||y<.075||Math.abs(z)>.34)continue;
   const a=Math.floor(x/cell),b=Math.floor(y/cell),c=Math.floor(z/cell),key=a+','+b+','+c;
   if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);selected.push(i);
  }
  const output=new Float32Array(norm.array),relaxed=new Float32Array(pos.array);
  for(const i of selected){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),a=Math.floor(x/cell),b=Math.floor(y/cell),c=Math.floor(z/cell);
   const n=new THREE.Vector3(),centroid=new THREE.Vector3(),original=new THREE.Vector3().fromBufferAttribute(norm,i);let weight=0;
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
    for(const j of buckets.get((a+dx)+','+(b+dy)+','+(c+dz))||[]){
     const distance=(pos.getX(j)-x)**2+(pos.getY(j)-y)**2+(pos.getZ(j)-z)**2;
     if(distance>.0016)continue;
     const v=new THREE.Vector3().fromBufferAttribute(norm,j);if(v.dot(original)<.45)continue;
     const w=Math.exp(-distance/.00045);n.addScaledVector(v,w);centroid.addScaledVector(new THREE.Vector3().fromBufferAttribute(pos,j),w);weight+=w;
    }
   }
   if(weight){
    n.normalize();original.lerp(n,.95).normalize();output.set(original.toArray(),i*3);
    // Only the narrow roof shoulder strips receive geometric relaxation.
    const edgeWeight=THREE.MathUtils.smoothstep(Math.abs(z),.12,.18)*(1-THREE.MathUtils.smoothstep(Math.abs(z),.29,.34));
    const endWeight=THREE.MathUtils.smoothstep(x,-.65,-.48)*(1-THREE.MathUtils.smoothstep(x,.70,.79));
    centroid.multiplyScalar(1/weight).sub(new THREE.Vector3(x,y,z));
    const move=THREE.MathUtils.clamp(centroid.dot(n)*.8,-.0025,.0025)*edgeWeight*endWeight;
    relaxed[i*3]=x+n.x*move;relaxed[i*3+1]=y+n.y*move;relaxed[i*3+2]=z+n.z*move;
   }
  }
  geo.setAttribute('position',new THREE.BufferAttribute(relaxed,3));
  geo.setAttribute('normal',new THREE.BufferAttribute(output,3));
 });
 const bounds=new THREE.Box3().setFromObject(car),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());car.position.sub(center);const wrapper=new THREE.Group();wrapper.add(car);const scale=4.6/Math.max(size.x,size.z);wrapper.scale.setScalar(scale);carCentreZ=-center.z*scale;wrapper.position.y=size.y*scale/2+.015;
 car.traverse(o=>{if(!o.isMesh)return;o.layers.enable(1);if(/tyre/i.test(o.name))o.layers.set(2);o.castShadow=true;o.receiveShadow=true;const tune=m=>{if(/tyre/i.test(o.name))return new THREE.MeshBasicMaterial({color:0x30343b,side:THREE.DoubleSide,toneMapped:false});if(m.map){const paint=new THREE.MeshPhysicalMaterial({map:m.map,color:0xc9cdd1,roughness:.3,metalness:.55,clearcoat:.65,clearcoatRoughness:.17,side:m.side});paint.normalMap=null;paint.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec3 repairPosition;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nrepairPosition=position;');
 shader.fragmentShader='varying vec3 repairPosition;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 float rx=repairPosition.x;
 float originalLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
 float topRegion=smoothstep(.075,.115,repairPosition.y)*(1.0-smoothstep(.26,.32,abs(repairPosition.z)));
 float glassMask=topRegion*(1.0-smoothstep(.20,.40,originalLuma));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.018,.023,.032),glassMask);
 // Continuous curved paint boundary around the rear roof glass.
 float roofWidth=.244-.105*rx;
 float roofPatch=smoothstep(.15,.23,rx)*(1.0-smoothstep(.70,.74,rx))*smoothstep(.12,.145,repairPosition.y)*(1.0-smoothstep(.245,.265,abs(repairPosition.z)));
 float roofInside=1.0-smoothstep(roofWidth-.001,roofWidth+.001,abs(repairPosition.z));
 diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.60,.63,.67),vec3(.018,.023,.032),roofInside),roofPatch);
 float sideSurface=smoothstep(.395,.415,abs(repairPosition.z));
 float skirtRange=smoothstep(-.385,-.375,rx)*(1.0-smoothstep(.428,.440,rx));
 float seam=-.01855019*rx*rx*rx+.11046494*rx*rx+.08338871*rx-.13792316;
 float band=(1.0-smoothstep(.012,.025,abs(repairPosition.y-seam)))*sideSurface*skirtRange;
 float silver=smoothstep(seam-.0007,seam+.0007,repairPosition.y);
 diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.014,.018,.024),vec3(.60,.63,.67),silver),band);
 float rearRange=smoothstep(.765,.780,rx)*(1.0-smoothstep(.935,.949,rx));
 float rearSeam=-.065+.32*(rx-.76);
 float rearBand=(1.0-smoothstep(.012,.024,abs(repairPosition.y-rearSeam)))*sideSurface*rearRange;
 float rearSilver=smoothstep(rearSeam-.0007,rearSeam+.0007,repairPosition.y);
 diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.014,.018,.024),vec3(.60,.63,.67),rearSilver),rearBand);
 // Rear corner recesses are black throughout, including the inset faces.
 float rearRecess=smoothstep(.755,.775,rx)*smoothstep(.29,.34,abs(repairPosition.z))*(1.0-smoothstep(.010,.012,repairPosition.y));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.009,.012,.017),rearRecess);

 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\nmaterial.clearcoat *= 1.0-shoulderMask*.85;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat paintMask = smoothstep(0.14, 0.5, dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722)));\nroughnessFactor = mix(0.19, 0.32, paintMask);\nfloat shoulderMask=smoothstep(.12,.17,abs(repairPosition.z))*(1.0-smoothstep(.29,.34,abs(repairPosition.z)))*smoothstep(.075,.12,repairPosition.y);\nroughnessFactor=mix(roughnessFactor,.58,shoulderMask);').replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.05, 0.62, paintMask);').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat tailMask=smoothstep(0.045,0.16,diffuseColor.r-max(diffuseColor.g,diffuseColor.b))*smoothstep(0.06,0.18,diffuseColor.r);\ntotalEmissiveRadiance += vec3(1.0,0.012,0.002)*tailMask*1.5;')};return paint}const copy=m.clone();copy.normalMap=null;if(/tyre/i.test(o.name)){copy.color.set(0x30343a);copy.emissive.set(0x070809);copy.emissiveIntensity=.25;copy.roughness=1;copy.metalness=0;copy.envMapIntensity=0;copy.map=null;copy.side=THREE.DoubleSide;}return copy};o.material=Array.isArray(o.material)?o.material.map(tune):tune(o.material)});// Ground the tyres, rather than an AI-generated underbody protrusion.
 wrapper.updateMatrixWorld(true);let tyreMin=Infinity;wrapper.traverse(o=>{if(o.isMesh&&/tyre/i.test(o.name))tyreMin=Math.min(tyreMin,new THREE.Box3().setFromObject(o).min.y)});if(Number.isFinite(tyreMin))wrapper.position.y-=tyreMin-.012;
 // A recessed underbody insert masks the noisy generated machinery below the rear outlets.
 const rearInsert=new THREE.Mesh(new THREE.BoxGeometry(.12,.095,.59),new THREE.MeshStandardMaterial({color:0x11151a,roughness:.86,metalness:.08}));
 rearInsert.name='Clean recessed rear underbody';rearInsert.position.set(.80,-.157,0);rearInsert.castShadow=true;rearInsert.receiveShadow=true;car.add(rearInsert);
 // Smooth trim ribbons bridge the rough generated joins without changing the body shell.
 const joinMaterial=new THREE.MeshStandardMaterial({color:0x11151b,metalness:.12,roughness:.58,side:THREE.DoubleSide});
 for(const sign of [-1,1]){
  for(const rear of [false]){
   const verts=[],idx=[],steps=64;
   for(let i=0;i<=steps;i++){
    const t=i/steps,x=rear?mix(.775,.944,t):mix(-.378,.436,t);
    const y=rear?-.065+.32*(x-.76):-.01855019*x*x*x+.11046494*x*x+.08338871*x-.13792316;
    const z=sign*(rear?mix(.429,.404,t):.434);
    verts.push(x,y-.009,z,x,y+.009,z);
    if(i<steps){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}
   }
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();
   const trim=new THREE.Mesh(geo,joinMaterial);trim.name=rear?'Smooth rear corner join':'Smooth side skirt join';car.add(trim);
  }
 }
 // A continuous lens and narrow housing cover the generated jagged paint boundary.
 function rearRibbon(height,offset,material,name){
  const positions=[],indices=[],segments=96;
  for(let i=0;i<=segments;i++){
   const z=-.369+i/segments*.738,edge=Math.abs(z)/.369;
   const x=.933-.025*Math.pow(edge,3)+offset,y=.058-.002*Math.pow(edge,2);
   const round=Math.sqrt(Math.max(0,1-Math.pow(Math.max(0,(edge-.985)/.015),2)));
   positions.push(x,y-height*.5*round,z,x,y+height*.5*round,z);
   if(i<segments){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;car.add(mesh);return mesh;
 }
 rearRibbon(.023,0,new THREE.MeshStandardMaterial({color:0x090b0e,roughness:.45,metalness:.15,side:THREE.DoubleSide}),'Smooth rear lamp housing');
 rearRibbon(.0065,.0015,new THREE.MeshBasicMaterial({color:0xff2915,side:THREE.DoubleSide,toneMapped:false}),'Continuous red rear lens');
 baseY=wrapper.position.y;wrapper.position.y=0;motion.position.y=baseY;motion.add(wrapper);notice.hidden=true;
 // Headlights sit at the nose and throw their light forward, away from the rear camera.
 const frontX=(bounds.min.x-center.x)*scale-.035,frontY=baseY+(.36-center.y)*scale;
 const lampY=Math.max(.38,Math.min(.65,frontY));
 for(const side of [-1,1]){
  const z=carCentreZ+side*.69;
  const head=new THREE.SpotLight(0xffedc4,420,14,.32,.85,1.8);head.position.set(frontX,lampY-baseY,z);head.target.position.set(frontX-6,.015-baseY,z+side*.22);motion.add(head,head.target);
  const lens=new THREE.Mesh(new THREE.PlaneGeometry(.21,.018),new THREE.MeshBasicMaterial({color:0xfff2d6,side:THREE.FrontSide,toneMapped:false}));lens.rotation.y=-Math.PI/2;lens.position.set(frontX,lampY-baseY,z);motion.add(lens);
 }
 // Emission follows the existing red lens texture, avoiding a false central lamp.

 car.traverse(o=>{if(o.isMesh&&(Array.isArray(o.material)?o.material.some(m=>m.map):o.material.map))diagnosticMeshes.push({mesh:o,original:o.material})});



},undefined,e=>{notice.textContent='The model could not load. Please refresh.';console.error(e)});
let visible=true;document.addEventListener('visibilitychange',()=>visible=!document.hidden);renderer.setAnimationLoop(()=>{if(!visible)return;updateJourney();controls.update();renderer.render(scene,camera)});


function updateJourney(){
 const travel=Math.max(0,(scrollY-journey.offsetTop)/innerHeight),progress=clamp(travel/5.9),first=clamp(travel/1.45),t=smooth((first-.1)/.78),mobile=innerWidth<800;
 scrollBlend=mix(scrollBlend,travel,.09);
 const u=smooth((clamp(scrollBlend/1.45)-.1)/.78),flip=smooth((scrollBlend-1.65)/1.65),roll=smooth((flip-.1)/.8);
 const landing=smooth((scrollBlend-3.8)/1.8),unroll=smooth(landing/.65),descent=smooth((landing-.3)/.7);
 motion.rotation.x=(roll+unroll)*Math.PI;
 const settle=Math.sin(clamp((landing-.88)/.12)*Math.PI)*.035;
 motion.position.y=baseY+smooth(flip/.35)*1.35*(1-descent)-settle;
 const landingFloor=smooth((landing-.25)/.5);
 const overhead=smooth((flip-.48)/.52)*(1-smooth(landing/.45)),ceilingY=2*baseY+1.35+.015;
 // Separate horizontal surfaces avoid a sweeping wall during the roll.
 floor.visible=overhead<.995;floor.rotation.x=-Math.PI/2;floor.position.y=0;
 floor.material.transparent=true;floor.material.opacity=(1-smooth((flip-.48)/.52)) + landingFloor;floor.material.opacity=clamp(floor.material.opacity);
 ceiling.visible=overhead>.001;ceiling.position.y=ceilingY;ceiling.material.opacity=overhead;
 ceiling.material.emissive.setRGB(.013*overhead,.014*overhead,.016*overhead);
 ceilingBeam.position.set(3,ceilingY-1.85,5.5);ceilingBeam.target.position.set(-1,ceilingY,0);
 ceilingBeam.intensity=1800*overhead;
 const smokeReveal=smooth((landing-.38)/.35),clock=performance.now()*.00015;
 landingPlumes.forEach(({plume,side})=>{
  const gap=Math.max(.08,motion.position.y-baseY);
  plume.visible=landing>.45;
  plume.position.set(2.25,.15+gap*.45,carCentreZ+side*.65);
  plume.scale.set(.25,.4+gap,1);
  plume.material.opacity=smokeReveal*(.65+.3*(1-descent));
 });
 smokePuffs.forEach((puff,i)=>{
  const side=i%2?1:-1,k=Math.floor(i/2)/41,phase=i*2.39996;
  const age=(k+clock*(.08+(i%5)*.008))%1;
  const envelope=smooth(age/.1)*(1-smooth((age-.78)/.22));
  puff.visible=smokeReveal>.001;
  const curl=Math.sin(age*5+phase);
  puff.position.set(2.15+(i%3)*.22+Math.sin(phase)*.2+age*.8,
   .15+age*.34+Math.sin(age*Math.PI)*(.18+(i%4)*.07),
   carCentreZ+side*(.2+age*4.7*smokeReveal)+curl*.15);
  const width=.8+age*2.3;puff.scale.set(width,width*(.48+(i%4)*.08),1);
  puff.material.rotation=phase+side*age*.45;
  puff.material.opacity=smokeReveal*(.35+(i%3)*.12)*envelope;
 });


 tyreFills.forEach(light=>light.intensity=mix(.3,.9,flip));
 controls.enableDamping=manual;controls.maxPolarAngle=mix(1.5,2.3,overhead);
 if(!manual){const angle=mix(-u*Math.PI/2,0,flip),distance=mix(mix(10.3,9.5,u),10.8,flip);camera.position.set(Math.cos(angle)*distance,mix(mix(mix(2.8,2.05,u),ceilingY-.75,flip),2.2,landing),carCentreZ+Math.sin(angle)*distance);controls.target.set(0,mix(mix(mix(1,.8,u),ceilingY-.5,flip),1.5,landing),carCentreZ)}
 const w=host.clientWidth,h=host.clientHeight;camera.setViewOffset(w,h,mobile?0:mix(-w*.21,0,u),mobile?-h*.1:mix(mix(0,-h*.04,u),0,flip),w,h);camera.updateProjectionMatrix();
 beam.position.set(mix(mix(7,2,u),-1,flip),5,mix(mix(5,7,u),7,flip));beam.position.y=5;beam.target.position.set(mix(-1,0,u),0,0);beam.angle=mix(mix(.33,.48,u),.6,flip);beam.intensity=mix(950,1100,u)*((1-smooth((flip-.48)/.52))+landingFloor*.8);
 if(landing>0){beam.position.set(mix(2,5,landing),5,mix(7,4,landing));beam.target.position.set(1,0,0);beam.angle=mix(.6,.55,landing)}
 key.position.set(mix(5,1,u),mix(5,3.1,overhead),mix(4,5,u));key.intensity=mix(120,165,overhead);rim.intensity=mix(mix(2.3,1.8,u),2.2,overhead);
 heroCopy.style.opacity=1-smooth((first-.04)/.27);heroCopy.style.pointerEvents=first<.25?'auto':'none';heroCopy.setAttribute('aria-hidden',String(first>=.25));heroCopy.querySelectorAll('a').forEach(a=>a.tabIndex=first>=.25?-1:0);
 const reveal=smooth((first-.34)/.24)*(1-smooth((travel-1.6)/.4));pilotCopy.style.opacity=reveal;pilotCopy.style.transform=`translateY(${24*(1-reveal)}px)`;pilotCopy.setAttribute('aria-hidden',String(reveal<.05));
 const physicsCopy=document.querySelector('.journey-physics'),physicsReveal=smooth((travel-2)/.55)*(1-smooth((travel-3.8)/.5));physicsCopy.style.opacity=physicsReveal;physicsCopy.setAttribute('aria-hidden',String(physicsReveal<.05));
 const landingCopy=document.querySelector('.journey-landing'),landingReveal=smooth((travel-4.6)/.55);landingCopy.style.opacity=landingReveal;landingCopy.setAttribute('aria-hidden',String(landingReveal<.05));
 document.querySelector('#modelProgress').style.width=`${progress*100}%`;document.querySelector('.journey-scroll').style.opacity=1-smooth(progress/.2);document.querySelector('#viewName').textContent=manual?'YOUR PERSPECTIVE':landing>.3?'04 / GRAVITY DEFYING':flip>.5?'03 / BEYOND PHYSICS':t<.5?'01 / REAR PERSPECTIVE':'02 / SIDE PROFILE';
}
addEventListener('scroll',()=>{manual=false},{passive:true});document.querySelector('#reset').onclick=()=>{manual=false};





