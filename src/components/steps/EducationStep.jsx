import { TextInput, SelectInput } from '../ui/Inputs';
import {
  QUALIFICATIONS,
  getSemesterOptions,
  getPassoutYearOptions,
} from '../../constants/formOptions';

const SEMESTER_OPTIONS = getSemesterOptions();
const PASSOUT_YEAR_OPTIONS = getPassoutYearOptions();

function EducationStep({ values, errors, onChange, onBlur }) {
  return (
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
          required
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
          required
          placeholder="e.g. Computer Science, IT"
          value={values.specialization}
          error={errors.specialization}
          onChange={onChange}
          onBlur={onBlur}
        />
      )}

      <TextInput
        className="sm:col-span-2"
        label="Institute Name / Training Center"
        name="institute"
        required
        placeholder="e.g. Gujarat University"
        value={values.institute}
        error={errors.institute}
        onChange={onChange}
        onBlur={onBlur}
      />

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

      <SelectInput
        label="Passout Year"
        name="passoutYear"
        required
        placeholder="Select year"
        hint="The year you will complete your course."
        options={PASSOUT_YEAR_OPTIONS}
        value={values.passoutYear}
        error={errors.passoutYear}
        onChange={onChange}
        onBlur={onBlur}
      />
    </div>
  );
}

export default EducationStep;
