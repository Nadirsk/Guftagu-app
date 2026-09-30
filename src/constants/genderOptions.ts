import { CircleQuestionMark, Mars, Transgender, Venus } from 'lucide-react-native';

import type { SelectOption } from '../components/SelectModal';

/**
 * `apiValue` is what POST /auth/profile/setup accepts — the backend enum is only
 * male/female/undisclosed, so the two non-binary choices both report as
 * undisclosed while staying distinct in the UI.
 */
export type GenderOption = SelectOption & {
  apiValue: 'male' | 'female' | 'undisclosed';
};

export const GENDER_OPTIONS: GenderOption[] = [
  { value: 'Male', label: 'Male', Icon: Mars, apiValue: 'male' },
  { value: 'Female', label: 'Female', Icon: Venus, apiValue: 'female' },
  { value: 'Other', label: 'Other', Icon: Transgender, apiValue: 'undisclosed' },
  {
    value: 'Prefer not to say',
    label: 'Prefer not to say',
    Icon: CircleQuestionMark,
    apiValue: 'undisclosed',
  },
];
