import { useEffect, useRef, useState } from 'react';
import { FieldError } from './Field';
import { MAX_FILE_SIZE_MB } from '../../constants/formOptions';
import { checkFile } from '../../utils/validation';

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
 */
export function FileUpload({ config, file, error, onSelect, onRemove, onError }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

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

  function handleFile(selectedFile) {
    if (!selectedFile) {
      return;
    }
    const message = checkFile(selectedFile, config);
    if (message) {
      onError(config.name, message);
      return;
    }
    onSelect(config.name, selectedFile);
  }

  function handleInputChange(event) {
    handleFile(event.target.files[0]);
    // Reset so selecting the same file again still triggers onChange
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
  }

  function openPicker() {
    inputRef.current.click();
  }

  const inputId = 'file-' + config.name;

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

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={config.accept}
        onChange={handleInputChange}
        className="sr-only"
        aria-describedby={error ? inputId + '-error' : undefined}
      />

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
              {formatSize(file.size)}, ready
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={openPicker}
              className="rounded-lg px-2.5 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={function () {
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
                <span className="sm:hidden">Tap to upload</span>
                <span className="hidden sm:inline">Click to upload</span>
              </span>
              <span className="hidden sm:inline"> or drag and drop</span>
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 sm:mt-1">
              {config.allowedLabel}, up to {MAX_FILE_SIZE_MB} MB
            </span>
          </span>
        </button>
      )}

      <FieldError id={inputId + '-error'} message={error} />
    </div>
  );
}
