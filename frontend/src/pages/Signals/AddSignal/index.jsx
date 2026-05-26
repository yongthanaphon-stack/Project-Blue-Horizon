import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Link2, Tag, X } from 'lucide-react';
import { signalsApi } from '../../../api/api';

const PESTEL_OPTIONS = [
  { value: 'POLITICAL', label: 'Political' },
  { value: 'ECONOMIC', label: 'Economic' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'TECHNOLOGICAL', label: 'Technological' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
  { value: 'LEGAL', label: 'Legal' },
];

const STAKEHOLDERS = [
  'Academia', 'HEI', 'Administration', 'Startups',
  'SMEs', 'Industry', 'VCs/Investors', 'NGOs',
];

const DEFAULT_SIGNAL_FORM = {
  name: '',
  shortDetails: '',
  description: '',
  referenceSource: '',
  pestelCategories: [],
  stakeholders: [],
  tags: [],
  impactLevel: 'REGION',
  timeHorizon: 'H1',
  isGlobal: true,
};

const TAG_LIMIT = 12;
const EMPTY_TAG_SUGGESTIONS = {
  suggested: [],
  related: [],
  popular: [],
};

function normalizeTagValue(value = '') {
  return String(value)
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeTags(tags = []) {
  const tagSource = Array.isArray(tags) ? tags : String(tags).split(',');
  const seenTags = new Set();
  const normalizedTags = [];

  tagSource.forEach(tag => {
    const normalizedTag = normalizeTagValue(tag);
    if (!normalizedTag || seenTags.has(normalizedTag)) return;

    seenTags.add(normalizedTag);
    normalizedTags.push(normalizedTag);
  });

  return normalizedTags.slice(0, TAG_LIMIT);
}

function formatTagLabel(tag = '') {
  return String(tag)
    .split(' ')
    .map(part => {
      if (!part) return '';
      return part.length <= 3 ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    })
    .join(' ');
}

function flattenSuggestionGroups(groups) {
  const seenTags = new Set();

  return ['suggested', 'related', 'popular'].flatMap(groupKey => (
    (groups[groupKey] || []).filter(item => {
      if (!item?.tag || seenTags.has(item.tag)) return false;
      seenTags.add(item.tag);
      return true;
    }).map(item => ({ ...item, groupKey }))
  ));
}

export default function AddSignal() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('addSignalDraft');
    if (saved) {
      try {
        const savedDraft = JSON.parse(saved);
        if (savedDraft && typeof savedDraft === 'object' && !Array.isArray(savedDraft)) {
          delete savedDraft.impactScore;
          const normalizedDraft = { ...DEFAULT_SIGNAL_FORM, ...savedDraft };
          return { ...normalizedDraft, tags: normalizeTags(normalizedDraft.tags) };
        }
      } catch {
        localStorage.removeItem('addSignalDraft');
      }
    }
    return DEFAULT_SIGNAL_FORM;
  });
  
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState(EMPTY_TAG_SUGGESTIONS);
  const [tagSuggestionsLoading, setTagSuggestionsLoading] = useState(false);
  const pestelKey = form.pestelCategories.join(',');
  const tagKey = form.tags.join(',');
  const visibleTagSuggestions = useMemo(() => (
    flattenSuggestionGroups(tagSuggestions)
      .filter(item => !form.tags.includes(item.tag))
      .slice(0, 12)
  ), [form.tags, tagSuggestions]);

  useEffect(() => {
    localStorage.setItem('addSignalDraft', JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    let isMounted = true;
    const debounceTimer = window.setTimeout(async () => {
      setTagSuggestionsLoading(true);

      try {
        const response = await signalsApi.getTagSuggestions({
          query: tagInput.trim() || undefined,
          pestel: pestelKey || undefined,
          tags: tagKey || undefined,
          limit: 8,
        });

        if (!isMounted) return;
        setTagSuggestions(response.data || EMPTY_TAG_SUGGESTIONS);
      } catch (error) {
        console.warn('Failed to load tag suggestions.', error);
        if (isMounted) {
          setTagSuggestions(EMPTY_TAG_SUGGESTIONS);
        }
      } finally {
        if (isMounted) {
          setTagSuggestionsLoading(false);
        }
      }
    }, 220);

    return () => {
      isMounted = false;
      window.clearTimeout(debounceTimer);
    };
  }, [pestelKey, tagInput, tagKey]);

  function updateField(field, value) {
    if (field === 'name') {
      if (value.length > 200) setTitleError('Title cannot exceed 200 characters');
      else setTitleError('');
    }
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function updateTags(tags) {
    setForm(prev => ({ ...prev, tags: normalizeTags(tags) }));
  }

  function addTag(rawTag) {
    const normalizedTag = normalizeTagValue(rawTag);
    if (!normalizedTag) return;

    updateTags([...form.tags, normalizedTag]);
    setTagInput('');
  }

  function removeTag(tagToRemove) {
    updateTags(form.tags.filter(tag => tag !== tagToRemove));
  }

  function handleTagInputChange(event) {
    const value = event.target.value;

    if (value.includes(',')) {
      const tagParts = value.split(',');
      const completedTags = tagParts.slice(0, -1);
      updateTags([...form.tags, ...completedTags]);
      setTagInput(tagParts.at(-1) || '');
      return;
    }

    setTagInput(value);
  }

  function handleTagKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(tagInput);
      return;
    }

    if (event.key === 'Backspace' && !tagInput && form.tags.length) {
      removeTag(form.tags[form.tags.length - 1]);
    }
  }

  function togglePestel(cat) {
    setForm(prev => ({
      ...prev,
      pestelCategories: prev.pestelCategories.includes(cat)
        ? prev.pestelCategories.filter(c => c !== cat)
        : [...prev.pestelCategories, cat],
    }));
  }

  function toggleStakeholder(s) {
    setForm(prev => ({
      ...prev,
      stakeholders: prev.stakeholders.includes(s)
        ? prev.stakeholders.filter(x => x !== s)
        : [...prev.stakeholders, s],
    }));
  }

  async function handleSubmit(status = 'PUBLISHED') {
    if (form.name.length > 200) {
      setTitleError('Title cannot exceed 200 characters');
      return;
    }
    setSaving(true);
    try {
      const isPublishedSignal = status === 'PUBLISHED';
      const signalPayload = {
        ...form,
        tags: normalizeTags(form.tags),
        status,
        isGlobal: isPublishedSignal ? true : form.isGlobal,
      };
      delete signalPayload.impactScore;

      await signalsApi.create(signalPayload);
      localStorage.removeItem('addSignalDraft');
      navigate('/signals');
    } catch (error) {
      console.error(error);
      alert('Failed to save signal. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="signal-form-page workshop-form-page">
      <div className="card signal-form-card">
        <div className="signal-form-hero">
          <Link to="/signals" className="workshop-title-back-link">
            〱 Signal Bank
          </Link>
          <h1>Add New Signal</h1>
          <p>Identify and document a new strategic foresight signal to track emerging trends and potential disruptions.</p>
        </div>

        <div className="signal-form-divider" />

        {/* Signal Name */}
        <div className="form-group">
          <label className="form-label" htmlFor="signal-name">Signal Name <span style={{ color: 'red' }}>*</span></label>
          <input
            id="signal-name"
            className="form-input"
            style={{ borderColor: titleError ? 'red' : undefined }}
            placeholder="e.g., Decentralized Grid Autonomy in Urban Centers"
            value={form.name}
            onChange={e => updateField('name', e.target.value)}
          />
          {titleError && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '4px' }}>{titleError}</p>}
        </div>

        {/* Short Details */}
        <div className="form-group">
          <label className="form-label" htmlFor="short-details">Short Details</label>
          <textarea
            id="short-details"
            className="form-input"
            placeholder="Summarize the key takeaway in one or two sentences"
            rows={3}
            value={form.shortDetails}
            onChange={e => updateField('shortDetails', e.target.value)}
          />
        </div>

        {/* Brief Description */}
        <div className="form-group">
          <label className="form-label" htmlFor="description">Brief Description</label>
          <textarea
            id="description"
            className="form-input"
            placeholder="Describe the signal, its origins, and observed trends..."
            rows={5}
            value={form.description}
            onChange={e => updateField('description', e.target.value)}
          />
        </div>

        {/* Reference Source */}
        <div className="form-group">
          <label className="form-label" htmlFor="reference-source">Reference Source</label>
          <div className="form-url-input">
            <Link2 />
            <input
              id="reference-source"
              className="form-input"
              style={{ paddingLeft: 40 }}
              placeholder="https://example.com/report"
              value={form.referenceSource}
              onChange={e => updateField('referenceSource', e.target.value)}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="form-group">
          <label className="form-label" htmlFor="tags">Smart Tags</label>
          <div className="smart-tags-input">
            <Tag />
            <div className="smart-tags-chip-row">
              {form.tags.map(tag => (
                <span key={tag} className="smart-tag-chip">
                  {formatTagLabel(tag)}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove ${tag}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <input
              id="tags"
              placeholder={form.tags.length ? 'Add another tag...' : 'Type a tag, then press Enter'}
              value={tagInput}
              onChange={handleTagInputChange}
              onKeyDown={handleTagKeyDown}
              disabled={form.tags.length >= TAG_LIMIT}
            />
          </div>
          <div className="smart-tags-meta">
            <span>{form.tags.length}/{TAG_LIMIT} tags</span>
            {tagSuggestionsLoading && <span>Loading suggestions...</span>}
          </div>
          {visibleTagSuggestions.length > 0 && (
            <div className="smart-tags-suggestions">
              {visibleTagSuggestions.map(item => (
                <button
                  key={`${item.groupKey}-${item.tag}`}
                  type="button"
                  className={`smart-tag-suggestion ${item.groupKey}`}
                  onClick={() => addTag(item.tag)}
                >
                  <span>{formatTagLabel(item.tag)}</span>
                  <small>
                    {item.groupKey === 'suggested'
                      ? 'Suggested'
                      : item.groupKey === 'related'
                        ? 'Related'
                        : 'Popular'} · {item.count}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PESTEL Categories */}
        <div className="form-group">
          <label className="form-label">PESTEL Categories</label>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {PESTEL_OPTIONS.map(cat => (
              <button
                key={cat.value}
                type="button"
                className={`filter-pill ${form.pestelCategories.includes(cat.value) ? 'active' : ''}`}
                onClick={() => togglePestel(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stakeholders */}
        <div className="form-group">
          <label className="form-label">Stakeholders Involved</label>
          <div className="checkbox-grid">
            {STAKEHOLDERS.map(s => (
              <label key={s} className={`checkbox-item ${form.stakeholders.includes(s) ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={form.stakeholders.includes(s)}
                  onChange={() => toggleStakeholder(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        {/* Impact Level + Time Horizon */}
        <div className="signal-form-split mb-6">
          <div>
            <label className="form-label">Impact Level</label>
            <div className="toggle-group w-full">
              {['GLOBAL', 'REGION', 'COUNTRY'].map(level => (
                <button
                  key={level}
                  type="button"
                  className={`toggle-option ${form.impactLevel === level ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => updateField('impactLevel', level)}
                >
                  {level === 'GLOBAL' ? 'Global' : level === 'REGION' ? 'Region' : 'Country'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Time Horizon</label>
            <div className="toggle-group w-full">
              {['H1', 'H2', 'H3'].map(h => (
                <button
                  key={h}
                  type="button"
                  className={`toggle-option ${form.timeHorizon === h ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => updateField('timeHorizon', h)}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Global Signal Toggle */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.isGlobal}
              onChange={e => updateField('isGlobal', e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <span className="form-label" style={{ margin: 0 }}>
              This is a Global Signal (visible to all users)
            </span>
          </label>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '6px' }}>
            {form.isGlobal
              ? '✓ Published signals will be visible to everyone in the Signal Bank'
              : '○ Drafts can stay private. Published signals from this page still appear in All Signals'}
          </p>
        </div>

        {/* Footer */}
        <div className="signal-form-footer">
          <span className="auto-save">Auto-saved 2 minutes ago</span>
          <div className="flex gap-3">
            <button className="btn btn-secondary" onClick={() => handleSubmit('DRAFT')} id="save-draft-btn">
              Save as Draft
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleSubmit('PUBLISHED')}
              disabled={saving || !form.name}
              id="publish-signal-btn"
            >
              {saving ? 'Publishing...' : 'Publish Signal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
