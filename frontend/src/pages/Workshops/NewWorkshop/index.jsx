import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { workshopsApi } from '../../../api/api';

const HORIZON_OPTIONS = [
  {
    value: 'H1',
    label: 'H1',
    title: 'Current Horizon',
    description: 'Focus on current operations and short-term workshop decisions.',
  },
  {
    value: 'H2',
    label: 'H2',
    title: 'Emerging Horizon',
    description: 'Explore transition opportunities and medium-term shifts.',
  },
  {
    value: 'H3',
    label: 'H3',
    title: 'Future Horizon',
    description: 'Map long-range transformation and weak signals.',
  },
];

export default function NewWorkshop() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    horizon: 'H1',
  });
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  function updateField(field, value) {
    if (field === 'name' && value.trim()) {
      setNameError('');
    }

    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const workshopName = form.name.trim();
    if (!workshopName) {
      setNameError('Workshop session name is required');
      return;
    }

    const workshopPayload = {
      name: workshopName,
      description: form.description.trim(),
      horizon: form.horizon,
    };

    setSaving(true);
    try {
      const response = await workshopsApi.create(workshopPayload);
      const createdWorkshop = response.data;

      if (createdWorkshop?.id) {
        navigate(`/workshop/${createdWorkshop.id}/radar`);
        return;
      }

      navigate('/workshop');
    } catch (error) {
      console.error(error);
      alert('Failed to create workshop session. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="signal-form-page workshop-form-page">
      <form className="card signal-form-card workshop-form-card" onSubmit={handleSubmit}>
        <div className="signal-form-hero">
          <Link to="/workshop" className="workshop-title-back-link">
            〱 Workshops
          </Link>
          <h1>New Workshop Session</h1>
          <p>Create a strategic workshop space for environmental scanning, radar mapping, and scenario generation.</p>
        </div>

        <div className="signal-form-divider" />

        <div className="form-group">
          <label className="form-label" htmlFor="workshop-name">
            Workshop Session Name <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            id="workshop-name"
            className="form-input"
            placeholder="e.g., University Executive Meeting"
            value={form.name}
            onChange={event => updateField('name', event.target.value)}
            style={{ borderColor: nameError ? 'red' : undefined }}
          />
          {nameError && (
            <p className="form-error-text">{nameError}</p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="workshop-description">Workshop Description</label>
          <textarea
            id="workshop-description"
            className="form-input"
            placeholder="Describe the workshop purpose, participants, or strategic question..."
            rows={5}
            value={form.description}
            onChange={event => updateField('description', event.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Primary Horizon</label>
          <div className="workshop-horizon-grid">
            {HORIZON_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                className={`workshop-horizon-option ${form.horizon === option.value ? 'active' : ''}`}
                onClick={() => updateField('horizon', option.value)}
                aria-pressed={form.horizon === option.value}
              >
                <span>{option.label}</span>
                <strong>{option.title}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="signal-form-footer">
          <span className="auto-save">Draft details stay on this page until you create the session.</span>
          <div className="flex gap-3">
            <Link to="/workshop" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !form.name.trim()}
              id="create-workshop-session-btn"
            >
              <Plus size={18} />
              {saving ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
