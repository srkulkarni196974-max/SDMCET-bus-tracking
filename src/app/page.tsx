'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase, BusLocation, Bus, TripPath } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import NoticeBar from '@/components/NoticeBar';

// Import Map dynamically to avoid SSR issues with Leaflet
const BusMap = dynamic(() => import('@/components/BusMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-950 animate-pulse flex items-center justify-center text-slate-500 font-medium">Initializing Map Engine...</div>
});

export default function Home() {
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [activeBuses, setActiveBuses] = useState<(BusLocation & { buses: Bus })[]>([]);
  const [tripPaths, setTripPaths] = useState<TripPath[]>([]);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  useEffect(() => {
    if (!selectedRoute) {
      setActiveBuses([]);
      setTripPaths([]);
      return;
    }

    // Initial fetch of active buses on selected route
    const fetchBuses = async () => {
      console.log('--- FETCHING ACTIVE BUSES ---');
      console.log('Route ID selected:', selectedRoute);

      const { data, error } = await supabase
        .from('bus_locations')
        .select('*, buses(*)')
        .eq('route_id', selectedRoute)
        .eq('is_active', true);

      if (error) {
        console.error('Supabase fetch error:', error);
      } else {
        console.log('Query result:', data);
        const buses = data as any || [];
        setActiveBuses(buses);

        if (buses.length > 0) {
          const plates = buses.map((b: any) => b.license_plate);
          const { data: pathData } = await supabase
            .from('trip_paths')
            .select('*')
            .in('license_plate', plates)
            .order('created_at', { ascending: true });

          if (pathData) setTripPaths(pathData);
        } else {
          setTripPaths([]);
        }
      }
    };

    fetchBuses();

    // Subscribe to location updates
    const channel = supabase
      .channel(`location-updates-${selectedRoute}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          table: 'bus_locations'
        },
        (payload: any) => {
          console.log('REALTIME PAYLOAD:', payload);
          fetchBuses();
        }
      )
      .subscribe((status) => {
        console.log('SUBSCRIPTION STATUS:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoute]);

  // Handle mobile sidebar behavior
  useEffect(() => {
    if (selectedRoute && typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarVisible(false);
    }
  }, [selectedRoute]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950">
      <NoticeBar />

      <Sidebar
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        selectedRoute={selectedRoute}
        setSelectedRoute={setSelectedRoute}
        activeBuses={activeBuses}
        isVisible={isSidebarVisible}
        setIsVisible={setIsSidebarVisible}
      />

      <div className={`transition-all duration-500 h-full ${isSidebarVisible ? 'md:ml-[400px] w-full md:w-[calc(100vw-400px)]' : 'ml-0 w-full'
        }`}>
        <BusMap activeBuses={activeBuses} tripPaths={tripPaths} />
      </div>

      {/* Floating Toggle Button for Mobile */}
      {!isSidebarVisible && (
        <button
          onClick={() => setIsSidebarVisible(true)}
          className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl shadow-blue-600/40 z-[1000] flex items-center gap-2 border border-blue-400/30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Select Route
        </button>
      )}
    </main>
  );
}
