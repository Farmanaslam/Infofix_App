
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Tickets from './components/Tickets';
import Customers from './components/Customers';
import Schedule from './components/Schedule';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Portal from './components/Portal';
import RequestForm from './components/RequestForm';
import ReviewRequests from './components/ReviewRequests';
import SearchResults from './components/SearchResults';
import Login from './components/Login';
import { SkeletonDashboard } from './components/Skeleton';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';
import { Toaster, toast } from 'react-hot-toast';
import { StoreProvider, useStore } from './context/StoreContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { exportTickets } from './migration/exportTicket';
import { exportCustomers } from './migration/exportCustomer';

const TEMP_ADMIN = {
  id: "TEMP-ADMIN-001",
  name: "System Admin",
  email: "admin@infofix.com",
  role: "ADMIN",
};

const SQL_SETUP_SCRIPT = `-- 1. Tables Setup
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    notes JSONB DEFAULT '[]'::jsonb,
    photo_url TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    assigned_to TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    device JSONB NOT NULL,
    store TEXT NOT NULL,
    amount_estimate NUMERIC NOT NULL,
    warranty TEXT NOT NULL,
    bill_number TEXT,
    scheduled_date TEXT,
    charger_status TEXT,
    hold_reason TEXT,
    internal_progress_reason TEXT,
    internal_progress_note TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    text TEXT NOT NULL,
    completed BOOLEAN NOT NULL,
    assigned_to TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    action TEXT NOT NULL,
    "user" TEXT NOT NULL,
    details TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY DEFAULT 1,
    team_members JSONB,
    stores JSONB,
    hold_reasons JSONB,
    priorities JSONB,
    statuses JSONB,
    past_due_days JSONB,
    device_types JSONB,
    internal_progress_reasons JSONB,
    CONSTRAINT single_row_constraint CHECK (id = 1)
);

-- 1.1 Migration Checks (Ensure columns exist if table already created)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'assigned_to') THEN
        ALTER TABLE tasks ADD COLUMN assigned_to TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'assigned_to') THEN
        ALTER TABLE tickets ADD COLUMN assigned_to TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'internal_progress_reason') THEN
        ALTER TABLE tickets ADD COLUMN internal_progress_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'internal_progress_note') THEN
        ALTER TABLE tickets ADD COLUMN internal_progress_note TEXT;
    END IF;
END $$;

-- 2. Security Policies (Row Level Security)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow all access for this demo app (adjust for production)
DROP POLICY IF EXISTS "Enable all access for customers" ON customers;
CREATE POLICY "Enable all access for customers" ON customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for tickets" ON tickets;
CREATE POLICY "Enable all access for tickets" ON tickets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for tasks" ON tasks;
CREATE POLICY "Enable all access for tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for audit_log" ON audit_log;
CREATE POLICY "Enable all access for audit_log" ON audit_log FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for settings" ON settings;
CREATE POLICY "Enable all access for settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- 3. Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE customers;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tickets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE settings;
  END IF;
END
$$;

-- 4. Initial Data Seed
INSERT INTO settings (id, team_members, stores, hold_reasons, priorities, statuses, past_due_days, device_types, internal_progress_reasons) VALUES
(1, 
  '[
    {"id": "TM-1", "name": "System Admin", "details": "Administrator", "experience": 10, "photoUrl": "", "role": "ADMIN", "email": "admin@infofix.com", "password": "password123"},
    {"id": "TM-2", "name": "Sarah Manager", "details": "Service Manager", "experience": 8, "photoUrl": "", "role": "MANAGEMENT", "email": "manager@infofix.com", "password": "password123"},
    {"id": "TM-3", "name": "Mike Tech", "details": "Senior Technician", "experience": 5, "photoUrl": "", "role": "TECHNICIAN", "email": "tech@infofix.com", "password": "password123"}
  ]',
  '["Main Branch", "Downtown"]',
  '["Waiting for Parts", "Customer Approval Pending", "Technician Unavailable"]',
  '["HIGH", "MEDIUM", "LOW"]',
  '["NEW", "Open", "In Progress", "Internal Progress", "HOLD", "Pending Approval", "Rejected", "SERVICE DONE", "Resolved"]',
  '{"HIGH": 3, "MEDIUM": 7, "LOW": 14}',
  '["LAPTOP", "DESKTOP", "ACCESSORY", "CCTV", "BRAND SERVICE", "OTHER"]',
  '["Chip Level Work", "Software Installation", "Testing Phase", "Waiting for Approval"]'
)
ON CONFLICT (id) DO NOTHING;
`;

