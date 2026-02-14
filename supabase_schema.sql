-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE buses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_number TEXT NOT NULL,
    license_plate TEXT UNIQUE NOT NULL
);

CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region TEXT NOT NULL,
    route_name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE bus_locations (
    license_plate TEXT PRIMARY KEY REFERENCES buses(license_plate),
    route_id UUID REFERENCES routes(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    is_active BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE bus_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE notices;

-- RLS Policies (Allow public access for this MVP/Hobby project)
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON buses FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON routes FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON bus_locations FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON notices FOR SELECT USING (true);

CREATE POLICY "Allow public update" ON bus_locations FOR ALL USING (true);
CREATE POLICY "Allow public insert" ON notices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON bus_locations FOR INSERT WITH CHECK (true);

-- Seed some initial data
INSERT INTO routes (region, route_name, description) VALUES
('Hubballi', 'Vidyanagar-Chetana', 'Covers Vidyanagar and Chetana Colony'),
('Dharwad', 'Saptapur-Nuggikeri', 'Covers Saptapur and Nuggikeri Lake'),
('Dharwad', 'SDMCET-Local', 'Internal campus loop');

INSERT INTO buses (bus_number, license_plate) VALUES
('Bus 01', 'KA25F1234'),
('Bus 05', 'KA25F5678'),
('Bus 12', 'KA25F9012');
