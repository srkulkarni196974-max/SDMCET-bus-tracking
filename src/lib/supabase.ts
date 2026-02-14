import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key').trim();

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('Supabase credentials are missing. Live features will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Bus = {
  id: string;
  bus_number: string;
  license_plate: string;
};

export type Route = {
  id: string;
  region: string;
  route_name: string;
  description: string;
};

export type BusLocation = {
  license_plate: string;
  route_id: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  updated_at: string;
};

export type Notice = {
  id: string;
  content: string;
  created_at: string;
};
