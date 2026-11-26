import { useEffect, useRef, useState } from 'react';
import { FieldError } from './Field';
import { checkFileSize } from '../../utils/validation';
import { compressImage } from '../../utils/compressImage';
import { imagesToPdf, shrinkPdf } from '../../utils/pdfTools';
import { markPickingFile, clearPickingFile } from '../../utils/fileDraft';
import { detectFileKind, isPhotoKind, kindLabel, describeOtherFile, withCorrectType } from '../../utils/fileKind';

function isImageFile(file) {
  return file.type === 'image/jpeg' || file.type === 'image/png';
}

// Phones (Android Chrome especially) do not give the form the file itself, only a link to it.
// When Submit is pressed minutes later, the phone sometimes refuses to read it again
// (file from Google Photos, Drive or WhatsApp) and the upload fails as if there were no internet.
// So we read the whole file once, right when it is chosen, and keep that copy.
// Works the same for a file from the gallery, camera, WhatsApp, Google Drive or Files.

// Older way of reading a file (some phones / browsers only allow this one)
function readWithFileReader(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () {
      resolve(reader.result);
    };
    reader.onerror = function () {
      reject(reader.error);
    };
    reader.readAsArrayBuffer(file);
  });
}

// Returns the copy, or null if the file could not be read at all (tried 3 times, 2 ways)
async function copyIntoMemory(file) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const bytes = attempt === 1 ? await file.arrayBuffer() : await readWithFileReader(file);
      if (bytes && bytes.byteLength > 0) {
        return new File([bytes], file.name, { type: file.type, lastModified: file.lastModified || Date.now() });
      }
    } catch {
      // try again in a moment (cloud files sometimes need a second to arrive)
    }
    await new Promise(function (resolve) {
      setTimeout(resolve, 600);
    });
  }
  return null;
}

const CANNOT_READ_MESSAGE = 'This file could not be opened. Please tap to choose it again.';
const HEIC_MESSAGE =
  'This photo is in HEIC format (iPhone), which cannot be opened here. Please take a screenshot of the photo and upload the screenshot.';
const CANNOT_OPEN_PHOTO_MESSAGE =
  'This photo could not be opened. Please take a screenshot of it and upload the screenshot, or choose another photo.';

// "Aadhaar Card / PAN Card" -> "Aadhaar Card - PAN Card (front and back).pdf"
function combinedFileName(label) {
  return label.replace(/[^A-Za-z0-9 ]/g, '-').replace(/\s+/g, ' ').trim() + ' (front and back).pdf';
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// A phone or tablet (touch screen without a mouse).
// On these we show Gallery / Camera / PDF buttons, because Android opens a different picker for each:
// - accept="image/*" only            -> the Photos / Gallery picker (WhatsApp photos are there too)
// - accept="image/*" + capture       -> the camera
// - accept="application/pdf" only    -> the Files app
// One input that accepts photos AND PDFs makes Android show only "Camera" and "Files" (no Gallery).
function isTouchPhone() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches;
}

function GalleryIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M21 16l-5.2-5.2a1.5 1.5 0 00-2.1 0L5 19.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path
        d="M4 8.5A2.5 2.5 0 016.5 6h1.3l1.2-1.8A1.5 1.5 0 0110.3 3.5h3.4a1.5 1.5 0 011.3.7L16.2 6h1.3A2.5 2.5 0 0120 8.5v8a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5v-8z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.3" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M14 3.5H7.5A2 2 0 005.5 5.5v13a2 2 0 002 2h9a2 2 0 002-2V8l-4.5-4.5z" strokeLinejoin="round" />
      <path d="M14 3.5V8h4.5M9 13h6M9 16.5h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function PdfBadge() {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-[11px] font-bold tracking-wide text-accent-600 ring-1 ring-accent-100">
      PDF
    </div>
  );
}

/**
 * Drag & drop upload box for one document.
 * `file` is the selected File (or null). onSelect(name, file) / onRemove(name) update the parent.
 *
 * config.twoPhotos: the student can give a front and a back photo (select both together, or add the back
 *                   later). Both are joined into one PDF.
 * config.shrinkPdf: a PDF above the size limit is made smaller in the browser.
 */
