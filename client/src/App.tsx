import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, Bell, CheckCircle2, ChevronDown, CircleHelp,
  ClipboardList, Clock3, Droplets, FilePlus2, Filter, Gauge, LayoutDashboard, LogOut,
  MapPin, MessageSquareWarning, Save, Search, ShieldCheck, Siren, Sparkles, TrendingUp,
  UserRound, Users, Waves, X, CheckCheck, Download, Eye, EyeOff, KeyRound, Settings, Moon, Sun, MapPinned, BrainCircuit
} from 'lucide-react';
import { api, ApiError } from './api';
import ComplaintForm from './components/ComplaintForm';
import ComplaintMap from './components/ComplaintMap';
import AiQualityPanel from './components/AiQualityPanel';
import StatCard from './components/StatCard';
import type { Complaint, ComplaintUpdate, Notification, Officer, Status, Summary, User } from './types';

const statusLabels: Record<Status, string> = {
  SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under review', ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress', RESOLVED: 'Resolved', REJECTED: 'Rejected'
};
const categoryIcons: Record<string, string> = {
  'Water Supply': '💧', 'Roads and Potholes': '🛣️', Streetlights: '💡', Drainage: '🌧️',
  'Waste Management': '♻️', Sanitation: '🧹', Other: '📌'
};

type Toast = { title: string; message: string; kind?: 'success' | 'error' } | null;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
function initials(value: string) { return value.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(); }

function AuthScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('citizen@civicconnect.demo');
  const [password, setPassword] = useState('Demo@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [ward, setWard] = useState('Ward 12');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api<{ user: User }>(`/auth/${mode}`, {
        method: 'POST', body: JSON.stringify(mode === 'login' ? { email, password } : { fullName, email, password, ward })
      });
      onLogin(result.user);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in.'); }
    finally { setBusy(false); }
  }
  const demoAccounts = [
    { label: 'Citizen', email: 'citizen@civicconnect.demo' },
    { label: 'Admin', email: 'admin@civicconnect.demo' },
    { label: 'Water officer', email: 'officer.water@civicconnect.demo' },
    { label: 'Roads officer', email: 'officer.roads@civicconnect.demo' }
  ];
  return <div className="auth-screen">
    <div className="auth-left">
      <div className="brand brand-light"><span className="brand-mark"><Waves size={22} /></span><span>CivicConnect <b>AI</b></span></div>
      <div className="auth-hero-copy"><span className="eyebrow light-eyebrow">CIVIC SERVICES, MADE CLEARER</span><h1>Small reports.<br /><span>Meaningful change.</span></h1><p>One place to report local issues, follow their progress, and help your community move forward.</p>
        <div className="auth-mini-stats"><div><strong>01</strong><span>Report a problem</span></div><div><strong>02</strong><span>Track progress</span></div><div><strong>03</strong><span>See the outcome</span></div></div>
      </div>
      <div className="auth-left-footer"><ShieldCheck size={16} /> A civic-tech prototype · Not connected to a government system</div>
    </div>
    <div className="auth-right"><div className="auth-form-wrap">
      <div className="mobile-brand brand"><span className="brand-mark"><Waves size={22} /></span><span>CivicConnect <b>AI</b></span></div>
      <span className="eyebrow">WELCOME TO CIVICCONNECT</span><h2>{mode === 'login' ? 'Sign in to your account' : 'Create your citizen account'}</h2><p className="muted">{mode === 'login' ? 'Use a demo account or sign in with your registered email.' : 'Create an account to raise and track complaints.'}</p>
      <form onSubmit={submit} className="auth-form">
        {mode === 'register' && <label>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" minLength={2} required /></label>}
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
        <label>Password<div className="password-input-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /><button type="button" className="password-visibility" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></label>
        {mode === 'register' && <label>Ward / area <span className="optional">Optional</span><input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. Ward 12" /></label>}
        {error && <div className="error-banner">{error}</div>}
        <button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></button>
      </form>
      <div className="auth-switch">{mode === 'login' ? 'New to CivicConnect?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div>
      <div className="demo-box"><div className="demo-box-heading"><span className="demo-dot" /> Demo access <span className="demo-password">Password: Demo@12345</span></div><div className="demo-account-grid">{demoAccounts.map((account) => <button key={account.email} type="button" className={`demo-account ${email === account.email ? 'active' : ''}`} onClick={() => { setMode('login'); setEmail(account.email); setPassword('Demo@12345'); setError(''); }}><span className="demo-avatar">{initials(account.label)}</span><span><strong>{account.label}</strong><small>{account.email}</small></span><ArrowRight size={14} /></button>)}</div><p className="tiny-muted">Demo accounts work after you run database migrations and seeding.</p></div>
      <p className="legal-note">By continuing, you understand that AI suggestions may be incorrect and require human review.</p>
    </div></div>
  </div>;
}

function ComplaintCard({ complaint, user, officers, onRefresh, notify }: { complaint: Complaint; user: User; officers: Officer[]; onRefresh: () => Promise<void>; notify: (toast: Toast) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [updates, setUpdates] = useState<ComplaintUpdate[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [department, setDepartment] = useState(complaint.assigned_department || complaint.suggested_department);
  const [officerId, setOfficerId] = useState(complaint.assigned_officer_id || '');
  const [nextStatus, setNextStatus] = useState<Status>(complaint.status);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const canManage = user.role === 'admin' || user.role === 'officer';
  const isOverdue = Boolean(complaint.escalated_at) && !['RESOLVED', 'REJECTED'].includes(complaint.status);

  async function toggleDetails() {
    if (!expanded) {
      setDetailLoading(true);
      try { const data = await api<{ complaint: Complaint; updates: ComplaintUpdate[] }>(`/complaints/${complaint.id}`); setUpdates(data.updates); }
      catch (error) { notify({ title: 'Could not load details', message: error instanceof Error ? error.message : 'Try again.', kind: 'error' }); }
      finally { setDetailLoading(false); }
    }
    setExpanded(!expanded);
  }
  async function assign() {
    setSaving(true);
    try { await api(`/complaints/${complaint.id}/assign`, { method: 'PATCH', body: JSON.stringify({ department, officerId: officerId || null }) }); notify({ title: 'Assignment saved', message: `${complaint.ticket_id} has been assigned.` }); await onRefresh(); }
    catch (error) { notify({ title: 'Assignment failed', message: error instanceof Error ? error.message : 'Try again.', kind: 'error' }); }
    finally { setSaving(false); }
  }
  async function updateStatus() {
    setSaving(true);
    try { await api(`/complaints/${complaint.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus, note }) }); notify({ title: 'Status updated', message: `${complaint.ticket_id} is now ${statusLabels[nextStatus]}.` }); setNote(''); await onRefresh(); if (expanded) { const data = await api<{ updates: ComplaintUpdate[] }>(`/complaints/${complaint.id}`); setUpdates(data.updates); } }
    catch (error) { notify({ title: 'Update failed', message: error instanceof Error ? error.message : 'Try again.', kind: 'error' }); }
    finally { setSaving(false); }
  }
  async function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formData = new FormData(event.currentTarget); const message = String(formData.get('message') ?? '');
    try { await api(`/complaints/${complaint.id}/comments`, { method: 'POST', body: JSON.stringify({ message }) }); const data = await api<{ updates: ComplaintUpdate[] }>(`/complaints/${complaint.id}`); setUpdates(data.updates); event.currentTarget.reset(); notify({ title: 'Update added', message: 'Your message has been saved to the timeline.' }); }
    catch (error) { notify({ title: 'Could not add update', message: error instanceof Error ? error.message : 'Try again.', kind: 'error' }); }
  }

  return <article className="complaint-card">
    <div className="complaint-card-main">
      <div className="category-emoji">{categoryIcons[complaint.category] ?? '📌'}</div>
      <div className="complaint-content">
        <div className="complaint-topline"><span className="ticket-id">{complaint.ticket_id}</span><span className={`status-pill status-${complaint.status.toLowerCase()}`}>{statusLabels[complaint.status]}</span>{isOverdue && <span className="status-pill status-overdue"><Siren size={12} /> Escalated</span>}</div>
        <h3>{complaint.title}</h3><p className="complaint-description">{complaint.summary || complaint.description}</p>
        <div className="complaint-meta"><span><MapPin size={13} /> {complaint.area}{complaint.ward ? ` · ${complaint.ward}` : ''}</span><span><Clock3 size={13} /> {formatDate(complaint.created_at)}</span>{user.role !== 'citizen' && complaint.citizen_name && <span><UserRound size={13} /> {complaint.citizen_name}</span>}</div>
      </div>
      <div className="complaint-side"><span className={`urgency urgency-${complaint.urgency.toLowerCase()}`}>{complaint.urgency} priority</span><button className="text-button details-button" onClick={toggleDetails}>{expanded ? 'Hide details' : detailLoading ? 'Loading…' : 'View details'} <ChevronDown size={15} className={expanded ? 'rotate' : ''} /></button></div>
    </div>
    {complaint.ai_mode === 'DEMO' && <div className="ai-inline-note"><Sparkles size={13} /><span>Rule-based demo suggestion · {complaint.category} → {complaint.suggested_department}</span></div>}
    {complaint.ai_mode === 'AI' && <div className="ai-inline-note ai-live-note"><Sparkles size={13} /><span>AI-assisted suggestion · Review before action</span></div>}
    {complaint.possible_duplicate_of && <div className="duplicate-note"><MessageSquareWarning size={14} /> A possible duplicate was detected. Please review related reports before merging or closing.</div>}
    {expanded && <div className="complaint-expanded">
      <div className="expanded-grid"><div><span className="detail-label">Full description</span><p className="detail-description">{complaint.description}</p></div><div><span className="detail-label">AI triage</span><div className="ai-detail-box"><strong>{complaint.category}</strong><span>Suggested department: {complaint.suggested_department}</span><span>Suggested urgency: {complaint.urgency}</span><small>{complaint.ai_reasoning}</small><span className="confidence-label">Confidence: {Math.round(Number(complaint.ai_confidence || 0) * 100)}%</span></div>{complaint.hasPhoto && <img className="complaint-photo" src={`/api/complaints/${complaint.id}/photo`} alt="Citizen submitted issue" />}{complaint.photo_analysis && <div className="photo-analysis-note"><strong>AI photo observations</strong><p>{complaint.photo_analysis}</p></div>}</div></div>
      {complaint.latitude !== null && complaint.latitude !== undefined && complaint.longitude !== null && complaint.longitude !== undefined && <div className="shared-location-line"><MapPin size={15}/><span>Citizen-shared GPS: {Number(complaint.latitude).toFixed(5)}, {Number(complaint.longitude).toFixed(5)}</span><a href={`https://www.openstreetmap.org/?mlat=${Number(complaint.latitude)}&mlon=${Number(complaint.longitude)}#map=17/${Number(complaint.latitude)}/${Number(complaint.longitude)}`} target="_blank" rel="noreferrer">Open map <ArrowRight size={13}/></a></div>}
      {complaint.resolution_note && <div className="resolution-box"><CheckCircle2 size={17} /><div><strong>Resolution note</strong><p>{complaint.resolution_note}</p></div></div>}
      {user.role === 'admin' && <div className="manage-panel"><h4>Assign complaint</h4><div className="manage-controls"><label>Department<select value={department} onChange={(e) => setDepartment(e.target.value)}>{['Water Department','Roads Department','Electrical Department','Electrical / Streetlight Department','Drainage Department','Waste Management Department','Sanitation Department','General Municipal Services'].map((d) => <option key={d}>{d}</option>)}</select></label><label>Officer<select value={officerId} onChange={(e) => setOfficerId(e.target.value)}><option value="">Unassigned / department queue</option>{officers.filter((officer) => !officer.department || officer.department === department).map((officer) => <option key={officer.id} value={officer.id}>{officer.fullName}</option>)}</select></label><button className="button button-primary button-small" disabled={saving} onClick={assign}>Save assignment</button></div></div>}
      {canManage && <div className="manage-panel"><h4>Update status</h4><div className="manage-controls status-controls"><label>New status<select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as Status)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Update / resolution note<input value={note} onChange={(e) => setNote(e.target.value)} placeholder={nextStatus === 'RESOLVED' ? 'Required: describe the resolution' : 'What changed? (optional)'} /></label><button className="button button-primary button-small" disabled={saving} onClick={updateStatus}>Update status</button></div></div>}
      <div className="timeline-section"><h4>Activity timeline</h4>{updates.length ? <div className="timeline">{updates.map((item) => <div className="timeline-item" key={item.id}><span className="timeline-dot" /><div><div className="timeline-heading"><strong>{item.event_type.replaceAll('_', ' ')}</strong><time>{formatDateTime(item.created_at)}</time></div><p>{item.message}</p><small>{item.actor_name ?? 'System'}</small></div></div>)}</div> : <p className="muted">No updates yet.</p>}
        <form className="comment-form" onSubmit={addComment}><input name="message" placeholder="Add a message to this timeline…" minLength={2} maxLength={1200} required /><button type="submit" className="button button-light button-small">Add update</button></form>
      </div>
    </div>}
  </article>;
}

function NotificationsPanel({ notifications, onRefresh, notify }: { notifications: Notification[]; onRefresh: () => Promise<void>; notify: (toast: Toast) => void }) {
  const unread = notifications.filter((n) => !n.is_read).length;
  async function markRead(id: number) {
    try { await api(`/notifications/${id}/read`, { method: 'PATCH' }); await onRefresh(); }
    catch (error) { notify({ title: 'Could not update notification', message: error instanceof Error ? error.message : 'Try again.', kind: 'error' }); }
  }
  async function markAllRead() {
    try {
      const result = await api<{ updated: number }>('/notifications/read-all', { method: 'PATCH' });
      await onRefresh();
      notify({ title: 'Notifications updated', message: `${result.updated} notification${result.updated === 1 ? '' : 's'} marked as read.` });
    } catch (error) { notify({ title: 'Could not update notifications', message: error instanceof Error ? error.message : 'Try again.', kind: 'error' }); }
  }
  return <section className="page-content"><div className="page-heading heading-row"><div><span className="eyebrow">YOUR UPDATES</span><h1>Notifications</h1><p>Updates refresh automatically while the app is open (about every 25 seconds).</p></div>{unread > 0 && <button className="button button-light" onClick={markAllRead}><CheckCheck size={16}/> Mark all as read ({unread})</button>}</div><div className="card-surface notifications-list">{notifications.length ? notifications.map((n) => <div className={`notification-row ${n.is_read ? '' : 'unread'}`} key={n.id}><span className="notification-icon"><Bell size={17} /></span><div className="notification-copy"><strong>{n.title}</strong><p>{n.message}</p><small>{formatDateTime(n.created_at)}</small></div>{!n.is_read && <button className="text-button" onClick={() => markRead(n.id)}>Mark read</button>}</div>) : <EmptyState title="You're all caught up" body="New updates about your complaints will appear here." />}</div></section>;
}

function ProfilePanel({ user, onProfileUpdated, notify }: { user: User; onProfileUpdated: (user: User) => void; notify: (toast: Toast) => void }) {
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [ward, setWard] = useState(user.ward ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setFullName(user.fullName);
    setEmail(user.email);
    setWard(user.ward ?? '');
  }, [user.fullName, user.email, user.ward]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await api<{ user: User }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, email, ward })
      });
      onProfileUpdated(result.user);
      setFullName(result.user.fullName);
      setEmail(result.user.email);
      setWard(result.user.ward ?? '');
      notify({ title: 'Profile updated', message: 'Your profile details have been saved.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update your profile.';
      setError(message);
      notify({ title: 'Profile update failed', message, kind: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) { setPasswordError('The new passwords do not match.'); return; }
    if (newPassword.length < 10) { setPasswordError('Use at least 10 characters for your new password.'); return; }
    if (newPassword === currentPassword) { setPasswordError('Choose a password different from your current password.'); return; }
    setPasswordSaving(true);
    try {
      await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      notify({ title: 'Password changed', message: 'Your password was updated successfully.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not change your password.';
      setPasswordError(message);
      notify({ title: 'Password change failed', message, kind: 'error' });
    } finally { setPasswordSaving(false); }
  }

  const roleLabel = user.role === 'admin' ? 'Administrator' : user.role === 'officer' ? 'Department officer' : 'Citizen';

  return <section className="page-content profile-page">
    <div className="page-heading heading-row">
      <div><span className="eyebrow">MY ACCOUNT</span><h1>My profile</h1><p>Update your contact details and the area associated with your account.</p></div>
      <div className="profile-heading-avatar"><span className="avatar profile-large-avatar">{initials(user.fullName)}</span><div><strong>{user.fullName}</strong><small>{roleLabel}</small></div></div>
    </div>
    <div className="profile-layout">
      <div className="card-surface profile-card">
        <div className="profile-card-heading"><span className="profile-heading-icon"><UserRound size={20} /></span><div><h2>Personal details</h2><p>Changes are saved to your account.</p></div></div>
        <form className="profile-form" onSubmit={saveProfile}>
          <div className="profile-fields">
            <label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} minLength={2} maxLength={100} autoComplete="name" required /></label>
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" required /><small className="profile-field-hint">You will use this email the next time you sign in.</small></label>
            <label>Ward / area <span className="optional">Optional</span><input value={ward} onChange={(event) => setWard(event.target.value)} maxLength={80} placeholder="e.g. Ward 12, Shankar Nagar" autoComplete="address-level3" /></label>
          </div>
          <div className="profile-readonly-grid">
            <div><span>Account role</span><strong>{roleLabel}</strong></div>
            <div><span>Department</span><strong>{user.department || 'Not assigned'}</strong></div>
          </div>
          <p className="profile-security-note"><ShieldCheck size={15} /> Role and department are read-only here so account permissions cannot be changed from a profile form.</p>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <div className="profile-actions"><button type="button" className="button button-quiet" disabled={saving} onClick={() => { setFullName(user.fullName); setEmail(user.email); setWard(user.ward ?? ''); setError(''); }}>Reset changes</button><button type="submit" className="button button-primary" disabled={saving || !fullName.trim() || !email.trim()}><Save size={15} /> {saving ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      </div>
      <aside className="card-surface profile-side-card"><span className="profile-side-icon"><ShieldCheck size={19} /></span><h3>Account information</h3><p>Your profile belongs to your signed-in account. Updating it does not change existing complaints or their activity history.</p><div className="profile-side-row"><span>Sign-in method</span><strong>Email & password</strong></div><div className="profile-side-row"><span>Access level</span><strong>{roleLabel}</strong></div></aside>
    </div>
    <div className="card-surface security-card">
      <div className="profile-card-heading"><span className="profile-heading-icon"><KeyRound size={20} /></span><div><h2>Password & security</h2><p>Change your sign-in password. Your current password is required.</p></div></div>
      <form className="profile-form" onSubmit={changePassword}>
        <div className="profile-fields">
          <label>Current password<div className="password-input-wrap"><input type={showPasswordFields ? 'text' : 'password'} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" minLength={8} required /><button type="button" className="password-visibility" onClick={() => setShowPasswordFields((value) => !value)} aria-label={showPasswordFields ? 'Hide password' : 'Show password'}>{showPasswordFields ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div></label>
          <div className="profile-fields-two"><label>New password<div className="password-input-wrap"><input type={showPasswordFields ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required /></div></label><label>Confirm new password<div className="password-input-wrap"><input type={showPasswordFields ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required /></div></label></div>
          <small className="profile-field-hint">Use at least 10 characters. Avoid reusing a password from another service.</small>
        </div>
        {passwordError && <div className="error-banner" role="alert">{passwordError}</div>}
        <div className="profile-actions"><button type="submit" className="button button-primary" disabled={passwordSaving || !currentPassword || newPassword.length < 10 || !confirmPassword}><KeyRound size={15}/> {passwordSaving ? 'Updating password…' : 'Change password'}</button></div>
      </form>
      <p className="profile-security-note"><ShieldCheck size={15}/> Passwords are verified and hashed on the server. Never share your password or API keys.</p>
    </div>
  </section>;
}

function SettingsPanel({ user, theme, onThemeChange, onOpenProfile, onOpenNotifications, notify }: { user: User; theme: 'light' | 'dark'; onThemeChange: (theme: 'light' | 'dark') => void; onOpenProfile: () => void; onOpenNotifications: () => void; notify: (toast: Toast) => void }) {
  const roleLabel = user.role === 'admin' ? 'Administrator' : user.role === 'officer' ? 'Department officer' : 'Citizen';
  return <section className="page-content settings-page">
    <div className="page-heading"><span className="eyebrow">PREFERENCES</span><h1>Settings</h1><p>Manage your app appearance and account shortcuts.</p></div>
    <div className="settings-grid">
      <div className="card-surface settings-card"><div className="settings-card-title"><span className="profile-heading-icon">{theme === 'dark' ? <Moon size={20}/> : <Sun size={20}/>}</span><div><h2>Appearance</h2><p>Choose the display theme for this browser.</p></div></div><div className="theme-choice-row"><div><strong>{theme === 'dark' ? 'Dark theme' : 'Light theme'}</strong><small>Your preference is saved on this device.</small></div><button type="button" className="button button-light" onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; onThemeChange(next); notify({ title: 'Appearance updated', message: `${next === 'dark' ? 'Dark' : 'Light'} theme enabled.` }); }}><span>{theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}</span> Switch to {theme === 'dark' ? 'light' : 'dark'}</button></div></div>
      <div className="card-surface settings-card"><div className="settings-card-title"><span className="profile-heading-icon"><UserRound size={20}/></span><div><h2>Account</h2><p>Review your account details and access level.</p></div></div><div className="settings-account-summary"><span className="avatar profile-large-avatar">{initials(user.fullName)}</span><div><strong>{user.fullName}</strong><small>{user.email}</small><small>{roleLabel}{user.department ? ` · ${user.department}` : ''}</small></div></div><div className="settings-actions"><button className="button button-primary" onClick={onOpenProfile}><UserRound size={15}/> Edit profile & password</button><button className="button button-light" onClick={onOpenNotifications}><Bell size={15}/> Notification centre</button></div></div>
      <div className="card-surface settings-card settings-note"><span className="profile-side-icon"><ShieldCheck size={19}/></span><h3>Privacy & safety</h3><p>Your role and department are controlled by authorized administrators. AI classifications are suggestions, and staff should review them before taking action. This prototype does not connect to an official government grievance system.</p></div>
    </div>
  </section>;
}

function EmptyState({ title, body }: { title: string; body: string }) { return <div className="empty-state"><span className="empty-icon"><ClipboardList size={25} /></span><h3>{title}</h3><p>{body}</p></div>; }

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [page, setPage] = useState<'overview' | 'complaints' | 'new' | 'notifications' | 'profile' | 'settings' | 'map' | 'ai-quality'>('overview');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('civicconnect-theme') === 'dark' ? 'dark' : 'light');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState<Toast>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [lastTicket, setLastTicket] = useState<{ ticket: string; aiMode: string; duplicate: string | null } | null>(null);
  const isStaff = user?.role === 'admin' || user?.role === 'officer';

  const notify = useCallback((value: Toast) => {
    setToast(value);
    if (value) window.setTimeout(() => setToast(null), 5500);
  }, []);

  const refreshData = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const [summaryData, complaintData, notificationData] = await Promise.all([
        api<Summary>('/dashboard/summary'), api<{ complaints: Complaint[] }>('/complaints'), api<{ notifications: Notification[] }>('/notifications')
      ]);
      setSummary(summaryData); setComplaints(complaintData.complaints); setNotifications(notificationData.notifications);
      if (user.role === 'admin') {
        const officerData = await api<{ officers: Officer[] }>('/users/officers'); setOfficers(officerData.officers);
      } else setOfficers([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dashboard data.');
      if (err instanceof ApiError && err.status === 401) setUser(null);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    let active = true;
    api<{ user: User }>('/auth/me').then((result) => { if (active) setUser(result.user); }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setAuthChecking(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => { if (user) void refreshData(); }, [user, refreshData]);
  // Near-real-time in-app status/notification refresh while signed in.
  useEffect(() => { if (!user) return; const timer = window.setInterval(() => { void refreshData(); }, 25_000); return () => window.clearInterval(timer); }, [user, refreshData]);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('civicconnect-theme', theme); }, [theme]);
  const filteredComplaints = useMemo(() => complaints.filter((complaint) => {
    const matchesStatus = filterStatus === 'ALL' || complaint.status === filterStatus;
    const matchesCategory = filterCategory === 'ALL' || complaint.category === filterCategory;
    const haystack = `${complaint.ticket_id} ${complaint.title} ${complaint.description} ${complaint.area} ${complaint.category}`.toLowerCase();
    return matchesStatus && matchesCategory && (!search.trim() || haystack.includes(search.toLowerCase()));
  }), [complaints, filterStatus, filterCategory, search]);

  function exportComplaintsCsv() {
    if (!filteredComplaints.length) { notify({ title: 'Nothing to export', message: 'No complaints match the current filters.', kind: 'error' }); return; }
    const columns: Array<[string, (complaint: Complaint) => unknown]> = [
      ['Ticket ID', (c) => c.ticket_id], ['Title', (c) => c.title], ['Description', (c) => c.description],
      ['Category', (c) => c.category], ['Urgency', (c) => c.urgency], ['Status', (c) => statusLabels[c.status]],
      ['Area', (c) => c.area], ['Ward', (c) => c.ward ?? ''], ['Latitude', (c) => c.latitude ?? ''], ['Longitude', (c) => c.longitude ?? ''], ['Photo AI Observations', (c) => c.photo_analysis ?? ''], ['Suggested Department', (c) => c.suggested_department],
      ['Assigned Department', (c) => c.assigned_department ?? ''], ['Created At', (c) => c.created_at],
      ['Updated At', (c) => c.updated_at], ['AI Mode', (c) => c.ai_mode], ['Resolution Note', (c) => c.resolution_note ?? '']
    ];
    const escapeCell = (value: unknown) => { let text = String(value ?? ''); if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
    const csv = '\uFEFF' + [columns.map(([header]) => escapeCell(header)).join(','), ...filteredComplaints.map((complaint) => columns.map(([, getValue]) => escapeCell(getValue(complaint))).join(','))].join('\r\n');
    const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = blobUrl; link.download = `civicconnect-complaints-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(blobUrl);
    notify({ title: 'Export ready', message: `${filteredComplaints.length} complaint${filteredComplaints.length === 1 ? '' : 's'} exported to CSV.` });
  }

  async function logout() { if (!window.confirm('Sign out of CivicConnect AI?')) return; try { await api('/auth/logout', { method: 'POST' }); } catch { /* Local view still clears. */ } setUser(null); setSummary(null); setComplaints([]); setPage('overview'); }
  function onComplaintSubmitted(result: any) {
    setLastTicket({ ticket: result.complaint.ticket_id, aiMode: result.ai?.mode ?? 'DEMO', duplicate: result.possibleDuplicate?.ticketId ?? null });
    setPage('overview'); notify({ title: 'Complaint submitted', message: `Your ticket ${result.complaint.ticket_id} has been created.` });
    void refreshData();
  }

  if (authChecking) return <div className="full-loading"><div className="loader" /><p>Loading CivicConnect AI…</p></div>;
  if (!user) return <AuthScreen onLogin={(loggedInUser) => { setUser(loggedInUser); setPage('overview'); }} />;

  const roleLabel = user.role === 'admin' ? 'Administrator' : user.role === 'officer' ? 'Department officer' : 'Citizen account';
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const pageTitle = page === 'overview' ? 'Overview' : page === 'complaints' ? 'Complaints' : page === 'new' ? 'New complaint' : page === 'profile' ? 'My profile' : page === 'settings' ? 'Settings' : page === 'map' ? 'Complaint map' : page === 'ai-quality' ? 'AI quality review' : 'Notifications';

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Waves size={22} /></span><span>CivicConnect <b>AI</b></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav">
        <button className={page === 'overview' ? 'active' : ''} onClick={() => { setPage('overview'); setLastTicket(null); }}><LayoutDashboard size={18} /> Overview</button>
        <button className={page === 'complaints' ? 'active' : ''} onClick={() => setPage('complaints')}><ClipboardList size={18} /> {isStaff ? 'All complaints' : 'My complaints'}<span className="nav-count">{summary?.total ?? 0}</span></button>
        {user.role === 'citizen' && <button className={page === 'new' ? 'active' : ''} onClick={() => { setPage('new'); setLastTicket(null); }}><FilePlus2 size={18} /> Raise a complaint</button>}
        <button className={page === 'map' ? 'active' : ''} onClick={() => setPage('map')}><MapPinned size={18} /> Complaint map</button>
        {user.role === 'admin' && <button className={page === 'ai-quality' ? 'active' : ''} onClick={() => setPage('ai-quality')}><BrainCircuit size={18} /> AI quality review</button>}
        <button className={page === 'profile' ? 'active' : ''} onClick={() => setPage('profile')}><UserRound size={18} /> My profile</button>
        <button className={page === 'settings' ? 'active' : ''} onClick={() => setPage('settings')} title="Settings"><Settings size={18} /> Settings</button>
        <button className={page === 'notifications' ? 'active' : ''} onClick={() => setPage('notifications')}><Bell size={18} /> Notifications{unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}</button>
      </nav>
      <div className="sidebar-help"><div className="help-icon"><CircleHelp size={19} /></div><strong>Need a hand?</strong><p>Use a clear title and mention the affected area when reporting an issue.</p><button onClick={() => notify({ title: 'Tips for a useful report', message: 'Describe what happened, when it started, and the exact affected area. Avoid adding private identification details.' })}>Reporting tips <ArrowRight size={14} /></button></div>
      <div className="sidebar-footer"><div className="avatar avatar-dark">{initials(user.fullName)}</div><div className="sidebar-user"><strong>{user.fullName}</strong><small>{roleLabel}</small></div><button className="icon-button logout-button" title="Sign out" onClick={logout}><LogOut size={17} /></button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-sep">/</span><strong>{pageTitle}</strong></div><div className="topbar-actions"><span className={`environment-pill ${summary?.ai?.mode === 'DEMO MODE' ? 'environment-demo' : ''}`}><span className="live-dot" />{summary?.ai?.mode ?? 'Checking AI'}</span><button className="icon-button notification-button" onClick={() => setPage('notifications')} title="Notifications"><Bell size={18} />{unreadCount > 0 && <span className="bell-dot" />}</button><div className="topbar-divider"/><button type="button" className="topbar-profile profile-shortcut" onClick={() => setPage('profile')} title="Edit profile"><div className="avatar">{initials(user.fullName)}</div><div><strong>{user.fullName}</strong><small>{roleLabel}</small></div></button></div></header>

      {error && <div className="global-error"><span>{error}</span><button onClick={() => void refreshData()}>Retry</button></div>}
      {page === 'new' ? <ComplaintForm onCancel={() => setPage('overview')} onSubmitted={onComplaintSubmitted} /> : page === 'notifications' ? <NotificationsPanel notifications={notifications} onRefresh={refreshData} notify={notify} /> : page === 'profile' ? <ProfilePanel user={user} onProfileUpdated={setUser} notify={notify} /> : page === 'settings' ? <SettingsPanel user={user} theme={theme} onThemeChange={setTheme} onOpenProfile={() => setPage('profile')} onOpenNotifications={() => setPage('notifications')} notify={notify} /> : page === 'map' ? <ComplaintMap complaints={complaints} /> : page === 'ai-quality' && user.role === 'admin' ? <AiQualityPanel complaints={complaints} onUpdated={refreshData} notify={notify} /> : page === 'complaints' ? <section className="page-content">
        <div className="page-heading heading-row"><div><span className="eyebrow">{isStaff ? 'SERVICE DESK' : 'YOUR REPORTS'}</span><h1>{isStaff ? 'Complaint management' : 'My complaints'}</h1><p>{isStaff ? 'Review reports, coordinate assignments, and move issues toward resolution.' : 'Keep track of your reports and follow every status update.'}</p></div><div className="page-heading-actions"><button className="button button-light" onClick={exportComplaintsCsv}><Download size={15}/> Export CSV</button>{user.role === 'citizen' && <button className="button button-primary" onClick={() => setPage('new')}><FilePlus2 size={16} /> New complaint</button>}</div></div>
        <div className="filter-bar card-surface"><div className="search-field"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ticket, title, or area…" /></div><div className="filter-control"><Filter size={15} /><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="ALL">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="filter-control"><select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}><option value="ALL">All categories</option>{Object.keys(categoryIcons).map((category) => <option key={category}>{category}</option>)}</select></div></div>
        <div className="list-summary"><span>{filteredComplaints.length} {filteredComplaints.length === 1 ? 'complaint' : 'complaints'}</span><button className="text-button" onClick={() => { setSearch(''); setFilterStatus('ALL'); setFilterCategory('ALL'); }}>Clear filters</button></div>
        <div className="complaint-list">{loading && !complaints.length ? <div className="loading-card">Loading complaints…</div> : filteredComplaints.length ? filteredComplaints.map((c) => <ComplaintCard key={c.id} complaint={c} user={user} officers={officers} onRefresh={refreshData} notify={notify} />) : <EmptyState title="No complaints found" body="Try changing the filters, or submit a new complaint if you have a civic issue to report." />}</div>
      </section> : <section className="page-content">
        <div className="overview-hero"><div className="hero-copy"><span className="eyebrow light-eyebrow">CIVIC SERVICE OVERVIEW</span><h1>{user.role === 'citizen' ? <>Hello, {user.fullName.split(' ')[0]} <span className="hero-wave">👋</span></> : user.role === 'admin' ? 'Community service dashboard' : 'Department work queue'}</h1><p>{user.role === 'citizen' ? 'Your voice matters. Report a local issue and follow the steps toward resolution.' : user.role === 'admin' ? 'An overview of incoming reports, service progress, and issues that need attention.' : `Review and update complaints assigned to ${user.department || 'your department'}.`}</p><div className="hero-actions"><button className="button button-white" onClick={() => user.role === 'citizen' ? setPage('new') : setPage('complaints')}>{user.role === 'citizen' ? 'Report an issue' : 'Manage complaints'} <ArrowRight size={16} /></button><span className="hero-caption"><ShieldCheck size={14} /> Human review before official action</span></div></div><div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-center"><Waves size={51} strokeWidth={1.5} /></div><div className="art-chip chip-a"><MapPin size={14} /> Local reports</div><div className="art-chip chip-b"><CheckCircle2 size={14} /> Track progress</div></div><div className="hero-decoration"/></div>
        {lastTicket && <div className="ticket-success"><span className="success-check"><CheckCircle2 size={21} /></span><div><strong>Complaint submitted successfully</strong><p>Your ticket number is <b>{lastTicket.ticket}</b>. Save it for reference. AI mode: {lastTicket.aiMode}. {lastTicket.duplicate ? `Possible related report: ${lastTicket.duplicate}.` : ''}</p></div><button className="icon-button" onClick={() => setLastTicket(null)}><X size={16} /></button></div>}
        <div className="section-heading"><div><h2>At a glance</h2><p>{isStaff ? 'A quick view of the service queue.' : 'A quick look at your report activity.'}</p></div><button className="text-button" onClick={() => void refreshData()}><Activity size={15} /> Refresh data</button></div>
        <div className="stats-grid"><StatCard label="Total complaints" value={summary?.total ?? 0} detail="All recorded reports" icon={ClipboardList} tone="blue"/><StatCard label="Needs review" value={summary?.pending ?? 0} detail="Waiting for action" icon={Clock3} tone="amber"/><StatCard label="In progress" value={summary?.in_progress ?? 0} detail="Being worked on" icon={TrendingUp} tone="teal"/><StatCard label="Resolved" value={summary?.resolved ?? 0} detail="Marked as resolved" icon={CheckCircle2} tone="violet"/></div>
        <div className="overview-columns"><div className="left-column">
          <div className="section-heading section-heading-tight"><div><h2>{isStaff ? 'Service queue' : 'Recent complaints'}</h2><p>{isStaff ? 'Latest community reports that may need attention.' : 'The latest updates from your submitted reports.'}</p></div><button className="text-button" onClick={() => setPage('complaints')}>View all <ArrowRight size={14} /></button></div>
          <div className="complaint-list dashboard-list">{loading && !complaints.length ? <div className="loading-card">Loading…</div> : complaints.slice(0, 4).length ? complaints.slice(0, 4).map((c) => <ComplaintCard key={c.id} complaint={c} user={user} officers={officers} onRefresh={refreshData} notify={notify} />) : <div className="card-surface"><EmptyState title="No complaints yet" body={user.role === 'citizen' ? 'Your first report can help bring attention to a local issue.' : 'New reports will appear here when citizens submit them.'}/></div>}</div>
        </div><div className="right-column">
          <div className="card-surface category-card"><div className="panel-heading"><div><h3>Reports by category</h3><p>Current complaint distribution</p></div><span className="panel-icon"><Gauge size={18}/></span></div>{(summary?.byCategory ?? []).length ? <div className="category-bars">{summary!.byCategory.slice(0, 7).map((item, index) => { const total = Math.max(1, ...summary!.byCategory.map((x) => x.count)); return <div className="category-bar-row" key={item.category}><div className="category-bar-label"><span>{categoryIcons[item.category] ?? '📌'} {item.category}</span><strong>{item.count}</strong></div><div className="bar-track"><span style={{ width: `${Math.max(4, item.count / total * 100)}%`, opacity: 1 - index * 0.06 }}/></div></div>; })}</div> : <div className="category-empty"><Waves size={20}/><span>Category insights will appear after reports are added.</span></div>}<button className="panel-footer-link" onClick={() => setPage('complaints')}>Explore complaints <ArrowRight size={14}/></button></div>
          <div className="ai-status-card"><div className="ai-status-top"><span className="ai-spark"><Sparkles size={18}/></span><span className={`status-pill ${summary?.ai?.mode === 'DEMO MODE' ? 'status-demo' : 'status-live'}`}>{summary?.ai?.mode ?? 'Checking'}</span></div><h3>AI-assisted triage</h3><p>{summary?.ai?.mode === 'DEMO MODE' ? 'The app is using transparent keyword rules because a Gemini API key is not configured. Real AI predictions are not active.' : 'Gemini is configured. Individual requests can still fall back to rules if the provider is unavailable.'}</p><div className="ai-status-foot"><ShieldCheck size={15}/> Suggestions should be reviewed by a person</div></div>
          <div className="sla-card"><div className="sla-icon"><Siren size={18}/></div><div><strong>{summary?.overdue ?? 0} escalated reports</strong><p>Open complaints past configured SLA windows.</p></div><button className="icon-button" onClick={() => { setPage('complaints'); setFilterStatus('ALL'); }}><ArrowDownRight size={17}/></button></div>
          <div className="quick-help"><div className="quick-help-icon"><Users size={17}/></div><div><strong>Community first</strong><p>AI organizes reports; authorized staff make assignment and resolution decisions.</p></div></div>
        </div></div>
      </section>}
      <footer className="app-footer"><span>© {new Date().getFullYear()} CivicConnect AI · Independent prototype</span><span><ShieldCheck size={13}/> Secure by design, human-reviewed by default</span></footer>
    </main>
    {toast && <div className={`toast toast-${toast.kind ?? 'success'}`} role="status"><span className="toast-icon">{toast.kind === 'error' ? <X size={16}/> : <CheckCircle2 size={16}/>}</span><div><strong>{toast.title}</strong><p>{toast.message}</p></div><button className="icon-button" onClick={() => setToast(null)}><X size={15}/></button></div>}
  </div>;
}
