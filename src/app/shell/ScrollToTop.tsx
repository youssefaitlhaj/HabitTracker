import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Opening another section (or settings tab) starts at the top of the page; in-page #links still work. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}
