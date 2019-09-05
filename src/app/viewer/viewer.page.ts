import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import mapboxgl from 'mapbox-gl';
import { Scene, PerspectiveCamera, WebGLRenderer, Vector3 } from 'three';
import OrbitControls from 'three-orbitcontrols';
import tilebelt from '@mapbox/tilebelt';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.page.html',
  styleUrls: ['./viewer.page.scss'],
})
export class ViewerPage implements OnInit {

  token = 'pk.eyJ1IjoiZ29tb25rZXlhbWFuZ28iLCJhIjoiY2pneHgwOTNtMXA1eTMzcGd1eHVtMXYxeiJ9.ERQfx8U8kHKB8adxfGkMGA';
  scene: Scene;
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  @ViewChild('rendererContainer', { static: true }) rendererContainer: ElementRef;
  currentLocation: { latitude: number, longitude: number };

  constructor(private geolocation: Geolocation) {}

  ngOnInit() {
    mapboxgl.accessToken = this.token;

    // Initialize Three constants
    const width = window.innerWidth;
    const height = window.innerHeight;
    const viewAngle = 45;
    const nearClipping = 0.1;
    const farClipping = 9999;

    // Setup Three scene
    this.scene = new Scene();
    this.renderer = new WebGLRenderer();
    this.camera = new PerspectiveCamera(viewAngle, width / height, nearClipping, farClipping);
    this.renderer.setSize(width, height);
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Begin animation
    this.animate();

    // Test with the users current location
    this.testTerrainRgb();
  }

  getTile(latitude: number, longitude: number, zoom: number) {
    return tilebelt.pointToTile(longitude, latitude, zoom);
  }

  async testTerrainRgb() {
    // const worker = new Worker('./workers/build-mesh.worker', { type: 'module' });
    const worker = new Worker('./workers/test.worker', { type: 'module' });

    await this.getUserLocation();

    const tile = await this.getTile(this.currentLocation.latitude, this.currentLocation.longitude, 15);

    console.log(tile);

    worker.onmessage = ({ data }) => {
      console.log(data);
    };

    worker.postMessage('test');

    // MAKE CALL TO WORKER TO GET MESH HERE

    // this.scene.add(mesh);

    // this.scene.updateMatrixWorld(true);
    // const position = new Vector3();
    // position.setFromMatrixPosition(mesh.matrixWorld);

    // this.camera.position.set(position.x, position.y, 500);
    // this.controls.update();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.renderer.render(this.scene, this.camera);
  }

  async getUserLocation() {
    // Get user location
    return this.geolocation.getCurrentPosition().then((response) => {
      this.currentLocation = response.coords;
    }).catch((error) => {
      console.log('Error getting location', error);
    });
  }
}
