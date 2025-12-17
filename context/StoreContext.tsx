
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
    Ticket, Customer, TodoTask, AppSettings, AuditLogEntry, 
    CurrentUser, CustomerNote, Device, BeforeInstallPromptEvent, UserRole, View,
    TicketFilters, DashboardStats
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

// Helper functions to map Supabase snake_case to app camelCase
const mapSupabaseToTicket = (t: any): Ticket => {
    // Robustly handle the joined customer name.
    // Supabase can return an object or array depending on relationship definition.
    // For many-to-one (tickets->customers), it should be an object, but we handle both safely.
    const customerName = t.customers 
        ? (Array.isArray(t.customers) ? t.customers[0]?.name : t.customers.name) 
        : undefined;

    return {
        id: t.id,
        customerId: t.customer_id,
        customerName: customerName,
        subject: t.subject,
        status: t.status,
        holdReason: t.hold_reason ?? undefined,
        priority: t.priority,
        assignedTo: t.assigned_to ?? undefined,
        createdAt: t.created_at,
        resolvedAt: t.resolved_at ?? undefined,
        device: t.device as unknown as Device,
        chargerStatus: t.charger_status as 'YES' | 'NO' | undefined,
        store: t.store,
        amountEstimate: t.amount_estimate,
        warranty: t.warranty as 'YES' | 'NO',
        billNumber: t.bill_number ?? undefined,
        scheduledDate: t.scheduled_date ?? undefined,
        internalProgressReason: t.internal_progress_reason ?? undefined,
        internalProgressNote: t.internal_progress_note ?? undefined,
    };
};

const mapSupabaseToCustomer = (c: any): Customer => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    createdAt: c.created_at,
    notes: (Array.isArray(c.notes) ? c.notes as unknown as CustomerNote[] : []),
    photoUrl: c.photo_url ?? undefined
});

const mapSupabaseToAuditLog = (l: any): AuditLogEntry => ({
    id: l.id,
    timestamp: l.timestamp,
    entityId: l.entity_id,
    entityType: l.entity_type as 'TICKET' | 'CUSTOMER' | 'NOTE',
    action: l.action as 'CREATE' | 'UPDATE' | 'DELETE',
    user: l.user,
    details: l.details,
});

const mapSupabaseToTask = (t: any): TodoTask => ({
    id: t.id,
    date: t.date,
    text: t.text,
    completed: t.completed,
    assignedTo: t.assigned_to ?? undefined
});

const mapSupabaseToSettings = (s: any): AppSettings => ({
    id: s.id,
    teamMembers: Array.isArray(s.team_members) ? (s.team_members as any[]).map(m => {
        let role: UserRole = 'TECHNICIAN';
        const rawRole = m.role ? String(m.role).trim().toUpperCase() : '';
        if (rawRole === 'ADMIN' || rawRole === 'MANAGEMENT' || rawRole === 'TECHNICIAN') {
            role = rawRole as UserRole;
        }
        return {
            id: m.id,
            name: m.name,
            details: m.details,
            experience: m.experience,
            photoUrl: m.photoUrl,
            role: role, 
            email: m.email,
            password: m.password
        };
    }) : [],
    stores: Array.isArray(s.stores) ? (s.stores as string[]) : [],
    holdReasons: Array.isArray(s.hold_reasons) ? (s.hold_reasons as string[]) : [],
    priorities: Array.isArray(s.priorities) ? (s.priorities as string[]) : [],
    statuses: Array.isArray(s.statuses) ? (s.statuses as string[]) : [],
    pastDueDays: typeof s.past_due_days === 'object' && s.past_due_days !== null ? (s.past_due_days as { [key: string]: number }) : { HIGH: 3, MEDIUM: 7, LOW: 14 },
    deviceTypes: Array.isArray(s.device_types) ? (s.device_types as string[]) : ['LAPTOP', 'DESKTOP', 'ACCESSORY', 'CCTV', 'BRAND SERVICE', 'OTHER'],
    internalProgressReasons: Array.isArray(s.internal_progress_reasons) ? (s.internal_progress_reasons as string[]) : [],
});

interface StoreContextType {
    // Data State
    tickets: Ticket[]; // Main Paginated List
    ticketsCount: number;
    customers: Customer[]; // Main Paginated List
    customersCount: number;
    tasks: TodoTask[];
    settings: AppSettings | null;
    auditLog: AuditLogEntry[];
    currentUser: CurrentUser | null;
    
    // Additional Data
    dashboardStats: DashboardStats;
    pendingTickets: Ticket[]; 
    scheduledTickets: Ticket[];

