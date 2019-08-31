import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import mapboxgl from 'mapbox-gl';
import { Scene, PerspectiveCamera, PlaneGeometry, WebGLRenderer } from 'three';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.page.html',
  styleUrls: ['./viewer.page.scss'],
})
export class ViewerPage implements OnInit {

  token = 'pk.eyJ1IjoiZ29tb25rZXlhbWFuZ28iLCJhIjoiY2pneHgwOTNtMXA1eTMzcGd1eHVtMXYxeiJ9.ERQfx8U8kHKB8adxfGkMGA';
  map: any;
  scene: Scene;
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  @ViewChild('rendererContainer', { static: true }) rendererContainer: ElementRef;
  currentLocation: { latitude: number, longitude: number };

  constructor(private http: HttpClient, private geolocation: Geolocation) {}

  ngOnInit() {
    mapboxgl.accessToken = this.token;
    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v9'
    });

    this.map.on('load', () => {
      this.map.addSource('dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.terrain-rgb'
      });
    });

    // Initialize Three constants
    /*
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

    // Begin animation
    this.animate();
    */

    // Test with the users current location
    this.testTerrainRgb();
  }

  rgbToHeight(r: number, g: number, b: number) {
    return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
  }

  async getTerrainRgb(latitude: number, longitude: number, zoom: number) {
    const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${latitude}/${longitude}.pngraw?access_token=${this.token}`;
    return this.http.get(url).toPromise();
  }

  async testTerrainRgb() {
    await this.getUserLocation();

    const rgb = await this.getTerrainRgb(this.currentLocation.latitude, this.currentLocation.longitude, 15);
    console.log(rgb);
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
