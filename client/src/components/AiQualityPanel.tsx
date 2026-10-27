import { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, ClipboardCheck, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../api';
import type { Complaint } from '../types';

const categories = ['Water Supply', 'Roads and Potholes', 'Streetlights', 'Electrical Hazards', 'Drainage', 'Waste Management', 'Sanitation', 'Other'];
type QualityData = {
  reviewed: number;
  matches: number;
  corrections: number;
  agreementRate: number | null;
  byCategory: Array<{ category: string; count: number }>;
  recent: Array<{ id: number; complaint_id: string; predicted_category: string; corrected_category: string; notes: string; created_at: string; ticket_id: string; title: string }>;
};

export default function AiQualityPanel({ complaints, onUpdated, notify }: { complaints: Complaint[]; onUpdated: () => Promise<void>; notify: (value: { title: string; message: string; kind?: 'success' | 'error' } | null) => void }) {
  const [quality, setQuality] = useState<QualityData | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [correctedCategory, setCorrectedCategory] = useState('Electrical Hazards');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setQuality(await api<QualityData>('/ai/quality')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load AI review metrics.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const result = await api<{ predictedCategory: string; correctedCategory: string; ticketId: string }>('/ai/quality/feedback', {
        method: 'POST', body: JSON.stringify({ complaintId: selectedId, correctedCategory, notes })
      });
      notify({ title: 'AI review recorded', message: `${result.ticketId}: ${result.predictedCategory} reviewed as ${result.correctedCategory}.` });
      setNotes(''); await Promise.all([load(), onUpdated()]);
    } catch (err) { const message = err instanceof Error ? err.message : 'Could not save AI review.'; setError(message); notify({ title: 'Could not save AI review', message, kind: 'error' }); }
    finally { setSaving(false); }
  }

  return <section className="page-content ai-quality-page">
    <div className="page-heading heading-row"><div><span className="eyebrow">AI GOVERNANCE</span><h1>AI quality review</h1><p>Record human corrections to classification suggestions and measure reviewer agreement.</p></div><button className="button button-light" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> Refresh metrics</button></div>
    <div className="ai-quality-disclaimer"><Sparkles size={18}/><p><strong>Important:</strong> reviewer agreement is a monitoring signal, not a scientific model-accuracy score. Use a separate labelled test set for formal evaluation.</p></div>
    <div className="ai-quality-stats">
      <div className="card-surface ai-quality-stat"><span className="quality-stat-icon"><ClipboardCheck size={18}/></span><span>Reviewed complaints</span><strong>{quality?.reviewed ?? '—'}</strong></div>
      <div className="card-surface ai-quality-stat"><span className="quality-stat-icon"><CheckCircle2 size={18}/></span><span>Same as reviewer label</span><strong>{quality ? quality.matches : '—'}</strong></div>
      <div className="card-surface ai-quality-stat"><span className="quality-stat-icon"><BarChart3 size={18}/></span><span>Reviewer agreement</span><strong>{quality?.agreementRate === null || quality?.agreementRate === undefined ? '—' : `${quality.agreementRate}%`}</strong></div>
      <div className="card-surface ai-quality-stat"><span className="quality-stat-icon"><RefreshCw size={18}/></span><span>Corrections recorded</span><strong>{quality?.corrections ?? '—'}</strong></div>
    </div>
    <div className="ai-quality-grid">
      <div className="card-surface ai-review-form"><div className="panel-heading"><div><h3>Review a classification</h3><p>Choose a complaint and record the category a reviewer considers correct.</p></div></div>
        <form className="profile-form" onSubmit={submit}>
          <label>Complaint<select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); const found = complaints.find((c) => c.id === event.target.value); if (found) setCorrectedCategory(found.category); }} required><option value="">Select a complaint…</option>{complaints.map((complaint) => <option value={complaint.id} key={complaint.id}>{complaint.ticket_id} — {complaint.title} ({complaint.category})</option>)}</select></label>
          {selectedId && <div className="selected-ai-info">Current stored category: <strong>{complaints.find((c) => c.id === selectedId)?.category ?? 'Unknown'}</strong> · This review is stored separately and does not rewrite the original AI output.</div>}
          <label>Reviewer-corrected category<select value={correctedCategory} onChange={(event) => setCorrectedCategory(event.target.value)} required>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Reviewer notes <span className="optional">Optional</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={800} rows={3} placeholder="Why should this category be used? E.g. the photo clearly shows an exposed wire." /></label>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <button className="button button-primary" type="submit" disabled={saving || !selectedId}>{saving ? 'Saving review…' : 'Save human review'}</button>
        </form>
      </div>
      <div className="card-surface ai-review-history"><div className="panel-heading"><div><h3>Recent reviews</h3><p>Human labels used for ongoing quality monitoring.</p></div></div>
        {loading && !quality ? <p className="muted">Loading review metrics…</p> : quality?.recent.length ? <div className="quality-history-list">{quality.recent.map((item) => <div className="quality-history-item" key={item.id}><div><strong>{item.ticket_id} · {item.title}</strong><p>AI/stored label: <b>{item.predicted_category}</b> → Reviewer: <b>{item.corrected_category}</b></p>{item.notes && <small>{item.notes}</small>}</div><time>{new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(item.created_at))}</time></div>)}</div> : <div className="map-empty"><ClipboardCheck size={28}/><h3>No reviews recorded</h3><p>Submit a review to start collecting human feedback for AI evaluation.</p></div>}
      </div>
    </div>
    {quality?.byCategory?.length ? <div className="card-surface quality-category-card"><div className="panel-heading"><div><h3>Reviewer labels by category</h3><p>Distribution of corrected labels recorded so far.</p></div></div><div className="category-bars">{quality.byCategory.map((item) => { const max = Math.max(1, ...quality.byCategory.map((x) => x.count)); return <div className="category-bar-row" key={item.category}><div className="category-bar-label"><span>{item.category}</span><strong>{item.count}</strong></div><div className="bar-track"><span style={{ width: `${Math.max(4, item.count / max * 100)}%` }}/></div></div>; })}</div></div> : null}
  </section>;
}
