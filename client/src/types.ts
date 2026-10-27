export type Role = 'citizen' | 'officer' | 'admin';
export type Status = 'SUBMITTED' | 'UNDER_REVIEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export interface User {
  id: string; fullName: string; email: string; role: Role; department: string | null; ward: string | null;
}
export interface Complaint {
  id: string; ticket_id: string; title: string; description: string; summary: string; category: string;
  suggested_department: string; urgency: 'Low' | 'Medium' | 'High' | 'Critical'; ai_confidence: number | string;
  ai_mode: 'AI' | 'DEMO'; ai_reasoning: string; mentioned_location: string | null; area: string; ward: string | null;
  address: string | null; latitude?: number | string | null; longitude?: number | string | null; photo_analysis?: string | null; status: Status; citizen_id: string; assigned_department: string | null;
  assigned_officer_id: string | null; citizen_name?: string; officer_name?: string; possible_duplicate_of: string | null;
  duplicate_score: number | string | null; resolution_note: string | null; escalated_at: string | null; resolved_at: string | null;
  created_at: string; updated_at: string; hasPhoto: boolean;
}
export interface ComplaintUpdate { id: number; event_type: string; old_status: string | null; new_status: string | null; message: string; actor_name: string | null; created_at: string; }
export interface Summary { total: number; pending: number; in_progress: number; resolved: number; overdue: number; byCategory: Array<{ category: string; count: number }>; ai: { mode: string }; }
export interface Officer { id: string; fullName: string; email: string; department: string | null; ward: string | null; }
export interface Notification { id: number; complaint_id: string | null; title: string; message: string; is_read: boolean; created_at: string; }
