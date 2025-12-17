
import React, { useState, useEffect } from 'react';
import { Customer, Ticket, AuditLogEntry, Device, DeviceType, Database, Json } from '../types';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useStore } from '../context/StoreContext';

interface RequestFormProps {
    isPublicForm?: boolean;
    onCancel?: () => void;
    onCustomerCreated?: (customer: Customer) => void;
}

const RequestForm: React.FC<RequestFormProps> = ({ isPublicForm = false, onCancel, onCustomerCreated }) => {
    // Destructure setTickets from useStore to enable optimistic updates
    const { customers, settings, addAuditLog, setTickets, currentUser, setActiveView } = useStore();

    // Customer fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);

    // Ticket fields
    const [deviceType, setDeviceType] = useState<DeviceType>('LAPTOP');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [description, setDescription] = useState('');
    const [brandService, setBrandService] = useState('');

    const [chargerStatus, setChargerStatus] = useState<'YES'|'NO'>('NO');
    const [issue, setIssue] = useState('');
    // Initialize with a fallback to ensure not empty if settings delay
    const [store, setStore] = useState((settings && settings.stores && settings.stores.length > 0) ? settings.stores[0] : '');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    const isCustomerLoggedIn = currentUser?.type === 'customer';

    // Update store default if settings load asynchronously or weren't ready on mount
    useEffect(() => {
        if (settings && settings.stores && settings.stores.length > 0 && !store) {
            setStore(settings.stores[0]);
        }
    }, [settings, store]);

    // Pre-fill data if user is logged in
    useEffect(() => {
        if (currentUser && currentUser.type === 'customer') {
            setName(currentUser.name);
            setEmail(currentUser.email);
            setPhone(currentUser.phone);
            setAddress(currentUser.address);
            setExistingCustomer(currentUser);
        }
    }, [currentUser]);

    // NEW: Robust DB Check for Existing Customer by Email (Ignores Pagination)
    useEffect(() => {
        // Skip lookup logic if already logged in as a customer
        if (isCustomerLoggedIn) return;
        
        if (!email || !supabase) {
            setExistingCustomer(null);
            return;
        }

        const checkEmail = async () => {
            const { data: rawCustomer } = await supabase
                .from('customers')
                .select('*')
                .ilike('email', email.trim())
                .maybeSingle();

            if (rawCustomer) {
                // Map raw data to Customer type
                const customerData: Customer = {
                    id: rawCustomer.id,
                    name: rawCustomer.name,
                    email: rawCustomer.email,
                    phone: rawCustomer.phone,
                    address: rawCustomer.address,
                    createdAt: rawCustomer.created_at,
                    notes: Array.isArray(rawCustomer.notes) ? rawCustomer.notes : [],
                    photoUrl: rawCustomer.photo_url || undefined
                };
                
                setExistingCustomer(customerData);
                setName(customerData.name);
                setPhone(customerData.phone);
                setAddress(customerData.address);
            } else {
                setExistingCustomer(null);
            }
        };

        // Debounce the check to avoid spamming the DB while typing
        const timeoutId = setTimeout(checkEmail, 500);
        return () => clearTimeout(timeoutId);

    }, [email, isCustomerLoggedIn]);

    const generateNextId = async (table: string, prefix: string): Promise<string> => {
        if (!supabase) return `${prefix}001`;
        
        try {
            const { data, error } = await (supabase
                .from(table) as any)
                .select('id')
                .ilike('id', `${prefix}%`)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error || !data) return `${prefix}001`;

            const lastId = data.id;
            const numberPart = lastId.replace(prefix, '');
            const num = parseInt(numberPart, 10);

            if (!isNaN(num)) {
                return `${prefix}${String(num + 1).padStart(3, '0')}`;
            }
            
            return `${prefix}001`;
        } catch (e) {
            return `${prefix}001`;
        }
    };
    
    const getErrorMessage = (error: any): string => {
        if (!error) return 'Unknown error';
        if (typeof error === 'string') return error;
        
        if (error.message) return error.message;
        if (error.error_description) return error.error_description;
        if (error.details) return error.details;
        if (error.hint) return error.hint;
        
        try {
            return JSON.stringify(error);
        } catch {
            return 'An unexpected error occurred';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setIsSubmitting(true);
        
        let customerId = existingCustomer?.id;
        let customerName = existingCustomer?.name;

        // Use phone number exactly as typed
        let formattedPhone = phone;

        // 1. Create customer if they don't exist
        if (!existingCustomer) {
            customerId = await generateNextId('customers', 'CUST-');
            customerName = name;
            const newCustomer: Customer = { id: customerId, name, email, phone: formattedPhone, address, createdAt: new Date().toISOString(), notes: [] };

            const customerPayload: Database['public']['Tables']['customers']['Insert'] = { id: newCustomer.id, name: newCustomer.name, email: newCustomer.email, phone: newCustomer.phone, address: newCustomer.address, created_at: newCustomer.createdAt, notes: newCustomer.notes as unknown as Json, photo_url: newCustomer.photoUrl ?? null };
            
            let { error: customerError } = await (supabase.from('customers') as any).insert(customerPayload);

            // Retry logic for Duplicate ID on Customer
             if (customerError && customerError.code === '23505') { 
                console.warn("Duplicate Customer ID, retrying...");
                newCustomer.id = await generateNextId('customers', 'CUST-');
                customerId = newCustomer.id;
                customerPayload.id = newCustomer.id;
                const retryResult = await (supabase.from('customers') as any).insert(customerPayload);
                customerError = retryResult.error;
            }

            if (customerError) {
                console.error("Failed to create customer:", customerError);
                toast.error(`Error creating customer: ${getErrorMessage(customerError)}`);
                setIsSubmitting(false);
                return;
            }
            
            // Notify parent component (Login) about the new customer for optimistic login
            if (onCustomerCreated) {
                onCustomerCreated(newCustomer);
            }

            addAuditLog({ entityId: customerId, entityType: 'CUSTOMER', action: 'CREATE', details: `New customer "${newCustomer.name}" created via request form.` });
        }
        
        // 2. Create the ticket with 'Pending Approval' status
        const device: Device = { 
            type: deviceType, 
            brand: brand || undefined, 
            model: model || undefined, 
            serialNumber: serialNumber || undefined, 
            description: description || undefined,
            brandService: deviceType === 'BRAND SERVICE' ? (brandService || undefined) : undefined,
        };

        // Ensure store has a value even if state was empty
        const finalStore = store || (settings?.stores && settings.stores[0]) || 'Main Branch';

        // Ticket Creation Retry Logic
        let ticketCreated = false;
        let attempt = 0;
        const maxAttempts = 3;
        let lastError = null;

        while (!ticketCreated && attempt < maxAttempts) {
             try {
                // Generate next sequential ID with proper prefix
                const newTicketId = await generateNextId('tickets', 'TKT-IF-');

                const newTicket: Ticket = { 
                    id: newTicketId, 
                    customerId: customerId!, 
                    customerName: customerName, // Set name locally
                    subject: issue, 
                    status: 'Pending Approval', 
                    priority: 'MEDIUM', 
                    createdAt: new Date().toISOString(), 
                    device, 
                    chargerStatus: deviceType === 'LAPTOP' ? chargerStatus : undefined, 
                    store: finalStore, 
                    amountEstimate: 0, 
                    warranty: 'NO' 
                };

                const ticketPayload: Database['public']['Tables']['tickets']['Insert'] = { id: newTicket.id, customer_id: newTicket.customerId, subject: newTicket.subject, status: newTicket.status, priority: newTicket.priority, created_at: newTicket.createdAt, device: newTicket.device as unknown as Json, charger_status: newTicket.chargerStatus ?? null, store: newTicket.store, amount_estimate: newTicket.amountEstimate, warranty: newTicket.warranty };
                
                const { error: ticketError } = await (supabase.from('tickets') as any).insert(ticketPayload);
                
                if (ticketError) {
                    if (ticketError.code === '23505') { // Unique violation
                         attempt++;
                         continue;
                    }
                    throw ticketError;
                }

                ticketCreated = true;
                // Optimistic update
                setTickets(prev => [newTicket, ...prev]);
                addAuditLog({ entityId: newTicket.id, entityType: 'TICKET', action: 'CREATE', details: `Request submitted for customer "${customerName}".` });
                
             } catch (err) {
                 lastError = err;
                 attempt = maxAttempts;
             }
        }

        if (!ticketCreated) {
            console.error("Failed to create ticket:", lastError);
            toast.error(`Error creating ticket: ${getErrorMessage(lastError || "Unknown error")}`);
            setIsSubmitting(false);
            return;
        }
        
        setIsSubmitting(false);
        setSubmissionSuccess(true);
        toast.success('Request submitted successfully');
    };

    if (submissionSuccess) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-md max-w-lg mx-auto text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-2xl font-bold my-4 text-black">Request Submitted!</h2>
                <p className="text-black mb-6">
                    {isPublicForm 
                        ? "Thank you for your submission. Your account has been created. You can now log in to the Customer Portal using your Email Address and Phone Number as your password."
                        : "Thank you for your submission. Our team will review your request shortly. You can track the status in the 'Your Service Tickets' section."}
                </p>
                <button 
                    onClick={() => {
                        if (isPublicForm && onCancel) {
                            onCancel();
                        } else {
                            setActiveView('portal');
                        }
                    }} 
                    className="w-full bg-blue-600 text-white p-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                    {isPublicForm ? 'Return to Login Page' : 'Return to Customer Portal'}
                </button>
            </div>
        );
    }
    
    const inputClasses = "p-2 border border-gray-300 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500";

    const renderDeviceFields = () => {
        if (deviceType === 'ACCESSORY' || deviceType === 'OTHER') {
             return <textarea name="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the device (e.g., Logitech Mouse, Unbranded 2TB HDD)" required rows={2} className={`${inputClasses} md:col-span-2`}></textarea>;
        }
        
        return (<><input name="brand" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Brand (e.g., Dell, HP)" className={inputClasses}/> <input name="model" value={model} onChange={e => setModel(e.target.value)} placeholder="Model (e.g., XPS 15, Pavilion)" className={inputClasses}/> {deviceType !== 'CCTV' && <input name="serialNumber" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Serial Number" className={`${inputClasses} md:col-span-2`}/>}</>);
    };

    if (!settings) return null;

    return (
        <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-black">New Service Request</h2>
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6">
                {!isCustomerLoggedIn ? (
                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-semibold px-2 text-black">Your Information {existingCustomer && "(Welcome Back!)"}</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (to find or create your profile)" required className={inputClasses}/>
                            <input name="name" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" required className={inputClasses} disabled={!!existingCustomer}/>
                            <input name="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number" required className={inputClasses} disabled={!!existingCustomer}/>
                            <input name="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className={`${inputClasses} md:col-span-2`} disabled={!!existingCustomer}/>
                        </div>
                    </fieldset>
                ) : (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200 flex items-center justify-between">
                        <div>
                             <p className="text-sm text-blue-800 font-medium">Requesting as <span className="font-bold">{currentUser.name}</span></p>
                             <p className="text-xs text-blue-600">{currentUser.email}</p>
                        </div>
                        <div className="bg-white p-1 rounded-full border border-blue-100">
                             <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        </div>
                    </div>
                )}
                
                 <fieldset className="border p-4 rounded-md">
                    <legend className="font-semibold px-2 text-black">Device & Issue Details</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <select name="deviceType" value={deviceType} onChange={e => setDeviceType(e.target.value as DeviceType)} className={inputClasses}>
                            {settings.deviceTypes.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        {deviceType === 'BRAND SERVICE' && (
                            <select name="brandService" value={brandService} onChange={e => setBrandService(e.target.value)} className={inputClasses}>
                                <option value="">-- Select Brand Service --</option>
                                <option value="IVOOMI">IVOOMI</option>
                                <option value="ELISTA">ELISTA</option>
                            </select>
                        )}

                        {deviceType === 'LAPTOP' && <select name="chargerStatus" value={chargerStatus} onChange={e => setChargerStatus(e.target.value as 'YES'|'NO')} className={inputClasses}><option value="YES">Charger Included</option><option value="NO">No Charger</option></select>}
                        {renderDeviceFields()}
                        <textarea name="issue" value={issue} onChange={e => setIssue(e.target.value)} placeholder="Please describe the issue in detail" required rows={4} className={`${inputClasses} md:col-span-2`}></textarea>
                        <div>
                            <label htmlFor="store" className="text-sm font-medium text-black">Preferred Store Location</label>
                            <select name="store" id="store" value={store} onChange={e => setStore(e.target.value)} className={`${inputClasses} mt-1`} required>
                                {settings.stores.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </fieldset>

                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={onCancel ? onCancel : () => setActiveView('portal')}
                        className="px-6 py-2 bg-gray-200 text-black rounded-md font-semibold hover:bg-gray-300"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 disabled:bg-blue-300" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RequestForm;
