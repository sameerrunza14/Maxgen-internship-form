import { TextInput, SelectInput } from '../ui/Inputs';
import { ChoiceCards } from '../ui/ChoiceCards';
import {
  QUALIFICATIONS,
  EDUCATION_STATUSES,
  getSemesterOptions,
  getPassoutYearOptions,
} from '../../constants/formOptions';
import { getFormConfig } from '../../config/formConfig';

const SEMESTER_OPTIONS = getSemesterOptions();

function EducationStep({ values, errors, onChange, onValueChange, onBlur }) {
  const isPassout = values.educationStatus === 'passout';
  const hasChosenStatus = values.educationStatus !== '';
  // Pursuing: this year and later. Passout: this year and earlier. "Years ahead" comes from the admin Settings page.
  const passoutYearOptions = getPassoutYearOptions(getFormConfig().passoutYearsAhead, values.educationStatus);

  return (
    <div className="space-y-6">
      <ChoiceCards
        label="Current Status"
        name="educationStatus"
        required
        compact
        gridClass="grid-cols-2 gap-2.5 sm:max-w-lg sm:gap-3"
        options={EDUCATION_STATUSES}
        value={values.educationStatus}
        error={errors.educationStatus}
        onChange={onValueChange}
      />

      {hasChosenStatus && (
        <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
          <SelectInput
            label="Educational Qualification"
            name="qualification"
            required
            placeholder="Select qualification"
            options={QUALIFICATIONS}
            value={values.qualification}
            error={errors.qualification}
            onChange={onChange}
            onBlur={onBlur}
          />

          {values.qualification === 'Other' ? (
            <TextInput
              label="Your Qualification"
              name="qualificationOther"
              required
              placeholder="e.g. B.Com, PGDCA"
              value={values.qualificationOther}
              error={errors.qualificationOther}
              onChange={onChange}
              onBlur={onBlur}
            />
          ) : (
            <TextInput
              label="Specialization"
              name="specialization"
              optional
              placeholder="e.g. Computer Science, IT"
              value={values.specialization}
              error={errors.specialization}
              onChange={onChange}
              onBlur={onBlur}
            />
          )}

          {values.qualification === 'Other' && (
            <TextInput
              className="sm:col-span-2"
              label="Specialization"
              name="specialization"
              optional
              placeholder="e.g. Computer Science, IT"
              value={values.specialization}
              error={errors.specialization}
              onChange={onChange}
              onBlur={onBlur}
            />
          )}

          <TextInput
            className="sm:col-span-2"
            label="College / University Name"
            name="institute"
            required
            placeholder="e.g. Gujarat University"
            value={values.institute}
            error={errors.institute}
            onChange={onChange}
            onBlur={onBlur}
          />

          {isPassout && (
            <TextInput
              className="sm:col-span-2"
              label="Training Center / Company Name"
              name="trainingCenter"
              optional
              placeholder="If you did a course or internship after college, e.g. ABC Institute"
              value={values.trainingCenter}
              error={errors.trainingCenter}
              onChange={onChange}
              onBlur={onBlur}
            />
          )}

          {!isPassout && (
            <SelectInput
              label="Current Semester"
              name="semester"
              required
              placeholder="Select semester"
              options={SEMESTER_OPTIONS}
              value={values.semester}
              error={errors.semester}
              onChange={onChange}
              onBlur={onBlur}
            />
          )}

          <SelectInput
            label="Passout Year"
            name="passoutYear"
            required
            placeholder="Select year"
            hint={isPassout ? 'The year you completed your course.' : 'The year you will complete your course.'}
            options={passoutYearOptions}
            value={values.passoutYear}
            error={errors.passoutYear}
            onChange={onChange}
            onBlur={onBlur}
          />
        </div>
      )}
    </div>
  );
}

export default EducationStep;
