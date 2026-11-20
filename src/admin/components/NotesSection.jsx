import { useRef, useState } from 'react';
import { ConfirmDialog, useErrorHandler } from './AdminUi';
import PhotoThumb from './PhotoThumb';
import { addNote, editNote, deleteNote, setFollowUpDone, getNotePhoto } from '../adminApi';
import { formatDateTime } from '../formatters';
import { toDateText } from '../dateRanges';
import { compressImage } from '../../utils/compressImage';

// ---------- Settings (change them here) ----------

const MAX_NOTE_LENGTH = 500;
const MAX_PHOTOS = 3; // keep the same as MAX_NOTE_PHOTOS in the backend
const MAX_PHOTO_BYTES = 900 * 1024; // bigger phone photos are made smaller first (backend limit: 1 MB)

// Note types: the coloured tag on each note. Keep the values the same as NOTE_TYPES in the backend.
const NOTE_TYPES = [
  { value: 'call', label: 'Call', className: 'bg-sky-50 text-sky-800 ring-sky-200' },
  { value: 'visit', label: 'Visit', className: 'bg-violet-50 text-violet-800 ring-violet-200' },
  { value: 'payment', label: 'Payment', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  { value: 'follow_up', label: 'Follow-up', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  { value: 'other', label: 'Note', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
];

// One-click notes. followUpDays: also sets a follow-up date that many days from today.
const QUICK_NOTES = [
  { label: 'No answer', text: 'Called – no answer.', type: 'call', followUpDays: 1 },
  { label: 'Interested, will visit', text: 'Called – interested, will visit the office.', type: 'call', followUpDays: 2 },
  { label: 'Will confirm later', text: 'Will confirm after discussing with parents.', type: 'follow_up', followUpDays: 2 },
  { label: 'Visited office', text: 'Visited the office for counselling.', type: 'visit' },
  { label: 'Registration done', text: 'Registration done. Fee paid: ₹', type: 'payment' },
  { label: 'Not interested', text: 'Not interested right now.', type: 'other' },
];

function findType(value) {
  for (let i = 0; i < NOTE_TYPES.length; i++) {
    if (NOTE_TYPES[i].value === value) {
      return NOTE_TYPES[i];
    }
  }
  return NOTE_TYPES[NOTE_TYPES.length - 1];
}

// '2026-11-20T00:00:00.000Z' or '2026-11-20' -> '2026-11-20'
function dateOnly(value) {
  return value ? String(value).slice(0, 10) : '';
}

function daysFromToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateText(date);
}

// '2026-11-20' -> '20 Nov'
function shortDate(dateText) {
  return new Date(dateText + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
function TypePicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Note type">
      {NOTE_TYPES.map(function (option) {
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

// "Follow-up today" / "Follow-up overdue · 18 Nov" / "Follow-up 22 Nov" / "Follow-up done"
function FollowUpBadge({ note }) {
  const date = dateOnly(note.followUpDate);
  if (!date) {
    return null;
  }
  if (note.followUpDoneAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
        ✓ Follow-up done
      </span>
    );
  }
  const today = toDateText(new Date());
  let text = 'Follow-up ' + shortDate(date);
  let className = 'bg-brand-50 text-brand-800 ring-brand-100';
  if (date === today) {
    text = 'Follow-up today';
    className = 'bg-amber-100 text-amber-900 ring-amber-300';
  } else if (date < today) {
    text = 'Follow-up overdue · ' + shortDate(date);
    className = 'bg-accent-50 text-accent-600 ring-accent-100';
  }
  return <span className={'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ' + className}>{text}</span>;
}

const textareaClass =
  'block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 ' +
  'focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15 sm:text-sm';
const dateInputClass =
  'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15';

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
 * Each note: a type (Call, Visit, Payment …), the text, an optional follow-up date and up to 3 photos.
 * HR edits their own notes; the superadmin edits and deletes any note.
 */
function NotesSection({ application, admin, isSuperadmin, onUpdated }) {
  const handleError = useErrorHandler();
  const photoInputRef = useRef(null);
  const canChange = !application.deletedAt;

  // New note form
  const [text, setText] = useState('');
  const [type, setType] = useState('other');
  const [followUpDate, setFollowUpDate] = useState('');
  const [photos, setPhotos] = useState([]); // [{ file, previewUrl }]
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isPreparingPhotos, setIsPreparingPhotos] = useState(false);

  // Editing a note: { id, text, type, followUpDate }
  const [editing, setEditing] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyFollowUpId, setBusyFollowUpId] = useState(null);
  const [listError, setListError] = useState('');

  function applyQuickNote(quick) {
    setText(function (current) {
      const trimmed = current.trim();
      return trimmed ? trimmed + '\n' + quick.text : quick.text;
    });
    setType(quick.type);
    if (quick.followUpDays) {
      setFollowUpDate(daysFromToday(quick.followUpDays));
    }
    setErrors({});
  }

  // ---------- Photos for a new note ----------

  async function handlePhotosChosen(event) {
    const chosen = Array.from(event.target.files || []);
    event.target.value = '';
    if (chosen.length === 0) {
      return;
    }
    const room = MAX_PHOTOS - photos.length;
    if (chosen.length > room) {
      setErrors({ photos: 'You can add up to ' + MAX_PHOTOS + ' photos to one note.' });
    } else {
      setErrors({});
    }

    setIsPreparingPhotos(true);
    const ready = [];
    for (let i = 0; i < chosen.length && i < room; i++) {
      let file = chosen[i];
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        setErrors({ photos: 'Please choose JPG or PNG photos.' });
        continue;
      }
      try {
        // Read the photo now (phones may not let us read it again later), and make big photos smaller
        if (file.size > MAX_PHOTO_BYTES) {
          file = await compressImage(file, MAX_PHOTO_BYTES);
        } else {
          file = new File([await file.arrayBuffer()], file.name, { type: file.type });
        }
      } catch {
        file = null;
      }
      if (!file) {
        setErrors({ photos: 'One photo could not be opened. Please choose it again.' });
        continue;
      }
      ready.push({ file: file, previewUrl: URL.createObjectURL(file) });
    }
    setIsPreparingPhotos(false);
    setPhotos(function (current) {
      return current.concat(ready);
    });
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
    setType('other');
    setFollowUpDate('');
    setPhotos([]);
    setErrors({});
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
      const updated = await addNote(application.id, { text: text.trim(), type: type, followUpDate: followUpDate }, files);
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

  // ---------- Edit / delete / follow-up ----------

  async function saveEdit() {
    if (!editing.text.trim()) {
      setEditErrors({ note: 'Please write a note.' });
      return;
    }
    setIsSavingEdit(true);
    setEditErrors({});
    try {
      const updated = await editNote(application.id, editing.id, {
        text: editing.text.trim(),
        type: editing.type,
        followUpDate: editing.followUpDate,
      });
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

  async function toggleFollowUp(note, done) {
    setBusyFollowUpId(note.id);
    setListError('');
    try {
      const updated = await setFollowUpDone(application.id, note.id, done);
      onUpdated(updated);
    } catch (error) {
      handleError(error, setListError);
    } finally {
      setBusyFollowUpId(null);
    }
  }

  const notes = application.notes || [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-4 py-3 text-[15px] font-bold text-slate-900 sm:px-5">
        HR notes{notes.length > 0 ? ' (' + notes.length + ')' : ''}
      </h2>
      <div className="px-4 py-4 sm:px-5">
        {canChange && (
          <form onSubmit={handleAdd}>
            {/* One-click notes */}
            <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">Quick note</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {QUICK_NOTES.map(function (quick) {
                return (
                  <button
                    key={quick.label}
                    type="button"
                    onClick={function () {
                      applyQuickNote(quick);
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                  >
                    {quick.label}
                  </button>
                );
              })}
            </div>

            <TypePicker
              value={type}
              onChange={function (value) {
                setType(value);
              }}
            />

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
              placeholder="e.g. Called, will join on Monday"
              className={textareaClass + ' mt-2.5'}
            />
            <ErrorText>{errors.note}</ErrorText>

            {/* Follow-up date + photos */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <label className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
                Follow-up
                <input
                  type="date"
                  value={followUpDate}
                  min={toDateText(new Date())}
                  onChange={function (event) {
                    setFollowUpDate(event.target.value);
                  }}
                  className={dateInputClass}
                />
              </label>
              {followUpDate && (
                <button
                  type="button"
                  onClick={function () {
                    setFollowUpDate('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Clear
                </button>
              )}
            </div>
            <ErrorText>{errors.followUpDate}</ErrorText>

            <input
              ref={photoInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              multiple
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
                <button
                  type="button"
                  disabled={isPreparingPhotos}
                  onClick={function () {
                    photoInputRef.current.click();
                  }}
                  className="inline-flex h-14 items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 text-xs font-semibold text-slate-600 transition hover:border-brand-600 hover:text-brand-700 disabled:opacity-60"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .41.34.75.75.75h13.5c.41 0 .75-.34.75-.75v-2.69l-2.22-2.22a.75.75 0 00-1.06 0l-1.91 1.91-4.03-4.03a.75.75 0 00-1.06 0L2.5 11.06zM12.75 7a1.25 1.25 0 112.5 0 1.25 1.25 0 01-2.5 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {isPreparingPhotos ? 'Preparing…' : photos.length === 0 ? 'Add photos' : 'Add more'}
                  <span className="font-normal text-slate-400">({photos.length}/{MAX_PHOTOS})</span>
                </button>
              )}
            </div>
            <ErrorText>{errors.photos}</ErrorText>

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
                      <label className="mt-2 flex items-center gap-2 text-[13px] font-medium text-slate-600">
                        Follow-up
                        <input
                          type="date"
                          value={editing.followUpDate}
                          onChange={function (event) {
                            setEditing({ ...editing, followUpDate: event.target.value });
                          }}
                          className={dateInputClass}
                        />
                        {editing.followUpDate && (
                          <button
                            type="button"
                            onClick={function () {
                              setEditing({ ...editing, followUpDate: '' });
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                          >
                            Clear
                          </button>
                        )}
                      </label>
                      <ErrorText>{editErrors.followUpDate}</ErrorText>
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

                const hasOpenFollowUp = Boolean(dateOnly(note.followUpDate)) && !note.followUpDoneAt;
                return (
                  <li key={note.id} className="rounded-lg bg-slate-50 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        <TypeTag type={note.type} />
                        <FollowUpBadge note={note} />
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          title="Edit this note"
                          aria-label={'Edit note by ' + note.authorName}
                          onClick={function () {
                            setEditing({ id: note.id, text: note.text, type: note.type || 'other', followUpDate: dateOnly(note.followUpDate) });
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

                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        {note.authorName} · {formatDateTime(note.createdAt)}
                        {note.editedAt && <span title={'Edited ' + formatDateTime(note.editedAt)}> · (edited)</span>}
                      </p>
                      {canChange && hasOpenFollowUp && (
                        <button
                          type="button"
                          disabled={busyFollowUpId === note.id}
                          onClick={function () {
                            toggleFollowUp(note, true);
                          }}
                          className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          {busyFollowUpId === note.id ? 'Saving…' : '✓ Mark follow-up done'}
                        </button>
                      )}
                      {canChange && note.followUpDoneAt && (
                        <button
                          type="button"
                          disabled={busyFollowUpId === note.id}
                          onClick={function () {
                            toggleFollowUp(note, false);
                          }}
                          className="text-xs font-semibold text-slate-400 hover:text-slate-700"
                        >
                          Undo
                        </button>
                      )}
                    </div>
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
