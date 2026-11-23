// PDF helpers that run inside the browser, before upload:
//   1. imagesToPdf  - puts 2 photos (e.g. Aadhaar front + back) on one A4 page as one PDF
//   2. shrinkPdf    - makes a PDF that is too large smaller (each page becomes a compressed picture)
//
// The two libraries (pdf-lib and pdf.js) are big, so they are loaded only when they are needed
// (when a student adds a back side, or uploads a large PDF). The rest of the form stays fast.

import { compressImage } from './compressImage';

// A4 page size in PDF points (1 point = 1/72 inch)
const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const PAGE_MARGIN = 28;
const GAP_BETWEEN_PHOTOS = 18;

// A PDF with more pages than this is not shrunk (Aadhaar, PAN, ID cards have 1–2 pages)
const MAX_PAGES_TO_SHRINK = 6;

// Page picture sizes (longest side, in pixels) and JPEG qualities we try, from best to smallest
const PAGE_SIDES = [1600, 1300, 1100, 900];
const PAGE_QUALITIES = [0.8, 0.7, 0.6, 0.5];

async function loadPdfLib() {
  return import('pdf-lib');
}

// pdf.js (the "legacy" build also works on older phones) and its worker file
async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerModule = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  return pdfjs;
}

// "Aadhaar.pdf" / "IMG_2041.jpg" -> "IMG_2041"
function baseName(fileName) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

function toPdfFile(bytes, fileName) {
  return new File([bytes], fileName, { type: 'application/pdf', lastModified: Date.now() });
}

