import { TextInput, PhoneInput, TextArea } from '../ui/Inputs';
import { ChoiceCards } from '../ui/ChoiceCards';
import { GENDERS } from '../../constants/formOptions';

function PersonalStep({ values, errors, onChange, onValueChange, onBlur }) {
  return (
    <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
      <TextInput
        className="sm:col-span-2"
        label="Full Name"
        name="fullName"
        required
        autoComplete="name"
        autoCapitalize="words"
        placeholder="e.g. Riya Patel"
        hint="As written on your college ID or Aadhaar card."
        value={values.fullName}
        error={errors.fullName}
        onChange={onChange}
        onBlur={onBlur}
      />

      <TextInput
        className="sm:col-span-2"
        label="Email Address"
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="you@example.com"
        value={values.email}
        error={errors.email}
        onChange={onChange}
        onBlur={onBlur}
      />

      <PhoneInput
        label="Contact Number"
        name="contactNumber"
        required
        value={values.contactNumber}
        error={errors.contactNumber}
        onChange={onChange}
        onBlur={onBlur}
      />

      <PhoneInput
        label="Parent Contact Number"
        name="parentContactNumber"
        required
        value={values.parentContactNumber}
        error={errors.parentContactNumber}
        onChange={onChange}
        onBlur={onBlur}
      />

      <ChoiceCards
        className="sm:col-span-2"
        label="Gender"
        name="gender"
        required
        compact
        gridClass="grid-cols-2 sm:max-w-sm"
        options={GENDERS}
        value={values.gender}
        error={errors.gender}
        onChange={onValueChange}
      />

      <TextArea
        className="sm:col-span-2"
        label="Address"
        name="address"
        required
        rows={3}
        maxLength={300}
        autoComplete="street-address"
        placeholder="House / flat no., street, area, city, pincode"
        value={values.address}
        error={errors.address}
        onChange={onChange}
        onBlur={onBlur}
      />
    </div>
  );
}

export default PersonalStep;
