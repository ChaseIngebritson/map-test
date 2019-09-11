/// <reference lib="webworker" />

addEventListener('message', async ({ data }) => {
  const command = data.command;

  switch(command) {
    case 'getTileHeights':
      const x = data.x;
      const y = data.y;
      const z = data.z;
      const offset = data.offset;
      const pixels = data.pixels;
      
      const heights = await getTileHeights(pixels);
      postMessage({ 
        command: 'getTileHeights',
        heights, x, y, z, offset 
      });

      break;
    case 'setGeometryHeights':
      
      break;
  }
});

function rgbToHeight(r: number, g: number, b: number) {
  return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
}

async function getTileHeights(pixels: Uint8ClampedArray) {
  const output = [];

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i + 0];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const height = rgbToHeight(r, g, b);
    output.push(height);
  }

  return output;
}
