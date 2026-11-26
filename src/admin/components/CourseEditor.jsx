import { useState } from 'react';
import TechnologyChoice from './TechnologyChoice';
import DurationChoice from './DurationChoice';
import { updateCourse } from '../adminApi';

/**
 * "Change" panel at the top of the application page.
 * HR fixes the technology and duration in one place (e.g. the student ticked 3 technologies,
 * or chose 1 Month and is now joining for 3 Months). Saved straight away, no email is sent.
 * The list page, the emails and the Excel export then show only what HR picked.
 */
function CourseEditor({ application, allTechnologies, onSaved, onCancel }) {
  // Start with what is saved now. More than one duration: HR must pick one.
  const [technologies, setTechnologies] = useState(application.technologies.slice());
  const [duration, setDuration] = useState(application.durations.length === 1 ? application.durations[0] : '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (technologies.length === 0 || !duration) {
      setError('Please pick at least one technology and one duration.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const updated = await updateCourse(application.id, technologies, duration);
      onSaved(updated);
    } catch (saveError) {
      setError(saveError.message || 'Could not save. Please try again.');
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-3 max-w-xl rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
      <p className="text-sm font-semibold text-slate-900">Change technology and duration</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Keep only what the student will really do. No email is sent. The list and the emails will show this.
      </p>
      <TechnologyChoice
        studentTechnologies={application.technologies}
        allTechnologies={allTechnologies}
        selected={technologies}
        onChange={setTechnologies}
        disabled={isSaving}
      />
      <DurationChoice
        studentDurations={application.durations}
        selected={duration}
        onChange={setDuration}
        disabled={isSaving}
      />
      {error && <p className="mt-2 text-xs font-medium text-accent-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isSaving || technologies.length === 0 || !duration}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default CourseEditor;
