
import React, { useState, useEffect } from 'react';
import { Customer, Ticket, AppSettings, TicketPriority, AuditLogEntry, Device, DeviceType, Database, Json } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useStore } from '../../context/StoreContext';

interface NewTicketModalProps {
    onClose: () => void;
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
    settings: AppSettings;
    setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
}

const NewTicketModal: React.FC<NewTicketModalProps> = ({ onClose, customers, setCustomers, setTickets, settings, setAuditLog }) => {
    const { currentUser } = useStore();
    const canAssign = currentUser?.type === 'team' && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGEMENT');

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
    
    // Initialize defaults, handling potential empty settings arrays gracefully
    const [store, setStore] = useState((settings.stores && settings.stores.length > 0) ? settings.stores[0] : '');
    const [amountEstimate, setAmountEstimate] = useState('');
    const [warranty, setWarranty] = useState<'YES'|'NO'>('NO');
    const [billNumber, setBillNumber] = useState('');
    
    // Initialize priority with fallback
    const [priority, setPriority] = useState((settings.priorities && settings.priorities.length > 0) 
        ? (settings.priorities.find(p => p.toUpperCase().includes('MEDIUM')) || settings.priorities[0]) 
        : 'MEDIUM');
        
    const [scheduledDate, setScheduledDate] = useState('');
    const [assignedTo, setAssignedTo] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Update store and priority if settings load asynchronously
    useEffect(() => {
        if (!store && settings.stores && settings.stores.length > 0) {
            setStore(settings.stores[0]);
        }
        if (!priority && settings.priorities && settings.priorities.length > 0) {
            const defaultPriority = settings.priorities.find(p => p.toUpperCase().includes('MEDIUM')) || settings.priorities[0];
            if (defaultPriority) setPriority(defaultPriority);
        }
    }, [settings, store, priority]);

    useEffect(() => {
        if (email) {
            const customer = customers.find(c => c.email.toLowerCase() === email.toLowerCase());
            setExistingCustomer(customer || null);
            if (customer) {
                setName(customer.name);
                setPhone(customer.phone);
                setAddress(customer.address);
            }
        } else {
            setExistingCustomer(null);
        }
    }, [email, customers]);

    const addAuditLog = async (log: Omit<AuditLogEntry, 'id' | 'timestamp' | 'user'>) => {
        if (!supabase) return;
        const newLog: AuditLogEntry = {
            id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date().toISOString(),
            user: 'System',
            ...log
        };
        // Optimistic update for audit log
        setAuditLog(prev => [newLog, ...prev]);
        
        const payload: Database['public']['Tables']['audit_log']['Insert'] = {
            id: newLog.id,
            timestamp: newLog.timestamp,
            entity_id: newLog.entityId,
            entity_type: newLog.entityType,
            action: newLog.action,
            user: newLog.user,
            details: newLog.details,
        };
        const { error } = await (supabase.from('audit_log') as any).insert(payload);
        if (error) {
            console.error("Failed to add audit log:", error);
        }
    }

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
        
        // Prioritize readable messages from Supabase error objects
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

        if (warranty === 'YES' && !billNumber.trim()) {
            toast.error("Bill Number is required when Warranty is selected.");
            return;
        }

        if (!store) {
            toast.error("Please select a store.");
            return;
        }

        setIsSubmitting(true);
        
        // Use phone number exactly as typed
        let formattedPhone = phone;

        let customerId = existingCustomer?.id;
        let customerName = existingCustomer?.name;

        // 1. Create customer if they don't exist
        if (!existingCustomer) {
            customerId = await generateNextId('customers', 'CUST-');
            customerName = name;
            const newCustomer: Customer = {
                id: customerId,
                name, email, phone: formattedPhone, address,
                createdAt: new Date().toISOString(),
                notes: []
            };

            const customerPayload: Database['public']['Tables']['customers']['Insert'] = {
                id: newCustomer.id,
                name: newCustomer.name,
                email: newCustomer.email,
                phone: newCustomer.phone,
                address: newCustomer.address,
                created_at: newCustomer.createdAt,
                notes: newCustomer.notes as unknown as Json,
                photo_url: newCustomer.photoUrl ?? null
            };
            
            let { error: customerError } = await (supabase.from('customers') as any).insert(customerPayload);

             // Retry logic for Duplicate ID on Customer
             if (customerError && customerError.code === '23505') { 
                console.warn("Duplicate Customer ID, retrying...");
                newCustomer.id = await generateNextId('customers', 'CUST-'); // Try generating next one
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
            
            // Optimistic update for customers
            setCustomers(prev => [...prev, newCustomer]);

            addAuditLog({
                entityId: customerId,
                entityType: 'CUSTOMER',
                action: 'CREATE',
                details: `New customer "${newCustomer.name}" created.`
            });
        }
        
        // Determine which fields to save based on device type logic
        const device: Device = {
            type: deviceType,
            brand: brand || undefined,
            model: model || undefined,
            serialNumber: serialNumber || undefined,
            description: description || undefined,
            brandService: deviceType === 'BRAND SERVICE' ? (brandService || undefined) : undefined,
        };

        // Ticket Creation with Retry Logic for Unique Constraints
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
                    customerName: customerName, // Ensure name is set for local display
                    subject: issue,
                    status: 'NEW',
                    priority: priority as TicketPriority,
                    createdAt: new Date().toISOString(),
                    device,
                    chargerStatus: deviceType === 'LAPTOP' ? chargerStatus : undefined,
                    store,
                    amountEstimate: parseFloat(amountEstimate) || 0,
                    warranty,
                    billNumber: warranty === 'YES' ? billNumber : undefined,
                    scheduledDate: scheduledDate || undefined,
                    assignedTo: assignedTo || undefined
                };

                const ticketPayload: Database['public']['Tables']['tickets']['Insert'] = {
                    id: newTicket.id,
                    customer_id: newTicket.customerId,
                    subject: newTicket.subject,
                    status: newTicket.status,
                    priority: newTicket.priority,
                    created_at: newTicket.createdAt,
                    device: newTicket.device as unknown as Json,
                    charger_status: newTicket.chargerStatus ?? null,
                    store: newTicket.store,
                    amount_estimate: newTicket.amountEstimate,
                    warranty: newTicket.warranty,
                    bill_number: newTicket.billNumber ?? null,
                    hold_reason: newTicket.holdReason ?? null,
                    assigned_to: newTicket.assignedTo ?? null,
                    resolved_at: newTicket.resolvedAt ?? null,
                    scheduled_date: newTicket.scheduledDate ?? null,
                };
                
                const { error: ticketError } = await (supabase.from('tickets') as any).insert(ticketPayload);
                
                if (ticketError) {
                    if (ticketError.code === '23505') { // Unique violation
                        console.warn(`Duplicate Ticket ID ${newTicketId}, retrying...`);
                        attempt++;
                        continue;
                    }
                    throw ticketError;
                }

                // Success
                ticketCreated = true;
                setTickets(prev => [newTicket, ...prev]);
                addAuditLog({
                    entityId: newTicket.id,
                    entityType: 'TICKET',
                    action: 'CREATE',
                    details: `Ticket created for customer "${customerName}".`
                });
                toast.success(`Ticket ${newTicket.id} created successfully`);
                onClose();
            } catch (err) {
                lastError = err;
                attempt = maxAttempts; // Stop loop on non-duplicate error
            }
        }

        if (!ticketCreated) {
            console.error("Failed to create ticket:", lastError);
            toast.error(`Failed to create ticket: ${getErrorMessage(lastError || "Could not generate unique ID")}`);
        }

        setIsSubmitting(false);
    };

    const inputClasses = "p-2 border border-gray-300 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500";
    const disabledInputClasses = "p-2 border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed";

    const renderDeviceFields = () => {
        if (deviceType === 'ACCESSORY' || deviceType === 'OTHER') {
            return <textarea name="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the device (e.g., Logitech Mouse, Unbranded 2TB HDD)" required rows={2} className={`${inputClasses} md:col-span-2`}></textarea>;
        }
        
        return (
            <>
                <input name="brand" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Brand (e.g., Dell, HP)" className={inputClasses}/>
                <input name="model" value={model} onChange={e => setModel(e.target.value)} placeholder="Model (e.g., XPS 15, Pavilion)" className={inputClasses}/>
                {deviceType !== 'CCTV' && (
                    <input name="serialNumber" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Serial Number" className={`${inputClasses} md:col-span-2`}/>
                )}
            </>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-black">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">New Ticket</h2>
                    <button onClick={onClose} className="text-black text-2xl">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-semibold px-2">Customer Info {existingCustomer && "(Existing)"}</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <input name="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (to search or create)" required className={inputClasses}/>
                            <input name="name" value={name} onChange={e => setName(e.target.value)} placeholder="Name" required className={inputClasses} disabled={!!existingCustomer}/>
                            <input name="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" required className={inputClasses} disabled={!!existingCustomer}/>
                            <input name="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className={`${inputClasses} md:col-span-2`} disabled={!!existingCustomer}/>
                        </div>
                    </fieldset>
                    
                     <fieldset className="border p-4 rounded-md">
                        <legend className="font-semibold px-2">Device & Issue Details</legend>
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

                            <textarea name="issue" value={issue} onChange={e => setIssue(e.target.value)} placeholder="Describe the issue" required rows={3} className={`${inputClasses} md:col-span-2`}></textarea>
                            
                            <select name="store" value={store} onChange={e => setStore(e.target.value)} className={inputClasses} required>
                                {settings.stores.length === 0 && <option value="">Loading stores...</option>}
                                {settings.stores.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                             <input type="number" name="amountEstimate" value={amountEstimate} onChange={e => setAmountEstimate(e.target.value)} placeholder="Amount Estimate" className={inputClasses}/>

                            <select name="warranty" value={warranty} onChange={e => setWarranty(e.target.value as 'YES'|'NO')} className={inputClasses}>
                                <option value="NO">No Warranty</option>
                                <option value="YES">Warranty</option>
                            </select>
                            {warranty === 'YES' && <input name="billNumber" value={billNumber} onChange={e => setBillNumber(e.target.value)} placeholder="Bill Number (Required)" className={inputClasses} required />}
                            
                            <select name="priority" value={priority} onChange={e => setPriority(e.target.value)} className={`${inputClasses} md:col-span-2`}>
                                {settings.priorities.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>

                            <div className="md:col-span-2">
                                <label htmlFor="scheduledDate" className="block text-sm font-medium mb-1 text-black">Scheduled Date (Optional)</label>
                                <input type="date" name="scheduledDate" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className={inputClasses}/>
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="assignedTo" className="block text-sm font-medium mb-1 text-black">Assign To (Optional)</label>
                                <select 
                                    name="assignedTo" 
                                    value={assignedTo} 
                                    onChange={e => setAssignedTo(e.target.value)} 
                                    className={canAssign ? inputClasses : disabledInputClasses} 
                                    disabled={!canAssign}
                                >
                                    <option value="">Unassigned</option>
                                    {settings.teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </fieldset>

                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-black" disabled={isSubmitting}>Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create Ticket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewTicketModal;
