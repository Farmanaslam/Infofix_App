
import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Ticket, Customer } from '../types';
import TicketDetailsModal from './modals/TicketDetailsModal';
import CustomerDetailsModal from './modals/CustomerDetailsModal';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const SearchResults: React.FC = () => {
    const { tickets, customers, searchQuery, setTickets, addAuditLog, settings, auditLog } = useStore();
    
    // Detail Modal States
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    
    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return { tickets: [], customers: [] };

        const lowerQuery = searchQuery.toLowerCase();

        const matchedTickets = tickets.filter(t => 
            t.id.toLowerCase().includes(lowerQuery) ||
            t.subject.toLowerCase().includes(lowerQuery) ||
            (t.device?.type && t.device.type.toLowerCase().includes(lowerQuery)) ||
            (t.device?.serialNumber && t.device.serialNumber.toLowerCase().includes(lowerQuery)) ||
            (t.device?.brand && t.device.brand.toLowerCase().includes(lowerQuery)) ||
            t.status.toLowerCase().includes(lowerQuery)
        );

        const matchedCustomers = customers.filter(c => 
            c.name.toLowerCase().includes(lowerQuery) ||
            c.email.toLowerCase().includes(lowerQuery) ||
            c.phone.includes(lowerQuery)
        );

        return { tickets: matchedTickets, customers: matchedCustomers };
    }, [tickets, customers, searchQuery]);

    const handleUpdateTicket = async (updatedTicket: Ticket, transferNote?: string): Promise<boolean> => {
        if (!supabase) return false;

        const originalTickets = tickets;
        const oldTicket = tickets.find(t => t.id === updatedTicket.id);
        
        setTickets(current => current.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        setSelectedTicket(updatedTicket);

        const changes = [];
        if (oldTicket && oldTicket.store !== updatedTicket.store) {
            changes.push(`store to ${updatedTicket.store}`);
        }

        const updatePayload: any = {
            status: updatedTicket.status,
            priority: updatedTicket.priority,
            assigned_to: updatedTicket.assignedTo ?? null,
            subject: updatedTicket.subject,
            device: updatedTicket.device,
            store: updatedTicket.store,
            amount_estimate: updatedTicket.amountEstimate,
            warranty: updatedTicket.warranty,
            bill_number: updatedTicket.billNumber ?? null,
            hold_reason: updatedTicket.holdReason ?? null,
            internal_progress_reason: updatedTicket.internalProgressReason ?? null,
            internal_progress_note: updatedTicket.internalProgressNote ?? null,
            scheduled_date: updatedTicket.scheduledDate ?? null,
            charger_status: updatedTicket.chargerStatus ?? null
        };
        
        if (updatedTicket.status === 'Resolved' && !updatedTicket.resolvedAt) {
            updatePayload.resolved_at = new Date().toISOString();
        }

        const { error } = await (supabase.from('tickets') as any).update(updatePayload).eq('id', updatedTicket.id);

        if (error) {
            console.error("Failed to update ticket:", error);
            toast.error(`Error updating ticket: ${error.message}`);
            setTickets(originalTickets);
            return false;
        } else {
            toast.success('Ticket updated successfully');
            
            let details = `Ticket updated from Search Results.`;
            if (changes.length > 0) {
                 details += ` Changed ${changes.join(', ')}.`;
                 if (transferNote) {
                     details += ` Transfer Note: ${transferNote}`;
                 }
            }

            addAuditLog({
                entityId: updatedTicket.id,
                entityType: 'TICKET',
                action: 'UPDATE',
                details: details
            });
            return true;
        }
    };

    const getStatusBadgeClass = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('new')) return 'bg-blue-100 text-blue-800 border border-blue-200';
        if (s.includes('open')) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
        if (s.includes('progress')) return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
        if (s.includes('hold')) return 'bg-gray-200 text-gray-800 border border-gray-300';
        if (s.includes('resolved')) return 'bg-green-100 text-green-800 border border-green-200';
        return 'bg-gray-50 text-gray-600 border border-gray-200';
    };

    return (
        <div>
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Search Results</h2>
                <p className="text-gray-600 mt-2">Showing results for "<span className="font-bold text-black">{searchQuery}</span>"</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Tickets Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg flex justify-between items-center">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
                            Tickets ({filteredData.tickets.length})
                        </h3>
                    </div>
                    <div className="overflow-y-auto max-h-[600px]">
                        {filteredData.tickets.length > 0 ? (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                    <tr>
                                        <th className="p-3">ID</th>
                                        <th className="p-3">Subject</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredData.tickets.map(ticket => (
                                        <tr key={ticket.id} className="hover:bg-blue-50 transition-colors">
                                            <td className="p-3 font-mono text-blue-600 font-medium">{ticket.id}</td>
                                            <td className="p-3 text-gray-800">
                                                <div className="font-medium">{ticket.subject}</div>
                                                <div className="text-xs text-gray-500">{ticket.device?.type} {ticket.device?.brand}</div>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 text-xs rounded-full font-semibold whitespace-nowrap ${getStatusBadgeClass(ticket.status)}`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <button 
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-gray-500 italic">No matching tickets found.</div>
                        )}
                    </div>
                </div>

                {/* Customers Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg flex justify-between items-center">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197M15 21a6 6 0 006-6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197"></path></svg>
                            Customers ({filteredData.customers.length})
                        </h3>
                    </div>
                    <div className="overflow-y-auto max-h-[600px]">
                         {filteredData.customers.length > 0 ? (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                    <tr>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Contact</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredData.customers.map(customer => (
                                        <tr key={customer.id} className="hover:bg-green-50 transition-colors">
                                            <td className="p-3 font-medium text-gray-900">{customer.name}</td>
                                            <td className="p-3 text-gray-600">
                                                <div className="text-xs">{customer.email}</div>
                                                <a href={`tel:${customer.phone}`} className="text-xs font-medium text-blue-600 hover:underline block mt-1">
                                                    {customer.phone}
                                                </a>
                                            </td>
                                            <td className="p-3 text-right">
                                                 <button 
                                                    onClick={() => setSelectedCustomer(customer)}
                                                    className="text-green-600 hover:text-green-800 font-medium text-xs"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         ) : (
                            <div className="p-8 text-center text-gray-500 italic">No matching customers found.</div>
                         )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {selectedTicket && settings && (
                <TicketDetailsModal 
                    ticket={selectedTicket}
                    customer={customers.find(c => c.id === selectedTicket.customerId)}
                    settings={settings}
                    auditLog={auditLog}
                    onSave={handleUpdateTicket}
                    onClose={() => setSelectedTicket(null)}
                />
            )}

            {selectedCustomer && (
                <CustomerDetailsModal 
                    customer={selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                />
            )}
        </div>
    );
};

export default SearchResults;
