'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, BusLocation } from '@/lib/supabase';
import { useEffect, useState } from 'react';

// Fix Leaflet marker icon issue
const busIcon = new L.DivIcon({
    html: `<div class="relative w-8 h-8">
            <div class="absolute inset-0 bg-blue-600 rounded-full animate-ping opacity-25"></div>
            <div class="absolute inset-1 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg shadow-blue-500/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="M6 19v2"/><path d="M18 21v-2"/></svg>
            </div>
         </div>`,
    className: 'custom-bus-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

interface BusMapProps {
    activeBuses: (BusLocation & { buses: Bus })[];
}

function MapUpdater({ activeBuses }: BusMapProps) {
    const map = useMap();

    useEffect(() => {
        if (activeBuses.length > 0) {
            const firstBus = activeBuses[0];
            map.setView([firstBus.latitude, firstBus.longitude], map.getZoom());
        }
    }, [activeBuses, map]);

    return null;
}

export default function BusMap({ activeBuses }: BusMapProps) {
    const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
    // Default center at SDMCET, Dharwad
    const defaultCenter: [number, number] = [15.4419, 74.9818];

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer
                center={defaultCenter}
                zoom={15}
                className="w-full h-full"
                zoomControl={false}
            >
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Street View">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                            eventHandlers={{
                                add: () => setMapMode('street'),
                            }}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satellite View">
                        <TileLayer
                            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            eventHandlers={{
                                add: () => setMapMode('satellite'),
                            }}
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                {activeBuses.map((bus) => (
                    <Marker
                        key={bus.license_plate}
                        position={[bus.latitude, bus.longitude]}
                        icon={busIcon}
                    >
                        <Popup className="custom-popup">
                            <div className="p-2">
                                <p className="font-bold text-slate-900">{bus.buses?.bus_number || 'Bus'}</p>
                                <p className="text-xs text-slate-600">{bus.license_plate}</p>
                                <div className="mt-2 text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded uppercase">
                                    Live Tracking Active
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
