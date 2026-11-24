import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import ImagePicker from '../../components/ImagePicker';
import { Input, Select, Textarea } from '../../components/FormControls';
import { PriorityBadge } from '../../components/Badges';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { createComplaint } from '../../services/complaintService';
import { BUILDINGS, CATEGORIES, PRIORITIES, PRIORITY_HELP, SLA_HOURS } from '../../constants';

function validate(form) {
  const errors = {};
  if (form.title.trim().length < 5) errors.title = 'Give a short title of at least 5 characters';
  if (!form.category) errors.category = 'Choose the type of problem';
  if (form.description.trim().length < 15) errors.description = 'Describe the problem in at least 15 characters';
  if (!form.building) errors.building = 'Choose the building';
  if (!form.floor.trim()) errors.floor = 'Enter the floor';
  return errors;
}

export default function CreateComplaint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    category: '',
    priority: 'Medium',
    description: '',
    building: user.hostel || '',
    block: '',
    floor: '',
    roomNumber: '',
    location: '',
  });
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setFormError('Please fix the highlighted fields.');
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim() !== ''));
      const complaint = await createComplaint({ ...payload, images });
      toast.success('Complaint submitted', `${complaint.complaintCode} has been sent to the maintenance office.`);
      navigate(`/student/complaints/${complaint._id}`, { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Report an issue"
        description="The maintenance office reviews new complaints and assigns them to the right staff member."
        back={{ to: '/student', label: 'Dashboard' }}
      />

      <form onSubmit={handleSubmit} noValidate>
        <section className="form-section">
          <div className="form-section__intro">
            <h2>What is the problem?</h2>
            <p>A clear title and description help staff bring the right tools on the first visit.</p>
          </div>
          <div className="form">
            <Input label="Title" placeholder="e.g. Ceiling fan not working in Room 214" maxLength={120} value={form.title} onChange={update('title')} error={errors.title} />
            <Select label="Category" placeholder="Select a category" options={CATEGORIES} value={form.category} onChange={update('category')} error={errors.category} />
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="field__label" style={{ marginBottom: 6 }}>
                Priority
              </legend>
              <div className="choice-group">
                {PRIORITIES.map((priority) => (
                  <label key={priority} className="choice">
                    <input type="radio" name="priority" value={priority} checked={form.priority === priority} onChange={update('priority')} />
                    <span className="choice__title">
                      <PriorityBadge priority={priority} />
                    </span>
                    <span className="choice__desc">{PRIORITY_HELP[priority]}</span>
                  </label>
                ))}
              </div>
              <span className="field__hint" style={{ display: 'block', marginTop: 6 }}>
                Target fix time for {form.priority.toLowerCase()} priority: {SLA_HOURS[form.priority] >= 48 ? `${SLA_HOURS[form.priority] / 24} days` : `${SLA_HOURS[form.priority]} hours`}
              </span>
            </fieldset>
            <Textarea
              label="Description"
              rows={5}
              maxLength={2000}
              placeholder="What is happening, since when, and how it affects you."
              value={form.description}
              onChange={update('description')}
              error={errors.description}
              hint={`${form.description.length}/2000`}
            />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section__intro">
            <h2>Where is it?</h2>
            <p>Pinpoint the room so staff can find it without calling you.</p>
          </div>
          <div className="form-grid">
            <Select label="Building" className="span-all" placeholder="Select a building" options={BUILDINGS} value={form.building} onChange={update('building')} error={errors.building} />
            <Input label="Floor" placeholder="e.g. G, 1, 2" maxLength={20} value={form.floor} onChange={update('floor')} error={errors.floor} />
            <Input label="Room number" optional placeholder="e.g. 214, Lab 3" maxLength={20} value={form.roomNumber} onChange={update('roomNumber')} />
            <Input label="Block or wing" optional placeholder="e.g. East wing" maxLength={40} value={form.block} onChange={update('block')} />
            <Input label="Landmark or details" optional placeholder="e.g. Next to the water cooler" maxLength={160} value={form.location} onChange={update('location')} />
          </div>
        </section>

        <section className="form-section">
          <div className="form-section__intro">
            <h2>Photos</h2>
            <p>Optional, but a photo often saves a trip.</p>
          </div>
          <ImagePicker images={images} onChange={setImages} />
        </section>

        {formError && (
          <div className="callout callout--error" role="alert" style={{ marginBottom: 16 }}>
            <Icon name="alert" />
            <div className="callout__body">{formError}</div>
          </div>
        )}

        <div className="form-actions">
          <Button variant="ghost" to="/student" disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon="send" loading={busy}>
            Submit complaint
          </Button>
        </div>
      </form>
    </>
  );
}
