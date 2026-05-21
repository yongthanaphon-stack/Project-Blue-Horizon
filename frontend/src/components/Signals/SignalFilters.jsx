import { X, Search, Calendar } from 'lucide-react';

const PESTEL_OPTIONS = [
  { label: 'Political', value: 'POLITICAL' },
  { label: 'Economic', value: 'ECONOMIC' },
  { label: 'Social', value: 'SOCIAL' },
  { label: 'Tech', value: 'TECHNOLOGICAL' },
  { label: 'Enviro', value: 'ENVIRONMENTAL' },
  { label: 'Legal', value: 'LEGAL' },
];

const IMPACT_OPTIONS = [
  { label: 'Global', value: 'GLOBAL' },
  { label: 'Region', value: 'REGION' },
  { label: 'Country', value: 'COUNTRY' },
];

const HORIZON_OPTIONS = [
  { label: 'H1', value: 'H1' },
  { label: 'H2', value: 'H2' },
  { label: 'H3', value: 'H3' },
];

export default function SignalFilters({ filters, onChange, onClear }) {
  function updateFilter(key, value) {
    onChange({ ...filters, [key]: value });
  }

  function toggleMultiSelect(key, value) {
    const current = filters[key] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFilter(key, updated);
  }

  const hasActiveFilters =
    filters.search ||
    (filters.pestel?.length > 0) ||
    (filters.impact?.length > 0) ||
    (filters.horizon?.length > 0) ||
    filters.startDate ||
    filters.endDate;

  return (
    <div className="signal-filters-container">
      {/* Search Row */}
      <div className="filter-row filter-search-row">
        <div className="filter-search-input-wrapper">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search signals by title or description..."
            value={filters.search || ''}
            onChange={e => updateFilter('search', e.target.value)}
            className="filter-search-input"
          />
          {filters.search && (
            <button
              type="button"
              className="filter-clear-btn"
              onClick={() => updateFilter('search', '')}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Multi-select Filters Row */}
      <div className="filter-row filter-selects-row">
        {/* PESTEL Multi-select */}
        <div className="filter-group">
          <label className="filter-group-label">PESTEL</label>
          <div className="filter-checkboxes">
            {PESTEL_OPTIONS.map(option => (
              <label key={option.value} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.pestel?.includes(option.value) || false}
                  onChange={() => toggleMultiSelect('pestel', option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Impact Multi-select */}
        <div className="filter-group">
          <label className="filter-group-label">Impact Level</label>
          <div className="filter-checkboxes">
            {IMPACT_OPTIONS.map(option => (
              <label key={option.value} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.impact?.includes(option.value) || false}
                  onChange={() => toggleMultiSelect('impact', option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Time Horizon Multi-select */}
        <div className="filter-group">
          <label className="filter-group-label">Time Horizon</label>
          <div className="filter-checkboxes">
            {HORIZON_OPTIONS.map(option => (
              <label key={option.value} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.horizon?.includes(option.value) || false}
                  onChange={() => toggleMultiSelect('horizon', option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Filters Row (Date Range) */}
      <div className="filter-row filter-advanced-row">
        <div className="filter-group filter-date-group">
          <label className="filter-group-label">
            <Calendar size={16} />
            Created Date Range
          </label>
          <div className="filter-date-inputs">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={e => updateFilter('startDate', e.target.value)}
              className="filter-date-input"
              placeholder="Start date"
            />
            <span className="filter-date-separator">to</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={e => updateFilter('endDate', e.target.value)}
              className="filter-date-input"
              placeholder="End date"
            />
          </div>
        </div>
      </div>

      {/* Clear All Button */}
      {hasActiveFilters && (
        <div className="filter-row filter-actions-row">
          <button
            type="button"
            className="btn btn-secondary filter-clear-all-btn"
            onClick={onClear}
          >
            <X size={16} />
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
