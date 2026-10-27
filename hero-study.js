import {MeshoptDecoder} from './vendor/meshoptimizer/meshopt_decoder.mjs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const diagnosticMeshes=[];
const host=document.querySelector('#studio'),notice=document.querySelector('#loading');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x030405);scene.fog=new THREE.FogExp2(0x030405,.035);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(32,1,.1,80);camera.position.set(10.3,2.8,0);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=.8;controls.maxPolarAngle=1.5;
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.setViewOffset(w,h,w<800?0:-w*.21,w<800?-h*.13:0,w,h);camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
// The same physical floor receives both the spotlight and the model's shadows.
const cn=document.createElement('canvas');cn.width=cn.height=256;const ctx=cn.getContext('2d'),pixels=ctx.createImageData(256,256);let seed=42;for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const c=105+(seed%18);pixels.data.set([c,c,c,255],i)}ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(cn);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(20,20);texture.colorSpace=THREE.SRGBColorSpace;
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x3b3e43,map:texture,roughness:.87,metalness:.03,envMapIntensity:.08}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
scene.add(new THREE.HemisphereLight(0xb9c9df,0x090909,.07));
const beam=new THREE.SpotLight(0xfff5e3,950);beam.position.set(7,5,5);beam.target.position.set(-1,0,0);beam.angle=.33;beam.penumbra=.38;beam.decay=2;beam.distance=25;beam.castShadow=true;beam.shadow.mapSize.set(1024,1024);beam.shadow.radius=5;beam.shadow.blurSamples=16;beam.shadow.bias=-.00015;beam.shadow.normalBias=.025;beam.shadow.camera.near=.5;beam.shadow.camera.far=25;beam.shadow.focus=1;scene.add(beam,beam.target);
const key=new THREE.SpotLight(0xe9edf5,120);key.position.set(5,5,4);key.target.position.set(0,.7,0);key.angle=.52;key.penumbra=.9;key.decay=2;scene.add(key,key.target);
const rim=new THREE.DirectionalLight(0xbacbe0,2.3);rim.position.set(-3,3,-5);rim.layers.set(1);key.layers.set(1);camera.layers.enable(1);scene.add(rim);
const pmrem=new THREE.PMREMGenerator(renderer);let environment;
new RGBELoader().load('assets/roadster-studio-v2.hdr',hdr=>{environment=pmrem.fromEquirectangular(hdr).texture;scene.environment=environment;scene.environmentIntensity=.22;hdr.dispose();pmrem.dispose()});
new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load('assets/roadster-web.glb',gltf=>{
 const car=gltf.scene;const bounds=new THREE.Box3().setFromObject(car),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());car.position.sub(center);const wrapper=new THREE.Group();wrapper.add(car);const scale=4.6/Math.max(size.x,size.z);wrapper.scale.setScalar(scale);wrapper.position.y=size.y*scale/2+.015;
 car.traverse(o=>{if(!o.isMesh)return;o.layers.enable(1);o.castShadow=true;o.receiveShadow=true;const tune=m=>{if(m.map){const paint=new THREE.MeshPhysicalMaterial({map:m.map,color:0xc9cdd1,roughness:.3,metalness:.55,clearcoat:.65,clearcoatRoughness:.17,side:m.side});paint.normalMap=null;paint.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat paintMask = smoothstep(0.14, 0.5, dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722)));\nroughnessFactor = mix(0.19, 0.32, paintMask);').replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.05, 0.62, paintMask);')};return paint}const copy=m.clone();copy.normalMap=null;return copy};o.material=Array.isArray(o.material)?o.material.map(tune):tune(o.material)});// Ground the tyres, rather than an AI-generated underbody protrusion.
 wrapper.updateMatrixWorld(true);let tyreMin=Infinity;wrapper.traverse(o=>{if(o.isMesh&&/tyre/i.test(o.name))tyreMin=Math.min(tyreMin,new THREE.Box3().setFromObject(o).min.y)});if(Number.isFinite(tyreMin))wrapper.position.y-=tyreMin-.012;
 scene.add(wrapper);notice.hidden=true;
 car.traverse(o=>{if(o.isMesh&&(Array.isArray(o.material)?o.material.some(m=>m.map):o.material.map))diagnosticMeshes.push({mesh:o,original:o.material})});

},undefined,e=>{notice.textContent='The model could not load. Please refresh.';console.error(e)});
let visible=true;document.addEventListener('visibilitychange',()=>visible=!document.hidden);renderer.setAnimationLoop(()=>{if(!visible)return;controls.update();renderer.render(scene,camera)});

const diagnosticPanel=document.createElement('div');diagnosticPanel.style.cssText='position:fixed;top:70px;right:35px;z-index:20;display:flex;gap:8px;background:#101116dd;padding:10px;border:1px solid #494638';
for(const [label,mode] of [['Original','original'],['Plain dark','dark'],['Matte grey','grey'],['Inspect roof','roof'],['Hero view','hero']]){const button=document.createElement('button');button.textContent=label;button.style.cssText='font:11px Arial;color:#ddd;background:#23252a;border:1px solid #555;padding:8px;cursor:pointer';button.onclick=()=>{if(mode==='roof'||mode==='hero'){camera.position.set(mode==='roof'?5.8:10.3,mode==='roof'?7:2.8,0);controls.target.set(0,1,0);controls.update();return}for(const entry of diagnosticMeshes){entry.mesh.material=mode==='original'?entry.original:new THREE.MeshStandardMaterial({color:mode==='dark'?0x171b22:0x777777,roughness:mode==='dark'?.32:1,metalness:0,side:THREE.DoubleSide})}diagnosticPanel.dataset.mode=mode;};diagnosticPanel.appendChild(button)}document.body.appendChild(diagnosticPanel);
