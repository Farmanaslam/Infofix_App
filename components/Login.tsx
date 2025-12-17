
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { supabase } from '../lib/supabaseClient';
import { Customer } from '../types';
import RequestForm from './RequestForm';

// --- Icons ---
const MailIcon = () => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>;
const PhoneIcon = () => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>;
const LockIcon = () => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>;

const Login: React.FC = () => {
    const { setCurrentUser, settings, setActiveView, installPrompt, setInstallPrompt, refreshData, loading } = useStore();
    const [mode, setMode] = useState<'customer' | 'staff' | 'request'>('customer');
    const [error, setError] = useState('');
    const [isInitializing, setIsInitializing] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Customer Login State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPhoneNumber, setLoginPhoneNumber] = useState('');

    // Staff Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Auto-load saved credentials on mount
    useEffect(() => {
        const savedCustEmail = localStorage.getItem('infofix_cust_email');
        const savedCustPhone = localStorage.getItem('infofix_cust_phone');
        if (savedCustEmail) setLoginEmail(savedCustEmail);
        if (savedCustPhone) setLoginPhoneNumber(savedCustPhone);

        const savedStaffEmail = localStorage.getItem('infofix_staff_email');
        const savedStaffPass = localStorage.getItem('infofix_staff_pass');
        if (savedStaffEmail) setEmail(savedStaffEmail);
        if (savedStaffPass) setPassword(savedStaffPass);
    }, []);

    useEffect(() => {
        const initApp = async () => {
            setIsInitializing(true);
            try {
                await refreshData();
            } catch (err) {
                console.error("Data initialization failed:", err);
            } finally {
                setIsInitializing(false);
            }
        };
        initApp();
    }, []);

    if (isInitializing || (loading && !settings)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 flex-col">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-b-blue-400 rounded-full animate-spin-slow opacity-50"></div>
                </div>
                <h2 className="text-xl font-bold text-gray-700 mt-6 tracking-wide animate-pulse">Initializing InfoFix...</h2>
            </div>
        );
    }

    if (!settings) return null;

    const handleCustomerLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        if (!supabase) {
            setError("Database connection unavailable.");
            setIsSubmitting(false);
            return;
        }

        try {
            // Auto-save credentials
            localStorage.setItem('infofix_cust_email', loginEmail);
            localStorage.setItem('infofix_cust_phone', loginPhoneNumber);
            
            // QUERY DB DIRECTLY (Bypasses Pagination Issue)
            // We search for the exact email, case-insensitive
            const { data: rawCustomer, error: fetchError } = await supabase
                .from('customers')
                .select('*')
                .ilike('email', loginEmail.trim())
                .maybeSingle();

            if (fetchError) {
                console.error("Login error:", fetchError);
                setError("System error during login check.");
                setIsSubmitting(false);
                return;
            }

            if (!rawCustomer) {
                setError("No account found with that email address.");
                setIsSubmitting(false);
                return;
            }

            // Map raw DB data to App Type
            const customer: Customer = {
                id: rawCustomer.id,
                name: rawCustomer.name,
                email: rawCustomer.email,
                phone: rawCustomer.phone,
                address: rawCustomer.address,
                createdAt: rawCustomer.created_at,
                notes: Array.isArray(rawCustomer.notes) ? rawCustomer.notes : [],
                photoUrl: rawCustomer.photo_url || undefined
            };
            
            const normalizePhone = (p: string) => p.replace(/\D/g, '').slice(-10);
            const storedPhoneDigits = normalizePhone(customer.phone);
            const enteredPhoneDigits = normalizePhone(loginPhoneNumber);
            
            // Check match: either exact DB match OR last 10 digits match
            const isMatch = (enteredPhoneDigits.length >= 10 && storedPhoneDigits === enteredPhoneDigits) || (customer.phone === loginPhoneNumber);

            if (isMatch) {
                setCurrentUser({ ...customer, type: 'customer' });
                setActiveView('portal');
            } else {
                setError('The phone number (password) is incorrect.');
            }
        } catch (err) {
            console.error("Login Exception:", err);
            setError("An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStaffLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        setTimeout(() => {
             // Auto-save credentials
            localStorage.setItem('infofix_staff_email', email);
            localStorage.setItem('infofix_staff_pass', password);
            
            const member = settings.teamMembers.find(m => m.email.toLowerCase() === email.toLowerCase());
            
            if (member) {
                if (member.password === password) {
                    setCurrentUser({ ...member, type: 'team' });
                    setActiveView('dashboard');
                } else {
                    setError('Invalid password.');
                }
            } else {
                setError('User not found.');
            }
            setIsSubmitting(false);
        }, 600);
    };

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult) => {
            setInstallPrompt(null);
        });
    };
    
    if (mode === 'request') {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <div className="w-full max-w-3xl animate-fade-in-up">
                     <button type="button" onClick={() => setMode('customer')} className="mb-6 text-blue-600 hover:text-blue-800 font-bold flex items-center transition-colors group">
                        <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Login
                    </button>
                    <RequestForm isPublicForm={true} onCancel={() => setMode('customer')} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-4 font-sans">
            {/* Install Button (Floating) */}
            {installPrompt && (
                <button 
                    onClick={handleInstallClick} 
                    className="fixed top-6 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 font-semibold z-50 flex items-center"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Install App
                </button>
            )}

            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg md:max-w-5xl flex flex-col md:flex-row overflow-hidden min-h-[500px] md:min-h-[600px] transition-all duration-500 hover:shadow-3xl">
                
                {/* Left Side: Visuals (Hidden on Mobile) */}
                <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-600 to-indigo-800 p-12 flex-col justify-between text-white relative overflow-hidden">
                    {/* Abstract Shapes */}
                    <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-[-50px] right-[-50px] w-80 h-80 bg-blue-400 opacity-20 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                    <div className="relative z-10">
                         <div className="flex items-center space-x-3 mb-8">
                             <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                             </div>
                             <span className="text-xl font-bold tracking-wider">INFOFIX</span>
                         </div>
                         <h1 className="text-4xl font-extrabold mb-6 leading-tight">
                            Manage Service <br/>
                            <span className="text-blue-300">Like a Pro.</span>
                         </h1>
                         <p className="text-blue-100 text-lg max-w-sm leading-relaxed">
                            Experience seamless ticket management, real-time tracking, and effortless communication all in one place.
                         </p>
                    </div>

                    <div className="relative z-10">
                        <div className="flex -space-x-4 mb-4">
                            <img className="w-10 h-10 rounded-full border-2 border-indigo-600" src="https://i.pravatar.cc/100?img=1" alt="User" />
                            <img className="w-10 h-10 rounded-full border-2 border-indigo-600" src="https://i.pravatar.cc/100?img=2" alt="User" />
                            <img className="w-10 h-10 rounded-full border-2 border-indigo-600" src="https://i.pravatar.cc/100?img=3" alt="User" />
                            <div className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-white text-blue-600 flex items-center justify-center text-xs font-bold">+2k</div>
                        </div>
                        <p className="text-sm text-blue-200 font-medium">Trusted by 2,000+ customers for reliable service.</p>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="w-full md:w-1/2 p-6 md:p-12 bg-white flex flex-col justify-center relative">
                    <div className="max-w-md mx-auto w-full">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back! 👋</h2>
                            <p className="text-gray-500">Please enter your details to sign in.</p>
                        </div>

                        {/* Custom Tabs */}
                        <div className="flex p-1 bg-gray-100 rounded-xl mb-6 relative">
                            <div 
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out ${mode === 'staff' ? 'translate-x-[calc(100%+8px)]' : 'translate-x-0'}`}
                            ></div>
                            <button 
                                type="button"
                                onClick={() => { setMode('customer'); setError(''); }} 
                                className={`flex-1 relative z-10 py-2.5 text-sm font-bold rounded-lg transition-colors duration-300 ${mode === 'customer' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Customer
                            </button>
                            <button 
                                type="button"
                                onClick={() => { setMode('staff'); setError(''); }} 
                                className={`flex-1 relative z-10 py-2.5 text-sm font-bold rounded-lg transition-colors duration-300 ${mode === 'staff' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Staff Member
                            </button>
                        </div>

                        {/* Form Container with animation */}
                        <div className="transition-all duration-300 ease-in-out">
                            {mode === 'customer' ? (
                                <form onSubmit={handleCustomerLogin} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Email Address</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-blue-500 transition-colors">
                                                <MailIcon />
                                            </div>
                                            <input 
                                                type="email" 
                                                value={loginEmail} 
                                                onChange={e => setLoginEmail(e.target.value)} 
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200" 
                                                placeholder="name@example.com" 
                                                required 
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Phone Number (Password)</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-blue-500 transition-colors">
                                                <PhoneIcon />
                                            </div>
                                            <input 
                                                type="password" 
                                                value={loginPhoneNumber} 
                                                onChange={e => setLoginPhoneNumber(e.target.value)} 
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200" 
                                                placeholder="Enter your phone number" 
                                                required 
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center mb-4">
                                        <input id="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" defaultChecked />
                                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-500">Remember me</label>
                                    </div>

                                    {/* Registration Box */}
                                    <button 
                                        type="button" 
                                        onClick={() => setMode('request')} 
                                        className="w-full mb-4 p-3 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 transition-all duration-200 flex items-center justify-center gap-2 group shadow-sm"
                                    >
                                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                                        <span className="text-sm font-medium">Are you new?</span>
                                        <span className="text-sm font-bold underline decoration-2 underline-offset-2 group-hover:text-indigo-900">Register here.</span>
                                    </button>

                                    {error && (
                                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-shake">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-red-700 font-medium">{error}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                                    >
                                        {isSubmitting ? (
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        ) : 'Sign In'}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleStaffLogin} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Staff Email</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-purple-500 transition-colors">
                                                <MailIcon />
                                            </div>
                                            <input 
                                                type="email" 
                                                value={email} 
                                                onChange={e => setEmail(e.target.value)} 
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200" 
                                                placeholder="staff@infofix.com" 
                                                required 
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-purple-500 transition-colors">
                                                <LockIcon />
                                            </div>
                                            <input 
                                                type="password" 
                                                value={password} 
                                                onChange={e => setPassword(e.target.value)} 
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200" 
                                                placeholder="••••••••" 
                                                required 
                                            />
                                        </div>
                                    </div>
                                    
                                    {error && (
                                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-shake">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-red-700 font-medium">{error}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                                    >
                                        {isSubmitting ? (
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        ) : 'Secure Staff Login'}
                                    </button>
                                </form>
                            )}
                        </div>
                        
                        {/* Auto-save & Social Footer */}
                        <div className="mt-8 text-center space-y-6">
                            <div className="bg-green-50 border border-green-100 rounded-lg p-3 inline-block">
                                <p className="text-xs text-green-700 font-medium flex items-center justify-center">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    Your login IDs and passwords are auto-saved for convenient access.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
