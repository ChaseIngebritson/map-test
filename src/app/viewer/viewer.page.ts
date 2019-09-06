import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import mapboxgl from 'mapbox-gl';
import { Scene, PerspectiveCamera, WebGLRenderer, PlaneGeometry, DoubleSide, MeshBasicMaterial, Mesh, TextureLoader, Texture } from 'three';
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

  async testTerrainRgb() {
    // const worker = new Worker('../workers/build-mesh.worker', { type: 'module' });
    const zoom = 15;

    await this.getUserLocation();

    const tile = await this.getTile(this.currentLocation.latitude, this.currentLocation.longitude, zoom);

    const genLength = 16;
    const genPattern = this.getGenerationPattern(genLength);

    genPattern.forEach(async (offset, index) => {
      const x = tile[0] + offset[0];
      const y = tile[1] - offset[1];

      console.log(`Generating mesh ${index} for tile [${x}, ${y}] at position [${offset[0]}, ${offset[1]}].`);
      const mesh = await this.tileToMesh(x, y, zoom);
      this.scene.add(mesh);

      console.log(`Setting mesh ${index} position to [${offset[0] * 250}, ${offset[1] * 250}].`)
      mesh.position.set(offset[0] * 256, offset[1] * 256, 0);
    });

    this.camera.position.set(128, 128, 500);
    this.controls.update();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.renderer.render(this.scene, this.camera);
  }

  getTile(latitude: number, longitude: number, zoom: number) {
    // [x, y, z]
    return tilebelt.pointToTile(longitude, latitude, zoom);
  }

  async getUserLocation() {
    // Get user location
    return this.geolocation.getCurrentPosition().then((response) => {
      this.currentLocation = response.coords;
    }).catch((error) => {
      console.log('Error getting location', error);
    });
  }

  rgbToHeight(r: number, g: number, b: number) {
    return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
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
  
        resolve(imgData.data);
      };
    });
  }
  
  // https://stackoverflow.com/a/398302/5026438
  getGenerationPattern(length: number) {
    const output: Array<[number, number]> = [];
    let x = 0, y = 0;
    let dx = 0, dy = -1;

    for (let i=0; i < length; i++) {
      output.push([x, y]);

      if (
        (x === y) ||
        ((x < 0) && (x === -y)) ||
        ((x > 0) && (x === 1-y))
      ) {
        let temp = dx;
        dx = -dy;
        dy = temp;
      }

      x += dx;
      y += dy;
    }

    return output;
  }

  async tileToMesh(x: number, y: number, z: number) {

    const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${z}/${x}/${y}.pngraw?access_token=${this.token}`;

    const pixels = await this.getPixels(url);

    const planeSize = Math.sqrt(pixels.length / 4);

    const geometry = new PlaneGeometry(planeSize, planeSize, planeSize - 1, planeSize - 1);

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i + 0];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const height = this.rgbToHeight(r, g, b);

      if (!geometry.vertices[i / 4]) {
        console.error(`No vertices at index ${i / 4} found.`);
        break;
      }
      geometry.vertices[i / 4].z = height;
    }

    geometry.verticesNeedUpdate = true;

    const texture = new TextureLoader().load(url);
    const material = new MeshBasicMaterial({ map: texture, side: DoubleSide, wireframe: true });
    const mesh = new Mesh(geometry, material);

    return mesh;
  }
}
