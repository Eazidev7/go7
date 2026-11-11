import { useEffect, useState } from 'react';

/**
 * Returns bottom inset (px) when the mobile keyboard shrinks the visual viewport.
 * Keeps fixed footers above the keyboard on iOS Safari / Android Chrome.
 */
export function useVisualViewportInset() {
  const [inset, setInset] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const update = () => {
      const gap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      const open = gap > 40;
      setInset(open ? gap : 0);
      setKeyboardOpen(open);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return { bottomInset: inset, keyboardOpen };
}
