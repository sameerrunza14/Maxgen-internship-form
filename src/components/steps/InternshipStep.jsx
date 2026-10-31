import { TextInput } from '../ui/Inputs';
import { ChoiceCards } from '../ui/ChoiceCards';
import {
  TECHNOLOGIES,
  MAX_TECHNOLOGIES,
  DURATIONS,
  LETTER_TYPES,
  YES_NO,
  LOCATIONS,
  INTERNSHIP_MODES,
  REFERENCE_SOURCES,
  REFERENCE_DETAIL_LABELS,
} from '../../constants/formOptions';

function InternshipStep({ values, errors, onChange, onValueChange, onBlur }) {
  // Extra text box only for "Ref. from Friends" and "Any Other"
  const detailConfig = REFERENCE_DETAIL_LABELS[values.referenceSource];

  return (
    <div className="space-y-7 sm:space-y-8">
      <ChoiceCards
        label="Technology"
        name="technologies"
        multiple
        maxSelected={MAX_TECHNOLOGIES}
        required
        compact
        hideDescriptionOnMobile
        hint={
          'Select up to ' + MAX_TECHNOLOGIES + ' technologies.' +
          (values.technologies.length > 0 ? ' Selected: ' + values.technologies.length + ' of ' + MAX_TECHNOLOGIES + '.' : '')
        }
        gridClass="grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-3"
        options={TECHNOLOGIES}
        value={values.technologies}
        error={errors.technologies}
        onChange={onValueChange}
      />

      <ChoiceCards
        label="Duration"
        name="durations"
        multiple
        required
        compact
        hideDescriptionOnMobile
        hint="Select one or more durations that suit you."
        gridClass="grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3"
        options={DURATIONS}
        value={values.durations}
        error={errors.durations}
        onChange={onValueChange}
      />

      <ChoiceCards
        label="Letters Required"
        name="letters"
        multiple
        required
        compact
        hint="Select all the letters you need."
        gridClass="grid-cols-1 sm:grid-cols-2"
        options={LETTER_TYPES}
        value={values.letters}
        error={errors.letters}
        onChange={onValueChange}
      />

      <ChoiceCards
        label="Location"
        name="location"
        required
        compact
        hideDescriptionOnMobile
        centerOnMobile
        gridClass="grid-cols-3 gap-2.5 sm:gap-3"
        options={LOCATIONS}
        value={values.location}
        error={errors.location}
        onChange={onValueChange}
      />

      <ChoiceCards
        label="Internship Mode"
        name="mode"
        required
        compact
        hideDescriptionOnMobile
        centerOnMobile
        gridClass="grid-cols-3 gap-2.5 sm:gap-3"
        options={INTERNSHIP_MODES}
        value={values.mode}
        error={errors.mode}
        onChange={onValueChange}
      />

      <ChoiceCards
        label="Project Included?"
        name="projectIncluded"
        required
        compact
        gridClass="grid-cols-2 sm:max-w-sm"
        options={YES_NO}
        value={values.projectIncluded}
        error={errors.projectIncluded}
        onChange={onValueChange}
      />

      <div>
        <ChoiceCards
          label="Reference — How did you hear about us?"
          name="referenceSource"
          required
          compact
          gridClass="grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3"
          options={REFERENCE_SOURCES}
          value={values.referenceSource}
          error={errors.referenceSource}
          onChange={onValueChange}
        />

        {detailConfig && (
          <TextInput
            className="mt-4 sm:max-w-md"
            label={detailConfig.label}
            name="referenceDetail"
            required
            maxLength={60}
            placeholder={detailConfig.placeholder}
            value={values.referenceDetail}
            error={errors.referenceDetail}
            onChange={onChange}
            onBlur={onBlur}
          />
        )}
      </div>
    </div>
  );
}

export default InternshipStep;
