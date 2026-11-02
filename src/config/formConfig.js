import { TECHNOLOGIES, MAX_TECHNOLOGIES, PASSOUT_YEARS_AHEAD } from '../constants/formOptions';
import { IS_DEMO_MODE } from './demoMode';

/**
 * Form settings the superadmin can change in the admin panel (Settings page):
 * open / closed, the technologies list, how many technologies, passout years ahead.
 *
 * The form starts with the built-in values from constants/formOptions.js, then
 * loadFormConfig() asks the server for the current ones. Any part of the form reads
 * them with getFormConfig().
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

let current = {
  applicationsOpen: true,
  closedMessage: '',
  technologies: TECHNOLOGIES,
  maxTechnologies: MAX_TECHNOLOGIES,
  passoutYearsAhead: PASSOUT_YEARS_AHEAD,
};

export function getFormConfig() {
  return current;
}

// ['React JS', 'Rust'] -> cards. Known technologies keep their short description.
function toTechnologyCards(names) {
  const cards = [];
  for (let i = 0; i < names.length; i++) {
    let card = null;
    for (let j = 0; j < TECHNOLOGIES.length; j++) {
      if (TECHNOLOGIES[j].value === names[i]) {
        card = TECHNOLOGIES[j];
      }
    }
    cards.push(card || { value: names[i], label: names[i], description: '' });
  }
  return cards;
}

// Returns the config. If the server cannot be reached, the built-in values are kept
// (the server still checks everything when the form is sent).
export async function loadFormConfig() {
  if (IS_DEMO_MODE) {
    return current;
  }
  try {
    const response = await fetch(API_BASE_URL + '/api/applications/config');
    const result = await response.json();
    if (response.ok && result.success) {
      const config = result.data.config;
      current = {
        applicationsOpen: config.applicationsOpen,
        closedMessage: config.closedMessage,
        technologies: toTechnologyCards(config.technologies),
        maxTechnologies: config.maxTechnologies,
        passoutYearsAhead: config.passoutYearsAhead,
      };
    }
  } catch {
    // keep the built-in values
  }
  return current;
}
