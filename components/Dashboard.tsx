
import React, { useState } from 'react';
import { Ticket, Customer } from '../types';
import { useStore } from '../context/StoreContext';

const ModernStatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    onClick: () => void;
    colorClass: string; // e.g. "from-blue-500 to-blue-600"
    bgClass: string; // e.g. "bg-blue-50"
}> = ({ title, value, icon, onClick, colorClass, bgClass }) => (
    <div
        onClick={onClick}
        className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:-translate-y-1"
    >
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorClass} opacity-10 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500`}></div>
        
        <div className="relative z-10 flex justify-between items-start">
            <div>
                <p className="text-gray-500 text-xs font-bold tracking-wider uppercase mb-2">{title}</p>
                <h3 className="text-3xl font-black text-gray-800 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 transition-all">
                    {value}
                </h3>
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} text-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                {icon}
            </div>
        </div>
        <div className="mt-4 flex items-center text-xs font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
            <span>Tap to view details</span>
            <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
        </div>
    </div>
);

type StoreStat = { total: number; priorities: { [priority: string]: number } };

const Dashboard: React.FC = () => {
    const { 
        dashboardStats, 
        customers,
        settings, 
        setActiveView, 
        setTicketFilters,
        setTicketPage,
        currentUser
    } = useStore();
    
    if (!settings) return null;

    const { openTickets, overdueTickets, resolvedToday, totalCustomers, highPriorityTickets, storeStats } = dashboardStats;

    const getPriorityBadgeClass = (priority: string) => {
        const priorityUpper = priority.toUpperCase();
        if (priorityUpper.includes('HIGH')) return 'bg-red-100 text-red-700 border border-red-200 ring-1 ring-red-200';
        if (priorityUpper.includes('MEDIUM')) return 'bg-orange-100 text-orange-700 border border-orange-200 ring-1 ring-orange-200';
        if (priorityUpper.includes('LOW')) return 'bg-green-100 text-green-700 border border-green-200 ring-1 ring-green-200';
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    };

    const handleNavigateToTickets = (filter: { store: string }) => {
        const baseFilter = {
            priority: 'ALL',
            status: 'ALL',
            search: '',
            startDate: '',
            endDate: '',
            dateRange: 'ALL',
            assignedTo: 'ALL',
            deviceType: 'ALL',
            warranty: 'ALL',
            sortBy: 'NEWEST' as const
        };
        setTicketFilters({ ...baseFilter, ...filter });
        setTicketPage(0);
        setActiveView('tickets');
    };

    const handleStatClick = (type: 'open' | 'overdue' | 'resolved' | 'customers') => {
        if (type === 'customers') {
            setActiveView('customers');
        } else {
            setTicketPage(0);
            
            const baseFilter = {
                priority: 'ALL',
                store: 'ALL',
                assignedTo: 'ALL',
                search: '',
                startDate: '',
                endDate: '',
                deviceType: 'ALL',
                warranty: 'ALL',
                sortBy: 'NEWEST' as const
            };

            if (type === 'open') {
                setTicketFilters({ ...baseFilter, status: 'Open', dateRange: 'ALL' }); 
            } else if (type === 'resolved') {
                 setTicketFilters({ ...baseFilter, status: 'Resolved', dateRange: 'TODAY' });
            } else {
                 setTicketFilters({ ...baseFilter, status: 'ALL', dateRange: 'ALL' });
            }

            setActiveView('tickets');
        }
    };

    const getCurrentDate = () => {
        const date = new Date();
        return {
            weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
            fullDate: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        };
    };
    
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const { weekday, fullDate } = getCurrentDate();
    const greeting = getGreeting();
    const firstName = currentUser?.name.split(' ')[0] || 'Team';

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                        {greeting}, <span className="text-blue-600">{firstName}</span>!
                    </h2>
                    <p className="text-gray-500 text-sm mt-1 flex items-center">
                        Dashboard Overview &bull; <span className="font-medium text-gray-700 ml-1 mr-1">{weekday},</span> {fullDate}
                    </p>
                </div>
                <div className="mt-4 md:mt-0">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                        System Operational
                    </span>
                </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <ModernStatCard 
                    title="Open Tickets" 
                    value={openTickets} 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 12h10m0-12v12m-5 4h.01M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>} 
                    onClick={() => handleStatClick('open')} 
                    colorClass="from-blue-500 to-indigo-600"
                    bgClass="bg-blue-50"
                />
                <ModernStatCard 
                    title="Estimated Overdue" 
                    value={overdueTickets} 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} 
                    onClick={() => handleStatClick('overdue')} 
                    colorClass="from-red-500 to-rose-600"
                    bgClass="bg-red-50"
                />
                <ModernStatCard 
                    title="Resolved Today" 
                    value={resolvedToday} 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} 
                    onClick={() => handleStatClick('resolved')} 
                    colorClass="from-green-500 to-emerald-600"
                    bgClass="bg-green-50"
                />
                <ModernStatCard 
                    title="Total Customers" 
                    value={totalCustomers} 
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} 
                    onClick={() => handleStatClick('customers')} 
                    colorClass="from-purple-500 to-violet-600"
                    bgClass="bg-purple-50"
                />
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* High Priority Tickets Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <span className="flex h-3 w-3 relative mr-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            Urgent Attention
                        </h3>
                        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">Top 5 High Priority</span>
                    </div>
                    <div className="flex-grow overflow-x-auto">
                        <table className="w-full text-left text-gray-700">
                            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                                <tr>
                                    <th className="p-4">ID</th>
                                    <th className="p-4">Details</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {highPriorityTickets.map(ticket => (
                                    <tr key={ticket.id} className="group hover:bg-red-50/50 transition-colors">
                                        <td className="p-4 align-top">
                                            <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{ticket.id}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">{ticket.subject}</div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${getPriorityBadgeClass(ticket.priority)}`}>
                                                    {ticket.priority}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {ticket.customerName} • {ticket.store}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right align-middle">
                                            <button 
                                                onClick={() => {
                                                    setTicketFilters({ 
                                                        priority: 'ALL', status: 'ALL', store: 'ALL', dateRange: 'ALL', assignedTo: 'ALL', 
                                                        deviceType: 'ALL', warranty: 'ALL', sortBy: 'NEWEST', search: ticket.id 
                                                    });
                                                    setTicketPage(0);
                                                    setActiveView('tickets');
                                                }}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {highPriorityTickets.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-10 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <svg className="w-12 h-12 mb-3 text-green-100" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                                <p className="text-gray-500 font-medium">All clear! No high priority tickets.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* Store Workload Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                     <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            Store Workload
                        </h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(Object.entries(storeStats) as [string, StoreStat][]).sort((a,b) => b[1].total - a[1].total).map(([store, data]) => (
                            <div 
                                key={store} 
                                onClick={() => handleNavigateToTickets({ store })}
                                className="group relative bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-gray-800 text-sm truncate pr-2">{store}</h4>
                                    <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded-md group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                        {data.total} Tickets
                                    </span>
                                </div>
                                
                                <div className="relative pt-1">
                                    <div className="flex mb-2 items-center justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Load Capacity</span>
                                        <span className="text-blue-600 font-bold">{Math.round((data.total / Math.max(1, openTickets)) * 100)}%</span>
                                    </div>
                                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-50">
                                        <div 
                                            style={{ width: `${Math.min((data.total / Math.max(1, openTickets)) * 100, 100)}%` }} 
                                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-400 to-blue-600 rounded transition-all duration-1000 ease-out"
                                        ></div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-end text-xs font-semibold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-1 group-hover:translate-y-0">
                                    View Details <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </div>
                            </div>
                        ))}
                        {Object.keys(storeStats).length === 0 && (
                            <div className="col-span-2 text-center py-8 text-gray-400 text-sm">
                                No active workload data available.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
