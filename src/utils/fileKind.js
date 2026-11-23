// Finds out what a file REALLY is by reading its first bytes.
// We cannot trust the file name or the type the phone gives us:
// - WhatsApp / Google Photos / Drive sometimes give an empty type
// - an iPhone photo can be HEIC even when it is named .jpg
// - a WhatsApp photo can be WEBP inside

// Returns one of: 'pdf', 'jpeg', 'png', 'webp', 'heic', 'gif', 'bmp', 'avif', 'other',
// or null when the file could not be read at all.
export async function detectFileKind(file) {
  let bytes = null;
  try {
    const buffer = await file.slice(0, 32).arrayBuffer();
    bytes = new Uint8Array(buffer);
  } catch {
    return null;
  }
  if (bytes.length < 4) {
    return 'other';
  }

  // Text of some bytes, e.g. textAt(4, 4) -> 'ftyp'
  function textAt(start, length) {
    let text = '';
    for (let i = start; i < start + length && i < bytes.length; i++) {
      text = text + String.fromCharCode(bytes[i]);
    }
    return text;
  }

  // A PDF starts with %PDF (some have a few junk bytes before it)
  for (let i = 0; i < 16 && i + 4 <= bytes.length; i++) {
    if (textAt(i, 4) === '%PDF') {
      return 'pdf';
    }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  if (bytes[0] === 0x89 && textAt(1, 3) === 'PNG') {
    return 'png';
  }
  if (textAt(0, 4) === 'RIFF' && textAt(8, 4) === 'WEBP') {
    return 'webp';
  }
  if (textAt(0, 3) === 'GIF') {
    return 'gif';
  }
  if (textAt(0, 2) === 'BM') {
    return 'bmp';
  }
  if (textAt(4, 4) === 'ftyp') {
    const brand = textAt(8, 4);
    if (brand === 'avif' || brand === 'avis') {
      return 'avif';
    }
    if (brand === 'heic' || brand === 'heix' || brand === 'heif' || brand === 'mif1' || brand === 'msf1' || brand === 'hevc') {
      return 'heic';
    }
  }
  return 'other';
}

// Is this kind a photo?
export function isPhotoKind(kind) {
  return kind === 'jpeg' || kind === 'png' || kind === 'webp' || kind === 'heic' || kind === 'gif' || kind === 'bmp' || kind === 'avif';
}

// A name the student understands, for error messages
export function kindLabel(kind) {
  if (kind === 'pdf') return 'PDF';
  if (kind === 'jpeg') return 'JPG photo';
  if (kind === 'png') return 'PNG photo';
  if (kind === 'webp') return 'WEBP photo';
  if (kind === 'heic') return 'HEIC photo (iPhone format)';
  if (kind === 'gif') return 'GIF image';
  if (kind === 'bmp') return 'BMP image';
  if (kind === 'avif') return 'AVIF photo';
  return 'file';
}

// "Resume.docx" -> "a Word file", used when the file is not a photo or a PDF
export function describeOtherFile(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'a Word file';
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return 'an Excel file';
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'a PowerPoint file';
  if (name.endsWith('.zip') || name.endsWith('.rar')) return 'a ZIP file';
  if (name.endsWith('.txt')) return 'a text file';
  if (name.endsWith('.mp4') || name.endsWith('.mov')) return 'a video';
  return 'a file type we cannot accept';
}

// Same file, with the right name ending and type (the server checks both).
// "IMG-2041" (type '') -> "IMG-2041.jpg" (image/jpeg)
export function withCorrectType(file, kind) {
  let type = '';
  let ending = '';
  if (kind === 'pdf') {
    type = 'application/pdf';
    ending = '.pdf';
  } else if (kind === 'jpeg') {
    type = 'image/jpeg';
    ending = '.jpg';
  } else if (kind === 'png') {
    type = 'image/png';
    ending = '.png';
  } else {
    return file;
  }

  const name = file.name || 'document';
  const lowerName = name.toLowerCase();
  let nameIsRight = lowerName.endsWith(ending);
  if (kind === 'jpeg' && lowerName.endsWith('.jpeg')) {
    nameIsRight = true;
  }
  if (nameIsRight && file.type === type) {
    return file;
  }
  let newName = name;
  if (!nameIsRight) {
    const dotIndex = name.lastIndexOf('.');
    const baseName = dotIndex > 0 ? name.slice(0, dotIndex) : name;
    newName = baseName + ending;
  }
  return new File([file], newName, { type: type, lastModified: file.lastModified || Date.now() });
}
