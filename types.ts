// FIX: Removed self-import which caused declaration conflicts.

export type View =
  | "dashboard"
  | "tickets"
  | "requests"
  | "customers"
  | "schedule"
  | "reports"
  | "settings"
  | "portal"
  | "request"
  | "search";

export type TicketStatus = string;

export type TicketPriority = string;

// Changed from const array to string to allow dynamic types from DB
export type DeviceType = string;

export interface Device {
  type: DeviceType;
  brand?: string;
  model?: string;
  serialNumber?: string;
  description?: string; // Used for ACCESSORY or OTHER
  brandService?: string;
}

export interface Ticket {
  id: string;
  customerId: string;
  customerName?: string; // Fetched via join for display
  subject: string;
  status: TicketStatus;
  holdReason?: string;
  rejectionReason?: string;

  priority: TicketPriority;
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
  device: Device;
  chargerStatus?: "YES" | "NO";
  store: string;
  amountEstimate: number;
  warranty: "YES" | "NO";
  billNumber?: string;
  scheduledDate?: string;
  internalProgressReason?: string;
  internalProgressNote?: string;
}

export interface CustomerNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  notes: CustomerNote[];
  photoUrl?: string;
}

export interface TodoTask {
  id: string;
  date: string; // 'YYYY-MM-DD'
  text: string;
  completed: boolean;
  assignedTo?: string|String[]; // Name of the team member
}

export type UserRole = "ADMIN" | "MANAGEMENT" | "TECHNICIAN";

export interface TeamMember {
  id: string;
  name: string;
  details: string;
  experience: number;
  photoUrl?: string;
  // New fields for RBAC
  role: UserRole;
  email: string;
  password?: string; // Should be hashed in a real app
}

// A union type for the currently logged-in user
export type CurrentUser =
  | (TeamMember & { type: "team" })
  | (Customer & { type: "customer" });

export interface AppSettings {
  id: number;
  teamMembers: TeamMember[];
  stores: string[];
  holdReasons: string[];
  priorities: string[];
  statuses: string[];
  deviceTypes: string[];
  pastDueDays: { [key: string]: number };
  internalProgressReasons: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  entityId: string;
  entityType: "TICKET" | "CUSTOMER" | "NOTE";
  action: "CREATE" | "UPDATE" | "DELETE";
  user: string;
  details: string;
}

// --- NEW TYPES FOR PAGINATION & STATS ---

export interface TicketFilters {
  status?: string;
  priority?: string;
  store?: string;
  assignedTo?: string;
  search?: string;
  dateRange?: string; // 'TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'CUSTOM', 'ALL'
  startDate?: string;
  endDate?: string;
  deviceType?: string;
  warranty?: string;
  sortBy?: "NEWEST" | "OLDEST";
}

export interface DashboardStats {
  openTickets: number;
  overdueTickets: number;
  resolvedToday: number;
  totalCustomers: number;
  highPriorityTickets: Ticket[]; // Top 5 high priority
  taskAssigned: number;
  storeStats: {
    [store: string]: {
      total: number;
      priorities: { [priority: string]: number };
    };
  };
}

// Supabase type definitions
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          details: string;
          entity_id: string;
          entity_type: string;
          id: string;
          timestamp: string;
          user: string;
        };
        Insert: {
          action: string;
          details: string;
          entity_id: string;
          entity_type: string;
          id: string;
          timestamp: string;
          user: string;
        };
        Update: {
          action?: string;
          details?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          timestamp?: string;
          user?: string;
        };
      };
      customers: {
        Row: {
          address: string;
          created_at: string;
          email: string;
          id: string;
          name: string;
          notes: Json | null;
          phone: string;
          photo_url: string | null;
        };
        Insert: {
          address: string;
          created_at: string;
          email: string;
          id: string;
          name: string;
          notes?: Json | null;
          phone: string;
          photo_url?: string | null;
        };
        Update: {
          address?: string;
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          notes?: Json | null;
          phone?: string;
          photo_url?: string | null;
        };
      };
      settings: {
        Row: {
          hold_reasons: Json | null;
          id: number;
          past_due_days: Json | null;
          priorities: Json | null;
          statuses: Json | null;
          stores: Json | null;
          team_members: Json | null;
          device_types: Json | null;
          internal_progress_reasons: Json | null;
        };
        Insert: {
          hold_reasons?: Json | null;
          id?: number;
          past_due_days?: Json | null;
          priorities?: Json | null;
          statuses?: Json | null;
          stores?: Json | null;
          team_members?: Json | null;
          device_types?: Json | null;
          internal_progress_reasons?: Json | null;
        };
        Update: {
          hold_reasons?: Json | null;
          id?: number;
          past_due_days?: Json | null;
          priorities?: Json | null;
          statuses?: Json | null;
          stores?: Json | null;
          team_members?: Json | null;
          device_types?: Json | null;
          internal_progress_reasons?: Json | null;
        };
      };
      tasks: {
        Row: {
          completed: boolean;
          date: string;
          id: string;
          text: string;
          assigned_to: string | null;
        };
        Insert: {
          completed: boolean;
          date: string;
          id: string;
          text: string;
          assigned_to?: string | null;
        };
        Update: {
          completed?: boolean;
          date?: string;
          id?: string;
          text?: string;
          assigned_to?: string | null;
        };
      };
      tickets: {
        Row: {
          amount_estimate: number;
          assigned_to: string | null;
          bill_number: string | null;
          charger_status: string | null;
          created_at: string;
          customer_id: string;
          device: Json;
          hold_reason: string | null;
          id: string;
          priority: string;
          resolved_at: string | null;
          scheduled_date: string | null;
          status: string;
          store: string;
          subject: string;
          warranty: string;
          internal_progress_reason: string | null;
          internal_progress_note: string | null;
        };
        Insert: {
          amount_estimate: number;
          assigned_to?: string | null;
          bill_number?: string | null;
          charger_status?: string | null;
          created_at: string;
          customer_id: string;
          device: Json;
          hold_reason?: string | null;
          id: string;
          priority: string;
          resolved_at?: string | null;
          scheduled_date?: string | null;
          status: string;
          store: string;
          subject: string;
          warranty: string;
          internal_progress_reason?: string | null;
          internal_progress_note?: string | null;
        };
        Update: {
          amount_estimate?: number;
          assigned_to?: string | null;
          bill_number?: string | null;
          charger_status?: string | null;
          created_at?: string;
          customer_id?: string;
          device?: Json;
          hold_reason?: string | null;
          id?: string;
          priority?: string;
          resolved_at?: string | null;
          scheduled_date?: string | null;
          status?: string;
          store?: string;
          subject?: string;
          warranty?: string;
          internal_progress_reason?: string | null;
          internal_progress_note?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Interface for the PWA install prompt event
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}