const AppContent: React.FC = () => {
  const { currentUser,setCurrentUser, activeView, setActiveView, isSidebarOpen, setSidebarOpen, logout, loading, error, settings, refreshData, isRefreshing } = useStore();
  const [sqlCopied, setSqlCopied] = useState(false);

  const copySql = () => {
    navigator.clipboard.writeText(SQL_SETUP_SCRIPT);
    setSqlCopied(true);
    toast.success("SQL Code copied to clipboard!");
    setTimeout(() => setSqlCopied(false), 3000);
  };


  useEffect(() => {
 const fetchTeamMembers = async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("settings")
      .select("team_members")
      .eq("id", 1)
      .single() as { data: { team_members: unknown } | null; error: unknown };

    if (error) {
      console.error("Team members fetch error:", error);
    } else {
      console.log("Team Members:", data?.team_members);

     
    }
  };

  fetchTeamMembers();
  }, []);
  // Monitor Online/Offline Status
  useEffect(() => {
    const handleOnline = () => toast.success('You are back online!');
    const handleOffline = () => toast.error('You are offline. Some features may be limited.', { duration: 5000 });
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);
  

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 p-8">
        <div className="max-w-3xl w-full bg-white p-10 rounded-lg shadow-2xl border-t-4 border-blue-500">
          <div className="flex items-center mb-6">
            <svg className="w-12 h-12 text-blue-500 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7s0 0 0 0l8 5 8-5M12 22v-8"></path></svg>
            <div>
              <h1 className="text-3xl font-bold text-black">Welcome to INFOFIX SERVICES!</h1>
              <p className="text-lg text-black mt-1">Just one more step to get started.</p>
            </div>
          </div>
          <p className="text-lg text-black mb-6">To connect the application to your database, you need to add your Supabase project credentials.</p>
          <div className="bg-gray-800 text-left p-6 rounded-md font-mono text-sm text-gray-200 space-y-6">
            <div>
              <p className="font-bold text-lg mb-2 text-white">1. Find Your Credentials</p>
              <p>You can find your Project URL and <code className="bg-gray-700 px-1 py-0.5 rounded">anon</code> public key in your Supabase project's API settings.</p>
               <a href="https://app.supabase.com/" target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-blue-400 hover:underline font-sans text-base">Go to Supabase Dashboard &rarr;</a>
            </div>
            <div>
              <p className="font-bold text-lg mb-2 text-white">2. Update Configuration File</p>
              <p className="mb-2">Open the following file in your editor: <code className="bg-gray-700 px-2 py-1 rounded">lib/config.ts</code></p>
              <p>Replace the placeholder values with your credentials. The file contains detailed instructions.</p>
            </div>
          </div>
          <p className="text-center text-md text-gray-600 mt-8">After adding your credentials, <strong className="text-black">please refresh this page</strong> to launch the application.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <SkeletonDashboard />;
  }
  
  if (error) {
    const isConnectionError = error.includes("CORS") || error.includes("Failed to connect") || error.includes("Failed to fetch");
    const isMissingTableError = error.includes("relation") && error.includes("does not exist");
    
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'your-app-url.com';
    const isLocalhost = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1');
    
    if (isMissingTableError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
                <div className="max-w-4xl w-full bg-white p-6 md:p-8 rounded-2xl shadow-2xl border border-yellow-200">
                     <div className="flex flex-col md:flex-row items-start mb-6">
                        <div className="flex-shrink-0 mb-4 md:mb-0">
                            <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                        <div className="md:ml-5">
                            <h1 className="text-2xl font-bold text-gray-900">Database Setup Required</h1>
                            <p className="text-md text-gray-600 mt-2">
                                The connection works, but the <strong>database tables are missing</strong>.
                            </p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                             <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-inner">
                                <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                                    <span className="text-xs font-mono text-gray-400">SQL Setup Script</span>
                                    <button 
                                        onClick={copySql}
                                        className={`text-xs px-3 py-1 rounded transition-colors ${sqlCopied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                    >
                                        {sqlCopied ? 'Copied!' : 'Copy SQL'}
                                    </button>
                                </div>
                                <textarea 
                                    readOnly 
                                    value={SQL_SETUP_SCRIPT} 
                                    className="w-full h-80 p-4 bg-gray-900 text-green-400 font-mono text-xs focus:outline-none resize-none"
                                />
                             </div>
                        </div>
                        
                        <div className="lg:col-span-1 flex flex-col space-y-6">
                             <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                <h3 className="font-bold text-yellow-800 mb-2 text-sm">How to fix:</h3>
                                <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-900">
                                    <li>Copy the SQL code.</li>
                                    <li>Go to <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" className="text-blue-600 font-bold hover:underline">Supabase SQL Editor</a>.</li>
                                    <li>Paste and click <strong>Run</strong>.</li>
                                </ol>
                             </div>

                             <button onClick={() => window.location.reload()} className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md flex items-center justify-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                Refresh Page
                             </button>
                             
                             <div className="bg-red-50 p-3 rounded border border-red-100 mt-auto">
                                <p className="text-xs font-mono text-red-600 break-all">{error}</p>
                             </div>
                        </div>
                     </div>
                </div>
            </div>
        );
    }

    if (isConnectionError) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 p-4">
                <div className="max-w-4xl w-full bg-white p-8 rounded-2xl shadow-2xl border border-red-200">
                    <div className="flex items-start mb-6"><div className="flex-shrink-0"><svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14a2 2 0 100-4 2 2 0 000 4z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.34 17.66A9 9 0 0012 3a9 9 0 00-8.34 14.66"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.66 20.34A9 9 0 0012 21a9 9 0 008.34-3.66"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1l22 22"></path></svg></div><div className="ml-5"><h1 className="text-2xl font-bold text-red-600">Database Connection Error</h1><p className="text-md text-black mt-2">The application failed to connect to your Supabase database. This is a common setup issue, usually related to Cross-Origin Resource Sharing (CORS).</p></div></div>
                    <div className="bg-gray-800 text-left p-6 rounded-lg font-mono text-sm text-gray-200"><p className="font-bold text-lg mb-4 text-white">Troubleshooting Steps</p><ol className="list-decimal list-inside space-y-5"><li><strong className="text-yellow-400">Step 1: Verify Supabase Credentials</strong><p className="pl-4 mt-1">Ensure the URL and Key in <code className="bg-gray-700 px-1 py-0.5 rounded">lib/config.ts</code> are correct.</p></li><li><strong className="text-yellow-400">Step 2: Update Supabase CORS Settings</strong><p className="pl-4 mt-1 mb-2">Your database needs permission to accept requests from this application.</p><ul className="list-disc list-inside pl-6 mt-1 space-y-2"><li>Go to your Supabase Project Dashboard.</li><li>Navigate to: <code className="bg-gray-700 px-1 py-0.5 rounded">Project Settings</code> &rarr; <code className="bg-gray-700 px-1 py-0.5 rounded">API</code>.</li><li>Scroll to the <strong className="text-white">CORS Origins</strong> section.</li><li>Add the following URL to the list:<div className="my-2 p-3 bg-gray-900 rounded"><code className="text-green-400 font-bold">{currentOrigin}</code></div></li>{isLocalhost && (<li className="text-gray-400">For local development, it's often safe to add <code className="bg-gray-700 px-1 py-0.5 rounded">http://localhost:*</code> to allow any port.</li>)}</ul></li></ol></div>
                     <p className="text-center text-md text-gray-600 mt-6">After updating your Supabase settings, <strong className="text-black">please refresh this page</strong>. For more details, see the <a href="https://supabase.com/docs/guides/getting-started/tutorials/with-react#set-up-the-react-app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold ml-1">Supabase CORS documentation</a>.</p>
                </div>
            </div>
        );
    }
    return <div className="p-8 text-center"><h2 className="text-2xl font-bold text-red-600 mb-4">An Unexpected Error Occurred</h2><pre className="p-4 bg-red-50 text-red-700 rounded-md whitespace-pre-wrap text-left font-mono">{error}</pre></div>;
  }

  if (!currentUser) {
    if (!settings) return <Login />;
    if (activeView === 'request') return <RequestForm isPublicForm={true} onCancel={() => setActiveView('dashboard')} />;
    return <Login />;
  }

  // Determine which component to render
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard />;
      case 'tickets': return <Tickets />;
      case 'requests': return <ReviewRequests />;
      case 'customers': return <Customers />;
      case 'schedule': return <Schedule />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      case 'portal': return <Portal />;
      case 'request': return <RequestForm />;
      case 'search': return <SearchResults />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Sidebar 
        isOpen={isSidebarOpen} 
        activeView={activeView} 
        setActiveView={setActiveView} 
        currentUser={currentUser}
        setSidebarOpen={setSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          currentUser={currentUser}
          onLogout={logout}
          onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          onRefresh={refreshData}
          isRefreshing={isRefreshing}
        />
        <main 
            onClick={() => { if(isSidebarOpen && window.innerWidth < 768) setSidebarOpen(false); }} 
            className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 text-black p-4 md:p-6 lg:p-8"
        >
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

// Initialize the QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // Data is fresh for 1 minute
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
        <StoreProvider>
            <AppContent />
        </StoreProvider>
    </QueryClientProvider>
  );
};

export default App;
