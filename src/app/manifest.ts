import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'SDMCET Bus Tracking',
        short_name: 'SDMCET Bus',
        description: 'Live real-time college bus tracking system for SDMCET students and staff.',
        start_url: '/',
        display: 'standalone',
        background_color: '#020617',
        theme_color: '#2563eb',
        shortcuts: [
            {
                name: 'Driver Dashboard',
                url: '/driver',
                icons: [{ src: '/icon-192x192.png', sizes: '192x192' }]
            }
        ],
        icons: [
            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
