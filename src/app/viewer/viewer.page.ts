import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import mapboxgl from 'mapbox-gl';
import { Scene, PerspectiveCamera, PlaneGeometry, WebGLRenderer, DoubleSide, MeshBasicMaterial, Mesh, Vector3, TextureLoader } from 'three';
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

  rgbToHeight(r: number, g: number, b: number) {
    return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
  }

  getTileUrl(latitude: number, longitude: number, zoom: number) {
    let [x, y, z] = tilebelt.pointToTile(longitude, latitude, zoom)
    return `https://api.mapbox.com/v4/mapbox.terrain-rgb/${z}/${x}/${y}.pngraw?access_token=${this.token}`;
  }

  getPixels(url: string): Promise<Uint8ClampedArray> {
    return new Promise ((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
  
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src =  url;
  
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.width;
    
        context.drawImage(img, 0, 0, img.width, img.width);
    
        const imgData = context.getImageData(0, 0, img.width, img.height);

        resolve(imgData.data)
      }
    });
  }

  async testTerrainRgb() {
    await this.getUserLocation();

    const tileUrl = await this.getTileUrl(this.currentLocation.latitude, this.currentLocation.longitude, 15);
    const pixels = await this.getPixels(tileUrl);

    const planeSize = Math.sqrt(pixels.length / 4);

    const geometry = new PlaneGeometry(planeSize, planeSize, planeSize - 1, planeSize - 1);

    for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i + 0];
      let g = pixels[i + 1];
      let b = pixels[i + 2];

      const height = this.rgbToHeight(r, g, b);

      if (!geometry.vertices[i/4]) {
        console.error(`No vertices at index ${i/4} found.`);
        break;
      }
      geometry.vertices[i/4].z = height;
    }
    
    geometry.verticesNeedUpdate = true;
    
    const texture = new TextureLoader().load(tileUrl);
    const material = new MeshBasicMaterial({ map: texture, side: DoubleSide, wireframe: true });
    const mesh = new Mesh(geometry, material);

    this.scene.add(mesh);

    this.scene.updateMatrixWorld(true);
    const position = new Vector3();
    position.setFromMatrixPosition(mesh.matrixWorld);

    this.camera.position.set(position.x, position.y, 500)
    this.controls.update();
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