    // Setters
    setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    setTasks: React.Dispatch<React.SetStateAction<TodoTask[]>>;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings | null>>;
    setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
    setCurrentUser: (user: CurrentUser | null) => void;

    // Pagination & Filtering State
    ticketPage: number;
    setTicketPage: (page: number) => void;
    ticketPageSize: number;
    ticketFilters: TicketFilters;
    setTicketFilters: React.Dispatch<React.SetStateAction<TicketFilters>>;
    
    customerPage: number;
    setCustomerPage: (page: number) => void;
    customerPageSize: number;
    customerSearch: string;
    setCustomerSearch: (term: string) => void;

    // UI State
    activeView: View;
    setActiveView: (view: View) => void;
    isSidebarOpen: boolean;
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    searchQuery: string; 
    setSearchQuery: (q: string) => void;

    // App Status
    loading: boolean;
    ticketsLoading: boolean;
    customersLoading: boolean;
    isRefreshing: boolean;
    error: string | null;
    
    // Actions
    refreshData: () => Promise<void>;
    logout: () => void;
    addAuditLog: (log: Omit<AuditLogEntry, 'id' | 'timestamp' | 'user'>) => Promise<void>;
    
    // PWA Install Prompt
    installPrompt: BeforeInstallPromptEvent | null;
    setInstallPrompt: React.Dispatch<React.SetStateAction<BeforeInstallPromptEvent | null>>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    // --- Pagination & Filter State ---
    const [ticketPage, setTicketPage] = useState(0);
    const [ticketPageSize] = useState(10);
    const [ticketFilters, setTicketFilters] = useState<TicketFilters>({ 
        status: 'ALL', priority: 'ALL', store: 'ALL', dateRange: 'ALL', assignedTo: 'ALL',
        deviceType: 'ALL', warranty: 'ALL', sortBy: 'NEWEST'
    });

    const [customerPage, setCustomerPage] = useState(0);
    const [customerPageSize] = useState(10);
    const [customerSearch, setCustomerSearch] = useState('');

