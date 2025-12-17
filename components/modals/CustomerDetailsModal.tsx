
import React, { useState } from 'react';
import { Customer, CustomerNote, Json } from '../../types';
import { useStore } from '../../context/StoreContext';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

interface CustomerDetailsModalProps {
    customer: Customer;
    onClose: () => void;
}

const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({ customer: initialCustomer, onClose }) => {
    const { customers, setCustomers } = useStore();
    
    // Use the latest customer data from the store to ensure notes are up to date
    const customer = customers.find(c => c.id === initialCustomer.id) || initialCustomer;
    
    const [newNote, setNewNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;

        if (!supabase) {
            toast.error("Database connection not available");
            return;
        }

        setIsSaving(true);
        
        const note: CustomerNote = {
            id: `NOTE-${Date.now()}`,
            text: newNote.trim(),
            createdAt: new Date().toISOString()
        };

        const updatedNotes = [...(customer.notes || []), note];
        
        // Optimistic update
        setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, notes: updatedNotes } : c));
        setNewNote('');

        const { error } = await (supabase
            .from('customers') as any)
            .update({ notes: updatedNotes as unknown as Json })
            .eq('id', customer.id);

        setIsSaving(false);

        if (error) {
            console.error("Error saving note:", error);
            toast.error("Failed to save note");
            // Revert optimistic update
            setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, notes: customer.notes } : c));
        } else {
            toast.success("Note saved successfully");
            onClose(); // Automatically close modal after saving
        }
    };

    const sortedNotes = [...(customer.notes || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg text-black max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold">{customer.name}</h2>
                    <button onClick={onClose} className="text-black text-2xl hover:text-gray-700">&times;</button>
                </div>
                
                <div className="overflow-y-auto flex-1 pr-2">
                    <div className="space-y-3 mb-6">
                        <p><span className="font-semibold text-gray-600">Email:</span> {customer.email}</p>
                        <div className="flex items-center">
                            <span className="font-semibold text-gray-600">Phone:</span> 
                            <a href={`tel:${customer.phone}`} className="ml-2 text-blue-600 hover:underline">
                                {customer.phone}
                            </a>
                        </div>
                        <p><span className="font-semibold text-gray-600">Address:</span> {customer.address}</p>
                        <p><span className="font-semibold text-gray-600">Customer Since:</span> {new Date(customer.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="font-bold text-lg mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            Notes
                        </h3>
                        
                        <div className="space-y-3 mb-4">
                            {sortedNotes.length > 0 ? (
                                sortedNotes.map(note => (
                                    <div key={note.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="text-sm whitespace-pre-wrap text-gray-800">{note.text}</p>
                                        <p className="text-xs text-gray-500 mt-2 flex items-center justify-end">
                                            {new Date(note.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 italic text-center py-2 bg-gray-50 rounded">No notes recorded yet.</p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <label htmlFor="new-note" className="text-xs font-semibold text-gray-500 uppercase">Add New Note</label>
                            <textarea
                                id="new-note"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Type a new note here..."
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                rows={3}
                            />
                            <button
                                onClick={handleAddNote}
                                disabled={isSaving || !newNote.trim()}
                                className="self-end px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition flex items-center"
                            >
                                {isSaving ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Saving...
                                    </>
                                ) : (
                                    'Save Note'
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                 <div className="flex justify-end mt-4 pt-4 border-t flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-black font-medium transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
};

export default CustomerDetailsModal;
