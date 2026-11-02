import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Alert, Card, PageTitle, inputClass, primaryButton, secondaryButton, useErrorHandler } from '../components/AdminUi';
import { getApplication, editApplication, getFormTechnologies } from '../adminApi';
import {
  GENDERS,
  QUALIFICATIONS,
  DURATIONS,
  LETTER_TYPES,
  LOCATIONS,
  INTERNSHIP_MODES,
  REFERENCE_SOURCES,
  REFERENCE_DETAIL_LABELS,
} from '../../constants/formOptions';

// Superadmin only: correct a mistake in a saved application (wrong email, phone, name …).
// Documents cannot be changed here.

// "Ref. from Friends - Rahul" -> { source: 'Ref. from Friends', detail: 'Rahul' }
function splitReference(reference) {
  for (let i = 0; i < REFERENCE_SOURCES.length; i++) {
    const source = REFERENCE_SOURCES[i].value;
    if (reference === source) {
      return { source: source, detail: '' };
    }
    if (reference.startsWith(source + ' - ')) {
      return { source: source, detail: reference.slice(source.length + 3) };
    }
  }
  return { source: '', detail: reference };
}

function optionValue(option) {
  return typeof option === 'string' ? option : option.value;
}

function Field({ label, error, children, wide }) {
  return (
    <label className={'block' + (wide ? ' sm:col-span-2' : '')}>
      <span className="mb-1 block text-[13px] font-semibold text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[13px] font-medium text-accent-600">{error}</span>}
    </label>
  );
}

