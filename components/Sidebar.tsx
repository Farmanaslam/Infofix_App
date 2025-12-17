
import React from 'react';
import { View, CurrentUser } from '../types';

interface SidebarProps {
  isOpen: boolean;
  activeView: View;
  setActiveView: (view: View) => void;
  currentUser: CurrentUser | null;
  setSidebarOpen: (open: boolean) => void;
}

const NavItem: React.FC<{
  view: View;
  icon: React.ReactNode;
  label: string;
  activeView: View;
  onClick: (view: View) => void;
}> = ({ view, icon, label, activeView, onClick }) => (
  <li
    onClick={() => onClick(view)}
    className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors ${
      activeView === view
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`}
  >
    {icon}
    <span className="ml-3 font-medium">{label}</span>
  </li>
);

// SVG Icon Components
const HomeIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>;
const TicketIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>;
const UsersIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197M15 21a6 6 0 006-6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197"></path></svg>;
const CalendarIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>;
const ChartBarIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>;
const CogIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>;
const UserCircleIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>;
const ClipboardCheckIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>;
const PlusCircleIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;

const allNavItems: { view: View; label: string; icon: React.ReactNode; roles: string[] }[] = [
    { view: 'dashboard', label: 'Dashboard', icon: <HomeIcon />, roles: ['ADMIN', 'MANAGEMENT', 'TECHNICIAN'] },
    { view: 'tickets', label: 'Tickets', icon: <TicketIcon />, roles: ['ADMIN', 'MANAGEMENT', 'TECHNICIAN'] },
    { view: 'requests', label: 'Review Requests', icon: <ClipboardCheckIcon />, roles: ['ADMIN', 'MANAGEMENT'] },
    { view: 'customers', label: 'Customers', icon: <UsersIcon />, roles: ['ADMIN', 'MANAGEMENT'] },
    { view: 'schedule', label: 'Schedule', icon: <CalendarIcon />, roles: ['ADMIN', 'MANAGEMENT', 'TECHNICIAN'] },
    { view: 'reports', label: 'Reports', icon: <ChartBarIcon />, roles: ['ADMIN', 'MANAGEMENT'] },
    { view: 'portal', label: 'Customer Portal', icon: <UserCircleIcon />, roles: ['CUSTOMER'] },
    { view: 'request', label: 'New Service Request', icon: <PlusCircleIcon />, roles: ['CUSTOMER'] },
    { view: 'settings', label: 'Settings', icon: <CogIcon />, roles: ['ADMIN'] },
];


const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeView, setActiveView, currentUser, setSidebarOpen }) => {
  const userRole = currentUser ? (currentUser.type === 'team' ? currentUser.role : 'CUSTOMER') : null;

  const visibleNavItems = allNavItems.filter(item => userRole && item.roles.includes(userRole));

  const handleItemClick = (view: View) => {
    setActiveView(view);
    if (window.innerWidth < 768) {
        setSidebarOpen(false);
    }
  };

  return (
    <nav className={`bg-gray-800 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out overflow-hidden absolute md:relative h-full z-40 ${isOpen ? 'w-64 p-4' : 'w-0 p-0 md:w-0'}`}>
      <div className="w-56 flex-shrink-0 h-full flex flex-col relative">
        {/* Mobile Close Button */}
        <div className="md:hidden absolute -top-1 right-0">
             <button 
                onClick={() => setSidebarOpen(false)} 
                className="text-gray-400 hover:text-white p-2 rounded-full focus:outline-none"
                aria-label="Close sidebar"
             >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
        </div>

        <div className="flex items-center justify-center mb-8 h-16 mt-2 md:mt-0">
           {/* Logo Text */}
           <h1 className="text-2xl font-extrabold text-white tracking-wider text-center leading-tight">
             INFOFIX<br/>SERVICES
           </h1>
        </div>
        <ul className="flex-1 space-y-1">
          {visibleNavItems.map((item) => (
            <NavItem
              key={item.view}
              view={item.view}
              icon={item.icon}
              label={item.label}
              activeView={activeView}
              onClick={handleItemClick}
            />
          ))}
        </ul>
        <div className="mt-auto">
          <p className="text-xs text-center text-gray-500">&copy; 2024 INFOFIX SERVICES</p>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
