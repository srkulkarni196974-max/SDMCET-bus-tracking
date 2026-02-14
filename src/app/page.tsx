'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase, BusLocation, Bus } from '@/lib/supabase';
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

  useEffect(() => {
    if (!selectedRoute) {
      setActiveBuses([]);
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
        setActiveBuses(data as any || []);
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

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950">
      <NoticeBar />

      <Sidebar
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        selectedRoute={selectedRoute}
        setSelectedRoute={setSelectedRoute}
        activeBuses={activeBuses}
      />

      <div className="ml-[400px] h-full w-[calc(100vw-400px)]">
        <BusMap activeBuses={activeBuses} />
      </div>

      {/* Floating UI Elements over map */}
      <div className="absolute top-8 right-8 z-[500] flex flex-col items-end gap-2">
        <div className="glass px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-white/10">
          SDMCET Campus Map
        </div>
      </div>
    </main>
  );
}
