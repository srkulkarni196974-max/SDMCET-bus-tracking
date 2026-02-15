'use client';

import { useState, useEffect } from 'react';
import { supabase, Route, BusLocation, Bus } from '@/lib/supabase';
import { MapPin, Bus as BusIcon, ChevronRight, Search, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
    selectedRegion: string;
    setSelectedRegion: (region: string) => void;
    selectedRoute: string;
    setSelectedRoute: (id: string) => void;
    activeBuses: (BusLocation & { buses: Bus })[];
    isVisible: boolean;
    setIsVisible: (visible: boolean) => void;
}

export default function Sidebar({
    selectedRegion,
    setSelectedRegion,
    selectedRoute,
    setSelectedRoute,
    activeBuses,
    isVisible,
    setIsVisible
}: SidebarProps) {
    const [regions, setRegions] = useState<string[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const { data: routesData } = await supabase.from('routes').select('*');
            if (routesData) {
                setRoutes(routesData);
                const uniqueRegions = Array.from(new Set(routesData.map(r => r.region)));
                setRegions(uniqueRegions);
            }
        };
        fetchData();
    }, []);

    const filteredRoutes = routes.filter(r =>
        r.region === selectedRegion &&
        (r.route_name.toLowerCase().includes(search.toLowerCase()) ||
            r.description?.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <motion.div
            initial={false}
            animate={{ x: isVisible ? 0 : -410 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="fixed top-0 left-0 w-full md:w-[400px] h-full glass border-r border-white/10 z-[500] flex flex-col shadow-2xl"
        >
            <div className="p-8 relative">
                <button
                    onClick={() => setIsVisible(false)}
                    className="md:hidden absolute right-6 top-9 p-2 bg-white/5 rounded-xl text-slate-400"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                </button>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    SDMCET <br /> <span className="text-blue-500">Bus Tracker</span>
                </h1>
                <p className="text-slate-400 mt-2 text-sm">Real-time GPS Monitoring System</p>
            </div>

            <div className="px-8 space-y-4">
                <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
                    {regions.map(region => (
                        <button
                            key={region}
                            onClick={() => {
                                setSelectedRegion(region);
                                setSelectedRoute('');
                            }}
                            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${selectedRegion === region
                                ? 'bg-blue-600 text-black shadow-lg shadow-blue-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {region}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search route or area..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-black placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 custom-scrollbar">
                {!selectedRegion ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                        <div className="bg-slate-800 p-4 rounded-full">
                            <MapPin size={32} />
                        </div>
                        <p className="text-slate-400">Select a region to view available routes</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Available Routes</h3>
                        {filteredRoutes.map(route => (
                            <button
                                key={route.id}
                                onClick={() => setSelectedRoute(route.id)}
                                className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedRoute === route.id
                                    ? 'bg-blue-600/10 border-blue-500/50'
                                    : 'bg-white/5 border-white/5 hover:border-white/10'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-white">{route.route_name}</h4>
                                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{route.description}</p>
                                    </div>
                                    <ChevronRight size={18} className={selectedRoute === route.id ? 'text-blue-500' : 'text-slate-600'} />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <AnimatePresence>
                    {selectedRoute && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3 pt-4"
                        >
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Active Buses</h3>
                            {activeBuses.length === 0 ? (
                                <p className="text-sm text-slate-500 pl-2 italic">No buses currently active on this route.</p>
                            ) : (
                                activeBuses.map(bus => (
                                    <div key={bus.license_plate} className="glass-card p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-blue-600/20 p-2 rounded-xl">
                                                    <BusIcon size={20} className="text-blue-500" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400">Bus Number</p>
                                                    <p className="font-bold text-white text-lg">{bus.buses?.bus_number || 'Unknown'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1.5 justify-end mb-1">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 heartbeat" />
                                                    <span className="text-[10px] font-bold text-emerald-500 uppercase">Live</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-mono tracking-tighter">{bus.license_plate}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Activity size={12} />
                                                <span className="text-[10px] uppercase font-bold tracking-widest">Active Connection</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-medium">
                                                Synced {new Date(bus.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
