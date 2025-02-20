/*
Copyright 2019 GEOSIRIS

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

import { createCube, centerCamera, getPointRayIntersection, createSphere } from './utils.js';
import { GeoObject, GeoScene, GeoSceneUi } from './geoScene.js';

// Loaders
import { OffLoader } from './loaders/offLoader.js';
import { ObjLoader } from './loaders/objLoader.js';
import { XYZLoader } from './loaders/xyzLoader.js';
import { MeshLoader } from './loaders/meshLoader.js';
import { PolylineLoader } from './loaders/polylineLoader.js';

export function fun_import_surface(
  geotjs,
  data,
  fileType,
  type=null,
  uuid=null,
  title=null,
  pointColor=null,
  lineColor=null,
  faceColor=null,
  epsgCode=null,
){
    var name = fileType;
    if(type != null && uuid != null && title != null){
      name = type + "_" + uuid + "[" + title + "]";
    }

    if(fileType.endsWith("off")){
        console.log("reading off");
        geotjs.geoScene.addObject(new GeoObject(new OffLoader(data), name, pointColor, lineColor, faceColor, epsgCode));
    }else if(fileType.endsWith("xyz")){
        console.log("reading xyz");
        geotjs.geoScene.addObject(new GeoObject(new XYZLoader(data), name, pointColor, lineColor, faceColor, epsgCode));
    }else if(fileType.endsWith("mesh")){
        console.log("reading mesh");
        geotjs.geoScene.addObject(new GeoObject(new MeshLoader(data), name, pointColor, lineColor, faceColor, epsgCode));
    }else if(fileType.endsWith("polyline")){
        console.log("reading polyline");
        geotjs.geoScene.addObject(new GeoObject(new PolylineLoader(data), name, pointColor, lineColor, faceColor, epsgCode));
    }else{
        console.log("reading obj");
        geotjs.geoScene.addObject(new GeoObject(new ObjLoader(data), name, pointColor, lineColor, faceColor, epsgCode));
    }
    geotjs.animate();
}

function blinkObject(geoScene, obj, nbLoop=6, timeMS=300){
    const const_scene = geoScene;

    for (var i = 0; i < nbLoop; i++) {
        setTimeout(function () {
            obj.material.color = new THREE.Color(obj.material.color.getHex() ^ 0xFFFFFF);
            const_scene.animate();
        }, ( 2 * i) * timeMS);
        setTimeout(function () {
            obj.material.color = new THREE.Color(obj.material.color.getHex() ^ 0xFFFFFF);
            const_scene.animate();
        }, ( 2 * i + 1) * timeMS);
    }
}


export class GeoThreeJS{

    constructor(width, height, createSceneUi=true){
        this.width = width;
        this.height = height;
        this.createSceneUi = createSceneUi;
        this.DO_ANIMATE = true;

        this.scene = new THREE.Scene();

        this.canvasElt = document.createElement("div");

        this.isAnimated = false;

        this.domElt = document.createElement("div");
        this.domElt.appendChild(this.canvasElt);

        if(this.createSceneUi){
            this.canvasElt.className = "geothreejs-canvas";
            var threeJSLabel = document.createElement("a");
            threeJSLabel.href = "https://threejs.org/";
            threeJSLabel.className = "geothreejs-canvas-label";
            threeJSLabel.appendChild(document.createTextNode("ThreeJS view"));
            this.canvasElt.appendChild(threeJSLabel);

            this.sceneUIElt = document.createElement("div");
            this.sceneUIElt.className = "geothreejs-scene-ui";
            this.domElt.appendChild(this.sceneUIElt);
        }else{
            this.canvasElt.className = "geothreejs-canvas-no-ui";
        }
        
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        this.geoScene = null;
        this.geoUi = null;

        // createView function must be called after to have the UI
    }

    setupCamera(up = [0,0,1]){
        if( this.camera ){ // removing old cam from the scene
            this.scene.remove(this.camera);
        }
        this.camera = new THREE.PerspectiveCamera( 75, this.width / this.height, 0.2, 50000 );
        this.camera.position.set( 0, -30, 50 );
        this.camera.up.set( up[0], up[1], up[2] );
        this.camera.lookAt( 0, 0, 10 );
        this.scene.add(this.camera);
    }

    setupRenderer(){
        const const_this = this;

        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.renderer.setSize( this.width, this.height );
        this.canvasElt.appendChild(this.renderer.domElement);
        console.log(const_this.scene);

        this.raycaster = new THREE.Raycaster();
        this.renderer.domElement.addEventListener("dblclick", function(event){
            var mouse = new THREE.Vector2();
            //mouse.x = ( event.clientX / const_this.canvasElt.innerWidth ) * 2 - 1;
            //mouse.y = - ( event.clientY / const_this.canvasElt.innerHeight ) * 2 + 1;
            /*mouse.x =   ( ( event.clientX - const_this.renderer.domElement.offsetLeft ) / const_this.renderer.domElement.width )  * 2 - 1;
            mouse.y = - ( ( event.clientY - const_this.renderer.domElement.offsetTop  ) / const_this.renderer.domElement.height) * 2 + 1;*/
            mouse.x =  (event.clientX / const_this.renderer.domElement.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / const_this.renderer.domElement.clientHeight) * 2 + 1;

            const_this.raycaster.setFromCamera(mouse, const_this.camera);
            var intersects = const_this.raycaster.intersectObjects(const_this.scene.children, true); //array
            if (intersects.length > 0) {
                const_this.createTemporaryPoint(intersects[0].point.x, intersects[0].point.y, intersects[0].point.z);
                // var selectedObject = intersects[0];
                console.log(intersects);
            }
        }, true);
        
    }

    createTemporaryPoint(x, y, z, size=1){
        const const_this = this;
        const geometry = new THREE.SphereGeometry( size, 9, 5 ); 
        const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } ); 
        const sphere = new THREE.Mesh( geometry, material );
        sphere.translateX(x);
        sphere.translateY(y);
        sphere.translateZ(z);

        this.scene.add( sphere );
        blinkObject(const_this, sphere);
        setTimeout(function () {
            const_this.scene.remove( sphere );
            const_this.animate();
        }, 6000);

    }

    setupControls(){
        if(this.controls != null)
            this.controls.dispose();
        //this.controls = new TrackballControls(this.camera, this.renderer.domElement);
        this.controls = new OrbitControls (this.camera, this.renderer.domElement);
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        }
        this.controls.update();
    }

    animate(){
        this.isAnimated = true;
        const const_this = this;
        try{
            requestAnimationFrame( () => const_this.animate() );
            this.controls.update();
            if(this.DO_ANIMATE){
                this.renderer.render( this.scene, this.camera );
            }
        }catch(Exception){console.log(Exception)}
    }

    createView(parent){
        const const_this = this;
        parent.appendChild(this.domElt);
        this.setupCamera();
        this.setupRenderer();
        this.setupControls();

        if(this.createSceneUi){
            this.geoScene = new GeoScene(this.scene, this.controls, this);
            this.geoUi = new GeoSceneUi(this.geoScene, this.sceneUIElt);
            this.sceneUIElt.addEventListener(GeoScene.EVT_RESET_CONTROLS, (e) => {
                const_this.setupControls();
            });
        }

        
        return this.domElt;
    }

    importSurface(
      data,
      fileType,
      type=null,
      uuid=null,
      title=null,
      pointColor=null,
      lineColor=null,
      faceColor=null,
      epsgCode=null){
        fun_import_surface(this, data, fileType, type, uuid, title, pointColor, lineColor, faceColor, epsgCode);
    }
}