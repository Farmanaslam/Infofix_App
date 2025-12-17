
import React, { useState, useMemo } from 'react';
import { Ticket, TodoTask } from '../types';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useStore } from '../context/StoreContext';

// Helper to safely extract error messages
const getErrorMessage = (error: any): string => {
    if (!error) return 'Unknown error';
    if (typeof error === 'string') return error;
    
    // Handle standard Error objects
    if (error instanceof Error) return error.message;
    
    // Handle Supabase/Postgrest errors
    if (error?.message) return error.message;
    if (error?.error_description) return error.error_description;
    if (error?.details) return error.details;
    if (error?.hint) return error.hint;
    
    try {
        // If it's a generic object, try to stringify it nicely
        const json = JSON.stringify(error);
        return json === '{}' ? 'An unexpected error occurred' : json;
    } catch {
        return 'An unexpected error occurred';
    }
};

const Schedule: React.FC = () => {
    // Use scheduledTickets for the calendar view to ensure we see all scheduled items, not just current page
    const { scheduledTickets, setTickets, tasks, setTasks, customers, settings, currentUser } = useStore();

    // Helper to get local date string YYYY-MM-DD to avoid UTC mismatches
    const getLocalDateStr = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(getLocalDateStr(new Date()));
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState('');
    
    const canAssignTasks = currentUser?.type === 'team' && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGEMENT');

    // Fallback map if customerName not present in ticket object
    const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

    const tasksByDate = useMemo(() => {
        const isTechnician = currentUser?.type === 'team' && currentUser.role === 'TECHNICIAN';

        return tasks.reduce((acc, task) => {
            // Filter: Technicians only see their own tasks
            if (isTechnician && task.assignedTo !== currentUser.name) {
                return acc;
            }

            (acc[task.date] = acc[task.date] || []).push(task);
            return acc;
        }, {} as Record<string, TodoTask[]>);
    }, [tasks, currentUser]);

    const ticketsByDate = useMemo(() => {
        return scheduledTickets.reduce((acc, ticket) => {
            if (ticket.scheduledDate) {
                (acc[ticket.scheduledDate] = acc[ticket.scheduledDate] || []).push(ticket);
            }
            return acc;
        }, {} as Record<string, Ticket[]>);
    }, [scheduledTickets]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(getLocalDateStr(today));
    };
    
    const handleAddTask = async () => {
        if (!newTaskText.trim() || !supabase) return;
        
        let assignee = newTaskAssignee || null;
        // Auto-assign to self if Technician creates a task
        if (currentUser?.type === 'team' && currentUser.role === 'TECHNICIAN') {
            assignee = currentUser.name;
        }

        const newTask: TodoTask = {
            id: `TASK-${Date.now()}`,
            date: selectedDate,
            text: newTaskText,
            completed: false,
            assignedTo: assignee || undefined
        };
        
        const originalTasks = tasks;
        // Optimistically add task
        setTasks(current => [...current, newTask]);
        setNewTaskText('');
        setNewTaskAssignee('');

        const payload = {
            id: newTask.id,
            date: newTask.date,
            text: newTask.text,
            completed: newTask.completed,
            assigned_to: assignee // Pass explicit null if no assignee
        };

        try {
            let { error } = await supabase.from('tasks').insert(payload);
            
            if (error) {
                const msg = getErrorMessage(error);
                // Fallback logic for schema mismatch (missing 'assigned_to' column in DB)
                if (msg.includes('assigned_to') || msg.includes('schema cache') || msg.includes('column "assigned_to" of relation "tasks" does not exist')) {
                    console.warn("Database schema outdated: 'assigned_to' column missing. Retrying without assignment.");
                    const { assigned_to, ...fallbackPayload } = payload;
                    const retry = await supabase.from('tasks').insert(fallbackPayload);
                    
                    if (retry.error) {
                        throw retry.error;
                    } else {
                        // Important: Update local state to remove the assignedTo field since it wasn't saved
                        setTasks(current => current.map(t => t.id === newTask.id ? { ...t, assignedTo: undefined } : t));
                        // Exact message matching user report
                        toast('Task added. Note: Assignment not saved (Database update required).', { icon: '⚠️', duration: 6000 });
                        return;
                    }
                }
                throw error;
            }
            
            toast.success('Task added');
        } catch (error: any) {
            console.error("Failed to add task:", error);
            toast.error(`Error adding task: ${getErrorMessage(error)}. Reverting.`);
            setTasks(originalTasks); // Rollback
        }
    };
    
    const handleToggleTask = async (taskId: string) => {
        if (!supabase) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const originalTasks = tasks;
        const newCompletedState = !task.completed;

        // Optimistically update task
        setTasks(current => current.map(t => t.id === taskId ? { ...t, completed: newCompletedState } : t));

        try {
            const { error } = await supabase.from('tasks').update({ completed: newCompletedState }).eq('id', taskId);
            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to toggle task:", error);
            toast.error(`Error updating task: ${getErrorMessage(error)}. Reverting.`);
            setTasks(originalTasks); // Rollback
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!supabase) return;

        const originalTasks = tasks;
        // Optimistically delete task
        setTasks(current => current.filter(t => t.id !== taskId));

        try {
            const { error } = await supabase.from('tasks').delete().eq('id', taskId);
            if (error) throw error;
            toast.success('Task deleted');
        } catch (error: any) {
            console.error("Failed to delete task:", error);
            toast.error(`Error deleting task: ${getErrorMessage(error)}. Reverting.`);
            setTasks(originalTasks); // Rollback
        }
    };

    const renderCalendar = () => {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayStr = getLocalDateStr(new Date());

        const days = Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`empty-${i}`} className="border-t border-r border-gray-200"></div>);

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const tasksForDay = tasksByDate[dateStr] || [];
            const ticketsForDay = ticketsByDate[dateStr] || [];

            let dayClasses = `p-1 md:p-2 text-center cursor-pointer relative transition-colors h-16 md:h-24 flex flex-col border-t border-r border-gray-200 text-black `;
            if(isSelected) dayClasses += 'bg-blue-500 text-white font-bold';
            else if(isToday) dayClasses += 'bg-blue-100';
            else dayClasses += 'hover:bg-gray-100';

            days.push(
                <div key={day} onClick={() => setSelectedDate(dateStr)} className={dayClasses} >
                    <span className={`w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full text-xs md:text-sm ${isSelected ? '' : isToday ? 'bg-blue-200' : ''}`}>
                        {day}
                    </span>
                    <div className="absolute bottom-1 right-1 flex gap-1">
                         {ticketsForDay.length > 0 && 
                            <span className={`text-[10px] md:text-xs font-semibold px-1 md:px-1.5 py-0.5 rounded-full flex items-center gap-0.5 md:gap-1 ${isSelected ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}>
                               <svg className="w-2 h-2 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
                               {ticketsForDay.length}
                            </span>
                        }
                        {tasksForDay.length > 0 && 
                            <span className={`text-[10px] md:text-xs font-semibold px-1 md:px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white text-blue-600' : 'bg-red-500 text-white'}`}>
                                {tasksForDay.length}
                            </span>
                        }
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
                <div className="flex justify-between items-center mb-4 text-black">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div className="text-center">
                        <h3 className="text-xl font-semibold">{currentDate.toLocaleString('default', { month: 'long' })}</h3>
                        <p className="text-sm">{currentDate.getFullYear()}</p>
                    </div>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
                <div className="grid grid-cols-7 text-xs text-center text-black font-semibold mb-2">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <div key={d} className="py-2">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 flex-grow border-l border-b border-gray-200">{days}</div>
                 <button onClick={goToToday} className="mt-4 w-full py-2 bg-gray-200 text-black font-semibold rounded-md hover:bg-gray-300 transition">
                    Today
                </button>
            </div>
        );
    };

    const selectedDayTasks = tasksByDate[selectedDate] || [];
    const selectedDayTickets = ticketsByDate[selectedDate] || [];

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-black">Schedule & Agenda</h2>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    {renderCalendar()}
                </div>
                <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4 border-b pb-2 text-black">
                        Agenda for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    
                    <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
                        {/* Tasks Section */}
                        <div>
                            <h4 className="font-bold text-lg mb-3 text-black flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                                Tasks ({selectedDayTasks.length})
                            </h4>
                            <div className="space-y-3">
                                {selectedDayTasks.length > 0 ? selectedDayTasks.map(task => (
                                    <div key={task.id} className={`relative overflow-hidden bg-white border border-gray-200 rounded-xl p-4 shadow-sm group transition-all duration-300 hover:shadow-md ${task.completed ? 'bg-gray-50' : ''}`}>
                                        {/* Visual Progress Indicator: Bottom Bar */}
                                        <div 
                                            className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ease-out ${task.completed ? 'bg-green-500 w-full' : 'bg-yellow-400 w-6'}`}
                                            title={task.completed ? "Completed" : "In Progress"}
                                        ></div>
                                        
                                        <div className="flex items-start gap-3 relative z-10">
                                            <div className="pt-0.5">
                                                <input 
                                                    type="checkbox" 
                                                    checked={task.completed} 
                                                    onChange={() => handleToggleTask(task.id)} 
                                                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-transform active:scale-90"
                                                />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap justify-between items-start gap-2">
                                                    <span className={`font-medium text-sm transition-colors break-words ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                        {task.text}
                                                    </span>
                                                    
                                                    {/* Visual Progress Indicator: Status Tag */}
                                                    <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${task.completed ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                                        {task.completed ? 'Completed' : 'Pending'}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center mt-2 text-xs text-gray-500">
                                                    <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                                    {task.assignedTo ? (
                                                        <>Assigned to: <span className="font-medium text-blue-600 ml-1">{task.assignedTo}</span></>
                                                    ) : (
                                                        <span className="text-orange-500 font-medium italic" title="Task assignment failed. Check Settings > Troubleshooting.">Unassigned</span>
                                                    )}
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => handleDeleteTask(task.id)} 
                                                className="text-gray-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title="Delete Task"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.143A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.857L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <p className="text-gray-500 text-sm">No tasks scheduled for this day.</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-4 flex flex-col space-y-2">
                                <input
                                    type="text" value={newTaskText} onChange={e => setNewTaskText(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleAddTask()}
                                    placeholder="Add new task..."
                                    className="p-2 border border-gray-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                                <div className="flex space-x-2">
                                    {canAssignTasks && settings && (
                                        <select 
                                            value={newTaskAssignee} 
                                            onChange={e => setNewTaskAssignee(e.target.value)}
                                            className="p-2 border border-gray-300 rounded-md bg-white text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow shadow-sm"
                                        >
                                            <option value="">Assign To (Optional)</option>
                                            {settings.teamMembers.map(m => (
                                                <option key={m.id} value={m.name}>{m.name}</option>
                                            ))}
                                        </select>
                                    )}
                                    <button onClick={handleAddTask} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold flex-shrink-0 shadow-sm transition-colors">Add Task</button>
                                </div>
                            </div>
                        </div>

                        {/* Tickets Scheduled for this day */}
                        <div>
                            <h4 className="font-bold text-lg mb-3 text-black flex items-center">
                                <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
                                Tickets Scheduled ({selectedDayTickets.length})
                            </h4>
                            <div className="space-y-2">
                                {selectedDayTickets.length > 0 ? selectedDayTickets.map(ticket => (
                                    <div key={ticket.id} className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg shadow-sm hover:shadow-md transition-shadow">
                                        <p className="font-semibold text-black text-sm">{ticket.subject}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-xs text-gray-600">
                                                <span className="font-mono font-bold">{ticket.id}</span> | {ticket.customerName || customerMap.get(ticket.customerId)?.name || 'Unknown'}
                                            </p>
                                            <span className="text-[10px] px-2 py-0.5 bg-white border border-blue-200 rounded-full text-blue-700 font-bold uppercase">
                                                {ticket.status}
                                            </span>
                                        </div>
                                    </div>
                                )) : <p className="text-gray-500 text-sm p-3 bg-gray-50 rounded-lg text-center border border-dashed border-gray-200">No tickets scheduled for this day.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Schedule;
