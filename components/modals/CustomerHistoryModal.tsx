
import React, { useState, useMemo } from 'react';
import { Customer, Ticket, TicketStatus, TicketPriority, AuditLogEntry } from '../../types';

interface CustomerHistoryModalProps {
    customer: Customer;
    tickets: Ticket[];
    auditLog: AuditLogEntry[];
    onClose: () => void;
    onSaveNote: (customerId: string, newNoteText: string) => void;
}

const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({ customer, tickets, auditLog, onClose, onSaveNote }) => {
    const [newNote, setNewNote] = useState('');
    const [activeTab, setActiveTab] = useState('tickets');

    const customerTickets = useMemo(() => {
        return tickets
            .filter(t => t.customerId === customer.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [tickets, customer.id]);

    const customerActivity = useMemo(() => {
        return auditLog
            .filter(log => log.entityId === customer.id)
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [auditLog, customer.id]);

    const handleSaveNoteClick = () => {
        if (newNote.trim()) {
            onSaveNote(customer.id, newNote);
            setNewNote('');
        }
    };

    const getStatusBadgeClass = (status: TicketStatus) => {
        const lowerCaseStatus = status.toLowerCase();
        if (lowerCaseStatus.includes('new')) return 'bg-blue-100 text-blue-800';
        if (lowerCaseStatus.includes('open')) return 'bg-yellow-100 text-yellow-800';
        if (lowerCaseStatus.includes('progress')) return 'bg-indigo-100 text-indigo-800';
        if (lowerCaseStatus.includes('hold')) return 'bg-gray-200 text-gray-800';
        if (lowerCaseStatus.includes('done')) return 'bg-purple-100 text-purple-800';
        if (lowerCaseStatus.includes('resolved')) return 'bg-green-100 text-green-800';
        return 'bg-gray-100 text-gray-800';
    };
    
    const getPriorityBadgeClass = (priority: TicketPriority) => {
        const priorityUpper = priority.toUpperCase();
        if (priorityUpper.includes('HIGH')) return 'bg-red-100 text-red-800';
        if (priorityUpper.includes('MEDIUM')) return 'bg-yellow-100 text-yellow-800';
        if (priorityUpper.includes('LOW')) return 'bg-green-100 text-green-800';
        return 'bg-gray-100 text-gray-800';
    };

    const renderDetails = (details: any) => {
        if (typeof details === 'object' && details !== null) {
            return JSON.stringify(details, null, 2);
        }
        return details;
    };
    
    const TabButton: React.FC<{tabName: string; label: string}> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tabName ? 'border-b-2 border-blue-600 text-blue-600' : 'text-black hover:text-blue-500'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col text-black">
                <div className="flex justify-between items-center mb-2 border-b pb-2">
                    <h2 className="text-2xl font-bold text-black">Customer History: {customer.name}</h2>
                    <button onClick={onClose} className="text-black text-3xl font-light">&times;</button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-2 mb-4 text-black text-sm">
                    <div><span className="font-semibold">Email:</span> {customer.email}</div>
                    <div><span className="font-semibold">Phone:</span> {customer.phone}</div>
                    <div><span className="font-semibold">Since:</span> {new Date(customer.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
                    <div className="lg:col-span-3"><span className="font-semibold">Address:</span> {customer.address}</div>
                </div>

                <div className="border-b mb-4">
                    <nav className="flex space-x-2">
                        <TabButton tabName="tickets" label="Ticket History" />
                        <TabButton tabName="notes_activity" label="Notes & Activity Log" />
                    </nav>
                </div>

                <div className="flex-grow overflow-y-auto">
                    {activeTab === 'tickets' && (
                         <div className="overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr className="text-black">
                                        <th className="p-2 font-semibold">ID</th><th className="p-2 font-semibold">Subject</th>
                                        <th className="p-2 font-semibold">Status</th><th className="p-2 font-semibold">Priority</th>
                                        <th className="p-2 font-semibold">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerTickets.length > 0 ? customerTickets.map(ticket => (
                                        <tr key={ticket.id} className="border-b hover:bg-gray-50">
                                            <td className="p-2 font-mono text-xs text-black">{ticket.id}</td>
                                            <td className="p-2 text-black">{ticket.subject}</td>
                                            <td className="p-2"><span className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusBadgeClass(ticket.status)}`}>{ticket.status}</span></td>
                                            <td className="p-2"><span className={`px-2 py-1 text-xs rounded-full font-semibold ${getPriorityBadgeClass(ticket.priority)}`}>{ticket.priority}</span></td>
                                            <td className="p-2 text-black">{new Date(ticket.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="text-center p-4 text-black">No tickets found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeTab === 'notes_activity' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                             <div className="flex flex-col">
                                <h3 className="text-lg font-bold mb-2 text-black">Notes</h3>
                                <div className="flex-grow overflow-y-auto border p-2 rounded-md mb-2 bg-gray-50">
                                    {customer.notes.slice().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(note => {
                                        const noteText = typeof note.text === 'string' ? note.text : JSON.stringify(note.text, null, 2);
                                        return (
                                            <div key={note.id} className="mb-2 p-2 bg-white rounded shadow-sm">
                                                <p className="text-sm text-black whitespace-pre-wrap">{noteText}</p>
                                                <p className="text-xs text-black mt-1">{new Date(note.createdAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        );
                                    })}
                                    {customer.notes.length === 0 && <p className="text-sm text-black p-2">No notes yet.</p>}
                                </div>
                                <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a new note..."
                                    className="w-full p-2 border border-gray-300 rounded-md mb-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2}></textarea>
                                <button onClick={handleSaveNoteClick} className="self-end px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add Note</button>
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-lg font-bold mb-2 text-black">Activity Log</h3>
                                <div className="flex-grow overflow-y-auto border p-2 rounded-md bg-gray-50 space-y-2">
                                    {customerActivity.length > 0 ? customerActivity.map(log => (
                                        <div key={log.id} className="p-2 bg-white rounded shadow-sm">
                                            <p className="text-sm text-black whitespace-pre-wrap">{renderDetails(log.details)}</p>
                                            <p className="text-xs text-black mt-1">{new Date(log.timestamp).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-black p-2">No activity recorded.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-6 border-t pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-black">Close</button>
                </div>
            </div>
        </div>
    );
};

export default CustomerHistoryModal;