function SelectField({ label, value, options, error, onChange }) {
  return (
    <Field label={label} error={error}>
      <select
        value={value}
        onChange={function (event) {
          onChange(event.target.value);
        }}
        className={inputClass + ' cursor-pointer'}
      >
        <option value="">Select…</option>
        {options.map(function (option) {
          const value = optionValue(option);
          return (
            <option key={value} value={value}>
              {typeof option === 'string' ? option : option.label}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

// Tick boxes for a list (technologies, durations, letters)
function CheckList({ label, options, values, error, onChange }) {
  function toggle(value) {
    if (values.includes(value)) {
      onChange(
        values.filter(function (item) {
          return item !== value;
        })
      );
    } else {
      onChange(values.concat([value]));
    }
  }
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-1.5 block text-[13px] font-semibold text-slate-700">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(function (value) {
          const isChecked = values.includes(value);
          return (
            <label
              key={value}
              className={
                'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ' +
                (isChecked ? 'border-brand-600 bg-brand-50 font-medium text-brand-800' : 'border-slate-200 text-slate-700 hover:border-slate-300')
              }
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={function () {
                  toggle(value);
                }}
                className="h-4 w-4 accent-brand-700"
              />
              {value}
            </label>
          );
        })}
      </div>
      {error && <span className="mt-1 block text-[13px] font-medium text-accent-600">{error}</span>}
    </fieldset>
  );
}

function EditApplicationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const handleError = useErrorHandler();
  const [application, setApplication] = useState(null);
  const [values, setValues] = useState(null);
  const [technologyOptions, setTechnologyOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(
    function () {
      Promise.all([getApplication(id), getFormTechnologies().catch(function () { return []; })])
        .then(function (results) {
          const app = results[0];
          if (app.deletedAt) {
            setNotice({ type: 'error', text: 'This application is in the trash. Restore it first to edit it.' });
            return;
          }
          // Today's technologies plus any old ones this application has
          const options = results[1].slice();
          for (let i = 0; i < app.technologies.length; i++) {
            if (!options.includes(app.technologies[i])) {
              options.push(app.technologies[i]);
            }
          }
          const reference = splitReference(app.reference);
          setTechnologyOptions(options);
          setApplication(app);
          setValues({
            fullName: app.fullName,
            email: app.email,
            contactNumber: app.contactNumber,
            parentContactNumber: app.parentContactNumber,
            gender: app.gender,
            address: app.address,
            qualification: app.qualification,
            specialization: app.specialization,
            institute: app.institute,
            semester: String(app.semester),
            passoutYear: String(app.passoutYear),
            technologies: app.technologies,
            durations: app.durations,
            letters: app.letters,
            location: app.location,
            mode: app.mode,
            projectIncluded: app.projectIncluded ? 'yes' : 'no',
            referenceSource: reference.source,
            referenceDetail: reference.detail,
          });
        })
        .catch(function (error) {
          handleError(error, function (message) {
            setNotice({ type: 'error', text: message });
          });
        });
    },
    [id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function update(name, value) {
    setValues({ ...values, [name]: value });
    setErrors({ ...errors, [name]: '' });
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    setErrors({});
    setNotice({ type: '', text: '' });

    let reference = values.referenceSource;
    if (REFERENCE_DETAIL_LABELS[values.referenceSource] && values.referenceDetail.trim()) {
      reference = values.referenceSource + ' - ' + values.referenceDetail.trim();
    }
    const body = { ...values, reference: reference };
    delete body.referenceSource;
    delete body.referenceDetail;

    try {
      const result = await editApplication(id, body);
      navigate('/admin/applications/' + id, { replace: true, state: { savedMessage: result.message } });
    } catch (error) {
      if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
        setErrors(error.fieldErrors);
        setNotice({ type: 'error', text: error.message });
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
  const yearOptions = [];
  for (let y = year + 10; y >= year - 10; y--) {
    yearOptions.push(String(y));
  }
  const semesterOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const detailConfig = values ? REFERENCE_DETAIL_LABELS[values.referenceSource] : null;

  function text(name, label, props) {
    return (
      <Field label={label} error={errors[name]} wide={props && props.wide}>
        <input
          type={(props && props.type) || 'text'}
          inputMode={props && props.inputMode}
          maxLength={props && props.maxLength}
          value={values[name]}
          onChange={function (event) {
            update(name, event.target.value);
          }}
          list={props && props.list}
          className={inputClass}
        />
      </Field>
    );
  }

  return (
    <AdminLayout>
      <Link to={'/admin/applications/' + id} className="text-sm font-semibold text-brand-700 hover:underline">
        ← Back to the application
      </Link>
      <div className="mt-4">
        <PageTitle
          title={application ? 'Edit ' + application.fullName : 'Edit application'}
          subtitle={application ? application.referenceNo + ' · Every change is saved in the activity log (old → new value).' : ''}
        />
      </div>

      <Alert type={notice.type} className="mt-5">{notice.text}</Alert>
      {!values && !notice.text && <p className="py-16 text-center text-sm text-slate-500">Loading…</p>}

      {values && (
        <form onSubmit={handleSave} noValidate className="mt-5 space-y-5">
          <Card title="Personal information">
            <div className="grid gap-4 sm:grid-cols-2">
              {text('fullName', 'Full name', { maxLength: 80 })}
              <SelectField label="Gender" value={values.gender} options={GENDERS} error={errors.gender} onChange={function (v) { update('gender', v); }} />
              {text('contactNumber', 'Contact number', { inputMode: 'numeric', maxLength: 10 })}
              {text('parentContactNumber', 'Parent contact number', { inputMode: 'numeric', maxLength: 10 })}
              {text('email', 'Email', { type: 'email', maxLength: 120, wide: true })}
              <Field label="Address" error={errors.address} wide>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={values.address}
                  onChange={function (event) {
                    update('address', event.target.value);
                  }}
                  className={inputClass + ' resize-y'}
                />
              </Field>
            </div>
          </Card>

          <Card title="Education">
            <div className="grid gap-4 sm:grid-cols-2">
              {text('qualification', 'Qualification', { maxLength: 80, list: 'qualification-options' })}
              <datalist id="qualification-options">
                {QUALIFICATIONS.map(function (option) {
                  return <option key={optionValue(option)} value={optionValue(option)} />;
                })}
              </datalist>
              {text('specialization', 'Specialization', { maxLength: 100 })}
              {text('institute', 'Institute / training center', { maxLength: 150, wide: true })}
              <SelectField label="Current semester" value={values.semester} options={semesterOptions} error={errors.semester} onChange={function (v) { update('semester', v); }} />
              <SelectField label="Passout year" value={values.passoutYear} options={yearOptions} error={errors.passoutYear} onChange={function (v) { update('passoutYear', v); }} />
            </div>
          </Card>

          <Card title="Internship details">
            <div className="grid gap-4 sm:grid-cols-2">
              <CheckList label="Technologies" options={technologyOptions} values={values.technologies} error={errors.technologies} onChange={function (v) { update('technologies', v); }} />
              <CheckList label="Durations" options={DURATIONS.map(optionValue)} values={values.durations} error={errors.durations} onChange={function (v) { update('durations', v); }} />
              <SelectField label="Location" value={values.location} options={LOCATIONS} error={errors.location} onChange={function (v) { update('location', v); }} />
              <SelectField label="Mode" value={values.mode} options={INTERNSHIP_MODES} error={errors.mode} onChange={function (v) { update('mode', v); }} />
              <SelectField
                label="Project included"
                value={values.projectIncluded}
                options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                error={errors.projectIncluded}
                onChange={function (v) { update('projectIncluded', v); }}
              />
              <SelectField label="Reference" value={values.referenceSource} options={REFERENCE_SOURCES} error={errors.referenceSource} onChange={function (v) { update('referenceSource', v); }} />
              {detailConfig && text('referenceDetail', detailConfig.label, { maxLength: 60 })}
              <CheckList label="Letters required" options={LETTER_TYPES.map(optionValue)} values={values.letters} error={errors.letters} onChange={function (v) { update('letters', v); }} />
            </div>
          </Card>

          <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-xl sm:border">
            <Link to={'/admin/applications/' + id} className={secondaryButton}>
              Cancel
            </Link>
            <button type="submit" disabled={isSaving} className={primaryButton}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </AdminLayout>
  );
}

export default EditApplicationPage;
