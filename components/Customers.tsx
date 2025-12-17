
import React, { useState, useEffect } from 'react';
import { Customer, CustomerNote, Database, Json } from '../types';
import ConfirmationModal from './modals/ConfirmationModal';
import CustomerHistoryModal from './modals/CustomerHistoryModal';
import CustomerFormModal from './modals/CustomerFormModal';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useStore } from '../context/StoreContext';
import { SkeletonList, SkeletonTable } from './Skeleton';

// Simple Pagination Component
const Pagination: React.FC<{
    currentPage: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
}> = ({ currentPage, pageSize, totalCount, onPageChange }) => {
    const totalPages = Math.ceil(totalCount / pageSize);
    
    return (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg">
            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    Next
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{Math.min(currentPage * pageSize + 1, totalCount)}</span> to <span className="font-medium">{Math.min((currentPage + 1) * pageSize, totalCount)}</span> of <span className="font-medium">{totalCount}</span> results
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                         <button
                            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                            disabled={currentPage === 0}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                            <span className="sr-only">Previous</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
                        </button>
                        <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                            Page {currentPage + 1} of {Math.max(1, totalPages)}
                        </span>
                        <button
                            onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
                            disabled={currentPage >= totalPages - 1}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                            <span className="sr-only">Next</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};

const Customers: React.FC = () => {
    const { 
        customers, customersCount, setCustomers, 
        tickets, auditLog, currentUser,
        // Server-side props
        customerPage, setCustomerPage, customerPageSize,
        customerSearch, setCustomerSearch,
        customersLoading
    } = useStore();

    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [customerForHistory, setCustomerForHistory] = useState<Customer | null>(null);
    const [activeActionDropdown, setActiveActionDropdown] = useState<string | null>(null);
    
    // State for Add/Edit modal
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

    const canDelete = currentUser?.type === 'team' && currentUser.role === 'ADMIN';

    // Handler for search with debounce logic could be added here, 
    // but React's state update is fast enough for now or React Query handles debouncing if configured.
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomerSearch(e.target.value);
        setCustomerPage(0); // Reset to first page
    };

    const handleDeleteCustomer = async () => {
        if (!customerToDelete || !supabase) return;
        
        const originalCustomers = customers;
        setCustomers(current => current.filter(c => c.id !== customerToDelete.id));
        setCustomerToDelete(null); 

        const { error } = await supabase.from('customers').delete().eq('id', customerToDelete.id);

        if (error) {
            console.error("Failed to delete customer:", error);
            toast.error(`Error deleting customer: ${error.message}. Reverting.`);
            setCustomers(originalCustomers); 
        } else {
            toast.success(`Customer ${customerToDelete.name} deleted successfully.`);
        }
    };

    const handleSaveNote = async (customerId: string, newNoteText: string) => {
        if (!supabase) return;

        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;

        const newNote: CustomerNote = {
            id: `NOTE-${Date.now()}`,
            text: newNoteText,
            createdAt: new Date().toISOString()
        };
        const updatedNotes = [...customer.notes, newNote];
        const updatedCustomer = { ...customer, notes: updatedNotes };
        
        const originalCustomers = customers;
        setCustomers(current => current.map(c => c.id === customerId ? updatedCustomer : c));
        setCustomerForHistory(prev => prev && prev.id === customerId ? updatedCustomer : prev);


        const { error } = await (supabase.from('customers') as any).update({ notes: updatedNotes as unknown as Json }).eq('id', customerId);

        if (error) {
            console.error("Failed to save note:", error);
            toast.error(`Error save note: ${error.message}. Reverting.`);
            setCustomers(originalCustomers);
            setCustomerForHistory(prev => prev && prev.id === customerId ? customer : prev);
        } else {
            toast.success('Note added successfully.');
        }
    };

    const openNewCustomerModal = () => {
        setCustomerToEdit(null);
        setIsFormModalOpen(true);
    };

    const openEditCustomerModal = (customer: Customer) => {
        setCustomerToEdit(customer);
        setIsFormModalOpen(true);
        setActiveActionDropdown(null);
    };
    
    const triggerDeleteCustomer = (customer: Customer) => {
        setCustomerToDelete(customer);
        setActiveActionDropdown(null);
    }
    
    const openCustomerHistory = (customer: Customer) => {
        setCustomerForHistory(customer);
    };

    const closeCustomerHistory = () => {
        setCustomerForHistory(null);
    };

    const handleSaveCustomer = async (customerData: Customer) => {
        if (!supabase) {
            throw new Error("Database client not available.");
        }

        if (customerToEdit) { 
            const customerForDb: Database['public']['Tables']['customers']['Update'] = {
                name: customerData.name,
                phone: customerData.phone,
                address: customerData.address,
            };
            const { error } = await (supabase.from('customers') as any).update(customerForDb).eq('id', customerData.id);

            if (error) {
                console.error("Failed to update customer:", error);
                throw new Error(error.message);
            }
            toast.success('Customer updated successfully.');
            
        } else { 
            const customerForDb: Database['public']['Tables']['customers']['Insert'] = {
                id: customerData.id,
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                address: customerData.address,
                created_at: customerData.createdAt,
                notes: customerData.notes as unknown as Json,
                photo_url: customerData.photoUrl ?? null
            };
            const { error } = await (supabase.from('customers') as any).insert(customerForDb);

            if (error) {
                console.error("Failed to create customer:", error);
                if (error.message.includes('duplicate key value violates unique constraint')) {
                    throw new Error('A customer with this email already exists.');
                } else {
                    throw new Error(error.message);
                }
            }
            toast.success('Customer created successfully.');
        }
        
        if (!customerToEdit) {
            setIsFormModalOpen(false);
            setCustomerToEdit(null);
        }
    };
    
    const inputStyles = "p-2 border border-gray-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500";


    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-3xl font-bold text-black">Customers</h2>
                <div className="flex items-center gap-4 flex-wrap justify-end">
                     <input
                        type="text"
                        placeholder="Search by Name, Email, or Phone..."
                        className={`${inputStyles} w-full max-w-xs`}
                        value={customerSearch}
                        onChange={handleSearchChange}
                    />
                    <button 
                        onClick={openNewCustomerModal}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                        New Customer
                    </button>
                </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md">
                 {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-hidden">
                    {customersLoading ? (
                        <SkeletonTable 
                            rows={10} 
                            columnWidths={['w-48', 'w-48', 'w-32', 'w-20']} 
                        />
                    ) : (
                        <table className="w-full text-left text-black table-fixed">
                            <thead>
                                <tr className="border-b bg-gray-50 text-black">
                                    <th className="p-3 font-semibold w-1/4">Name</th>
                                    <th className="p-3 font-semibold w-1/4">Contact</th>
                                    <th className="p-3 font-semibold w-1/6">Created On</th>
                                    <th className="p-3 font-semibold w-1/6">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map(customer => (
                                    <tr key={customer.id} className="border-b hover:bg-gray-50">
                                        <td 
                                            className="p-3 font-semibold cursor-pointer hover:underline text-blue-600 truncate"
                                            onClick={() => openCustomerHistory(customer)}
                                            title={customer.name}
                                        >
                                            {customer.name}
                                        </td>
                                        <td className="p-3">
                                            <div className="text-black truncate" title={customer.email}>{customer.email}</div>
                                            <div>
                                                <a href={`tel:${customer.phone}`} className="text-sm text-black hover:underline hover:text-blue-600">
                                                    {customer.phone}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="p-3 text-black">{new Date(customer.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                                        <td className="p-3">
                                            <div className="flex space-x-4">
                                                <button onClick={() => openEditCustomerModal(customer)} className="text-black transition-colors hover:text-blue-600" title="Edit Customer">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                </button>
                                                {canDelete && (
                                                    <button onClick={() => setCustomerToDelete(customer)} className="text-black transition-colors hover:text-red-600" title="Delete">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.143A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.857L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-2 space-y-4">
                    {customersLoading ? (
                        <SkeletonList count={5} />
                    ) : (
                        <>
                            {customers.map(customer => (
                                <div key={customer.id} className="p-4 bg-white rounded-lg shadow-sm border">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p
                                                className="font-bold text-lg text-blue-600 cursor-pointer hover:underline"
                                                onClick={() => openCustomerHistory(customer)}
                                            >
                                                {customer.name}
                                            </p>
                                            <p className="text-sm text-gray-500">{customer.email}</p>
                                        </div>
                                        <div className="relative">
                                            <button onClick={() => setActiveActionDropdown(activeActionDropdown === customer.id ? null : customer.id)} className="p-1 text-gray-500 hover:text-black rounded-full">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                            </button>
                                            {activeActionDropdown === customer.id && (
                                                <div className="absolute right-0 mt-2 w-32 bg-white border rounded-md shadow-lg z-10">
                                                    <button onClick={() => openEditCustomerModal(customer)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-black hover:bg-gray-100">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                        Edit
                                                    </button>
                                                    {canDelete && (
                                                        <button onClick={() => triggerDeleteCustomer(customer)} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                                                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.143A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.857L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm border-t pt-2 mt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-gray-600">Phone:</span>
                                            <a href={`tel:${customer.phone}`} className="text-black hover:underline hover:text-blue-600">
                                                {customer.phone}
                                            </a>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-gray-600">Created On:</span>
                                            <span className="text-black">{new Date(customer.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {customers.length === 0 && <p className="text-center p-4 text-black">No customers found.</p>}
                        </>
                    )}
                </div>
            </div>

            {/* Pagination */}
            <Pagination 
                currentPage={customerPage}
                pageSize={customerPageSize}
                totalCount={customersCount}
                onPageChange={setCustomerPage}
            />

            {customerToDelete && (
                <ConfirmationModal 
                    message={`Are you sure you want to delete ${customerToDelete.name}? This will also delete all their tickets. This action cannot be undone.`}
                    onConfirm={handleDeleteCustomer}
                    onCancel={() => setCustomerToDelete(null)}
                />
            )}
            
            {customerForHistory && (
                <CustomerHistoryModal
                    customer={customerForHistory}
                    tickets={tickets} // Note: This will only show tickets currently in state, which might be limited due to pagination. In full app, history modal should fetch its own tickets.
                    onClose={closeCustomerHistory}
                    onSaveNote={handleSaveNote}
                    auditLog={auditLog}
                />
            )}

            {isFormModalOpen && (
                <CustomerFormModal 
                    customer={customerToEdit}
                    onSave={handleSaveCustomer}
                    onClose={() => setIsFormModalOpen(false)}
                    existingEmails={customers.map(c => c.email.toLowerCase()).filter(email => email !== customerToEdit?.email.toLowerCase())}
                />
            )}
        </div>
    );
};

export default Customers;
