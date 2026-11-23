import { useEffect, useRef, useState } from 'react';
import { FieldError } from './Field';
import { checkFileType, checkFileSize } from '../../utils/validation';
import { compressImage } from '../../utils/compressImage';
import { imagesToPdf, shrinkPdf } from '../../utils/pdfTools';
import { markPickingFile, clearPickingFile } from '../../utils/fileDraft';

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
  const [isDragging, setIsDragging] = useState(false);
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
      onError(config.name, 'These photos could not be joined into a PDF under ' + config.maxSizeKB + ' KB. Please try other photos.');
      return;
    }
    setReadyText('Front and back joined into one PDF, ' + formatSize(pdfFile.size) + ', ready');
    onSelect(config.name, pdfFile);
  }

  async function handleFile(chosenFile) {
    if (!chosenFile) {
      return;
    }
    const typeError = checkFileType(chosenFile, config);
    if (typeError) {
      onError(config.name, typeError);
      return;
    }
    const maxBytes = config.maxSizeKB * 1024;

    // A big photo or PDF is read and made smaller right now, so no extra full-size copy is needed
    // (a full-size copy of a big camera photo can use up the memory of a low-end phone).
    // A file that is already small enough is copied, so the phone does not have to give it again at Submit.
    const willBeMadeSmaller =
      chosenFile.size > maxBytes && (isImageFile(chosenFile) || (chosenFile.type === 'application/pdf' && config.shrinkPdf));
    const selectedFile = willBeMadeSmaller ? chosenFile : await copyIntoMemory(chosenFile);
    if (!selectedFile) {
      onError(config.name, CANNOT_READ_MESSAGE);
      return;
    }

    // A photo that is too large is made smaller automatically
    if (isImageFile(selectedFile) && selectedFile.size > maxBytes) {
      setProcessingText('Making your photo smaller…');
      let smallerFile = null;
      try {
        smallerFile = await compressImage(selectedFile, maxBytes);
      } catch {
        // The phone did not give us the photo the first time: read it once more and try again
        const copy = await copyIntoMemory(selectedFile);
        if (copy) {
          try {
            smallerFile = await compressImage(copy, maxBytes);
          } catch {
            smallerFile = null;
          }
        }
      }
      setProcessingText('');

      if (!smallerFile) {
        onError(config.name, 'This photo could not be made smaller than ' + config.maxSizeKB + ' KB. Please try another photo.');
        return;
      }
      setReadyText('Resized from ' + formatSize(selectedFile.size) + ' to ' + formatSize(smallerFile.size) + ', ready');
      onSelect(config.name, smallerFile);
      return;
    }

    // A PDF that is too large is made smaller automatically (ID documents and the resume)
    if (selectedFile.type === 'application/pdf' && selectedFile.size > maxBytes && config.shrinkPdf) {
      setProcessingText('Making your PDF smaller…');
      let result;
      try {
        result = await shrinkPdf(selectedFile, maxBytes);
      } catch {
        result = { error: 'This PDF could not be made smaller. Please upload a photo of the document instead.' };
      }
      setProcessingText('');

      if (result.error) {
        onError(config.name, result.error);
        return;
      }
      setReadyText('Made smaller from ' + formatSize(selectedFile.size) + ' to ' + formatSize(result.file.size) + ', ready');
      onSelect(config.name, result.file);
      return;
    }

    const sizeError = checkFileSize(selectedFile, config);
    if (sizeError) {
      onError(config.name, sizeError);
      return;
    }

    setReadyText('');
    onSelect(config.name, selectedFile);
  }

  // One file, or (for twoPhotos) two photos: front and back
  function handleFiles(fileList) {
    const chosen = Array.from(fileList || []);
    if (chosen.length === 0) {
      return;
    }
    if (chosen.length === 1 || !config.twoPhotos) {
      handleFile(chosen[0]);
      return;
    }
    if (chosen.length > 2) {
      onError(config.name, 'Please select only 2 photos: the front and the back.');
      return;
    }
    if (!isImageFile(chosen[0]) || !isImageFile(chosen[1])) {
      onError(config.name, 'To upload two files, select 2 photos (JPG or PNG): the front and the back. Or upload one PDF.');
      return;
    }
    joinPhotos(chosen[0], chosen[1]);
  }

  function handleInputChange(event) {
    clearPickingFile();
    handleFiles(event.target.files);
    // Reset so selecting the same file again still triggers onChange
    event.target.value = '';
  }

  // "Add back side": the photo already chosen is the front
  function handleBackInputChange(event) {
    clearPickingFile();
    const back = event.target.files[0];
    event.target.value = '';
    if (!back || !file) {
      return;
    }
    if (!isImageFile(back)) {
      onError(config.name, 'Please choose a photo (JPG or PNG) of the back side.');
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

  const inputId = 'file-' + config.name;
  // Front photo chosen alone: offer to add the back side
  const canAddBackSide = Boolean(config.twoPhotos && file && isImageFile(file));

  return (
    <div>
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
      {config.twoPhotos && (
        <input
          ref={backInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          onClick={markPickingFile}
          onChange={handleBackInputChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
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
              onClick={openPicker}
              disabled={isProcessing}
              className="rounded-lg px-2.5 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={function () {
                setReadyText('');
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

      {canAddBackSide && (
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
