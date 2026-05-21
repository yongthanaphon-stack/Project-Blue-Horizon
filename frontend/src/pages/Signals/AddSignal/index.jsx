import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Link2, Tag } from 'lucide-react';
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

export default function AddSignal() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('addSignalDraft');
    if (saved) {
      try {
        const savedDraft = JSON.parse(saved);
        if (savedDraft && typeof savedDraft === 'object' && !Array.isArray(savedDraft)) {
          delete savedDraft.impactScore;
          return { ...DEFAULT_SIGNAL_FORM, ...savedDraft };
        }
      } catch {
        localStorage.removeItem('addSignalDraft');
      }
    }
    return DEFAULT_SIGNAL_FORM;
  });
  
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    localStorage.setItem('addSignalDraft', JSON.stringify(form));
  }, [form]);

  function updateField(field, value) {
    if (field === 'name') {
      if (value.length > 200) setTitleError('Title cannot exceed 200 characters');
      else setTitleError('');
    }
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleTagsChange(e) {
    const value = e.target.value;
    const tagsArray = value.split(',').map(t => t.trim()).filter(t => t);
    setForm(prev => ({ ...prev, tags: tagsArray }));
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
          <label className="form-label" htmlFor="tags">Tags (comma separated)</label>
          <div className="form-url-input">
            <Tag />
            <input
              id="tags"
              className="form-input"
              style={{ paddingLeft: 40 }}
              placeholder="e.g., AI, Automation, Policy"
              value={form.tags.join(', ')}
              onChange={handleTagsChange}
            />
          </div>
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
