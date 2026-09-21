import { useEffect, useRef, useState } from 'react';
import { CardPreview } from '../components/CardPreview';
import { CATEGORIES, GENERATORS } from '../generators';
import type { Category, Generator } from '../generators/types';
import { hrefFor } from '../lib/router';
import { aspectLabel } from '../lib/sizes';

const SEARCH_KEY = 'vam:search';
const FAVORITES_KEY = 'vam:favorites';

function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });
  const toggle = (id: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  return { favorites, toggle };
}

function matches(g: Generator, terms: string[]) {
  // Capability keywords come from the generator's definition so tags can't drift out of sync.
  const capabilities = [
    g.animation ? 'animated animation motion video webm mp4' : 'image still png',
    g.transparent ? 'transparent alpha overlay' : '',
    g.soundtrack ? 'audio sound music' : '',
    'hd 1080p 2k 1440p 4k uhd 2160p',
  ];
  const haystack = [g.name, g.description, g.category, ...g.tags, ...g.sizes.map((s) => s.label), ...capabilities].join(' ').toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

function AssetCard({ generator: g, favorite, onToggleFavorite }: { generator: Generator; favorite: boolean; onToggleFavorite: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div className="card" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        className={`fav-btn${favorite ? ' is-on' : ''}`}
        onClick={onToggleFavorite}
        aria-pressed={favorite}
        aria-label={favorite ? `Remove ${g.name} from favourites` : `Add ${g.name} to favourites`}
        title={favorite ? 'Remove from favourites' : 'Add to favourites'}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="m12 17.3-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z" />
        </svg>
      </button>
      <div className={`card-media${g.transparent ? ' checker' : ''}`}>
        <CardPreview generator={g} playing={hover} />
        {g.animation && <span className="card-play" aria-hidden>{hover ? '❚❚' : '▶'}</span>}
      </div>
      <div className="card-body">
        <div className="card-title-row">
          <h3>
            <a className="card-link" href={hrefFor(`/g/${g.id}`)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
              {g.name}
            </a>
          </h3>
          <span className="card-size" title="Formats · exports up to 4K">
            {g.sizes.map(aspectLabel).join(' · ')}
          </span>
        </div>
        <p>{g.description}</p>
        <div className="badges">
          <span className="badge">{g.category}</span>
          {g.animation ? <span className="badge badge-anim">Animated</span> : <span className="badge">Image</span>}
          {g.transparent && <span className="badge badge-alpha">Transparent</span>}
          {g.soundtrack && <span className="badge badge-audio">Audio</span>}
        </div>
      </div>
    </div>
  );
}

export function Home() {
  const [query, setQuery] = useState(() => sessionStorage.getItem(SEARCH_KEY) ?? '');
  const [category, setCategory] = useState<Category | 'All' | 'Favorites'>('All');
  const { favorites, toggle } = useFavorites();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sessionStorage.setItem(SEARCH_KEY, query);
  }, [query]);

  // "/" focuses search from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const searched = GENERATORS.filter((g) => matches(g, terms));
  const results =
    category === 'All' ? searched : category === 'Favorites' ? searched.filter((g) => favorites.has(g.id)) : searched.filter((g) => g.category === category);
  const favCount = searched.filter((g) => favorites.has(g.id)).length;
  const countFor = (c: Category) => searched.filter((g) => g.category === c).length;

  return (
    <main className="home">
      <section className="hero">
        <h1>
          Every asset your next video needs,
          <br />
          <span className="hero-accent">made in the browser.</span>
        </h1>
        <p className="hero-sub">Thumbnails, lower thirds, intros, end screens and more. Tweak anything, export PNG or video.</p>
        <div className="search">
          <svg viewBox="0 0 24 24" aria-hidden className="search-icon">
            <path d="M10.5 3a7.5 7.5 0 0 1 5.96 12.06l4.24 4.24-1.4 1.4-4.24-4.24A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z" />
          </svg>
          <input
            ref={input}
            type="search"
            placeholder="Search assets — try “animated”, “subscribe” or “shorts”"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuery('');
              if (e.key === 'Enter' && results.length === 1) window.location.hash = `/g/${results[0].id}`;
            }}
            aria-label="Search assets"
          />
          {query ? (
            <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              ×
            </button>
          ) : (
            <kbd>/</kbd>
          )}
        </div>
      </section>

      <nav className="chips" aria-label="Filter by category">
        <button className={`chip${category === 'All' ? ' is-active' : ''}`} onClick={() => setCategory('All')}>
          All <span>{searched.length}</span>
        </button>
        <button
          className={`chip chip-fav${category === 'Favorites' ? ' is-active' : ''}`}
          onClick={() => setCategory('Favorites')}
          disabled={!favCount && category !== 'Favorites'}
          title={favorites.size ? undefined : 'Star a generator to pin it here'}
        >
          ★ Favourites <span>{favCount}</span>
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip${category === c ? ' is-active' : ''}`} onClick={() => setCategory(c)} disabled={!countFor(c)}>
            {c} <span>{countFor(c)}</span>
          </button>
        ))}
      </nav>

      {results.length ? (
        <div className="grid">
          {results.map((g) => (
            <AssetCard key={g.id} generator={g} favorite={favorites.has(g.id)} onToggleFavorite={() => toggle(g.id)} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>{category === 'Favorites' && !query ? 'No favourites yet' : `No assets match “${query}”`}</h2>
          <p>{category === 'Favorites' ? 'Star any generator to pin it here.' : 'Try a broader word like “title”, “overlay” or “channel”.'}</p>
          <button
            className="btn"
            onClick={() => {
              setQuery('');
              setCategory('All');
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </main>
  );
}
