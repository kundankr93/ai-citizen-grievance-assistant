import { useMemo, useState, useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';
import { ExternalLink, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { Complaint, Status } from '../types';

function coordinates(complaint: Complaint): [number, number] | null {
  const lat = Number(complaint.latitude);
  const lng = Number(complaint.longitude);
  return complaint.latitude !== null && complaint.latitude !== undefined && complaint.longitude !== null && complaint.longitude !== undefined && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}
const defaultCenter: LatLngExpression = [21.2514, 81.6296]; // Raipur reference center only; not a device location.
const issueIcon = L.divIcon({ className: 'civic-map-marker-shell', html: '<span class="civic-map-marker" aria-hidden="true"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });
function RecenterMap({ point }: { point: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (point) map.setView(point, Math.max(map.getZoom(), 14), { animate: true }); }, [map, point]);
  return null;
}
const statuses: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All statuses' }, { value: 'SUBMITTED', label: 'Submitted' }, { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'ASSIGNED', label: 'Assigned' }, { value: 'IN_PROGRESS', label: 'In progress' }, { value: 'RESOLVED', label: 'Resolved' }, { value: 'REJECTED', label: 'Rejected' }
];

export default function ComplaintMap({ complaints }: { complaints: Complaint[] }) {
  const [selectedId, setSelectedId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const located = useMemo(() => complaints.map((complaint) => ({ complaint, point: coordinates(complaint) })).filter((x): x is { complaint: Complaint; point: [number, number] } => Boolean(x.point)), [complaints]);
  const categories = Array.from(new Set(located.map(({ complaint }) => complaint.category))).sort();
  const pinned = located.filter(({ complaint }) => (statusFilter === 'ALL' || complaint.status === statusFilter) && (categoryFilter === 'ALL' || complaint.category === categoryFilter));
  const selected = pinned.find((item) => item.complaint.id === selectedId) ?? pinned[0];
  const point = selected?.point ?? null;
  const fullMapUrl = point ? `https://www.openstreetmap.org/?mlat=${point[0]}&mlon=${point[1]}#map=17/${point[0]}/${point[1]}` : 'https://www.openstreetmap.org/';
  const initialCenter: LatLngExpression = point ?? located[0]?.point ?? defaultCenter;
  const noCoordinates = complaints.length - located.length;

  return <section className="page-content civic-map-page">
    <div className="page-heading"><span className="eyebrow">LOCATION INTELLIGENCE</span><h1>Complaint map</h1><p>Map pins appear only for reports where a citizen explicitly shared GPS coordinates.</p></div>
    <div className="map-summary-row">
      <div className="card-surface map-summary-card"><span className="map-summary-icon"><MapPin size={18}/></span><div><strong>{pinned.length}</strong><span>Located reports matching filters</span></div></div>
      <div className="card-surface map-summary-card"><span className="map-summary-icon"><MapPin size={18}/></span><div><strong>{noCoordinates}</strong><span>Reports without coordinates (not plotted)</span></div></div>
    </div>
    <div className="filter-bar card-surface map-filters"><div className="filter-control"><select aria-label="Filter map by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></div><div className="filter-control"><select aria-label="Filter map by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="ALL">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></div></div>
    <div className="card-surface map-wrapper">
      <MapContainer center={initialCenter} zoom={point ? 14 : 11} scrollWheelZoom style={{ height: 430, width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <RecenterMap point={point}/>
        {pinned.map(({ complaint, point: markerPoint }) => <Marker key={complaint.id} position={markerPoint} icon={issueIcon} eventHandlers={{ click: () => setSelectedId(complaint.id) }}>
          <Popup><div className="map-popup"><strong>{complaint.title}</strong><span>{complaint.ticket_id}</span><span>{complaint.category} · {complaint.urgency}</span><span>{complaint.area}{complaint.ward ? ` · ${complaint.ward}` : ''}</span><span>{complaint.status.replaceAll('_', ' ')}</span></div></Popup>
        </Marker>)}
      </MapContainer>
      {!pinned.length && <div className="map-empty map-empty-overlay"><MapPin size={28}/><h3>{located.length ? 'No locations match these filters' : 'No shared GPS locations yet'}</h3><p>{located.length ? 'Change the category or status filters to see more reports.' : 'When a citizen explicitly shares current location during complaint submission, the report can appear here.'}</p></div>}
    </div>
    <div className="map-embed-footer"><span>Map tiles by OpenStreetMap contributors. Internet connection required.</span>{point && <a href={fullMapUrl} target="_blank" rel="noreferrer">Open larger map <ExternalLink size={14}/></a>}</div>
    {pinned.length > 0 && <div className="map-detail-grid">
      <div className="card-surface map-list-card"><div className="panel-heading"><div><h3>Located reports</h3><p>Select a report to focus the map.</p></div></div>
        <div className="map-complaint-list">{pinned.map(({ complaint }) => <button type="button" key={complaint.id} className={`map-complaint-row ${selected?.complaint.id === complaint.id ? 'selected' : ''}`} onClick={() => setSelectedId(complaint.id)}><span className="map-row-pin"><MapPin size={15}/></span><span className="map-row-copy"><strong>{complaint.title}</strong><small>{complaint.ticket_id} · {complaint.area}</small><small>{complaint.category} · {complaint.status.replaceAll('_', ' ')}</small></span><ExternalLink size={14}/></button>)}</div>
      </div>
      {selected && <div className="card-surface map-selected-card"><span className="eyebrow">SELECTED REPORT</span><h3>{selected.complaint.title}</h3><p>{selected.complaint.description}</p><div className="map-coordinate-line"><span>Latitude</span><strong>{selected.point[0].toFixed(6)}</strong></div><div className="map-coordinate-line"><span>Longitude</span><strong>{selected.point[1].toFixed(6)}</strong></div><a className="button button-primary" href={fullMapUrl} target="_blank" rel="noreferrer">Open larger map <ExternalLink size={15}/></a><p className="tiny-muted">Precise coordinates are saved only after explicit consent. Only reports your account is authorized to view appear here.</p></div>}
    </div>}
  </section>;
}
