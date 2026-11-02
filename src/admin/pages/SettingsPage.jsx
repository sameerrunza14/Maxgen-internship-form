import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Alert, Card, PageTitle, inputClass, primaryButton, secondaryButton, useErrorHandler } from '../components/AdminUi';
import { getSettings, saveSettings } from '../adminApi';

// One list per line in a text box  <->  array
function listToLines(list) {
  return list.join('\n');
}

function linesToList(text) {
  const list = [];
  const lines = text.split(/[\n,]/);
  for (let i = 0; i < lines.length; i++) {
    const value = lines[i].trim();
    if (value && !list.includes(value)) {
      list.push(value);
    }
  }
  return list;
}

function technologyLinesToList(text) {
  // Technologies cannot contain a comma, so only new lines separate them (the server explains a comma)
  const list = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const value = lines[i].trim();
    if (value && !list.includes(value)) {
      list.push(value);
    }
  }
  return list;
}

function FieldError({ message }) {
  if (!message) {
    return null;
  }
  return <span className="mt-1 block text-[13px] font-medium text-accent-600">{message}</span>;
}

function NumberField({ label, help, value, min, max, error, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-semibold text-slate-700">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={function (event) {
          onChange(event.target.value);
        }}
        className={inputClass + ' max-w-[140px]'}
      />
      <span className="mt-1 block text-xs text-slate-500">{help}</span>
      <FieldError message={error} />
    </label>
  );
}

