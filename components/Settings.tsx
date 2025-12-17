
import React from 'react';
import { AppSettings, TeamMember, Database, Json } from '../types';
import ConfirmationModal from './modals/ConfirmationModal';
import TeamMemberFormModal from './modals/TeamMemberFormModal';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useStore } from '../context/StoreContext';

type SettingsView = 'team' | 'stores' | 'holdReasons' | 'statuses' | 'priorities' | 'deviceTypes' | 'pastDue' | 'internalProgress' | 'data';

// A reusable component for managing simple string lists (Stores, Hold Reasons)
const SimpleListManager: React.FC<{
    title: string;
    items: string[];
    onAdd: (item: string) => void;
    onDelete: (item: string) => void;
    onEdit?: (oldItem: string, newItem: string) => void;
    noun: string;
    placeholder: string;
}> = ({ title, items, onAdd, onDelete, onEdit, noun, placeholder }) => {
    const [newItem, setNewItem] = React.useState('');
    const [editingItem, setEditingItem] = React.useState<string | null>(null);
    const [editValue, setEditValue] = React.useState('');

    const handleAdd = () => {
        if (newItem.trim()) {
            onAdd(newItem.trim());
            setNewItem('');
        }
    };
    
    const startEdit = (item: string) => {
        setEditingItem(item);
        setEditValue(item);
    };

    const saveEdit = () => {
        if (editingItem && editValue.trim() && editValue !== editingItem && onEdit) {
            onEdit(editingItem, editValue.trim());
        }
        setEditingItem(null);
        setEditValue('');
    };

    const cancelEdit = () => {
        setEditingItem(null);
        setEditValue('');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-black">{title}</h3>
            <div className="flex mb-4">
                <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAdd()} placeholder={placeholder} className="flex-grow p-2 border border-gray-300 rounded-l-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                <button onClick={handleAdd} className="bg-blue-600 text-white px-4 rounded-r-md hover:bg-blue-700 font-semibold">Add</button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {items.length > 0 ? items.map(item => (
                    <li key={item} className="flex justify-between items-center p-2 bg-gray-50 rounded text-black hover:bg-gray-100">
                        {editingItem === item ? (
                            <div className="flex flex-grow gap-2 items-center">
                                <input 
                                    value={editValue} 
                                    onChange={(e) => setEditValue(e.target.value)} 
                                    className="flex-grow p-1 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                />
                                <button onClick={saveEdit} className="text-green-600 hover:text-green-800 p-1" title="Save">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                </button>
                                <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 p-1" title="Cancel">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        ) : (
                            <>
                                <span>{item}</span>
                                <div className="flex gap-1">
                                    {onEdit && (
                                        <button onClick={() => startEdit(item)} className="text-blue-500 hover:text-blue-700 px-2" title={`Edit ${noun}`}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                        </button>
                                    )}
                                    <button onClick={() => onDelete(item)} className="text-red-500 hover:text-red-700 font-bold px-2" title={`Delete ${item}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.143A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.857L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </>
                        )}
                    </li>
                )) : <p className="text-black text-center p-4">No {noun} added yet.</p>}
            </ul>
        </div>
    );
};

const PastDueManager: React.FC<{
    settings: AppSettings;
    onUpdate: (priority: string, days: number) => void;
}> = ({ settings, onUpdate }) => {
    
    const handleChange = (priority: string, value: string) => {
        const days = parseInt(value, 10);
        if (!isNaN(days) && days >= 0) {
            onUpdate(priority, days);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2 text-black">Past Due Ticket Configuration</h3>
            <p className="text-sm text-black mb-6">Define when a ticket is flagged as "overdue" on the dashboard based on its priority level.</p>
            <div className="space-y-4 max-w-sm">
                {settings.priorities.map(priority => (
                    <div key={priority} className="flex items-center justify-between">
                        <label htmlFor={`pastdue-${priority}`} className="font-medium text-black">{priority} Priority</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                id={`pastdue-${priority}`}
                                value={settings.pastDueDays[priority] || 0}
                                onChange={(e) => handleChange(priority, e.target.value)}
                                min="1"
                                className="w-24 p-2 border border-gray-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-black">days</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const Settings: React.FC = () => {
    // Destructure additional data for backup functionality
    const { settings, setSettings, tickets, customers, tasks, auditLog, currentUser } = useStore();
    // Component State
    const [activeSettingsView, setActiveSettingsView] = React.useState<SettingsView>('team');
    
    // Modals State
    const [isTeamModalOpen, setIsTeamModalOpen] = React.useState(false);
    const [editingTeamMember, setEditingTeamMember] = React.useState<TeamMember | null>(null);
    const [memberToDelete, setMemberToDelete] = React.useState<TeamMember | null>(null);

    if (!settings) return null;

    // Access Control: Only ADMIN can access settings
    if (currentUser?.type !== 'team' || currentUser.role !== 'ADMIN') {
        return (
             <div className="flex flex-col items-center justify-center h-full text-gray-500 mt-10">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                    <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                <p>You do not have permission to view or modify system settings.</p>
                <p className="text-sm mt-2">Only Administrators can make changes here.</p>
            </div>
        );
    }

    const updateSettingsInDb = async (updates: Partial<AppSettings>) => {
        if (!supabase) {
            throw new Error("Database client not initialized.");
        }

        // Build the update object dynamically to only send changed fields.
        const settingsForDb: Database['public']['Tables']['settings']['Update'] = {};

        if (updates.teamMembers !== undefined) settingsForDb.team_members = updates.teamMembers as unknown as Json;
        if (updates.stores !== undefined) settingsForDb.stores = updates.stores as unknown as Json;
        if (updates.holdReasons !== undefined) settingsForDb.hold_reasons = updates.holdReasons as unknown as Json;
        if (updates.internalProgressReasons !== undefined) settingsForDb.internal_progress_reasons = updates.internalProgressReasons as unknown as Json;
        if (updates.priorities !== undefined) settingsForDb.priorities = updates.priorities as unknown as Json;
        if (updates.statuses !== undefined) settingsForDb.statuses = updates.statuses as unknown as Json;
        if (updates.deviceTypes !== undefined) settingsForDb.device_types = updates.deviceTypes as unknown as Json;
        if (updates.pastDueDays !== undefined) settingsForDb.past_due_days = updates.pastDueDays as unknown as Json;

        // If nothing to update, return early
        if (Object.keys(settingsForDb).length === 0) return;
        
        // Use upsert to patch or create the row if it's missing (self-healing for deleted rows)
        // Explicitly set onConflict to 'id' to ensure Postgres handles it correctly
        const { error } = await (supabase.from('settings') as any).upsert({
             id: 1,
             ...settingsForDb
        }, { onConflict: 'id' });

        if (error) {
            console.error("Failed to update settings:", error);
            
            // Check for missing column error to provide helpful feedback
            if (error.message && (error.message.includes("device_types") || error.message.includes("column"))) {
                 throw new Error(`Database Schema Error: The 'device_types' column is missing in the 'settings' table.\n\nPlease run this SQL in your Supabase SQL Editor:\n\nALTER TABLE settings ADD COLUMN IF NOT EXISTS device_types JSONB;`);
            }
            
            // Provide a clear message about payload size if relevant
            if (error.message && error.message.includes("payload") || error.message.includes("size")) {
                throw new Error("Data too large to save. If you added a photo, try a smaller one.");
            }

            throw new Error(`Database Error: ${error.message}`);
        }
    };
    
    // Central function for optimistically updating settings state
    const optimisticallyUpdateSettings = async (updates: Partial<AppSettings>) => {
        const originalSettings = settings;
        const newSettings = { ...originalSettings, ...updates };

        // Optimistically update UI
        setSettings(newSettings);

        try {
            await updateSettingsInDb(updates);
            toast.success('Settings saved successfully.');
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error occurred.";
            console.error("Failed to save settings:", error);
            
            // Use a persistent toast for errors so user has time to read it
            toast.error(`Failed to save changes.\n\n${message}`, { duration: 6000 });
            
            // Rollback UI on failure
            setSettings(originalSettings);
        }
    };

    const handleExportData = () => {
        const backup = {
            metadata: {
                version: "1.0",
                timestamp: new Date().toISOString(),
                exportedBy: "User Action",
                appName: "INFOFIX SERVICES CRM"
            },
            data: {
                settings,
                tickets,
                customers,
                tasks,
                auditLog
            }
        };

        try {
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `infofix-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast.success("Full data backup downloaded successfully.");
        } catch (e) {
            console.error("Backup failed", e);
            toast.error("Failed to generate backup file.");
        }
    };


    // --- Team Member Handlers ---
    const handleSaveTeamMember = async (member: TeamMember) => {
        let updatedMembers;
    
        if (settings.teamMembers.some(m => m.id === member.id)) {
            updatedMembers = settings.teamMembers.map(m => m.id === member.id ? member : m);
        } else {
            updatedMembers = [...settings.teamMembers, member];
        }
        
        // Close modal immediately for better UX, error will revert state/show toast
        setIsTeamModalOpen(false);
        setEditingTeamMember(null);
        
        // Call the optimistic updater
        await optimisticallyUpdateSettings({ teamMembers: updatedMembers });
    };

    const handleDeleteTeamMember = (member: TeamMember) => {
        if (tickets.some(t => t.assignedTo === member.name)) {
            toast.error(`Cannot delete ${member.name} as they are assigned to active tickets. Please reassign the tickets first.`);
            return;
        }
        setMemberToDelete(member);
    };

    const confirmDeleteTeamMember = async () => {
        if (!memberToDelete) return;
        const updatedMembers = settings.teamMembers.filter(m => m.id !== memberToDelete.id);
        setMemberToDelete(null); // Close modal immediately
        await optimisticallyUpdateSettings({ teamMembers: updatedMembers });
    };

    // --- Generic List Handlers ---
    const handleAddListItem = async (key: keyof AppSettings, value: string) => {
        const list = (settings[key] as string[]) || []; // Default to empty array if undefined
        if (value && !list.some(item => item.toLowerCase() === value.toLowerCase())) {
            await optimisticallyUpdateSettings({ [key]: [...list, value] });
        }
    };
    
    const handleDeleteListItem = async (key: keyof AppSettings, value: string) => {
        const list = (settings[key] as string[]) || []; // Default to empty array if undefined
        await optimisticallyUpdateSettings({ [key]: list.filter(item => item !== value) });
    };
    
    // --- Store Edit Handler ---
    const handleEditStore = async (oldName: string, newName: string) => {
        if (!supabase) return;
        const list = settings.stores || [];
        if (list.includes(newName)) {
             toast.error('Store name already exists.');
             return;
        }
        
        // 1. Update settings array
        const updatedStores = list.map(item => item === oldName ? newName : item);
        await optimisticallyUpdateSettings({ stores: updatedStores });
        
        // 2. Update all existing tickets linked to this store
        // This runs in background after settings update
        const { error } = await (supabase.from('tickets') as any)
            .update({ store: newName })
            .eq('store', oldName);
            
        if (error) {
             console.error("Failed to migrate tickets to new store name:", error);
             toast.error("Settings updated, but failed to update existing tickets with new store name.");
        } else {
             toast.success(`Renamed store and updated associated tickets.`);
        }
    };

    // --- Status-specific delete handler with dependency check ---
    const handleDeleteStatus = (statusToDelete: string) => {
        const protectedStatuses = ['NEW', 'Resolved', 'Pending Approval', 'Rejected', 'SERVICE DONE', 'Internal Progress'];
        if (protectedStatuses.includes(statusToDelete)) {
            toast.error(`Cannot delete protected status "${statusToDelete}". This status is integral to the application's workflow.`);
            return;
        }
        if (tickets.some(t => t.status === statusToDelete)) {
            toast.error(`Cannot delete status "${statusToDelete}" as it is currently in use by one or more tickets.`);
            return;
        }
        handleDeleteListItem('statuses', statusToDelete);
    };

    // --- Priority-specific delete handler with dependency check ---
    const handleDeletePriority = (priorityToDelete: string) => {
        if (tickets.some(t => t.priority === priorityToDelete)) {
            toast.error(`Cannot delete priority "${priorityToDelete}" as it is currently in use by one or more tickets.`);
            return;
        }
        handleDeleteListItem('priorities', priorityToDelete);
    };
    
    // --- Device Type-specific delete handler with dependency check ---
    const handleDeleteDeviceType = (typeToDelete: string) => {
        if (tickets.some(t => t.device.type === typeToDelete)) {
            toast.error(`Cannot delete device type "${typeToDelete}" as it is currently in use by one or more tickets.`);
            return;
        }
        handleDeleteListItem('deviceTypes', typeToDelete);
    };
    
    // --- Past Due Handler ---
    const handlePastDueChange = async (priority: string, days: number) => {
        const newPastDueDays = {
            ...settings.pastDueDays,
            [priority]: days,
        };
        await optimisticallyUpdateSettings({ pastDueDays: newPastDueDays });
    };

    const getRoleBadgeColor = (role: string) => {
        switch(role) {
            case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'MANAGEMENT': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'TECHNICIAN': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const renderSettingsView = () => {
        switch (activeSettingsView) {
            case 'team':
                return (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-semibold text-black">Manage Team Members</h3>
                                <p className="text-sm text-gray-500 mt-1">Add, edit, or remove staff accounts and permissions.</p>
                            </div>
                            <button onClick={() => { setEditingTeamMember(null); setIsTeamModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold flex items-center gap-2 shadow-sm transition-transform hover:scale-105">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197M15 21a6 6 0 006-6v-1a6 6 0 00-9-5.197" /></svg>
                                Add Member
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto p-1">
                            {settings.teamMembers.map(member => (
                                <div key={member.id} className="relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                    <div className="p-5 flex items-start space-x-4">
                                        <div className="flex-shrink-0">
                                            <img 
                                                src={member.photoUrl || 'https://via.placeholder.com/64'} 
                                                alt={member.name}
                                                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/64'; }}
                                                className="w-16 h-16 rounded-full object-cover ring-4 ring-gray-50 shadow-inner"
                                            />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-bold text-lg text-gray-900 truncate pr-2">{member.name}</h4>
                                            </div>
                                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider mb-2 ${getRoleBadgeColor(member.role)}`}>
                                                {member.role}
                                            </span>
                                            <p className="text-sm text-gray-600 truncate mb-1 flex items-center">
                                                <svg className="w-3 h-3 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                                {member.email}
                                            </p>
                                            <div className="flex items-center text-xs text-gray-500">
                                                <span className="font-medium text-gray-700 truncate max-w-[120px]">{member.details}</span>
                                                <span className="mx-2 text-gray-300">|</span>
                                                <span className="text-blue-600 font-semibold">{member.experience}y Exp</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons Overlay */}
                                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 rounded-lg p-1 shadow-sm backdrop-blur-sm">
                                        <button 
                                            onClick={() => { setEditingTeamMember(member); setIsTeamModalOpen(true); }} 
                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                                            title="Edit Profile"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteTeamMember(member)} 
                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                                            title="Delete User"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.143A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.857L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'stores':
                return <SimpleListManager 
                    title="Manage Stores" 
                    items={settings.stores} 
                    onAdd={(item) => handleAddListItem('stores', item)} 
                    onDelete={(item) => handleDeleteListItem('stores', item)} 
                    onEdit={handleEditStore}
                    noun="store" 
                    placeholder="Add new store location..." 
                />;
            case 'holdReasons':
                 return <SimpleListManager title="Manage Hold Reasons" items={settings.holdReasons} onAdd={(item) => handleAddListItem('holdReasons', item)} onDelete={(item) => handleDeleteListItem('holdReasons', item)} noun="reason" placeholder="Add new hold reason..." />;
            case 'internalProgress':
                return <SimpleListManager title="Manage Internal Progress Reasons" items={settings.internalProgressReasons || []} onAdd={(item) => handleAddListItem('internalProgressReasons', item)} onDelete={(item) => handleDeleteListItem('internalProgressReasons', item)} noun="reason" placeholder="Add new progress reason..." />;
            case 'statuses':
                return <SimpleListManager 
                    title="Manage Ticket Statuses" 
                    items={settings.statuses} 
                    onAdd={(item) => handleAddListItem('statuses', item)} 
                    onDelete={handleDeleteStatus} 
                    noun="status" 
                    placeholder="Add new status..." 
                />;
            case 'priorities':
                return <SimpleListManager 
                    title="Manage Ticket Priorities" 
                    items={settings.priorities} 
                    onAdd={(item) => handleAddListItem('priorities', item)} 
                    onDelete={handleDeletePriority} 
                    noun="priority" 
                    placeholder="Add new priority level..." 
                />;
            case 'deviceTypes':
                return <SimpleListManager 
                    title="Manage Device Types" 
                    items={settings.deviceTypes} 
                    onAdd={(item) => handleAddListItem('deviceTypes', item)} 
                    onDelete={handleDeleteDeviceType} 
                    noun="device type" 
                    placeholder="Add new device type..." 
                />;
            case 'pastDue':
                return <PastDueManager settings={settings} onUpdate={handlePastDueChange} />;
            case 'data':
                return (
                     <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-semibold text-black">Data Management & Backup</h3>
                                <p className="text-gray-600 mt-2 max-w-2xl">
                                    Your data is automatically saved to the secure Supabase cloud database in real-time. 
                                    However, you can download a local backup of all your data (Tickets, Customers, Settings, etc.) as a JSON file for your records.
                                </p>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                            <h4 className="font-bold text-blue-800 mb-2">Database Connection Status</h4>
                            <p className="text-sm text-blue-700 flex items-center">
                                <span className="flex h-3 w-3 relative mr-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="font-bold mr-1">Connected:</span> Data is securely syncing with Supabase Cloud.
                            </p>
                        </div>

                        <div className="border-t pt-6">
                            <h4 className="font-bold text-lg text-black mb-4">Export Data</h4>
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <button 
                                    onClick={handleExportData}
                                    className="bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 transition flex items-center gap-2 shadow-sm"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Download Full Backup (.json)
                                </button>
                                <span className="text-sm text-gray-500">
                                    Contains {tickets.length} tickets, {customers.length} customers, and complete system settings.
                                </span>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-black">Settings</h2>

            <div className="mb-6 max-w-md">
                <label htmlFor="settings-view-select" className="block text-sm font-medium text-black mb-1">
                    Configuration Area
                </label>
                <select
                    id="settings-view-select"
                    value={activeSettingsView}
                    onChange={(e) => setActiveSettingsView(e.target.value as SettingsView)}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                    <option value="team">Team Members & Access</option>
                    <option value="data">Data Management & Backup</option>
                    <option value="stores">Stores Locations</option>
                    <option value="deviceTypes">Device Types</option>
                    <option value="statuses">Ticket Status Workflow</option>
                    <option value="priorities">Ticket Priorities</option>
                    <option value="holdReasons">Hold Reasons</option>
                    <option value="internalProgress">Internal Progress Reasons</option>
                    <option value="pastDue">SLA / Past Due Config</option>
                </select>
            </div>

            <div>
                {renderSettingsView()}
            </div>

            {isTeamModalOpen && (
                <TeamMemberFormModal 
                    member={editingTeamMember}
                    onSave={handleSaveTeamMember}
                    onClose={() => setIsTeamModalOpen(false)}
                />
            )}
            {memberToDelete && (
                <ConfirmationModal 
                    message={`Are you sure you want to delete team member "${memberToDelete.name}"? This action cannot be undone.`}
                    onConfirm={confirmDeleteTeamMember}
                    onCancel={() => setMemberToDelete(null)}
                />
            )}
        </div>
    );
};

export default Settings;
