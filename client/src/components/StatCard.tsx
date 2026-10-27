import type { LucideIcon } from 'lucide-react';

export default function StatCard({ label, value, detail, icon: Icon, tone = 'blue' }: { label: string; value: number | string; detail: string; icon: LucideIcon; tone?: 'blue' | 'amber' | 'teal' | 'violet' }) {
  return <div className={`stat-card tone-${tone}`}><div className="stat-top"><span className="stat-icon"><Icon size={19} /></span><span className="stat-detail">{detail}</span></div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>;
}
