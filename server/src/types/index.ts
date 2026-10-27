import type { Request } from 'express';

export type UserRole = 'citizen' | 'officer' | 'admin';
export interface UserPayload {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: string | null;
  ward: string | null;
}
export type AuthRequest = Request & { user?: UserPayload };

export const CATEGORIES = [
  'Water Supply', 'Roads and Potholes', 'Streetlights', 'Electrical Hazards', 'Drainage',
  'Waste Management', 'Sanitation', 'Other'
] as const;
export type ComplaintCategory = typeof CATEGORIES[number];
export type Urgency = 'Low' | 'Medium' | 'High' | 'Critical';
export const STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;
export type ComplaintStatus = typeof STATUSES[number];
