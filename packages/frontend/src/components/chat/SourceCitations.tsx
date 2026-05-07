import type { SourceReference } from '../../types';

interface SourceCitationsProps {
  sources: SourceReference[];
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  if (sources.length === 0) return null;

  const uniqueFiles = Array.from(new Map(sources.map((s) => [s.fileName, s])).values());

  return (
    <div className="sources" role="complementary" aria-label="Source documents">
      <p className="sources__label">Sources</p>
      <ul className="sources__list">
        {uniqueFiles.map((source) => (
          <li key={source.documentId + source.fileName} className="sources__item">
            <span className="sources__icon">📄</span>
            <span className="sources__filename">{source.fileName}</span>
            <span className="sources__score" title="Relevance score">
              {Math.round(source.score * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