async function readBytes(file) {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

// Draws one JPEG inside a box on the page, as large as possible without changing its shape, centred
function drawImageInBox(page, image, boxX, boxY, boxWidth, boxHeight) {
  const scale = Math.min(boxWidth / image.width, boxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, {
    x: boxX + (boxWidth - width) / 2,
    y: boxY + (boxHeight - height) / 2,
    width: width,
    height: height,
  });
}

/**
 * Two photos -> one PDF with both on one A4 page (first photo on top, second below).
 * Returns a PDF File of at most maxBytes, or null if it cannot be made that small.
 */
export async function imagesToPdf(photos, maxBytes, fileName) {
  const { PDFDocument } = await loadPdfLib();

  // Each photo gets a little less than half of the size limit (the PDF itself adds a few KB)
  const budgets = [0.46, 0.36, 0.26, 0.18];
  for (let i = 0; i < budgets.length; i++) {
    const budgetPerPhoto = Math.floor((maxBytes * budgets[i]) / photos.length);

    const jpegs = [];
    let canFit = true;
    for (let j = 0; j < photos.length; j++) {
      const small = await compressImage(photos[j], budgetPerPhoto);
      if (!small) {
        canFit = false;
        break;
      }
      jpegs.push(small);
    }
    if (!canFit) {
      continue;
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    const boxWidth = A4_WIDTH - PAGE_MARGIN * 2;
    const boxHeight = (A4_HEIGHT - PAGE_MARGIN * 2 - GAP_BETWEEN_PHOTOS * (jpegs.length - 1)) / jpegs.length;

    for (let j = 0; j < jpegs.length; j++) {
      const image = await pdf.embedJpg(await readBytes(jpegs[j]));
      // PDF pages count from the bottom, so the first photo gets the highest box
      const boxY = A4_HEIGHT - PAGE_MARGIN - boxHeight * (j + 1) - GAP_BETWEEN_PHOTOS * j;
      drawImageInBox(page, image, PAGE_MARGIN, boxY, boxWidth, boxHeight);
    }

    const bytes = await pdf.save();
    if (bytes.length <= maxBytes) {
      return toPdfFile(bytes, fileName);
    }
  }
  return null;
}

// Renders every page of an opened pdf.js document as a JPEG (longest side maxSide pixels)
async function renderPagesAsJpegs(pdfDocument, maxSide, quality) {
  const pages = [];
  for (let number = 1; number <= pdfDocument.numPages; number++) {
    const page = await pdfDocument.getPage(number);
    const pointSize = page.getViewport({ scale: 1 });
    const scale = maxSide / Math.max(pointSize.width, pointSize.height);
    const viewport = page.getViewport({ scale: scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext('2d');
    // White background (some PDFs have transparent pages)
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, canvas: canvas, viewport: viewport }).promise;

    const blob = await new Promise(function (resolve) {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    // Give the page's memory back to the phone straight away
    canvas.width = 0;
    canvas.height = 0;
    if (!blob) {
      throw new Error('Could not read this PDF.');
    }
    pages.push({
      bytes: new Uint8Array(await blob.arrayBuffer()),
      // Keep the original page size, so the new PDF looks the same
      widthPoints: pointSize.width,
      heightPoints: pointSize.height,
    });
    page.cleanup();
  }
  return pages;
}

/**
 * Makes a large PDF smaller. Returns
 *   { file }            a PDF File of at most maxBytes
 *   { error: 'message' } when it cannot be done (password protected, too many pages, still too big)
 */
export async function shrinkPdf(file, maxBytes) {
  let pdfjs;
  let PDFDocument;
  try {
    pdfjs = await loadPdfJs();
    PDFDocument = (await loadPdfLib()).PDFDocument;
  } catch {
    return { error: 'Could not prepare the PDF. Please check your internet connection and try again.' };
  }

  let source;
  const loadingTask = pdfjs.getDocument({ data: await readBytes(file) });
  try {
    source = await loadingTask.promise;
  } catch (error) {
    if (error && error.name === 'PasswordException') {
      return { error: 'This PDF is password protected. Please upload a PDF without a password, or a photo.' };
    }
    return { error: 'This PDF could not be opened. Please upload another PDF or a photo.' };
  }

  // Step 1: save the same PDF again in a more compact way (fonts, text and quality stay the same,
  // the text stays selectable). Often enough for a resume made in Word / Canva.
  try {
    const compact = await PDFDocument.load(await readBytes(file), { ignoreEncryption: true, updateMetadata: false });
    // A PDF with restrictions (owner password) would be damaged by saving it again this way: skip it
    const compactBytes = compact.isEncrypted ? null : await compact.save({ useObjectStreams: true });
    if (compactBytes && compactBytes.length <= maxBytes) {
      loadingTask.destroy();
      return { file: toPdfFile(compactBytes, baseName(file.name) + '.pdf') };
    }
  } catch {
    // could not re-save it this way: go on with step 2
  }

  // Step 2: every page becomes a compressed picture (always works, but the text is no longer selectable)
  try {
    if (source.numPages > MAX_PAGES_TO_SHRINK) {
      return {
        error: 'This PDF has ' + source.numPages + ' pages and is too large. Please upload only the needed pages, or a photo.',
      };
    }

    for (let i = 0; i < PAGE_SIDES.length; i++) {
      for (let j = 0; j < PAGE_QUALITIES.length; j++) {
        const pages = await renderPagesAsJpegs(source, PAGE_SIDES[i], PAGE_QUALITIES[j]);

        const pdf = await PDFDocument.create();
        for (let k = 0; k < pages.length; k++) {
          const image = await pdf.embedJpg(pages[k].bytes);
          const page = pdf.addPage([pages[k].widthPoints, pages[k].heightPoints]);
          page.drawImage(image, { x: 0, y: 0, width: pages[k].widthPoints, height: pages[k].heightPoints });
        }
        const bytes = await pdf.save();
        if (bytes.length <= maxBytes) {
          return { file: toPdfFile(bytes, baseName(file.name) + '.pdf') };
        }
        // Far too big at this size? Skip the other qualities and try a smaller size straight away
        if (bytes.length > maxBytes * 2) {
          break;
        }
      }
    }
  } catch {
    return { error: 'This PDF could not be made smaller. Please upload a photo of the document instead.' };
  } finally {
    // Frees the memory pdf.js used for this file
    loadingTask.destroy();
  }

  return { error: 'This PDF could not be made small enough. Please upload a photo of the document instead.' };
}
