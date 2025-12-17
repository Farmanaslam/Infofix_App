
import React, { useMemo, useState, useEffect } from 'react';
import { Ticket, Customer, AppSettings, TicketPriority } from '../types';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useStore } from '../context/StoreContext';

// --- Reusable Icon Components ---
const UserIcon = () => <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const DeviceIcon = () => <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const IssueIcon = () => <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// --- Modals ---
const ApproveModal: React.FC<{ ticket: Ticket; settings: AppSettings; onClose: () => void; addAuditLog: any; customers: Customer[]; setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>; }> = ({ ticket, settings, onClose, addAuditLog, customers, setTickets }) => {
    // FIX: Safe initialization to prevent crash if settings are empty
    const defaultPriority = (settings?.priorities && settings.priorities.length > 0) 
        ? (settings.priorities.find(p => p.toUpperCase().includes('MEDIUM')) || settings.priorities[0]) 
        : 'MEDIUM';

    const [priority, setPriority] = useState<TicketPriority>(defaultPriority as TicketPriority);
    const [assignedTo, setAssignedTo] = useState<string>('');
    const [amountEstimate, setAmountEstimate] = useState<string>('0');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirmApproval = async () => {
        if (!supabase) return;
        setIsSubmitting(true);
        const updates = { 
            status: 'NEW', 
            priority: priority, 
            assigned_to: assignedTo || null,
            amount_estimate: parseFloat(amountEstimate) || 0,
        };

        // Optimistic Update: Update local state immediately
        const updatedTicket = { 
            ...ticket, 
            ...updates,
            status: 'NEW',
            priority: priority,
            assignedTo: assignedTo || undefined,
            amountEstimate: parseFloat(amountEstimate) || 0
        };
        setTickets(prev => prev.map(t => t.id === ticket.id ? updatedTicket : t));

        // Close modal immediately for better UX
        onClose();

        const { error } = await (supabase.from('tickets') as any).update(updates).eq('id', ticket.id);

        if (error) {
            console.error("Failed to approve ticket:", error);
            toast.error(`Error: ${error.message}`);
            // Revert on error (optional, usually data refresh handles sync)
        } else {
            addAuditLog({ entityId: ticket.id, entityType: 'TICKET', action: 'UPDATE', details: `Request approved. Priority: ${priority}, Assigned to: ${assignedTo || 'Unassigned'}, Estimate: ${amountEstimate}` });
            toast.success('Request approved');
        }
        setIsSubmitting(false);
    };
    
    const inputClasses = "w-full p-2 border border-gray-300 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md text-black">
                <h3 className="text-xl font-bold mb-4">Approve Request: {ticket.id}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Set Priority</label>
                        <select value={priority} onChange={e => setPriority(e.target.value)} className={inputClasses}>
                            {settings?.priorities && settings.priorities.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Assign To (Optional)</label>
                        <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={inputClasses}>
                            <option value="">Unassigned</option>
                            {settings?.teamMembers && settings.teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Initial Amount Estimate</label>
                        <input type="number" value={amountEstimate} onChange={e => setAmountEstimate(e.target.value)} className={inputClasses}/>
                    </div>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-black" disabled={isSubmitting}>Cancel</button>
                    <button onClick={handleConfirmApproval} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300" disabled={isSubmitting}>{isSubmitting ? 'Approving...' : 'Confirm Approval'}</button>
                </div>
            </div>
        </div>
    );
};

const RejectModal: React.FC<{ ticket: Ticket; onClose: () => void; addAuditLog: any; customers: Customer[]; setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>; }> = ({ ticket, onClose, addAuditLog, customers, setTickets }) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleConfirmRejection = async () => {
        if (!reason.trim()) {
            toast.error('Please provide a reason for rejection.');
            return;
        }
        if (!supabase) return;
        setIsSubmitting(true);
        
        // Optimistic Update
        const updatedTicket = { ...ticket, status: 'Rejected', holdReason: reason };
        setTickets(prev => prev.map(t => t.id === ticket.id ? updatedTicket : t));

        onClose();

        // Store reason in hold_reason column as well as logging it
        const { error } = await (supabase.from('tickets') as any).update({ status: 'Rejected', hold_reason: reason }).eq('id', ticket.id);
        if (error) {
            console.error("Failed to reject ticket:", error);
            toast.error(`Error: ${error.message}`);
        } else {
            addAuditLog({ entityId: ticket.id, entityType: 'TICKET', action: 'UPDATE', details: `Request rejected. Reason: ${reason}` });
            toast.success('Request rejected');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md text-black">
                <h3 className="text-xl font-bold mb-4">Reject Request: {ticket.id}</h3>
                <p className="mb-2 text-sm text-gray-600">Please provide a reason for rejection (Required).</p>
                <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for rejection..." rows={4} className="w-full p-2 border border-gray-300 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-black" disabled={isSubmitting}>Cancel</button>
                    <button onClick={handleConfirmRejection} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300" disabled={isSubmitting}>{isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}</button>
                </div>
            </div>
        </div>
    );
};

const RequestCard: React.FC<{ ticket: Ticket; customer: Customer | undefined; customerTicketCount: number; onApprove: (ticket: Ticket) => void; onReject: (ticket: Ticket) => void; }> = ({ ticket, customer, customerTicketCount, onApprove, onReject }) => {
    // FIX: Safely handle missing device data
    const device = ticket.device || { type: 'Unknown', brand: '', model: '', serialNumber: '', description: '' };
    
    const deviceDetails = [
        device.brand,
        device.model,
        device.serialNumber ? `SN: ${device.serialNumber}` : '',
        device.description
    ].filter(Boolean).join(' - ');

    return (
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex flex-col">
            <div className="border-b pb-3 mb-4">
                <p className="font-mono text-sm text-blue-600">{ticket.id}</p>
                <p className="text-xs text-gray-500">Submitted: {new Date(ticket.createdAt).toLocaleString()}</p>
            </div>
            
            <div className="space-y-4 flex-grow">
                <div className="p-3 bg-gray-50 rounded-md">
                    <h4 className="font-semibold text-sm text-gray-600 flex items-center mb-2"><UserIcon />Customer Details</h4>
                    <p className="font-bold text-black">{customer?.name || 'Unknown Customer'}</p>
                    <p className="text-sm text-black">{customer?.email || 'No email'}</p>
                    <p className="text-sm text-black">{customer?.phone || 'No phone'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                    <h4 className="font-semibold text-sm text-gray-600 flex items-center mb-2"><DeviceIcon />Device Details</h4>
                    <p className="font-bold text-black">{device.type}</p>
                    <p className="text-sm text-black">{deviceDetails || 'No details provided'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                    <h4 className="font-semibold text-sm text-gray-600 flex items-center mb-2"><IssueIcon />Reported Issue</h4>
                    <p className="text-black">{ticket.subject}</p>
                </div>
            </div>

            <div className="flex space-x-2 mt-6">
                <button onClick={() => onApprove(ticket)} className="w-full bg-green-600 text-white font-bold py-2 px-3 rounded-md hover:bg-green-700 transition">Approve</button>
                <button onClick={() => onReject(ticket)} className="w-full bg-red-600 text-white font-bold py-2 px-3 rounded-md hover:bg-red-700 transition">Reject</button>
            </div>
        </div>
    );
};

const EmptyState: React.FC = () => (
    <div className="text-center bg-white p-10 rounded-lg shadow-md">
        <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <h3 className="mt-2 text-xl font-semibold text-black">All Caught Up!</h3>
        <p className="mt-1 text-black">There are no new customer requests to review.</p>
    </div>
);


const ReviewRequests: React.FC = () => {
    // pendingTickets is now served from a dedicated server-side query in StoreContext
    const { pendingTickets, customers, settings, addAuditLog, refreshData, setTickets } = useStore();
    const [ticketToApprove, setTicketToApprove] = useState<Ticket | null>(null);
    const [ticketToReject, setTicketToReject] = useState<Ticket | null>(null);

    // Force data refresh on mount to ensure admin sees latest requests
    // Also poll every 30 seconds to catch new public requests even if realtime websocket drops
    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 30000);
        return () => clearInterval(interval);
    }, []);

    // Optimization: customerMap might be incomplete if customers are paginated. 
    // Ideally we fetch specific customers for these tickets, but for now we rely on the context list.
    const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

    // Sorting locally is fine for this small subset
    const sortedPendingTickets = useMemo(() => {
        return [...pendingTickets].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        });
    }, [pendingTickets]);

    if (!settings) {
        return (
            <div className="p-8 flex flex-col items-center justify-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mb-2"></div>
                <p>Loading settings...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-bold text-black">Review Customer Requests ({sortedPendingTickets.length})</h2>
                 <button 
                    onClick={() => refreshData()}
                    className="flex items-center text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-100 transition"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    Refresh
                </button>
            </div>

            {sortedPendingTickets.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedPendingTickets.map(ticket => (
                        <RequestCard
                            key={ticket.id}
                            ticket={ticket}
                            customer={customerMap.get(ticket.customerId)}
                            customerTicketCount={0} // Disabled history count as it requires full DB scan, expensive for this view
                            onApprove={setTicketToApprove}
                            onReject={setTicketToReject}
                        />
                    ))}
                </div>
            )}
            
            {ticketToApprove && (
                <ApproveModal 
                    ticket={ticketToApprove} 
                    settings={settings} 
                    onClose={() => setTicketToApprove(null)} 
                    addAuditLog={addAuditLog} 
                    customers={customers}
                    setTickets={setTickets}
                />
            )}
            {ticketToReject && (
                <RejectModal 
                    ticket={ticketToReject} 
                    onClose={() => setTicketToReject(null)} 
                    addAuditLog={addAuditLog} 
                    customers={customers}
                    setTickets={setTickets}
                />
            )}
        </div>
    );
};

export default ReviewRequests;