export function FileUpload({ config, file, error, onSelect, onRemove, onError }) {
  const inputRef = useRef(null);
  const backInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const backCameraInputRef = useRef(null);
  const boxRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPhone] = useState(isTouchPhone);
  const [showReplaceOptions, setShowReplaceOptions] = useState(false); // phone: Gallery / Camera / PDF under the file
  const [previewUrl, setPreviewUrl] = useState('');
  const [processingText, setProcessingText] = useState(''); // e.g. 'Making your photo smaller…' while busy
  const [readyText, setReadyText] = useState(''); // e.g. 'Resized from 3.2 MB to 310 KB' after we changed the file
  const isProcessing = processingText !== '';

  // Create a preview for image files and clean it up afterwards
  useEffect(
    function () {
      if (!file || !file.type.startsWith('image/')) {
        setPreviewUrl('');
        return undefined;
      }
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return function () {
        URL.revokeObjectURL(url);
      };
    },
    [file]
  );

  // Shows a red message under this document and brings it into view
  // (on a phone the page may have moved while the file picker was open).
  function showError(message) {
    setProcessingText('');
    let fullMessage = message;
    if (file) {
      fullMessage = 'The new file was not added. ' + message;
    }
    onError(config.name, fullMessage);
    setTimeout(function () {
      if (boxRef.current && boxRef.current.scrollIntoView) {
        boxRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }

  // Checks that the chosen file is allowed for this document.
  // Returns an error message, or '' when it is fine.
  function checkKind(kind, chosenFile) {
    const allowsPdf = config.allowedTypes.includes('application/pdf');
    const allowsPhoto = config.allowedTypes.includes('image/jpeg');
    if (kind === 'pdf' && !allowsPdf) {
      return 'You chose a PDF. ' + config.label + ' must be a photo (' + config.allowedLabel + ').';
    }
    if (isPhotoKind(kind) && !allowsPhoto) {
      return (
        'You chose a ' + kindLabel(kind) + '. ' + config.label + ' must be a PDF file. ' +
        'Tip: save your resume as PDF from Word / Google Docs, or use a free "image to PDF" app.'
      );
    }
    if (kind === 'other') {
      return 'You chose ' + describeOtherFile(chosenFile) + '. Please upload a ' + config.allowedLabel + ' file.';
    }
    return '';
  }

  // Front + back photos -> one PDF.
  // The photos are read and made smaller right now (no extra full-size copy: that saves phone memory).
  async function joinPhotos(front, back) {
    const maxBytes = config.maxSizeKB * 1024;
    setProcessingText('Joining front and back into one PDF…');
    let pdfFile = null;
    try {
      pdfFile = await imagesToPdf([front, back], maxBytes, combinedFileName(config.label));
    } catch {
      // The phone did not give us the photos the first time: read them once more and try again
      const frontCopy = await copyIntoMemory(front);
      const backCopy = await copyIntoMemory(back);
      if (frontCopy && backCopy) {
        try {
          pdfFile = await imagesToPdf([frontCopy, backCopy], maxBytes, combinedFileName(config.label));
        } catch {
          pdfFile = null;
        }
      }
    }
    setProcessingText('');
    if (!pdfFile) {
      showError(
        'These photos could not be joined into one PDF. Please try other photos, or take a screenshot of each photo and upload the screenshots.'
      );
      return;
    }
    setReadyText('Front and back joined into one PDF, ' + formatSize(pdfFile.size) + ', ready');
    onSelect(config.name, pdfFile);
  }

  // A photo in another format (WEBP, HEIC, …) or one that is too big becomes a JPG under the size limit
  async function makePhotoReady(photo, kind) {
    const maxBytes = config.maxSizeKB * 1024;
    const isPlainPhoto = kind === 'jpeg' || kind === 'png';
    setProcessingText(isPlainPhoto ? 'Making your photo smaller…' : 'Changing your photo to JPG…');

    let smallerFile = null;
    let couldOpen = true;
    try {
      smallerFile = await compressImage(photo, maxBytes);
    } catch {
      // The phone did not give us the photo the first time: read it once more and try again
      const copy = await copyIntoMemory(photo);
      if (copy) {
        try {
          smallerFile = await compressImage(copy, maxBytes);
        } catch {
          couldOpen = false;
        }
      } else {
        couldOpen = false;
      }
    }
    setProcessingText('');

    if (!couldOpen) {
      if (kind === 'heic') {
        const pdfTip = config.allowedTypes.includes('application/pdf') ? ' You can also upload it as a PDF.' : '';
        showError(HEIC_MESSAGE + pdfTip);
      } else {
        showError(CANNOT_OPEN_PHOTO_MESSAGE);
      }
      return;
    }
    if (!smallerFile) {
      showError('This photo could not be made smaller than ' + config.maxSizeKB + ' KB. Please try another photo.');
      return;
    }
    if (isPlainPhoto) {
      setReadyText('Resized from ' + formatSize(photo.size) + ' to ' + formatSize(smallerFile.size) + ', ready');
    } else {
      setReadyText('Changed from ' + kindLabel(kind) + ' to JPG, ' + formatSize(smallerFile.size) + ', ready');
    }
    onSelect(config.name, smallerFile);
  }

  async function handleFile(chosenFile) {
    if (!chosenFile) {
      return;
    }
    // What is this file really? (the name and the type from the phone can be wrong)
    const kind = await detectFileKind(chosenFile);
    if (kind === null) {
      showError(CANNOT_READ_MESSAGE);
      return;
    }
    const kindError = checkKind(kind, chosenFile);
    if (kindError) {
      showError(kindError);
      return;
    }
    const maxBytes = config.maxSizeKB * 1024;

    // ----- Photo -----
    if (isPhotoKind(kind)) {
      const isPlainPhoto = kind === 'jpeg' || kind === 'png';
      if (!isPlainPhoto || chosenFile.size > maxBytes) {
        // Read and changed right now, so no extra full-size copy is needed
        // (a full-size copy of a big camera photo can use up the memory of a low-end phone).
        await makePhotoReady(chosenFile, kind);
        return;
      }
      // Small JPG / PNG: keep a copy, so the phone does not have to give it again at Submit
      const photoCopy = await copyIntoMemory(chosenFile);
      if (!photoCopy) {
        showError(CANNOT_READ_MESSAGE);
        return;
      }
      setReadyText('');
      onSelect(config.name, withCorrectType(photoCopy, kind));
      return;
    }

    // ----- PDF -----
    if (chosenFile.size > maxBytes && config.shrinkPdf) {
      setProcessingText('Making your PDF smaller…');
      let result;
      try {
        result = await shrinkPdf(withCorrectType(chosenFile, 'pdf'), maxBytes);
      } catch {
        result = { error: 'This PDF could not be made smaller. Please upload a photo of the document instead.' };
      }
      setProcessingText('');

      if (result.error) {
        showError(result.error);
        return;
      }
      setReadyText('Made smaller from ' + formatSize(chosenFile.size) + ' to ' + formatSize(result.file.size) + ', ready');
      onSelect(config.name, result.file);
      return;
    }

    const pdfCopy = await copyIntoMemory(chosenFile);
    if (!pdfCopy) {
      showError(CANNOT_READ_MESSAGE);
      return;
    }
    const sizeError = checkFileSize(pdfCopy, config);
    if (sizeError) {
      showError(sizeError);
      return;
    }
    setReadyText('');
    onSelect(config.name, withCorrectType(pdfCopy, 'pdf'));
  }

  // One file, or (for twoPhotos) two photos: front and back
  async function handleFiles(fileList) {
    const chosen = Array.from(fileList || []);
    if (chosen.length === 0) {
      return;
    }
    if (chosen.length === 1 || !config.twoPhotos) {
      handleFile(chosen[0]);
      return;
    }
    if (chosen.length > 2) {
      showError('Please select only 2 photos: the front and the back.');
      return;
    }
    const frontKind = await detectFileKind(chosen[0]);
    const backKind = await detectFileKind(chosen[1]);
    if (frontKind === null || backKind === null) {
      showError(CANNOT_READ_MESSAGE);
      return;
    }
    if (!isPhotoKind(frontKind) || !isPhotoKind(backKind)) {
      showError('To upload two files, select 2 photos: the front and the back. Or upload one PDF.');
      return;
    }
    if (frontKind === 'heic' || backKind === 'heic') {
      showError(HEIC_MESSAGE);
      return;
    }
    joinPhotos(chosen[0], chosen[1]);
  }

  function handleInputChange(event) {
    clearPickingFile();
    setShowReplaceOptions(false);
    handleFiles(event.target.files);
    // Reset so selecting the same file again still triggers onChange
    event.target.value = '';
  }

  // "Add back side": the photo already chosen is the front
  async function handleBackInputChange(event) {
    clearPickingFile();
    const back = event.target.files[0];
    event.target.value = '';
    if (!back || !file) {
      return;
    }
    const backKind = await detectFileKind(back);
    if (backKind === null) {
      showError(CANNOT_READ_MESSAGE);
      return;
    }
    if (!isPhotoKind(backKind)) {
      showError('Please choose a photo of the back side.');
      return;
    }
    if (backKind === 'heic') {
      showError(HEIC_MESSAGE);
      return;
    }
    joinPhotos(file, back);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  function openPicker() {
    inputRef.current.click();
  }

  function openInput(ref) {
    if (ref.current) {
      ref.current.click();
    }
  }

  const inputId = 'file-' + config.name;
  const allowsPhoto = config.allowedTypes.includes('image/jpeg');
  const allowsPdf = config.allowedTypes.includes('application/pdf');
  // Phone + this document takes photos: show Gallery / Camera (/ PDF) buttons instead of one picker
  const showPhoneChoices = isPhone && allowsPhoto;

  // The Gallery / Camera / PDF buttons (phone only)
  function renderPhoneChoices() {
    const buttons = [
      {
        key: 'gallery',
        label: 'Gallery',
        hint: config.twoPhotos ? 'Pick 1 or 2 photos' : 'Choose a photo',
        icon: <GalleryIcon />,
        ref: galleryInputRef,
      },
      { key: 'camera', label: 'Camera', hint: 'Take a photo', icon: <CameraIcon />, ref: cameraInputRef },
    ];
    if (allowsPdf) {
      buttons.push({ key: 'pdf', label: 'PDF', hint: 'From Files', icon: <FileIcon />, ref: pdfInputRef });
    }
    return (
      <div
        className={
          'grid gap-2 rounded-xl border-2 border-dashed p-2 ' +
          (buttons.length === 3 ? 'grid-cols-3 ' : 'grid-cols-2 ') +
          (error ? 'border-accent-500/60 bg-accent-50/40' : 'border-slate-300 bg-slate-50/60')
        }
      >
        {buttons.map(function (item) {
          return (
            <button
              key={item.key}
              type="button"
              data-choice={item.key}
              disabled={isProcessing}
              onClick={function () {
                openInput(item.ref);
              }}
              className="flex min-w-0 flex-col items-center gap-1 rounded-lg bg-white px-1.5 py-2.5 text-center shadow-sm ring-1 ring-slate-200 transition active:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
            >
              <span className="text-brand-700">{item.icon}</span>
              <span className="text-[13px] font-semibold text-slate-800">{item.label}</span>
              <span className="text-[11px] leading-tight text-slate-500">{item.hint}</span>
            </button>
          );
        })}
      </div>
    );
  }
  // Front photo chosen alone: offer to add the back side
  const canAddBackSide = Boolean(config.twoPhotos && file && isImageFile(file));

  return (
    <div ref={boxRef} className="scroll-mt-24">
      <div className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-slate-800">
        <label htmlFor={inputId}>{config.label}</label>
        {config.required ? (
          <span className="text-accent-500" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
        )}
      </div>

      {config.twoPhotos && (
        <p className="-mt-0.5 mb-2 text-xs leading-relaxed text-slate-500">
          Card has 2 sides? Select both photos (front and back) together, or add the back after the front. They are
          joined into one PDF.
        </p>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={config.accept}
        multiple={Boolean(config.twoPhotos)}
        onClick={markPickingFile}
        onChange={handleInputChange}
        className="sr-only"
        aria-describedby={error ? inputId + '-error' : undefined}
      />
      {allowsPhoto && (
        <>
          {/* Only photos -> Android opens the Photos / Gallery picker */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple={Boolean(config.twoPhotos)}
            onClick={markPickingFile}
            onChange={handleInputChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          {/* capture -> opens the back camera directly */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onClick={markPickingFile}
            onChange={handleInputChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
        </>
      )}
      {allowsPdf && allowsPhoto && (
        // Only PDF -> Android opens the Files app
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onClick={markPickingFile}
          onChange={handleInputChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
      {config.twoPhotos && (
        <>
          <input
            ref={backInputRef}
            type="file"
            accept="image/*"
            onClick={markPickingFile}
            onChange={handleBackInputChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <input
            ref={backCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onClick={markPickingFile}
            onChange={handleBackInputChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
        </>
      )}

      {file ? (
        <div
          className={
            'flex items-center gap-3.5 rounded-xl border bg-white p-3 ' +
            (error ? 'border-accent-500' : 'border-emerald-300 bg-emerald-50/40')
          }
        >
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
          ) : (
            <PdfBadge />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800" title={file.name}>
              {file.name}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.86-9.86a.75.75 0 00-1.22-.88l-3.24 4.5-1.6-1.6a.75.75 0 10-1.06 1.06l2.25 2.25a.75.75 0 001.14-.09l3.73-5.24z"
                  clipRule="evenodd"
                />
              </svg>
              {isProcessing ? processingText : readyText || formatSize(file.size) + ', ready'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={function () {
                if (showPhoneChoices) {
                  setShowReplaceOptions(!showReplaceOptions);
                } else {
                  openPicker();
                }
              }}
              disabled={isProcessing}
              aria-expanded={showPhoneChoices ? showReplaceOptions : undefined}
              className="rounded-lg px-2.5 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={function () {
                setReadyText('');
                setShowReplaceOptions(false);
                onRemove(config.name);
              }}
              aria-label={'Remove ' + config.label}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-accent-50 hover:text-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
      ) : showPhoneChoices ? (
        <div>
          {renderPhoneChoices()}
          <p className="mt-1.5 text-xs text-slate-500">
            {isProcessing ? processingText : config.allowedLabel + ', up to ' + config.maxSizeKB + ' KB. Big photos are made smaller for you.'}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={isProcessing}
          onDragOver={function (event) {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={function () {
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={
            'flex w-full items-center gap-3.5 rounded-xl border-2 border-dashed px-4 py-3.5 text-left transition-colors ' +
            'sm:flex-col sm:justify-center sm:gap-0 sm:py-6 sm:text-center ' +
            'focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20 ' +
            (isDragging
              ? 'border-brand-600 bg-brand-50'
              : error
                ? 'border-accent-500/60 bg-accent-50/40 hover:border-accent-500'
                : 'border-slate-300 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/50')
          }
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 shadow-sm ring-1 ring-slate-200">
            <UploadIcon />
          </span>
          <span className="min-w-0">
            <span className="block text-sm text-slate-700 sm:mt-3">
              <span className="font-semibold text-brand-700">
                {isProcessing ? (
                  'Please wait'
                ) : (
                  <>
                    <span className="sm:hidden">Tap to upload</span>
                    <span className="hidden sm:inline">Click to upload</span>
                  </>
                )}
              </span>
              <span className="hidden sm:inline"> or drag and drop</span>
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 sm:mt-1">
              {isProcessing ? processingText : config.allowedLabel + ', up to ' + config.maxSizeKB + ' KB'}
            </span>
          </span>
        </button>
      )}

      {file && showPhoneChoices && showReplaceOptions && (
        <div className="mt-2">
          <p className="mb-1.5 text-xs font-semibold text-slate-600">Replace with:</p>
          {renderPhoneChoices()}
        </div>
      )}

      {canAddBackSide && showPhoneChoices && !showReplaceOptions && (
        <div className="mt-2 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 p-2">
          <p className="px-1 text-xs font-semibold text-brand-800">
            {isProcessing ? processingText : 'Add back side (optional)'}
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={function () {
                openInput(backInputRef);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-slate-200 active:bg-brand-50 disabled:opacity-50"
            >
              <GalleryIcon />
              Gallery
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={function () {
                openInput(backCameraInputRef);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-slate-200 active:bg-brand-50 disabled:opacity-50"
            >
              <CameraIcon />
              Camera
            </button>
          </div>
        </div>
      )}

      {canAddBackSide && !showPhoneChoices && (
        <button
          type="button"
          disabled={isProcessing}
          onClick={function () {
            backInputRef.current.click();
          }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:border-brand-600 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          {isProcessing ? processingText : 'Add back side (optional)'}
        </button>
      )}

      <FieldError id={inputId + '-error'} message={error} />
    </div>
  );
}
