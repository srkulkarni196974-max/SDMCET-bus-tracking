'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, ScaleControl, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, BusLocation } from '@/lib/supabase';
import { useEffect, useState, useRef } from 'react';

// Fix Leaflet marker icon issue
const busIcon = new L.DivIcon({
    html: `<div class="relative w-12 h-12 flex items-center justify-center">
            <div class="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-25"></div>
            <div class="absolute inset-2 bg-indigo-500 rounded-full animate-pulse opacity-40"></div>
            <div class="absolute inset-3 bg-indigo-600 rounded-full border-4 border-white/95 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.7)] z-10 transition-transform duration-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="M6 19v2"/><path d="M18 21v-2"/></svg>
            </div>
          </div>`,
    className: 'custom-bus-icon',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
});

interface BusMapProps {
    activeBuses: (BusLocation & { buses: Bus })[];
}

function MapUpdater({ activeBuses }: BusMapProps) {
    const map = useMap();
    const lastPosRef = useRef<string>('');

    useEffect(() => {
        if (activeBuses.length > 0) {
            const firstBus = activeBuses[0];
            const currentPosKey = `${firstBus.latitude}-${firstBus.longitude}`;

            if (lastPosRef.current !== currentPosKey) {
                map.flyTo([firstBus.latitude, firstBus.longitude], map.getZoom(), {
                    animate: true,
                    duration: 2.0,
                    easeLinearity: 0.1
                });
                lastPosRef.current = currentPosKey;
            }
        }
    }, [activeBuses, map]);

    return null;
}

export default function BusMap({ activeBuses }: BusMapProps) {
    // Default center at SDMCET, Dharwad
    const defaultCenter: [number, number] = [15.4419, 74.9818];

    return (
        <div className="w-full h-full relative z-0 group">
            <MapContainer
                center={defaultCenter}
                zoom={14}
                className="w-full h-full"
                zoomControl={false}
                wheelDebounceTime={150}
            >
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Mapped Areas (Standard)">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM contributors</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            detectRetina={true}
                            maxZoom={19}
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.BaseLayer name="Street (Smooth Voyager)">
                        <TileLayer
                            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                            detectRetina={true}
                            maxZoom={20}
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.BaseLayer name="Satellite HD">
                        <TileLayer
                            attribution='Tiles &copy; Esri &mdash; HQ'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            maxZoom={19}
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                <ZoomControl position="bottomright" />
                <ScaleControl position="bottomleft" />

                {activeBuses.map((bus) => (
                    <Marker
                        key={bus.license_plate}
                        position={[bus.latitude, bus.longitude]}
                        icon={busIcon}
                    >
                        <Popup className="custom-popup rounded-2xl overflow-hidden border-0">
                            <div className="p-4 bg-white min-w-[180px]">
                                <div className="flex items-center gap-3 mb-3 border-b border-indigo-50 pb-2">
                                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></svg>
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-950 tracking-tight leading-none text-lg">{bus.buses?.bus_number}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Live Tracking</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-tighter text-slate-500">
                                        <span>STATUS</span>
                                        <span className="text-green-500 flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            Active
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-tighter text-slate-500">
                                        <span>REG NO</span>
                                        <span className="text-slate-950 font-mono">{bus.license_plate}</span>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                <MapUpdater activeBuses={activeBuses} />
            </MapContainer>

        </div>
    );
}
