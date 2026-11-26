import { useRef, useState } from 'react';
import { ConfirmDialog, useErrorHandler } from './AdminUi';
import PhotoThumb from './PhotoThumb';
import { addNote, editNote, deleteNote, getNotePhoto } from '../adminApi';
import { formatDateTime } from '../formatters';
import { compressImage } from '../../utils/compressImage';

// ---------- Settings (change them here) ----------

const MAX_NOTE_LENGTH = 500;
const MAX_PHOTOS = 3; // keep the same as MAX_NOTE_PHOTOS in the backend
const MAX_PHOTO_BYTES = 900 * 1024; // bigger phone photos are made smaller first (backend limit: 1 MB)

// Note types: the coloured tag on each note. Keep the values the same as NOTE_TYPES in the backend.
// hidden: not offered for new notes any more, only used to show older notes.
const NOTE_TYPES = [
  { value: 'call', label: 'Call', className: 'bg-sky-50 text-sky-800 ring-sky-200' },
  { value: 'visit', label: 'Visit', className: 'bg-violet-50 text-violet-800 ring-violet-200' },
  { value: 'payment', label: 'Payment', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  { value: 'follow_up', label: 'Note', className: 'bg-slate-100 text-slate-700 ring-slate-200', hidden: true },
  { value: 'other', label: 'Note', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
];

// Step 1 of a new note: what happened? (big buttons, Call is the most used)
const ADD_TYPES = [
  { value: 'call', label: 'Call', placeholder: 'e.g. Called, will join on Monday.' },
  { value: 'visit', label: 'Visit', placeholder: 'e.g. Came with parents, liked the course.' },
  { value: 'payment', label: 'Payment', placeholder: 'e.g. Fee paid ₹2000 in cash.' },
  { value: 'other', label: 'Note', placeholder: 'Write anything about this student.' },
];

// Step 2: one-click text, only for the chosen type (so only a few buttons show at a time)
const QUICK_NOTES = {
  call: [
    { label: 'No answer', text: 'Called – no answer.' },
    { label: 'Will visit', text: 'Called – interested, will visit the office.' },
    { label: 'Will confirm later', text: 'Called – will confirm after discussing with parents.' },
    { label: 'Not interested', text: 'Called – not interested right now.' },
  ],
  visit: [{ label: 'Visited office', text: 'Visited the office for counselling.' }],
  payment: [{ label: 'Registration fee paid', text: 'Registration done. Fee paid: ₹' }],
  other: [],
};

function TypeIcon({ type }) {
  if (type === 'call') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M2 3.5A1.5 1.5 0 013.5 2h1.15a1.5 1.5 0 011.46 1.14l.57 2.3a1.5 1.5 0 01-.43 1.45l-1 .97a11.1 11.1 0 004.9 4.9l.97-1a1.5 1.5 0 011.45-.43l2.3.57A1.5 1.5 0 0118 13.35v1.15a1.5 1.5 0 01-1.5 1.5H15C8 16 4 12 4 5V3.5H2z" />
      </svg>
    );
  }
  if (type === 'visit') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M4 2.5A1.5 1.5 0 015.5 1h9A1.5 1.5 0 0116 2.5V18h1a.75.75 0 010 1.5H3A.75.75 0 013 18h1V2.5zM8 5a.75.75 0 000 1.5h1A.75.75 0 009 5H8zm3 0a.75.75 0 000 1.5h1A.75.75 0 0012 5h-1zM8 9a.75.75 0 000 1.5h1A.75.75 0 009 9H8zm3 0a.75.75 0 000 1.5h1a.75.75 0 000-1.5h-1zm-2.5 5.5V18h3v-3.5h-3z" clipRule="evenodd" />
      </svg>
    );
  }
  if (type === 'payment') {
    return <span className="text-sm font-bold leading-none" aria-hidden="true">₹</span>;
  }
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M13.6 3.4a2 2 0 012.9 2.9l-8.6 8.6-3.6.8.8-3.6 8.5-8.7z" />
    </svg>
  );
}

