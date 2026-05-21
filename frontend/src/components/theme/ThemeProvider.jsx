import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { DEFAULT_FONT_PREFERENCE, getFontFamily, getFontOption } from '../../constants/fontPreferences';

export default function ThemeProvider({ children }) {
  const preferredFont = useSelector(
    state => state.auth.user?.preferredFont || DEFAULT_FONT_PREFERENCE,
  );

  useEffect(() => {
    const fontOption = getFontOption(preferredFont);
    const root = document.documentElement;

    root.style.setProperty('--font-sans', getFontFamily(fontOption.value));
    root.dataset.fontPreference = fontOption.value;
  }, [preferredFont]);

  return children;
}
