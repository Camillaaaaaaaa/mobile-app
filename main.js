/*
npm install --save three


npm install --save-dev vite

npx vite
*/

import * as THREE from 'three';
import vertex from "./vertex.js";

let current_filter=0;



let stream;
let videoElement = document.getElementById('videoElement');
async function startWebcam() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false,
            video: {
              facingMode: 'environment',
            } });
        videoElement.width = 1080;
        videoElement.height = 1920;
        videoElement.srcObject = stream;
        //https://github.com/tensorflow/tfjs/issues/322
        videoElement = await new Promise((resolve, reject) => {
            videoElement.onloadedmetadata = () => resolve(videoElement);
        });
        videoElement.play();
        videoElement.setAttribute("autoplay",'');
        videoElement.setAttribute('muted','');
        videoElement.setAttribute('playsinline','')
        
    } catch (error) {
        console.error('Error accessing webcam:', error);
    }
}


//https://lvngd.com/blog/how-write-custom-fragment-shader-glsl-and-use-it-threejs/

//--------------------------------------------------------------------------------------------------------------------------------
// set up scene
//--------------------------------------------------------------------------------------------------------------------------------

let camera,scene,renderer, loader;

const w= screen.width;
const h= parseInt(1920*screen.width/1080);

//const w= 1920;
//const h= 1080;


scene = new THREE.Scene();
scene.background = new THREE.Color( 0x000000 );

loader = new THREE.TextureLoader();

camera = new THREE.OrthographicCamera( w / - 2, w/ 2, h/ 2, h/ - 2, 1, 1000 );
camera.position.z = 1;

const canvas = document.querySelector('#glCanvas');

var texture = new THREE.VideoTexture( videoElement );
texture.colorSpace = THREE.LinearSRGBColorSpace;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.format = THREE.RGBFormat;

//const texture = new THREE.TextureLoader().load( "linz.png" );

renderer = new THREE.WebGLRenderer({canvas});
renderer.setPixelRatio( screen.devicePixelRatio);
renderer.setSize( w, h );

const plane = new THREE.PlaneGeometry(w, h);

//--------------------------------------------------------------------------------------------------------------------------------
// matrix
//--------------------------------------------------------------------------------------------------------------------------------


let tiles_dim = [3,5];
let color_per_tile=[];

let motion = [];
let sum_motion = [];

for(let x = 0; x<tiles_dim[1];x++){
    color_per_tile.push([]);
    for(let y = 0; y<tiles_dim[0];y++){
        color_per_tile[x].push(parseFloat(Math.floor(Math.random() * 7)+1));
        motion.push(0);
        sum_motion.push(0);
    }
}

//--------------------------------------------------------------------------------------------------------------------------------
// shader
//--------------------------------------------------------------------------------------------------------------------------------

const material = new THREE.ShaderMaterial( {
    uniforms: {
        u_resolution: new THREE.Uniform( new THREE.Vector2() ),
        texSize: {value: [1080,920]},
        colorM: {value: color_per_tile.flat(Infinity)},
        tex0:{
            type:'t',
            value: texture
        }
    },
    fragmentShader: vertex,
} );

const mesh = new THREE.Mesh( plane, material );

scene.add( mesh );

function render() {
    const object = scene.children[ 0 ];
    object.material.uniforms.u_resolution.value.x = w;
    object.material.uniforms.u_resolution.value.y = h;
    
    object.material.uniforms.colorM.value = color_per_tile.flat(Infinity); 

    texture.needsUpdate=true;
    renderer.render( scene, camera );
}

//--------------------------------------------------------------------------------------------------------------------------------
// motion detection
//--------------------------------------------------------------------------------------------------------------------------------

// sample the colour of every 50 pixels
//https://codersblock.com/blog/motion-detection-with-javascript/
var sample_size = 100;
let pixels_per_tile=[w / tiles_dim[0],h / tiles_dim[1]];

let offscreen= new OffscreenCanvas(w,h);
offscreen.width=w;
offscreen.height=h;

var ctx=offscreen.getContext("2d", {willReadFrequently: true});


let data = ctx.getImageData(0, 0, w, h).data;
let dataPrevious = ctx.getImageData(0, 0, w, h).data;

function detect_motion(){
    
    ctx.drawImage(videoElement, 0, 0, w, h);
    data = ctx.getImageData(0, 0, w, h).data;

    for(let x = 0; x<motion.length;x++){
        motion[x]=0;
    }

    for (var y = 0; y < h; y+= sample_size) {
        for (var x = 0; x < w; x+= sample_size) {

            var index = (x + y * w) * 4;
            let pr = dataPrevious[index + 0];
            let pg = dataPrevious[index + 1];
            let pb = dataPrevious[index + 2];
    
            let r = data[index + 0];
            let g = data[index + 1];
            let b = data[index + 2];

            var dx = pr - r;
            var dy = pg- g;
            var dz = pb - b;
            
            var dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2) + Math.pow(dz, 2));
    
            sum_motion[
            parseInt(y / pixels_per_tile[1]) * tiles_dim[0] +
            parseInt(x / pixels_per_tile[0])
            ] += dist/1000;
            motion[
                parseInt(y / pixels_per_tile[1]) * tiles_dim[0] +
                parseInt(x / pixels_per_tile[0])
                ] += dist/1000;

        }
    }

    for(let x = 0; x<tiles_dim[1];x++){
        for(let y = 0; y<tiles_dim[0];y++){

            if (motion[x*tiles_dim[0]+y]<0.2){
                color_per_tile[x][y]=current_filter;
            }else{
            
                if (sum_motion[x*tiles_dim[0]+y]>8){
                    randomColor(x,y);
                    sum_motion[x*tiles_dim[0]+y]=0;
                }
            }
        }
    }
    
    dataPrevious = data;
}

//--------------------------------------------------------------------------------------------------------------------------------
// animate tiles
//--------------------------------------------------------------------------------------------------------------------------------
/*for(let x = 0; x<tiles_dim[1];x++){
    for(let y = 0; y<tiles_dim[0];y++){
        setInterval(randomColor, Math.random()*4000+4000, x,y);
    }
}
*/
setInterval(change_filter, 4000);

function change_filter() {
    current_filter++;
    current_filter=current_filter%8;
}

function randomColor(x,y) {
    color_per_tile[x][y]=parseFloat(Math.floor(Math.random() * 7)+1);
}

//--------------------------------------------------------------------------------------------------------------------------------
// animate
//--------------------------------------------------------------------------------------------------------------------------------

startWebcam();

//videoElement.style.display="none";

function animate() {
    
    requestAnimationFrame( animate );
    render();
    detect_motion();
    console.log(motion);
}

animate()