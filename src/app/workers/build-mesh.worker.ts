/// <reference lib="webworker" />

import { PlaneGeometry, DoubleSide, MeshBasicMaterial, Mesh, TextureLoader } from 'three';

addEventListener('message', async ({ data }) => {
  console.log('Message recieved');

  const x = data.x;
  const y = data.y;
  const z = data.z;

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

  postMessage(mesh);
});

function rgbToHeight(r, g, b) {
  return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
}

function getPixels(url) {
  return new Promise ((resolve, reject) => {
    const canvas = new OffscreenCanvas(250, 250);
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