    // --- Data State ---
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [ticketsCount, setTicketsCount] = useState(0);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customersCount, setCustomersCount] = useState(0);
    const [tasks, setTasks] = useState<TodoTask[]>([]);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
    
    const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
        openTickets: 0, overdueTickets: 0, resolvedToday: 0, totalCustomers: 0, highPriorityTickets: [], storeStats: {}
    });
    const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
    const [scheduledTickets, setScheduledTickets] = useState<Ticket[]>([]);

    const queryClient = useQueryClient();

    const setSearchQuery = (q: string) => {
        setTicketFilters(prev => ({ ...prev, search: q }));
        setCustomerSearch(q);
    };
    const searchQuery = ticketFilters.search || '';

    // --- Fetchers ---

    const fetchSettings = async () => {
        if (!supabase) return null;
        const { data, error } = await supabase.from('settings').select('*').limit(1).single();
        if (error) {
            if (error.code === 'PGRST116') {
                return { id: 1, teamMembers: [], stores: [], holdReasons: [], priorities: [], statuses: [], deviceTypes: [], pastDueDays: {}, internalProgressReasons: [] } as AppSettings;
            }
            throw error;
        }
        return mapSupabaseToSettings(data);
    };

    const fetchPaginatedTickets = async () => {
        if (!supabase) return { data: [], count: 0 };
        // JOIN customers table to get name
        let query = supabase.from('tickets').select('*, customers(name)', { count: 'exact' });

        if (ticketFilters.search) {
            const term = ticketFilters.search;
            
            // FIX: Refactored search logic to avoid 'failed to parse logic tree' error
            // 1. Find matching customers first
            const { data: matchingCustomers } = await supabase
                .from('customers')
                .select('id')
                .ilike('name', `%${term}%`);
                
            const matchingCustomerIds = matchingCustomers?.map(c => c.id) || [];
            
            // 2. Construct filter: Subject OR ID OR (Customer ID in List)
            // NOTE: PostgREST syntax doesn't allow `customers.name.ilike` inside OR easily without complex embedding filter syntax.
            // We use the IDs we just fetched.
            let orFilter = `subject.ilike.%${term}%,id.ilike.%${term}%`;
            
            if (matchingCustomerIds.length > 0) {
                // Add customer IDs to the OR condition
                orFilter += `,customer_id.in.(${matchingCustomerIds.join(',')})`;
            }
            
            query = query.or(orFilter);
        }
        
        if (ticketFilters.status && ticketFilters.status !== 'ALL') query = query.eq('status', ticketFilters.status);
        if (ticketFilters.priority && ticketFilters.priority !== 'ALL') query = query.eq('priority', ticketFilters.priority);
        if (ticketFilters.store && ticketFilters.store !== 'ALL') query = query.eq('store', ticketFilters.store);
        
        // Assigned To Filter
        if (ticketFilters.assignedTo && ticketFilters.assignedTo !== 'ALL') {
             if (ticketFilters.assignedTo === 'UNASSIGNED') {
                 query = query.is('assigned_to', null);
             } else {
                 query = query.eq('assigned_to', ticketFilters.assignedTo);
             }
        }
        
        // Device Type Filter (JSONB Containment)
        if (ticketFilters.deviceType && ticketFilters.deviceType !== 'ALL') {
             query = query.contains('device', { type: ticketFilters.deviceType });
        }

        // Warranty Filter
        if (ticketFilters.warranty && ticketFilters.warranty !== 'ALL') {
            query = query.eq('warranty', ticketFilters.warranty);
        }
        
        // Date Filtering
        if (ticketFilters.dateRange && ticketFilters.dateRange !== 'ALL') {
            const today = new Date();
            let start: Date | null = null;
            let end: Date | null = new Date();
            if (ticketFilters.dateRange === 'TODAY') start = new Date(today.setHours(0,0,0,0));
            else if (ticketFilters.dateRange === 'LAST_7_DAYS') start = new Date(today.setDate(today.getDate() - 7));
            else if (ticketFilters.dateRange === 'LAST_30_DAYS') start = new Date(today.setDate(today.getDate() - 30));
            else if (ticketFilters.dateRange === 'CUSTOM' && ticketFilters.startDate) {
                start = new Date(ticketFilters.startDate);
                if (ticketFilters.endDate) end = new Date(ticketFilters.endDate);
            }
            
            // Determine which date column to filter on
            let dateColumn = 'created_at';
            if (ticketFilters.status === 'Resolved') {
                dateColumn = 'resolved_at';
            }

            if (start) query = query.gte(dateColumn, start.toISOString());
            if (end) { end.setHours(23, 59, 59, 999); query = query.lte(dateColumn, end.toISOString()); }
        }

        // Sort Order
        if (ticketFilters.sortBy === 'OLDEST') {
            query = query.order('created_at', { ascending: true });
        } else {
            // Default to NEWEST
            query = query.order('created_at', { ascending: false });
        }

        const from = ticketPage * ticketPageSize;
        const to = from + ticketPageSize - 1;
        const { data, count, error } = await query.range(from, to);
        if (error) throw error;
        return { data: (data || []).map(mapSupabaseToTicket), count: count || 0 };
    };

    const fetchPaginatedCustomers = async () => {
        if (!supabase) return { data: [], count: 0 };
        let query = supabase.from('customers').select('*', { count: 'exact' });
        if (customerSearch) query = query.or(`name.ilike.%${customerSearch}%,email.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`);
        const from = customerPage * customerPageSize;
        const to = from + customerPageSize - 1;
        const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
        if (error) throw error;
        return { data: (data || []).map(mapSupabaseToCustomer), count: count || 0 };
    };

    const fetchDashboardStats = async () => {
        if (!supabase) return null;
        // Use exact 'Open' etc check if needed, but generally exclude resolved states
        const { count: openCount } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).not('status', 'in', '("Resolved","SERVICE DONE")');
        
        // Calculate stats for "Today" using local time midnight logic
        // We need to find midnight in local time, then convert to ISO string for comparison
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const midnightIso = now.toISOString();

        const { count: resolvedCount } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Resolved') // Strict check
            .gte('resolved_at', midnightIso);

        const { count: custCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
        // Join customers for high priority tickets too
        const { data: highPriority } = await supabase.from('tickets').select('*, customers(name)').ilike('priority', '%HIGH%').not('status', 'in', '("Resolved","SERVICE DONE")').limit(5);
        const { data: storeRaw } = await supabase.from('tickets').select('store, priority').not('status', 'in', '("Resolved","SERVICE DONE")');
        
        const storeStats: any = {};
        (storeRaw || []).forEach((t: any) => {
             if (!storeStats[t.store]) storeStats[t.store] = { total: 0, priorities: {} };
             storeStats[t.store].total++;
             storeStats[t.store].priorities[t.priority] = (storeStats[t.store].priorities[t.priority] || 0) + 1;
        });

        const { data: overdueRaw } = await supabase.from('tickets').select('created_at, priority').not('status', 'in', '("Resolved","SERVICE DONE")');
        let overdueCount = 0;
        if (settings && overdueRaw) {
             const nowTime = new Date().getTime();
             overdueRaw.forEach((t: any) => {
                 const diffDays = Math.floor((nowTime - new Date(t.created_at).getTime()) / (1000 * 3600 * 24));
                 const threshold = settings.pastDueDays[t.priority] || 7;
                 if (diffDays > threshold) overdueCount++;
             });
        }

        return {
            openTickets: openCount || 0, overdueTickets: overdueCount, resolvedToday: resolvedCount || 0, totalCustomers: custCount || 0, highPriorityTickets: (highPriority || []).map(mapSupabaseToTicket), storeStats
        };
    };

    const fetchPendingTickets = async () => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('tickets').select('*, customers(name)').eq('status', 'Pending Approval');
        if (error) throw error;
        return (data || []).map(mapSupabaseToTicket);
    };

    const fetchScheduledTickets = async () => {
        if (!supabase) return [];
        // Also fetch customer name for schedule view
        const { data, error } = await supabase.from('tickets').select('*, customers(name)').not('scheduled_date', 'is', null);
        if (error) throw error;
        return (data || []).map(mapSupabaseToTicket);
    };

    const fetchTasks = async () => {
        if (!supabase) return [];
        
        let query = supabase.from('tasks').select('*');

        if (currentUser && currentUser.type === 'team') {
            if (currentUser.role === 'TECHNICIAN') {
                // Technicians only see tasks assigned to them
                query = query.eq('assigned_to', currentUser.name);
            }
            // Admin and Management see all tasks
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(mapSupabaseToTask);
    };

    const fetchAuditLog = async () => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('audit_log').select('*').order('timestamp', { ascending: false }).limit(50);
        if (error) throw error;
        return (data || []).map(mapSupabaseToAuditLog);
    };

    // --- Queries ---
    const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, enabled: isSupabaseConfigured });
    const ticketsQuery = useQuery({ queryKey: ['tickets', ticketPage, ticketPageSize, ticketFilters], queryFn: fetchPaginatedTickets, enabled: isSupabaseConfigured, placeholderData: keepPreviousData });
    const customersQuery = useQuery({ queryKey: ['customers', customerPage, customerPageSize, customerSearch], queryFn: fetchPaginatedCustomers, enabled: isSupabaseConfigured, placeholderData: keepPreviousData });
    // Include user role/name in task query key to refetch when user changes
    const tasksQuery = useQuery({ 
        queryKey: ['tasks', currentUser?.type === 'team' ? currentUser.name : '', currentUser?.type === 'team' ? currentUser.role : ''], 
        queryFn: fetchTasks, 
        enabled: isSupabaseConfigured && !!currentUser
    });
    const auditLogQuery = useQuery({ queryKey: ['auditLog'], queryFn: fetchAuditLog, enabled: isSupabaseConfigured });
    const dashboardQuery = useQuery({ queryKey: ['dashboardStats'], queryFn: fetchDashboardStats, enabled: isSupabaseConfigured });
    const pendingTicketsQuery = useQuery({ queryKey: ['pendingTickets'], queryFn: fetchPendingTickets, enabled: isSupabaseConfigured });
    const scheduledTicketsQuery = useQuery({ queryKey: ['scheduledTickets'], queryFn: fetchScheduledTickets, enabled: isSupabaseConfigured });

    // --- Synchronization Effects ---
    useEffect(() => { if (settingsQuery.data) setSettings(settingsQuery.data); }, [settingsQuery.data]);
    useEffect(() => { if (ticketsQuery.data) { setTickets(ticketsQuery.data.data); setTicketsCount(ticketsQuery.data.count); } }, [ticketsQuery.data]);
    useEffect(() => { if (customersQuery.data) { setCustomers(customersQuery.data.data); setCustomersCount(customersQuery.data.count); } }, [customersQuery.data]);
    useEffect(() => { if (tasksQuery.data) setTasks(tasksQuery.data); }, [tasksQuery.data]);
    useEffect(() => { if (auditLogQuery.data) setAuditLog(auditLogQuery.data); }, [auditLogQuery.data]);
    useEffect(() => { if (dashboardQuery.data) setDashboardStats(dashboardQuery.data); }, [dashboardQuery.data]);
    useEffect(() => { if (pendingTicketsQuery.data) setPendingTickets(pendingTicketsQuery.data); }, [pendingTicketsQuery.data]);
    useEffect(() => { if (scheduledTicketsQuery.data) setScheduledTickets(scheduledTicketsQuery.data); }, [scheduledTicketsQuery.data]);

    // --- PWA Install Listener ---
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // --- Real-time Subscriptions ---
    useEffect(() => {
        if (!supabase) return;
        const channel = supabase.channel('global-app-changes');
        
        const invalidateTickets = () => {
             queryClient.invalidateQueries({ queryKey: ['tickets'] });
             queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
             queryClient.invalidateQueries({ queryKey: ['pendingTickets'] });
             queryClient.invalidateQueries({ queryKey: ['scheduledTickets'] });
        };

        const invalidateCustomers = () => {
             queryClient.invalidateQueries({ queryKey: ['customers'] });
             // Customer changes might affect ticket displays (names)
             queryClient.invalidateQueries({ queryKey: ['tickets'] }); 
             queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        };

        channel
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
                // Optimistic Updates for instant UI feedback
                try {
                    if (payload.eventType === 'UPDATE') {
                        setTickets(current => current.map(t => t.id === payload.new.id ? { ...mapSupabaseToTicket(payload.new), customerName: t.customerName } : t));
                    } else if (payload.eventType === 'DELETE') {
                        setTickets(current => current.filter(t => t.id !== payload.old.id));
                    } else if (payload.eventType === 'INSERT') {
                        // For inserts, we try to find customer name from local state if possible to avoid blinking ID
                        const newTicket = mapSupabaseToTicket(payload.new);
                        const localCustomer = customers.find(c => c.id === newTicket.customerId);
                        if(localCustomer) newTicket.customerName = localCustomer.name;
                        
                        setTickets(current => [newTicket, ...current]);
                    }
                } catch (e) {
                    console.error("Realtime ticket update failed:", e);
                }
                // Always invalidate to ensure consistency with DB (count, etc.)
                invalidateTickets();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
                 try {
                     if (payload.eventType === 'UPDATE') {
                        setCustomers(current => current.map(c => c.id === payload.new.id ? mapSupabaseToCustomer(payload.new) : c));
                    } else if (payload.eventType === 'DELETE') {
                        setCustomers(current => current.filter(c => c.id !== payload.old.id));
                    } else if (payload.eventType === 'INSERT') {
                        setCustomers(current => [mapSupabaseToCustomer(payload.new), ...current]);
                    }
                 } catch (e) {
                     console.error("Realtime customer update failed:", e);
                 }
                invalidateCustomers();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
                // Invalidate query if task update is relevant
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload) => { 
                if (payload.eventType === 'DELETE') return; 
                try {
                    setSettings(mapSupabaseToSettings(payload.new)); 
                    queryClient.invalidateQueries({ queryKey: ['settings'] });
                } catch (e) {
                    console.error("Realtime settings update failed:", e);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [queryClient, customers]);

    const logout = async () => {
        if (supabase) await supabase.auth.signOut();
        setCurrentUser(null);
        setActiveView('dashboard');
        queryClient.clear();
    };

    const addAuditLogHelper = async (log: Omit<AuditLogEntry, 'id' | 'timestamp' | 'user'>) => {
        if (!supabase) return;
        const newLog: AuditLogEntry = {
            id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date().toISOString(),
            user: currentUser?.name || 'System',
            ...log
        };
        setAuditLog(prev => [newLog, ...prev]);
        await (supabase.from('audit_log') as any).insert({
            id: newLog.id,
            timestamp: newLog.timestamp,
            entity_id: newLog.entityId,
            entity_type: newLog.entityType,
            action: newLog.action,
            user: newLog.user,
            details: newLog.details,
        });
        queryClient.invalidateQueries({ queryKey: ['auditLog'] });
    };

    const loading = isSupabaseConfigured && settingsQuery.isLoading;
    const ticketsLoading = ticketsQuery.isLoading;
    const customersLoading = customersQuery.isLoading;
    const isRefreshing = ticketsQuery.isRefetching;
    const error = (ticketsQuery.error as Error)?.message || null;

    const refreshData = async () => { await queryClient.refetchQueries(); };

    const value = {
        tickets, ticketsCount, customers, customersCount, tasks, settings, auditLog, currentUser,
        dashboardStats, pendingTickets, scheduledTickets,
        setTickets, setCustomers, setTasks, setSettings, setAuditLog, setCurrentUser,
        ticketPage, setTicketPage, ticketPageSize, ticketFilters, setTicketFilters,
        customerPage, setCustomerPage, customerPageSize, customerSearch, setCustomerSearch,
        activeView, setActiveView, isSidebarOpen, setSidebarOpen, searchQuery, setSearchQuery,
        loading, ticketsLoading, customersLoading, isRefreshing, error, refreshData, logout, addAuditLog: addAuditLogHelper,
        installPrompt, setInstallPrompt
    };

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (context === undefined) throw new Error('useStore must be used within a StoreProvider');
    return context;
};
