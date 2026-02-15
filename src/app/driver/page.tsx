'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, Bus, Route } from '@/lib/supabase';
import {
    Bus as BusIcon,
    MapPin,
    Navigation,
    Power,
    AlertTriangle,
    MessageSquare,
    Lock,
    ChevronRight,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DriverDashboard() {
    const [passcode, setPasscode] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const [buses, setBuses] = useState<Bus[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
    const [activeBusPlates, setActiveBusPlates] = useState<string[]>([]);

    const [isTracking, setIsTracking] = useState(false);
    const [lastPos, setLastPos] = useState<{ lat: number, lng: number } | null>(null);
    const watchId = useRef<number | null>(null);
    const wakeLock = useRef<any>(null);
    const autoTerminateTimer = useRef<NodeJS.Timeout | null>(null);

    const [noticeText, setNoticeText] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [remainingTime, setRemainingTime] = useState<number>(6000000); // 1h 40m in ms
    const countdownInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: bData } = await supabase.from('buses').select('*');
            const { data: rData } = await supabase.from('routes').select('*');
            if (bData) setBuses(bData);
            if (rData) setRoutes(rData);

            // Fetch currently active buses
            const { data: locData } = await supabase
                .from('bus_locations')
                .select('license_plate')
                .eq('is_active', true);

            if (locData) {
                setActiveBusPlates(locData.map(l => l.license_plate));
            }
        };
        fetchInitialData();

        // Subscribe to occupancy changes
        const channel = supabase
            .channel('bus-occupancy')
            .on('postgres_changes' as any, { event: '*', table: 'bus_locations' }, (payload: any) => {
                const updatedPlate = payload.new.license_plate || payload.old.license_plate;
                const isActive = payload.new.is_active;

                setActiveBusPlates(prev => {
                    if (isActive) {
                        return prev.includes(updatedPlate) ? prev : [...prev, updatedPlate];
                    } else {
                        return prev.filter(p => p !== updatedPlate);
                    }
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (passcode === '1234') {
            setIsAuthenticated(true);
        } else {
            alert('Invalid Passcode');
        }
    };

    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLock.current = await (navigator as any).wakeLock.request('screen');
            }
        } catch (err) {
            console.error('Wake Lock failed:', err);
        }
    };

    const [syncError, setSyncError] = useState<string | null>(null);

    const startTracking = async () => {
        if (!selectedBus || !selectedRoute) return;
        setSyncError(null);

        console.log('--- STARTING TRACKING DIAGNOSTICS ---');
        try {
            const testConn = await supabase.from('bus_locations').select('count', { count: 'exact', head: true });
            if (testConn.error) {
                console.error('DIAGNOSTIC: Table unreachable', testConn.error);
                setSyncError(`Database Error: ${testConn.error.message} (Code: ${testConn.error.code})`);
                return;
            }
        } catch (e: any) {
            setSyncError(`Connection Failed: ${e.message}`);
            return;
        }

        if ('geolocation' in navigator) {
            setIsTracking(true);
            requestWakeLock();

            // Set auto-termination timer for 1 hour 40 minutes (6000000ms)
            const startTime = Date.now();
            setRemainingTime(6000000);

            autoTerminateTimer.current = setTimeout(() => {
                console.log('Auto-terminating trip after 1 hour 40 minutes');
                stopTracking();
            }, 6000000);

            // Update countdown every minute
            countdownInterval.current = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, 6000000 - elapsed);
                setRemainingTime(remaining);

                if (remaining === 0 && countdownInterval.current) {
                    clearInterval(countdownInterval.current);
                }
            }, 60000); // Update every minute

            // Get initial position immediately to activate the bus
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setLastPos({ lat: latitude, lng: longitude });

                    // Record initial position for path
                    await supabase.from('trip_paths').insert({
                        license_plate: selectedBus.license_plate,
                        latitude,
                        longitude
                    });

                    const { error, status, statusText } = await supabase
                        .from('bus_locations')
                        .upsert({
                            license_plate: selectedBus.license_plate,
                            route_id: selectedRoute.id,
                            latitude,
                            longitude,
                            is_active: true,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'license_plate' });

                    if (error) {
                        const errMsg = `[v2] Sync Failed [${status}]: ${error.message} (Code: ${error.code})`;
                        console.error(errMsg, error);
                        setSyncError(errMsg);
                    } else {
                        console.log('[v2] DRIVER: Live Tracking Active. Status:', status);
                    }
                },
                (error) => {
                    console.error('GPS Error:', error);
                    setSyncError(`GPS Error: ${error.message}`);
                },
                { enableHighAccuracy: true }
            );

            // Start watching for movement
            watchId.current = navigator.geolocation.watchPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setLastPos({ lat: latitude, lng: longitude });

                    // Record movement for path
                    await supabase.from('trip_paths').insert({
                        license_plate: selectedBus.license_plate,
                        latitude,
                        longitude
                    });

                    const { error } = await supabase
                        .from('bus_locations')
                        .upsert({
                            license_plate: selectedBus.license_plate,
                            route_id: selectedRoute.id,
                            latitude,
                            longitude,
                            is_active: true,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'license_plate' });

                    if (error) {
                        console.error('[v2] Movement Sync Error:', error.message || error.details || JSON.stringify(error));
                    }
                },
                (error) => console.error('Watch error:', error),
                { enableHighAccuracy: true, maximumAge: 0 }
            );
        }
    };

    const stopTracking = async () => {
        // Clear auto-termination timer
        if (autoTerminateTimer.current) {
            clearTimeout(autoTerminateTimer.current);
            autoTerminateTimer.current = null;
        }

        // Clear countdown interval
        if (countdownInterval.current) {
            clearInterval(countdownInterval.current);
            countdownInterval.current = null;
        }

        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
        }
        if (wakeLock.current) {
            wakeLock.current.release();
            wakeLock.current = null;
        }

        if (selectedBus) {
            // Terminate live status
            await supabase
                .from('bus_locations')
                .update({ is_active: false })
                .eq('license_plate', selectedBus.license_plate);

            // Delete recorded path points
            await supabase
                .from('trip_paths')
                .delete()
                .eq('license_plate', selectedBus.license_plate);
        }

        setIsTracking(false);
    };

    const broadcastNotice = async (text: string) => {
        if (!text.trim()) return;
        setIsBroadcasting(true);
        const { error } = await supabase
            .from('notices')
            .insert({ content: `${selectedBus?.bus_number}: ${text}` });

        if (!error) {
            setNoticeText('');
            setTimeout(() => setIsBroadcasting(false), 2000);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md glass p-8 rounded-[2.5rem] border-white/10"
                >
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="bg-blue-600 p-4 rounded-3xl mb-4 shadow-xl shadow-blue-600/20">
                            <Lock className="text-white" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Driver Portal</h1>
                        <p className="text-slate-400 text-sm">Authentication Required</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <input
                            type="password"
                            placeholder="••••"
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-center text-3xl tracking-[0.5em] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                            maxLength={4}
                        />
                        <button
                            type="submit"
                            className="w-full bg-white text-slate-900 font-bold py-4 rounded-2xl hover:bg-blue-500 hover:text-white transition-all transform active:scale-95 shadow-lg shadow-white/5"
                        >
                            Access Dashboard
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 pb-24 max-w-2xl mx-auto">
            {/* Integrated Header */}
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        Terminal View
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                    </h2>
                    <p className="text-blue-500 text-[10px] font-bold uppercase tracking-[0.2em]">Operator: Campus Fleet </p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl">
                    <ActivityStatus isTracking={isTracking} />
                </div>
            </div>

            {!isTracking ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                    {/* Section 1: Bus Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <BusIcon size={16} className="text-blue-500" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Assign Vehicle</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                {buses.map(bus => {
                                    const isInUse = activeBusPlates.includes(bus.license_plate) && selectedBus?.license_plate !== bus.license_plate;

                                    return (
                                        <button
                                            key={bus.id}
                                            disabled={isInUse}
                                            onClick={() => setSelectedBus(bus)}
                                            className={`flex-shrink-0 w-44 p-4 rounded-2xl border transition-all text-left relative overflow-hidden ${selectedBus?.id === bus.id
                                                ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-600/20'
                                                : isInUse
                                                    ? 'bg-slate-900 border-white/5 opacity-40 cursor-not-allowed'
                                                    : 'bg-white/5 border-white/5 hover:border-white/10'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className={`p-2 rounded-lg ${selectedBus?.id === bus.id ? 'bg-white/20' : 'bg-white/5'}`}>
                                                    <BusIcon size={18} className={isInUse ? 'text-slate-600' : ''} />
                                                </div>
                                                {selectedBus?.id === bus.id && <CheckCircle2 size={16} className="text-white" />}
                                                {isInUse && <Lock size={14} className="text-slate-500" />}
                                            </div>
                                            <p className={`font-bold text-lg ${isInUse ? 'text-slate-600' : ''}`}>{bus.bus_number}</p>
                                            <p className={`text-[10px] font-mono ${selectedBus?.id === bus.id ? 'text-blue-100' : 'text-slate-700'}`}>
                                                {isInUse ? 'BUS IN USE' : bus.license_plate}
                                            </p>

                                            {isInUse && (
                                                <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] flex items-center justify-center">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Occupied</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Region & Route Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <MapPin size={16} className="text-blue-500" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Route Configuration</h3>
                        </div>

                        <div className="glass p-6 rounded-[2rem] border-white/5 space-y-6">
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1">Select Region</p>
                                <div className="flex gap-2">
                                    {Array.from(new Set(routes.map(r => r.region))).map(region => (
                                        <button
                                            key={region}
                                            onClick={() => { setSelectedRegion(region); setSelectedRoute(null); }}
                                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${selectedRegion === region
                                                ? 'bg-white/10 border-blue-500 text-white'
                                                : 'bg-transparent border-white/5 text-slate-500'
                                                }`}
                                        >
                                            {region}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {selectedRegion && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2 border-t border-white/5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1">Assign Active Route</p>
                                    <div className="space-y-2">
                                        {routes.filter(r => r.region === selectedRegion).map(route => (
                                            <button
                                                key={route.id}
                                                onClick={() => setSelectedRoute(route)}
                                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${selectedRoute?.id === route.id
                                                    ? 'bg-blue-600/10 border-blue-500/50 text-white'
                                                    : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className="text-left">
                                                    <p className="text-sm font-bold">{route.route_name}</p>
                                                    <p className="text-[10px] opacity-60 font-medium">{route.description}</p>
                                                </div>
                                                {selectedRoute?.id === route.id && <CheckCircle2 size={16} className="text-blue-500" />}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Action Footer */}
                    <div className="pt-6">
                        {syncError && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm flex items-center gap-3"
                            >
                                <AlertTriangle size={18} />
                                <p className="font-bold">{syncError}</p>
                            </motion.div>
                        )}
                        <button
                            disabled={!selectedBus || !selectedRoute}
                            onClick={startTracking}
                            className={`w-full py-6 rounded-3xl font-bold flex items-center justify-center gap-3 transition-all shadow-2xl ${selectedBus && selectedRoute
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                                : 'bg-white/5 text-white/20 border border-white/10'
                                }`}
                        >
                            <Power size={24} />
                            <span className="text-lg">Initialize Trip</span>
                        </button>
                        {!selectedBus || !selectedRoute ? (
                            <p className="text-center text-[10px] text-slate-600 mt-4 uppercase tracking-widest font-bold">
                                {!selectedBus ? 'Select Bus' : !selectedRoute ? 'Complete Route Setup' : ''}
                            </p>
                        ) : null}
                    </div>
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                    {/* Active Trip Info */}
                    <div className="glass p-6 rounded-[2.5rem] border-blue-500/20 bg-blue-600/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Navigation size={80} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-600/20">
                                    <Navigation size={28} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-white">{selectedRoute?.route_name}</h4>
                                    <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">{selectedBus?.bus_number} Tracking</p>
                                </div>
                            </div>

                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 heartbeat shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Live GPS Feed</span>
                                </div>
                                <p className="text-xs text-emerald-500/60 font-mono font-bold">
                                    {lastPos ? `${lastPos.lat.toFixed(6)}, ${lastPos.lng.toFixed(6)}` : 'Sourcing...'}
                                </p>
                            </div>

                            {/* Auto-termination countdown */}
                            <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-2xl mb-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Auto-Terminate In</span>
                                    </div>
                                    <p className="text-lg font-mono font-bold text-orange-500">
                                        {Math.floor(remainingTime / 60000)}m
                                    </p>
                                </div>
                                <p className="text-[10px] text-orange-500/60 mt-2 font-medium">
                                    Trip will auto-terminate after 1h 40m to prevent battery drain
                                </p>
                            </div>

                            <button
                                onClick={stopTracking}
                                className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 font-bold py-5 rounded-2xl border border-red-500/10 transition-all flex items-center justify-center gap-2"
                            >
                                Terminate Active Session
                            </button>
                        </div>
                    </div>

                    {/* Broadcast Center */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <MessageSquare size={16} className="text-blue-500" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Operations Notice</h3>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {["10m Late", "Traffic Detour", "Bus Full", "Breakdown", "On Time"].map(msg => (
                                <button
                                    key={msg}
                                    onClick={() => broadcastNotice(msg)}
                                    className="flex-shrink-0 bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-xs font-bold hover:bg-blue-600 hover:border-blue-500 transition-all"
                                >
                                    {msg}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <textarea
                                placeholder="Enter custom broadcast message..."
                                value={noticeText}
                                onChange={(e) => setNoticeText(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-32 resize-none transition-all"
                            />
                            <button
                                onClick={() => broadcastNotice(noticeText)}
                                disabled={!noticeText || isBroadcasting}
                                className="absolute bottom-4 right-4 bg-white text-slate-900 px-6 py-2 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-black/20 transform active:scale-95 transition-all"
                            >
                                {isBroadcasting ? <Loader2 size={16} className="animate-spin" /> : 'Broadcast'}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => { stopTracking(); setSelectedRoute(null); }}
                        className="w-full py-2 text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em] hover:text-white transition-colors"
                    >
                        Reconfigure Hardware
                    </button>
                </motion.div>
            )}
        </div>
    );
}

function ActivityStatus({ isTracking }: { isTracking: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-emerald-500 heartbeat' : 'bg-slate-700'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isTracking ? 'text-emerald-500' : 'text-slate-500'}`}>
                {isTracking ? 'Broadcasting' : 'Standby'}
            </span>
        </div>
    );
}
