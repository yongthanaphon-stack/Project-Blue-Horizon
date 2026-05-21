import { Search } from 'lucide-react';
import { truncateText } from '../../utils/text';

const PESTEL_LABELS = {
  POLITICAL: 'POLITICAL',
  ECONOMIC: 'ECONOMIC',
  SOCIAL: 'SOCIAL',
  TECHNOLOGICAL: 'TECHNOLOGY',
  ENVIRONMENTAL: 'ENVIRONMENTAL',
  LEGAL: 'LEGAL',
};

function getCategoryLabel(signal) {
  const category = signal.pestelCategories?.[0];
  return PESTEL_LABELS[category] || category || signal.impactLevel || 'SIGNAL';
}

export default function SignalSearchSuggestions({
  examples = [],
  loading = false,
  onSearch,
  onSelectSignal,
  query,
  suggestions = [],
  visible,
}) {
  if (!visible) return null;

  const term = query.trim();
  const showExamples = term.length < 2;
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="signal-search-suggestions" role="listbox">
      {showExamples ? (
        <>
          <div className="signal-search-suggestions-title">Example searches</div>
          <div className="signal-search-examples">
            {examples.map(example => (
              <button
                key={example}
                type="button"
                className="signal-search-example"
                onClick={() => onSearch(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="signal-search-suggestions-title">
            {loading ? 'Searching signals...' : 'Matching signals'}
          </div>

          {hasSuggestions ? (
            <div className="signal-search-suggestion-list">
              {suggestions.map(signal => (
                <button
                  key={signal.id}
                  type="button"
                  className="signal-search-suggestion"
                  onClick={() => onSelectSignal(signal)}
                  role="option"
                >
                  <span className="signal-search-suggestion-main">
                    <strong>{signal.name}</strong>
                    <small>{truncateText(signal.shortDetails || '', 82)}</small>
                  </span>
                  <span className="signal-search-suggestion-meta">
                    {getCategoryLabel(signal)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="signal-search-empty">
              {loading ? 'Looking for close matches...' : 'No close matches yet.'}
            </div>
          )}

          <button
            type="button"
            className="signal-search-all"
            onClick={() => onSearch(term)}
          >
            <Search size={15} />
            Search for "{term}"
          </button>
        </>
      )}
    </div>
  );
}
