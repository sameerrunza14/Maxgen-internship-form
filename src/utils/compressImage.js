// Makes a large photo (JPG or PNG) smaller inside the browser, before it is uploaded.
// A phone camera photo is often 2–5 MB; after this it is usually 100–400 KB and still easy to read.

// We try these sizes (longest side, in pixels) and JPEG qualities, from best to smallest,
// and stop at the first result that fits under the limit.
const MAX_SIDES = [1600, 1280, 1024, 800];
const QUALITIES = [0.85, 0.75, 0.65, 0.55];

function loadImage(file) {
  return new Promise(function (resolve, reject) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = function () {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image.'));
    };
    image.src = url;
  });
}

function canvasToJpeg(canvas, quality) {
  return new Promise(function (resolve) {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
}

// "IMG_2041.PNG" -> "IMG_2041.jpg"
function toJpegName(fileName) {
  const dotIndex = fileName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  return baseName + '.jpg';
}

/**
 * Returns a new, smaller JPEG File that is at most `maxBytes`,
 * or null if the photo cannot be made small enough.
 */
export async function compressImage(file, maxBytes) {
  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  for (let i = 0; i < MAX_SIDES.length; i++) {
    const maxSide = MAX_SIDES[i];

    // Keep the shape of the photo; only shrink, never enlarge
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    const longestSide = Math.max(width, height);
    if (longestSide > maxSide) {
      width = Math.round((width * maxSide) / longestSide);
      height = Math.round((height * maxSide) / longestSide);
    }

    canvas.width = width;
    canvas.height = height;
    // White background, so transparent PNG areas do not turn black in the JPEG
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (let j = 0; j < QUALITIES.length; j++) {
      const blob = await canvasToJpeg(canvas, QUALITIES[j]);
      if (blob && blob.size <= maxBytes) {
        return new File([blob], toJpegName(file.name), { type: 'image/jpeg', lastModified: Date.now() });
      }
    }
  }

  return null;
}
