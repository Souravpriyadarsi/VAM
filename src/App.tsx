import { Icon } from './components/Icon';
import { getGenerator, GENERATORS } from './generators';
import { GeneratorPage } from './pages/editor/GeneratorPage';
import { Home } from './pages/Home';
import { hrefFor, useRoute } from './lib/router';

function NotFound() {
  return (
    <main className="empty">
      <h2>That asset doesn’t exist</h2>
      <p>It may have been renamed. Head back to browse all {GENERATORS.length} generators.</p>
      <a className="btn btn-primary" href={hrefFor('/')}>
        Browse assets
      </a>
    </main>
  );
}

export function App() {
  const path = useRoute();
  const match = path.match(/^\/g\/([\w-]+)/);
  const generator = match ? getGenerator(match[1]) : undefined;

  return (
    <div className={`app${match ? ' app-editor' : ''}`}>
      <header className="topbar">
        <a className="brand" href={hrefFor('/')}>
          <span className="brand-mark" aria-hidden>
            <Icon name="logo" />
          </span>
          Video Asset Maker
        </a>
        <span className="topbar-meta">{GENERATORS.length} generators · runs entirely in your browser</span>
      </header>
      {!match ? <Home /> : generator ? <GeneratorPage key={generator.id} generator={generator} /> : <NotFound />}
    </div>
  );
}
