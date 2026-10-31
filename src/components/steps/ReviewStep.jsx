import { FieldError } from '../ui/Field';
import { DECLARATION_TEXT, DOCUMENTS, STEPS } from '../../constants/formOptions';
import { buildReferenceText } from '../../services/applicationApi';

function ReviewSection({ title, stepIndex, rows, onEdit }) {
  return (
    <section className="rounded-xl border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <button
          type="button"
          onClick={function () {
            onEdit(stepIndex);
          }}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M13.59 3.59a2 2 0 112.83 2.83l-.79.79-2.83-2.83.79-.79zM11.38 5.8L3 14.17V17h2.83l8.38-8.38-2.83-2.82z" />
          </svg>
          Edit
        </button>
      </div>
      <dl className="grid gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
        {rows.map(function (row) {
          return (
            <div key={row.label} className={row.wide ? 'sm:col-span-2' : ''}>
              <dt className="text-[13px] text-slate-500">{row.label}</dt>
              <dd className="mt-0.5 break-words text-sm font-medium text-slate-800">{row.value || '—'}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function ReviewStep({ values, files, errors, onValueChange, onEdit }) {
  let qualification = values.qualification;
  if (qualification === 'Other') {
    qualification = values.qualificationOther;
  }

  let semesterText = '';
  if (values.semester) {
    semesterText = 'Semester ' + values.semester;
  }

  const documentRows = [];
  for (let i = 0; i < DOCUMENTS.length; i++) {
    const file = files[DOCUMENTS[i].name];
    documentRows.push({ label: DOCUMENTS[i].label, value: file ? file.name : 'Not uploaded' });
  }

  return (
    <div className="space-y-4">
      <ReviewSection
        title={STEPS[0].title}
        stepIndex={0}
        onEdit={onEdit}
        rows={[
          { label: 'Full name', value: values.fullName },
          { label: 'Email', value: values.email },
          { label: 'Contact number', value: values.contactNumber ? '+91 ' + values.contactNumber : '' },
          { label: 'Parent contact', value: values.parentContactNumber ? '+91 ' + values.parentContactNumber : '' },
          { label: 'Gender', value: values.gender },
          { label: 'Address', value: values.address, wide: true },
        ]}
      />

      <ReviewSection
        title={STEPS[1].title}
        stepIndex={1}
        onEdit={onEdit}
        rows={[
          { label: 'Qualification', value: qualification },
          { label: 'Specialization', value: values.specialization },
          { label: 'Institute', value: values.institute },
          { label: 'Current semester', value: semesterText },
          { label: 'Passout year', value: values.passoutYear },
        ]}
      />

      <ReviewSection
        title={STEPS[2].title}
        stepIndex={2}
        onEdit={onEdit}
        rows={[
          { label: 'Technology', value: values.technologies.join(', '), wide: true },
          { label: 'Duration', value: values.durations.join(', '), wide: true },
          { label: 'Location', value: values.location },
          { label: 'Mode', value: values.mode },
          { label: 'Project included', value: values.projectIncluded === 'yes' ? 'Yes' : values.projectIncluded === 'no' ? 'No' : '' },
          { label: 'Reference', value: values.referenceSource ? buildReferenceText(values) : '' },
          { label: 'Letters', value: values.letters.join(', '), wide: true },
        ]}
      />

      <ReviewSection title={STEPS[3].title} stepIndex={3} onEdit={onEdit} rows={documentRows} />

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-slate-800">Declaration</h3>
        </div>
        <div className="px-4 py-4">
          <p className="text-[13px] leading-relaxed text-slate-600">{DECLARATION_TEXT}</p>

          <label
            className={
              'mt-4 flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-brand-600/20 ' +
              (values.declarationAccepted
                ? 'border-brand-700 bg-brand-50'
                : errors.declarationAccepted
                  ? 'border-accent-500 bg-accent-50/50'
                  : 'border-slate-200 hover:border-brand-300')
            }
          >
            <input
              type="checkbox"
              name="declarationAccepted"
              checked={values.declarationAccepted}
              onChange={function (event) {
                onValueChange('declarationAccepted', event.target.checked);
              }}
              className="sr-only"
            />
            <span
              className={
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ' +
                (values.declarationAccepted
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-slate-300 bg-white text-transparent')
              }
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.79 6.8-6.8a1 1 0 011.4 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <span className="text-sm font-medium text-slate-800">
              I have read and agree to the above declaration and terms and conditions.
              <span className="text-accent-500"> *</span>
            </span>
          </label>
          <FieldError message={errors.declarationAccepted} />
        </div>
      </section>
    </div>
  );
}

export default ReviewStep;
