import React, { useState, useEffect } from 'react';
import { X, Lock, Smartphone, Key, ShieldCheck, Eye, EyeOff, Loader2, AlertTriangle, User, Hash } from 'lucide-react';
import { useMarketStore } from '../store';
import { API_BASE } from '../config/api';

interface BrokerLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

const BrokerLoginModal: React.FC<BrokerLoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    // Steps: 'details' (Mobile, UCC, Key, Secret, TOTP) -> 'mpin' (Validation)
    const [step, setStep] = useState<'details' | 'mpin'>('details');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // const [backendConnected, setBackendConnected] = useState<boolean | null>(null);

    // Form State
    const [consumerKey, setConsumerKey] = useState('');
    const [consumerSecret, setConsumerSecret] = useState('');
    const [mobile, setMobile] = useState('');
    const [ucc, setUcc] = useState('');
    const [totp, setTotp] = useState('');
    const [environment, setEnvironment] = useState<'PROD' | 'UAT'>('PROD');
    const [mpin, setMpin] = useState('');


    // Visibility Toggles
    const [showSecret, setShowSecret] = useState(false);
    const [showMpin, setShowMpin] = useState(false);

    // Fetch saved credentials from backend on mount
    useEffect(() => {
        if (!isOpen) return;
        const fetchCreds = async () => {
            try {
                const res = await fetch('/api/v1/broker/saved-credentials');
                if (res.ok) {
                    const data = await res.json();
                    if (data.mobile) setMobile(data.mobile);
                    if (data.ucc) setUcc(data.ucc);
                    if (data.consumer_key) setConsumerKey(data.consumer_key);
                    if (data.consumer_secret) setConsumerSecret(data.consumer_secret);
                    if (data.environment) setEnvironment(data.environment as 'PROD' | 'UAT');
                    console.log('✅ Pre-filled credentials from backend');
                }
            } catch (err) {
                console.warn('Could not fetch saved credentials:', err);
            }
        };
        fetchCreds();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleAutoLogin = async () => {
        setError(null);
        setLoading(true);
        try {
            console.log('🔐 Attempting Auto-Login via Backend...');
            const res = await fetch('/api/v1/broker/auto-login', {
                method: 'POST'
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                console.log('✅ Auto-Login Successful');
                useMarketStore.getState().setBrokerConnected(true);
                onLoginSuccess();
                onClose();
            } else {
                throw new Error(data.detail || "Auto-login failed");
            }
        } catch (err: any) {
            console.error("❌ Auto-Login Failed:", err);
            setError(err.message || "Auto-Login Failed");
        } finally {
            setLoading(false);
        }
    };

    const handleStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            console.log('📡 Sending login request to backend...');
            const res = await fetch('/api/v1/broker/login-step1', {

                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mobile,
                    ucc,
                    totp,
                    mpin: '',
                    consumer_key: consumerKey,
                    consumer_secret: consumerSecret || null, // Optional
                    environment: environment
                }),
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });

            console.log(`📥 Response status: ${res.status}`);

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || data.message || `Login Step 1 failed (${res.status})`);
            }

            if (data.status === 'success') {
                setStep('mpin');
            } else {
                if (data.message && data.message.includes("Library not installed")) {
                    throw new Error("Backend Library Missing: 'neo_api_client' is not installed. Please check console.");
                }
                throw new Error(data.message || 'Unknown response from broker');
            }

        } catch (err: any) {
            console.error("❌ Login Step 1 Error:", err);
            let msg = 'Unknown error';

            // Detect network errors vs API errors
            if (err.name === 'AbortError') {
                msg = '⏱️ Request timed out. Backend might be slow or not responding.';
            } else if (err.message === 'Failed to fetch' || err.message.includes('fetch')) {
                msg = `🔌 Cannot connect to backend. Make sure:\n1. Backend is running (python run_server.py)\n2. Running on ${API_BASE}\n3. Check browser console for network errors`;
            } else if (err?.message) {
                if (typeof err.message === 'object') {
                    msg = JSON.stringify(err.message);
                } else {
                    msg = String(err.message);
                }
            } else if (typeof err === 'string') {
                msg = err;
            } else {
                msg = JSON.stringify(err);
            }

            // Clean up JSON msg if needed
            if (msg.includes('{"')) {
                try {
                    // Try to parse it back to see if we can get a cleaner "message" field inside
                    const parsed = JSON.parse(msg);
                    if (parsed.message) msg = parsed.message;
                    else if (parsed.detail) msg = parsed.detail;
                } catch (e) { }
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            console.log('📡 Sending MPIN validation to backend...');
            const res = await fetch('/api/v1/broker/login-step2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mpin }),
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });

            console.log(`📥 Response status: ${res.status}`);
            const data = await res.json();
            console.log(`📋 Login Step2 Response:`, data);

            if (!res.ok) throw new Error(data.detail || data.message || `MPIN Verification failed (${res.status})`);

            if (data.status === 'success') {
                console.log('✅ Login successful, setting broker connected');
                useMarketStore.getState().setBrokerConnected(true);
                onLoginSuccess();
                onClose();
            } else if (data.status === 'warning') {
                // Login appeared successful but tokens weren't obtained
                console.warn('⚠️ Login warning:', data.message);
                throw new Error(data.message || 'Login failed - tokens not obtained');
            } else {
                throw new Error(data.message || 'Invalid MPIN');
            }
        } catch (err: any) {
            console.error("❌ Login Step 2 Error:", err);
            let msg = 'Unknown error';

            // Detect network errors vs API errors
            if (err.name === 'AbortError') {
                msg = '⏱️ Request timed out.';
            } else if (err.message === 'Failed to fetch' || err.message.includes('fetch')) {
                msg = '🔌 Cannot connect to backend. Step 1 may not have completed.';
            } else {
                msg = err.message || JSON.stringify(err);
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#0F1115] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#14181F] border-b border-slate-800 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold">K</div>
                        <h2 className="text-lg font-bold text-white">Connect Kotak Neo</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Auto Login Button */}
                    <button
                        type="button"
                        onClick={handleAutoLogin}
                        disabled={loading}
                        className="w-full mb-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-emerald-400 font-medium flex items-center justify-center gap-2 transition-all"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                        Connect with Saved Credentials
                    </button>

                    <div className="relative flex items-center justify-center mb-6">
                        <div className="absolute inset-x-0 h-px bg-slate-800"></div>
                        <span className="relative z-10 bg-[#0F1115] px-4 text-xs text-slate-500 uppercase tracking-wider">Or Enter Details</span>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2 text-rose-400 text-sm">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {step === 'details' ? (
                        <form onSubmit={handleStep1} className="space-y-4">
                            {/* Mobile & UCC Row */}
                            <div className="flex gap-3">
                                <div className="space-y-1 w-1/2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Mobile No</label>
                                    <div className="relative">
                                        <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                        <input
                                            type="text"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white focus:border-blue-500 outline-none text-sm"
                                            placeholder="10-digit Num"
                                            value={mobile}
                                            onChange={e => setMobile(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1 w-1/2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">UCC / Client ID</label>
                                    <div className="relative">
                                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                        <input
                                            type="text"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white focus:border-blue-500 outline-none text-sm"
                                            placeholder="Ex: AB1234"
                                            value={ucc}
                                            onChange={e => setUcc(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="space-y-1 w-2/3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Consumer Key</label>
                                    <div className="relative">
                                        <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                        <input
                                            type="text"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white focus:border-blue-500 outline-none text-sm font-mono"
                                            placeholder="Paste Consumer Key"
                                            value={consumerKey}
                                            onChange={e => setConsumerKey(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1 w-1/3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Env</label>
                                    <select
                                        value={environment}
                                        onChange={e => setEnvironment(e.target.value as 'PROD' | 'UAT')}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white focus:border-blue-500 outline-none text-sm font-mono appearance-none"
                                    >
                                        <option value="PROD">LIVE</option>
                                        <option value="UAT">UAT</option>
                                    </select>
                                </div>
                            </div>

                            {/* Consumer Secret (Optional/Hidden by default if not strictly 100% required but good to have) */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase flex justify-between">
                                    <span>Consumer Secret</span>
                                    <span className="text-slate-600 font-normal normal-case">(Optional per doc)</span>
                                </label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                    <input
                                        type={showSecret ? "text" : "password"}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-10 py-2 text-white focus:border-blue-500 outline-none text-sm font-mono"
                                        placeholder="Paste Consumer Secret"
                                        value={consumerSecret}
                                        onChange={e => setConsumerSecret(e.target.value)}
                                    />
                                    <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                        {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* TOTP Input */}
                            <div className="space-y-1 pt-2 border-t border-slate-800/50">
                                <label className="text-[10px] font-bold text-blue-400 uppercase flex items-center gap-1">
                                    <Hash size={12} /> Authenticator Code (TOTP)
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full bg-slate-900 border border-blue-500/30 rounded-lg px-4 py-3 text-center text-xl tracking-[0.2em] text-white focus:border-blue-500 outline-none transition-colors font-mono"
                                        placeholder="000 000"
                                        maxLength={6}
                                        value={totp}
                                        onChange={e => setTotp(e.target.value)}
                                        required
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500">
                                    Enter code from Google Authenticator registered with Kotak.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full font-bold py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 mt-4 bg-blue-600 hover:bg-blue-500 text-white hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]`}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Validate & Proceed'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleStep2} className="space-y-6 animate-in slide-in-from-right duration-300">
                            <div className="text-center mb-4">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2 text-emerald-400">
                                    <Lock size={24} />
                                </div>
                                <h3 className="text-white font-semibold">Enter MPIN</h3>
                                <p className="text-sm text-slate-400">Please enter your 6-digit Trading PIN to complete login.</p>
                            </div>

                            <div className="relative max-w-[200px] mx-auto">
                                <input
                                    type={showMpin ? "text" : "password"}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.2em] text-white focus:border-emerald-500 outline-none transition-colors font-mono"
                                    placeholder="------"
                                    maxLength={6}
                                    value={mpin}
                                    onChange={e => setMpin(e.target.value)}
                                    autoFocus
                                    required
                                />
                                <button type="button" onClick={() => setShowMpin(!showMpin)} className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-2">
                                    {showMpin ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]`}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Connect Terminal'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrokerLoginModal;
