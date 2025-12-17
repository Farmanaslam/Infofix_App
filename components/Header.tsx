import React, { useState } from 'react';
import { CurrentUser } from '../types';
import { useStore } from '../context/StoreContext';

interface HeaderProps {
  currentUser: CurrentUser | null;
  onLogout: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onToggleSidebar, isSidebarOpen, onRefresh, isRefreshing }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { setSearchQuery, setActiveView } = useStore();
  const [localSearchTerm, setLocalSearchTerm] = useState('');

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && localSearchTerm.trim()) {
        setSearchQuery(localSearchTerm);
        setActiveView('search');
    }
  };

  const handleSearchIconClick = () => {
      if (localSearchTerm.trim()) {
          setSearchQuery(localSearchTerm);
          setActiveView('search');
      }
  }

  return (
    <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center z-20 relative">
      <div className="flex items-center flex-1 mr-4">
        <button 
            onClick={onToggleSidebar} 
            className="text-white mr-4 p-1 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white flex-shrink-0"
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
        <div className="relative w-full max-w-lg">
            <input
                type="search"
                placeholder="Global Search (Tickets, Customers)..."
                className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                onKeyDown={handleSearch}
            />
            <div 
                className="absolute inset-y-0 left-0 pl-3 flex items-center cursor-pointer"
                onClick={handleSearchIconClick}
            >
                <svg className="w-5 h-5 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
        </div>
      </div>
      <div className="flex items-center space-x-4 flex-shrink-0">
        {currentUser && (
          <>
            <button 
                onClick={onRefresh} 
                disabled={isRefreshing}
                className={`text-white p-2 rounded-full hover:bg-gray-700 transition-colors focus:outline-none ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Refresh Data"
            >
                <svg className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
            </button>

            <div className="relative">
                <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 focus:outline-none"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                >
                <img
                    src={currentUser.photoUrl || `https://i.pravatar.cc/40?u=${currentUser.id}`}
                    alt="User Avatar"
                    className="w-10 h-10 rounded-full object-cover border border-gray-600"
                />
                <div className="hidden md:flex flex-col items-start">
                    <span className="font-semibold text-sm max-w-[100px] truncate">{currentUser.name}</span>
                    <span className="text-xs text-gray-400 capitalize">{currentUser.type === 'team' ? currentUser.role.toLowerCase() : 'Customer'}</span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 text-black z-20">
                    <div className="border-t border-gray-100"></div>
                    <button
                    onClick={() => {
                        onLogout();
                        setDropdownOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-black hover:bg-gray-100"
                    >
                    Logout
                    </button>
                </div>
                )}
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;