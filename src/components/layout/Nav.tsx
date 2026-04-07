import { useEffect, useState } from 'react';

import styles from './Nav.module.css';

interface NavLink {
  id: string;
  label: string;
}

const LINKS: readonly NavLink[] = [
  { id: 'race', label: 'THE RACE' },
  { id: 'geomap', label: 'GEO MAP' },
  { id: 'sites', label: 'INTEL' },
  { id: 'models', label: 'MODELS' },
];

const LINK_IDS: readonly string[] = LINKS.map((l) => l.id);

/** Scroll-spy: track whichever section the user has scrolled past. */
function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0] ?? '');

  useEffect(() => {
    const handler = (): void => {
      let current = ids[0] ?? '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 100) {
          current = id;
        }
      }
      setActive(current);
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [ids]);

  return active;
}

export function Nav(): JSX.Element {
  const active = useActiveSection(LINK_IDS);

  return (
    <nav className={styles.nav}>
      <span className={styles.brand}>AI ARMS RACE</span>
      {LINKS.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          className={`${styles.link} ${active === link.id ? styles.active : ''}`}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