function findType(value) {
  for (let i = 0; i < NOTE_TYPES.length; i++) {
    if (NOTE_TYPES[i].value === value) {
      return NOTE_TYPES[i];
    }
  }
  return NOTE_TYPES[NOTE_TYPES.length - 1];
}

function isPhoto(file) {
  return file.type === 'image/jpeg' || file.type === 'image/png';
}

// A pasted / camera photo often has no useful name ("image.png"): give it one
function namePhoto(file) {
  if (file.name && file.name !== 'image.png' && file.name !== 'image.jpg') {
    return file.name;
  }
  return 'photo-' + Date.now() + (file.type === 'image/png' ? '.png' : '.jpg');
}

// Reads the photo now (phones may not let us read it again later) and makes a big photo smaller.
// Returns a File, or null if it could not be read.
async function preparePhoto(file) {
  try {
    // Too big, or another photo format (e.g. HEIC from a camera): turn it into a smaller JPG
    if (file.size > MAX_PHOTO_BYTES || !isPhoto(file)) {
      return await compressImage(file, MAX_PHOTO_BYTES);
    }
    return new File([await file.arrayBuffer()], namePhoto(file), { type: file.type });
  } catch {
    return null;
  }
}

// ---------- Small parts ----------

function TypeTag({ type }) {
  const config = findType(type);
  return (
    <span className={'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ' + config.className}>
      {config.label}
    </span>
  );
}

// Type chooser: a row of small buttons
function findAddType(value) {
  for (let i = 0; i < ADD_TYPES.length; i++) {
    if (ADD_TYPES[i].value === value) {
      return ADD_TYPES[i];
    }
  }
  return ADD_TYPES[3];
}

function TypePicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Note type">
      {NOTE_TYPES.map(function (option) {
        if (option.hidden) {
          return null;
        }
        const isChosen = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isChosen}
            onClick={function () {
              onChange(option.value);
            }}
            className={
              'rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition ' +
              (isChosen ? option.className + ' ring-2' : 'bg-white text-slate-500 ring-slate-200 hover:text-slate-800')
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const textareaClass =
  'block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 ' +
  'focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15 sm:text-sm';
const photoButtonClass =
  'inline-flex h-14 items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 text-xs font-semibold text-slate-600 ' +
  'transition hover:border-brand-600 hover:text-brand-700 disabled:opacity-60';

function ErrorText({ children }) {
  if (!children) {
    return null;
  }
  return (
    <p role="alert" className="mt-1.5 text-[13px] font-medium text-accent-600">
      {children}
    </p>
  );
}

/**
 * "HR notes" box on the application page.
 * Each note: a type (Call, Visit, Payment, Note), the text and up to 3 photos.
 * Photos can be chosen from the phone / computer, taken with the camera, or pasted (e.g. copied from WhatsApp).
 * HR edits their own notes; the superadmin edits and deletes any note.
 */
function NotesSection({ application, admin, isSuperadmin, onUpdated }) {
  const handleError = useErrorHandler();
  const photoInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const canChange = !application.deletedAt;

  // New note form
  const [text, setText] = useState('');
  const [type, setType] = useState('call'); // most notes are about a call
  const [photos, setPhotos] = useState([]); // [{ file, previewUrl }]
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isPreparingPhotos, setIsPreparingPhotos] = useState(false);
  const [pasteHint, setPasteHint] = useState('');

  // Editing a note: { id, text, type }
  const [editing, setEditing] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [listError, setListError] = useState('');

  function applyQuickNote(quick) {
    setText(function (current) {
      const trimmed = current.trim();
      return trimmed ? trimmed + '\n' + quick.text : quick.text;
    });
    setType(quick.type);
    setErrors({});
  }

  // ---------- Photos: from files, camera or paste ----------

  async function addPhotoFiles(chosen) {
    if (chosen.length === 0) {
      return;
    }
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setErrors({ photos: 'You can add up to ' + MAX_PHOTOS + ' photos to one note.' });
      return;
    }
    let problem = chosen.length > room ? 'You can add up to ' + MAX_PHOTOS + ' photos to one note.' : '';

    setIsPreparingPhotos(true);
    const ready = [];
    for (let i = 0; i < chosen.length && ready.length < room; i++) {
      if (!chosen[i].type.startsWith('image/')) {
        problem = 'Please choose photos only.';
        continue;
      }
      const file = await preparePhoto(chosen[i]);
      if (!file) {
        problem = 'One photo could not be opened. Please try again.';
        continue;
      }
      ready.push({ file: file, previewUrl: URL.createObjectURL(file) });
    }
    setIsPreparingPhotos(false);
    setErrors(problem ? { photos: problem } : {});
    setPhotos(function (current) {
      return current.concat(ready);
    });
  }

  function handlePhotosChosen(event) {
    const chosen = Array.from(event.target.files || []);
    event.target.value = '';
    addPhotoFiles(chosen);
  }

  // Ctrl + V / long-press "Paste" in the note box: pasted photos are added, pasted text goes in the box as usual
  function handlePaste(event) {
    const items = event.clipboardData ? Array.from(event.clipboardData.items || []) : [];
    const pasted = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file && file.type.startsWith('image/')) {
          pasted.push(file);
        }
      }
    }
    if (pasted.length > 0) {
      event.preventDefault();
      setPasteHint('');
      addPhotoFiles(pasted);
    }
  }

  function removePhoto(index) {
    setPhotos(function (current) {
      URL.revokeObjectURL(current[index].previewUrl);
      return current.filter(function (item, position) {
        return position !== index;
      });
    });
  }

  function clearForm() {
    for (let i = 0; i < photos.length; i++) {
      URL.revokeObjectURL(photos[i].previewUrl);
    }
    setText('');
    setType('call');
    setPhotos([]);
    setErrors({});
    setPasteHint('');
  }

  async function handleAdd(event) {
    event.preventDefault();
    if (!text.trim()) {
      setErrors({ note: 'Please write a note.' });
      return;
    }
    setIsSaving(true);
    setErrors({});
    try {
      const files = [];
      for (let i = 0; i < photos.length; i++) {
        files.push(photos[i].file);
      }
      const updated = await addNote(application.id, { text: text.trim(), type: type, followUpDate: '' }, files);
      onUpdated(updated);
      clearForm();
    } catch (error) {
      if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
        setErrors(error.fieldErrors);
      } else {
        handleError(error, function (message) {
          setErrors({ note: message });
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  // ---------- Edit / delete ----------

  async function saveEdit() {
    if (!editing.text.trim()) {
      setEditErrors({ note: 'Please write a note.' });
      return;
    }
    setIsSavingEdit(true);
    setEditErrors({});
    try {
      const updated = await editNote(application.id, editing.id, { text: editing.text.trim(), type: editing.type, followUpDate: '' });
      onUpdated(updated);
      setEditing(null);
    } catch (error) {
      if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
        setEditErrors(error.fieldErrors);
      } else {
        handleError(error, function (message) {
          setEditErrors({ note: message });
        });
      }
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function confirmDelete() {
    setIsDeleting(true);
    setListError('');
    try {
      const updated = await deleteNote(application.id, deletingId);
      onUpdated(updated);
      setDeletingId(null);
    } catch (error) {
      setDeletingId(null);
      handleError(error, setListError);
    } finally {
      setIsDeleting(false);
    }
  }

  const notes = application.notes || [];

  return (
    <section id="notes" className="scroll-mt-20 rounded-xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-4 py-3 text-[15px] font-bold text-slate-900 sm:px-5">
        HR notes{notes.length > 0 ? ' (' + notes.length + ')' : ''}
      </h2>
      <div className="px-4 py-4 sm:px-5">
        {canChange && (
          <form onSubmit={handleAdd} onPaste={handlePaste}>
            {/* Step 1: what happened? */}
            <p className="mb-1.5 text-[13px] font-semibold text-slate-700">What happened?</p>
            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Note type">
              {ADD_TYPES.map(function (option) {
                const isChosen = type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isChosen}
                    onClick={function () {
                      setType(option.value);
                    }}
                    className={
                      'flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[13px] font-semibold ring-1 transition ' +
                      (isChosen
                        ? 'bg-brand-700 text-white ring-brand-700'
                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-900')
                    }
                  >
                    <TypeIcon type={option.value} />
                    {option.label}
                  </button>
                );
              })}
            </div>

            {/* Step 2: one-click text for this type */}
            {QUICK_NOTES[type].length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {QUICK_NOTES[type].map(function (quick) {
                  return (
                    <button
                      key={quick.label}
                      type="button"
                      onClick={function () {
                        applyQuickNote({ text: quick.text, type: type });
                      }}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                    >
                      + {quick.label}
                    </button>
                  );
                })}
              </div>
            )}

            <label htmlFor="note-text" className="sr-only">
              Note
            </label>
            <textarea
              id="note-text"
              rows={3}
              maxLength={MAX_NOTE_LENGTH}
              value={text}
              onChange={function (event) {
                setText(event.target.value);
                setErrors({});
              }}
              placeholder={findAddType(type).placeholder}
              className={textareaClass + ' mt-2.5'}
            />
            <ErrorText>{errors.note}</ErrorText>

            {/* Photos: choose, camera, paste */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={handlePhotosChosen}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotosChosen}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {photos.map(function (photo, index) {
                return (
                  <span key={photo.previewUrl} className="relative">
                    <img src={photo.previewUrl} alt={photo.file.name} className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200" />
                    <button
                      type="button"
                      onClick={function () {
                        removePhoto(index);
                      }}
                      aria-label={'Remove ' + photo.file.name}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] text-white hover:bg-accent-600"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              {photos.length < MAX_PHOTOS && (
                <>
                  <button
                    type="button"
                    disabled={isPreparingPhotos}
                    onClick={function () {
                      photoInputRef.current.click();
                    }}
                    className={photoButtonClass}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .41.34.75.75.75h13.5c.41 0 .75-.34.75-.75v-2.69l-2.22-2.22a.75.75 0 00-1.06 0l-1.91 1.91-4.03-4.03a.75.75 0 00-1.06 0L2.5 11.06zM12.75 7a1.25 1.25 0 112.5 0 1.25 1.25 0 01-2.5 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {isPreparingPhotos ? 'Preparing…' : 'Add photos'}
                  </button>
                  <button
                    type="button"
                    disabled={isPreparingPhotos}
                    onClick={function () {
                      cameraInputRef.current.click();
                    }}
                    className={photoButtonClass}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M1 8a2 2 0 012-2h.93a2 2 0 001.66-.89l.82-1.22A2 2 0 018.07 3h3.86a2 2 0 011.66.89l.82 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm13.5 3a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM10 14a3 3 0 100-6 3 3 0 000 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Camera
                  </button>
                  <span className="text-xs text-slate-400">
                    {photos.length}/{MAX_PHOTOS}
                  </span>
                </>
              )}
            </div>
            <ErrorText>{errors.photos}</ErrorText>
            {pasteHint && <p className="mt-1.5 text-[13px] text-slate-600">{pasteHint}</p>}
            <p className="mt-1.5 text-xs text-slate-500">
              Tip: copy a photo (e.g. from WhatsApp), then press <b>Ctrl + V</b> in the note box. On a phone, tap and hold in the
              box and choose <b>Paste</b>.
            </p>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                {text.length}/{MAX_NOTE_LENGTH}
              </span>
              <button
                type="submit"
                disabled={isSaving || isPreparingPhotos}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {isSaving ? 'Saving…' : 'Add note'}
              </button>
            </div>
          </form>
        )}

        <ErrorText>{listError}</ErrorText>

        {notes.length > 0 && (
          <ol className={'space-y-3' + (canChange ? ' mt-4 border-t border-slate-100 pt-4' : '')}>
            {notes
              .slice()
              .reverse()
              .map(function (note) {
                // HR can edit their own notes; the superadmin can edit any note
                const canEdit = canChange && (isSuperadmin || note.adminId === admin.id);
                const isEditing = editing && editing.id === note.id;

                if (isEditing) {
                  return (
                    <li key={note.id} className="rounded-lg bg-slate-50 px-3 py-3 ring-1 ring-brand-200">
                      <TypePicker
                        value={editing.type}
                        onChange={function (value) {
                          setEditing({ ...editing, type: value });
                        }}
                      />
                      <label htmlFor={'edit-note-' + note.id} className="sr-only">
                        Edit note
                      </label>
                      <textarea
                        id={'edit-note-' + note.id}
                        rows={3}
                        maxLength={MAX_NOTE_LENGTH}
                        value={editing.text}
                        autoFocus
                        onChange={function (event) {
                          setEditing({ ...editing, text: event.target.value });
                          setEditErrors({});
                        }}
                        className={textareaClass + ' mt-2'}
                      />
                      <ErrorText>{editErrors.note}</ErrorText>
                      <div className="mt-2.5 flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={function () {
                            setEditing(null);
                            setEditErrors({});
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={saveEdit}
                          className="rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
                        >
                          {isSavingEdit ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </li>
                  );
                }

                // The type picker no longer offers "Follow-up": such older notes are edited as a plain "Note"
                const editType = findType(note.type).hidden ? 'other' : note.type || 'other';
                return (
                  <li key={note.id} className="rounded-lg bg-slate-50 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        <TypeTag type={note.type} />
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          title="Edit this note"
                          aria-label={'Edit note by ' + note.authorName}
                          onClick={function () {
                            setEditing({ id: note.id, text: note.text, type: editType });
                            setEditErrors({});
                          }}
                          className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M2.7 13.6l-.7 3.6a.7.7 0 00.8.8l3.6-.7L15.9 7.8 12.2 4.1 2.7 13.6zM17.7 5.9a1.3 1.3 0 000-1.8l-1.8-1.8a1.3 1.3 0 00-1.8 0l-1.2 1.2 3.6 3.6 1.2-1.2z" />
                          </svg>
                        </button>
                      )}
                      {isSuperadmin && canChange && (
                        <button
                          type="button"
                          title="Delete this note"
                          aria-label={'Delete note by ' + note.authorName}
                          onClick={function () {
                            setDeletingId(note.id);
                          }}
                          className="-mr-1 shrink-0 rounded-md p-1 text-slate-400 hover:bg-accent-50 hover:text-accent-600"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <p className="mt-1.5 whitespace-pre-line break-words text-sm text-slate-800">{note.text}</p>

                    {note.photos && note.photos.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {note.photos.map(function (photo) {
                          return (
                            <PhotoThumb
                              key={photo.id}
                              label={'photo-' + photo.id}
                              size="h-16 w-16"
                              load={function () {
                                return getNotePhoto(application.id, photo.id);
                              }}
                            />
                          );
                        })}
                      </div>
                    )}

                    <p className="mt-1.5 text-xs text-slate-500">
                      {note.authorName} · {formatDateTime(note.createdAt)}
                      {note.editedAt && <span title={'Edited ' + formatDateTime(note.editedAt)}> · (edited)</span>}
                    </p>
                  </li>
                );
              })}
          </ol>
        )}
      </div>

      {deletingId !== null && (
        <ConfirmDialog
          title="Delete this note?"
          message="The note and its photos are removed for everyone. This cannot be undone (the activity log keeps a copy of its text)."
          confirmLabel="Delete note"
          danger
          busy={isDeleting}
          onConfirm={confirmDelete}
          onCancel={function () {
            setDeletingId(null);
          }}
        />
      )}
    </section>
  );
}

export default NotesSection;
