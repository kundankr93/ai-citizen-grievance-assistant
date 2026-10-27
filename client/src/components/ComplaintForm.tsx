import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, MapPin, Mic, MicOff, Paperclip, Send, Sparkles, X, LocateFixed } from 'lucide-react';
import { api } from '../api';

export default function ComplaintForm({ onCancel, onSubmitted }: { onCancel: () => void; onSubmitted: (response: any) => void }) {
  const [form, setForm] = useState({ title: '', description: '', area: '', ward: '', address: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'shared' | 'denied' | 'error'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const update = (field: keyof typeof form, value: string) => setForm((old) => ({ ...old, [field]: value }));
  const photoPreview = useMemo(() => photo ? URL.createObjectURL(photo) : '', [photo]);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  function toggleVoice() {
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError('Voice input is not supported in this browser. Please type your complaint.'); return; }
    if (listening) { setListening(false); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => { const transcript = event.results?.[0]?.[0]?.transcript ?? ''; update('description', `${form.description}${form.description ? ' ' : ''}${transcript}`); setListening(false); };
    recognition.onerror = () => { setError('Voice input failed. You can type the complaint instead.'); setListening(false); };
    recognition.onend = () => setListening(false);
    setListening(true); recognition.start();
  }

  function shareCurrentLocation() {
    setError('');
    if (!navigator.geolocation) { setLocationState('error'); setError('This browser does not support location sharing. You can enter the area manually.'); return; }
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationState('shared');
      },
      (geoError) => {
        setLocationState(geoError.code === geoError.PERMISSION_DENIED ? 'denied' : 'error');
        setError(geoError.code === geoError.PERMISSION_DENIED ? 'Location permission was denied. You can continue by entering your area manually.' : 'Could not get your location. Try again or enter your area manually.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (photo) data.append('photo', photo);
      // Coordinates are sent only after the citizen explicitly clicks the share-location button.
      if (coordinates) { data.append('latitude', String(coordinates.latitude)); data.append('longitude', String(coordinates.longitude)); }
      const result = await api<any>('/complaints', { method: 'POST', body: data });
      onSubmitted(result);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not submit complaint.'); }
    finally { setLoading(false); }
  }

  return <section className="form-page">
    <button className="back-link" onClick={onCancel}><ArrowLeft size={16} /> Back to dashboard</button>
    <div className="page-heading"><span className="eyebrow">CITIZEN SERVICES / NEW REPORT</span><h1>Raise a complaint</h1><p>Describe the issue. AI can use your text and an optional photo to suggest a category, urgency, and department.</p></div>
    <form className="complaint-form card-surface" onSubmit={submit}>
      <div className="form-section-title"><span className="section-number">01</span><div><h3>Describe the issue</h3><p>Write naturally in English or Hindi. Please don't include sensitive personal details.</p></div></div>
      <label>Complaint title <span className="required">*</span><input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Water supply has stopped" minLength={5} maxLength={160} required /></label>
      <label>What happened? <span className="required">*</span><textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe the problem, when it started, and how it affects the area…" rows={5} minLength={10} maxLength={5000} required /><span className="field-helper">You can write in Hindi or English.</span></label>
      <div className="form-actions-inline"><button type="button" className={`button button-light ${listening ? 'recording' : ''}`} onClick={toggleVoice}>{listening ? <MicOff size={16} /> : <Mic size={16} />}{listening ? 'Listening…' : 'Speak in Hindi'}</button><span className="tiny-muted">Voice input depends on browser support.</span></div>
      <div className="form-divider" />
      <div className="form-section-title"><span className="section-number">02</span><div><h3>Where is it happening?</h3><p>Precise location is optional. Share it only if you choose to.</p></div></div>
      <div className="field-grid"><label>Area / locality <span className="required">*</span><input value={form.area} onChange={(e) => update('area', e.target.value)} placeholder="e.g. Shankar Nagar" minLength={2} maxLength={120} required /></label><label>Ward number<input value={form.ward} onChange={(e) => update('ward', e.target.value)} placeholder="e.g. Ward 12" maxLength={80} /></label></div>
      <label>Landmark or address <span className="optional">Optional</span><input value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Nearby school, crossing, or landmark" maxLength={250} /></label>
      <div className="location-share-card">
        <div className="location-share-icon"><LocateFixed size={20}/></div>
        <div className="location-share-copy"><strong>Share current location</strong><p>Use your browser's location permission to add GPS coordinates to this complaint. Nothing is tracked in the background.</p>
          {coordinates && <small className="location-coordinates">Location ready: {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</small>}
          {locationState === 'denied' && <small className="field-error">Location permission was denied. You can still submit without GPS.</small>}
        </div>
        {coordinates ? <button type="button" className="button button-light button-small" onClick={() => { setCoordinates(null); setLocationState('idle'); }}>Remove location <X size={14}/></button> : <button type="button" className="button button-light button-small" onClick={shareCurrentLocation} disabled={locationState === 'loading'}>{locationState === 'loading' ? 'Getting location…' : <><MapPin size={15}/> Share location</>}</button>}
      </div>
      <div className="form-divider" />
      <div className="form-section-title"><span className="section-number">03</span><div><h3>Add a photo <span className="optional">Optional</span></h3><p>Gemini can inspect a supported photo alongside your description when live AI is configured.</p></div></div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      <button type="button" className="upload-zone" onClick={() => fileRef.current?.click()}><Paperclip size={19} /><span><strong>{photo ? photo.name : 'Attach a photo'}</strong><small>JPG, PNG or WEBP · Up to 5 MB</small></span><span className="upload-action">Browse</span></button>
      {photo && <div className="photo-preview-card"><img src={photoPreview} alt="Preview of the selected complaint photo"/><div><strong>Photo attached</strong><p>The image will be sent securely to the backend for authorized storage. If Gemini is configured, AI will analyze visible evidence.</p><button type="button" className="text-button" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ''; }}>Remove photo</button></div></div>}
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="ai-notice"><Sparkles size={18} /><div><strong>AI-assisted triage</strong><p>Text and optional photo can inform category, urgency and department suggestions. A person should review the suggestion before official action.</p></div></div>
      <div className="form-submit-row"><button type="button" className="button button-light" onClick={onCancel}>Cancel</button><button type="submit" className="button button-primary" disabled={loading}>{loading ? 'Analyzing & submitting…' : 'Submit complaint'} <Send size={16} /></button></div>
    </form>
  </section>;
}
