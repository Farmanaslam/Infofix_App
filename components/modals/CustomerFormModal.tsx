
import React, { useState, useEffect } from 'react';
import { Customer, CustomerNote } from '../../types';
import { useAutosave, SaveStatus } from '../../hooks/useAutosave';

interface CustomerFormModalProps {
    customer?: Customer | null;
    onSave: (customer: Customer) => Promise<void>;
    onClose: () => void;
    existingEmails: string[];
}

const SaveStatusIndicator: React.FC<{ status: SaveStatus }> = ({ status }) => {
    let text = null;
    if (status === 'saving') text = 'Saving...';
    if (status === 'saved') text = 'All changes saved.';
    if (status === 'error') text = 'Error saving changes.';

    return <div className="text-sm text-gray-500 h-5">{text}</div>;
};

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ customer, onSave, onClose, existingEmails }) => {
    const isEditing = !!customer;
    const [formData, setFormData] = useState<Omit<Customer, 'id' | 'createdAt' | 'notes'>>({
        name: '',
        email: '',
        phone: '',
        address: '',
        photoUrl: undefined,
    });
    const [initialNote, setInitialNote] = useState('');
    const [emailError, setEmailError] = useState('');

    useEffect(() => {
        if (isEditing && customer) {
            setFormData({
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                photoUrl: customer.photoUrl,
            });
        }
    }, [customer, isEditing]);

    const handleSave = async (data: typeof formData) => {
        if (isEditing) {
            // Use phone number exactly as typed
            let formattedPhone = data.phone;
            
            const customerData = { ...customer, ...data, phone: formattedPhone };
            await onSave(customerData as Customer);
        }
    };
    
    const saveStatus = useAutosave(formData, handleSave, 1000);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'email') {
            setEmailError('');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (existingEmails.includes(formData.email.toLowerCase())) {
            setEmailError('A customer with this email already exists.');
            return;
        }

        const notes: CustomerNote[] = [];
        if (initialNote.trim()) {
            notes.push({
                id: `NOTE-${Date.now()}`,
                text: initialNote.trim(),
                createdAt: new Date().toISOString()
            });
        }

        // Use phone number exactly as typed
        let formattedPhone = formData.phone;

        const customerData: Customer = {
            id: `CUST-${Date.now()}`,
            createdAt: new Date().toISOString(),
            notes: notes,
            ...formData,
            phone: formattedPhone
        };
        
        try {
            await onSave(customerData);
            // onSuccess, the parent component closes the modal.
        } catch (error: any) {
            setEmailError(error.message);
        }
    };

    const inputClasses = "w-full p-2 border border-gray-300 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md text-black">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">{isEditing ? 'Edit Customer' : 'New Customer'}</h2>
                    <button onClick={onClose} className="text-black text-2xl">&times;</button>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
                        <input id="name" name="name" value={formData.name} onChange={handleChange} required className={inputClasses} />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                        <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required className={inputClasses} />
                        {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone</label>
                        <input id="phone" name="phone" value={formData.phone} onChange={handleChange} required className={inputClasses} />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium mb-1">Address</label>
                        <input id="address" name="address" value={formData.address} onChange={handleChange} required className={inputClasses} />
                    </div>
                    
                    {!isEditing && (
                        <div>
                            <label htmlFor="initialNote" className="block text-sm font-medium mb-1 text-blue-800">Initial Note (Optional)</label>
                            <textarea 
                                id="initialNote" 
                                value={initialNote} 
                                onChange={(e) => setInitialNote(e.target.value)} 
                                placeholder="Add initial notes about this customer..." 
                                className={inputClasses}
                                rows={3} 
                            />
                            <p className="text-xs text-gray-500 mt-1">This note will be added to the customer's history log.</p>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4">
                        {isEditing ? <SaveStatusIndicator status={saveStatus} /> : <div />}
                        <div className="flex space-x-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-black">
                                {isEditing ? 'Close' : 'Cancel'}
                            </button>
                            {!isEditing && (
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                    Create Customer
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerFormModal;