function SettingsPage() {
  const handleError = useErrorHandler();
  const [saved, setSaved] = useState(null); // the settings as saved on the server
  const [form, setForm] = useState(null); // what is on screen
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);

  function fillForm(settings) {
    setSaved(settings);
    setForm({
      applicationsOpen: settings.applicationsOpen,
      closedMessage: settings.closedMessage,
      notificationEmails: listToLines(settings.notificationEmails),
      technologies: listToLines(settings.technologies),
      maxTechnologies: String(settings.maxTechnologies),
      duplicateBlockDays: String(settings.duplicateBlockDays),
      passoutYearsAhead: String(settings.passoutYearsAhead),
    });
  }

  useEffect(function () {
    getSettings()
      .then(fillForm)
      .catch(function (error) {
        handleError(error, function (message) {
          setNotice({ type: 'error', text: message });
        });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function update(name, value) {
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: '' });
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    setErrors({});
    setNotice({ type: '', text: '' });
    try {
      const result = await saveSettings({
        applicationsOpen: form.applicationsOpen,
        closedMessage: form.closedMessage,
        notificationEmails: linesToList(form.notificationEmails),
        technologies: technologyLinesToList(form.technologies),
        maxTechnologies: Number(form.maxTechnologies),
        duplicateBlockDays: Number(form.duplicateBlockDays),
        passoutYearsAhead: Number(form.passoutYearsAhead),
      });
      fillForm(result.settings);
      setNotice({ type: 'success', text: result.message });
    } catch (error) {
      if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
        setErrors(error.fieldErrors);
        setNotice({ type: 'error', text: error.message });
      } else {
        handleError(error, function (message) {
          setNotice({ type: 'error', text: message });
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  const year = new Date().getFullYear();

  return (
    <AdminLayout>
      <PageTitle title="Settings" subtitle="Changes apply to the application form straight away. Every change is saved in the activity log." />
      <Alert type={notice.type} className="mt-5">{notice.text}</Alert>

      {!form && !notice.text && <p className="py-16 text-center text-sm text-slate-500">Loading settings…</p>}

      {form && (
        <form onSubmit={handleSave} noValidate className="mt-5 space-y-5">
          <Card title="Application form">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  The form is{' '}
                  <span className={form.applicationsOpen ? 'text-emerald-700' : 'text-accent-600'}>
                    {form.applicationsOpen ? 'OPEN' : 'CLOSED'}
                  </span>
                  {saved && saved.applicationsOpen !== form.applicationsOpen && <span className="font-normal text-slate-500"> (not saved yet)</span>}
                </p>
                <p className="text-[13px] text-slate-500">
                  {form.applicationsOpen ? 'Students can apply.' : 'Students see the message below instead of the form.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.applicationsOpen}
                aria-label="Applications open"
                onClick={function () {
                  update('applicationsOpen', !form.applicationsOpen);
                }}
                className={
                  'relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/30 ' +
                  (form.applicationsOpen ? 'bg-emerald-600' : 'bg-slate-300')
                }
              >
                <span
                  className={
                    'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ' + (form.applicationsOpen ? 'left-[22px]' : 'left-0.5')
                  }
                />
              </button>
            </div>
            <label className="mt-4 block">
              <span className="mb-1 block text-[13px] font-semibold text-slate-700">Message when the form is closed</span>
              <textarea
                rows={2}
                maxLength={300}
                value={form.closedMessage}
                onChange={function (event) {
                  update('closedMessage', event.target.value);
                }}
                className={inputClass + ' resize-y'}
              />
              <FieldError message={errors.closedMessage} />
            </label>
          </Card>

          <Card title="New application emails">
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-slate-700">Send an email for every new application to</span>
              <textarea
                rows={3}
                value={form.notificationEmails}
                onChange={function (event) {
                  update('notificationEmails', event.target.value);
                }}
                placeholder={'hr@maxgentechnologies.com\nceo@maxgentechnologies.com'}
                className={inputClass + ' resize-y font-mono sm:text-[13px]'}
              />
              <span className="mt-1 block text-xs text-slate-500">One email per line (HR, CEO …). Up to 10. Leave empty to send none.</span>
              <FieldError message={errors.notificationEmails} />
            </label>
          </Card>

          <Card title="Technologies and limits">
            <div className="grid gap-5 md:grid-cols-[1fr_260px]">
              <label className="block">
                <span className="mb-1 block text-[13px] font-semibold text-slate-700">Technologies students can choose</span>
                <textarea
                  rows={12}
                  value={form.technologies}
                  onChange={function (event) {
                    update('technologies', event.target.value);
                  }}
                  className={inputClass + ' resize-y sm:text-[13px]'}
                />
                <span className="mt-1 block text-xs text-slate-500">
                  One per line, in the order the form shows them. Removing one does not change old applications.
                </span>
                <FieldError message={errors.technologies} />
              </label>
              <div className="space-y-5">
                <NumberField
                  label="Technologies per student"
                  help="How many a student can choose (1 to 5)."
                  value={form.maxTechnologies}
                  min={1}
                  max={5}
                  error={errors.maxTechnologies}
                  onChange={function (value) {
                    update('maxTechnologies', value);
                  }}
                />
                <NumberField
                  label="Block repeat applications for (days)"
                  help="Same phone + same technology within these days is refused. 0 = off."
                  value={form.duplicateBlockDays}
                  min={0}
                  max={60}
                  error={errors.duplicateBlockDays}
                  onChange={function (value) {
                    update('duplicateBlockDays', value);
                  }}
                />
                <NumberField
                  label="Passout years ahead"
                  help={'Passout year can be ' + year + ' to ' + (year + (Number(form.passoutYearsAhead) || 0)) + '.'}
                  value={form.passoutYearsAhead}
                  min={1}
                  max={10}
                  error={errors.passoutYearsAhead}
                  onChange={function (value) {
                    update('passoutYearsAhead', value);
                  }}
                />
              </div>
            </div>
          </Card>

          <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-xl sm:border">
            <button
              type="button"
              disabled={isSaving}
              onClick={function () {
                fillForm(saved);
                setErrors({});
                setNotice({ type: '', text: '' });
              }}
              className={secondaryButton}
            >
              Undo changes
            </button>
            <button type="submit" disabled={isSaving} className={primaryButton}>
              {isSaving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>
      )}
    </AdminLayout>
  );
}

export default SettingsPage;
