import { useEffect, useState } from 'react';

const current = () => window.location.hash.replace(/^#/, '') || '/';

/** Minimal hash router: `#/` is home, `#/g/<id>` is a generator. */
export function useRoute() {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const onChange = () => {
      setPath(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

export const hrefFor = (path: string) => `#${path}`;
