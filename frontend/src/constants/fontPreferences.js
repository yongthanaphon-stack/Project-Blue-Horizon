export const DEFAULT_FONT_PREFERENCE = 'google-sans-flex';

export const FONT_OPTIONS = [
  {
    value: 'google-sans-flex',
    label: 'Google Sans Flex',
    helper: 'Modern product UI',
    fontFamily: '"Google Sans Flex", sans-serif',
  },
  {
    value: 'ibm-plex-sans-thai-looped',
    label: 'IBM Plex Thai Looped',
    helper: 'Thai looped, enterprise',
    fontFamily: '"IBM Plex Sans Thai Looped", sans-serif',
  },
  {
    value: 'noto-sans-thai-looped',
    label: 'Noto Thai Looped',
    helper: 'Clean Thai readability',
    fontFamily: '"Noto Sans Thai Looped", sans-serif',
  },
  {
    value: 'prompt',
    label: 'Prompt',
    helper: 'Geometric Thai/English',
    fontFamily: '"Prompt", sans-serif',
  },
];

export function getFontOption(value) {
  return FONT_OPTIONS.find(option => option.value === value) || FONT_OPTIONS[0];
}

export function getFontFamily(value) {
  return getFontOption(value).fontFamily;
}
