import { useState, useEffect } from 'react';

/** Reage a uma media query (ex.: '(min-width: 768px)'). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** true a partir do breakpoint md (768px) — usado para liberar a visão de tabela. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
