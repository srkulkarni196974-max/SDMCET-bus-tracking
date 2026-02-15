-- Function to automatically terminate trips older than 1 hour 40 minutes
-- This provides server-side protection in case the client-side timer fails

CREATE OR REPLACE FUNCTION auto_terminate_old_trips()
RETURNS void AS $$
BEGIN
    -- Deactivate trips that have been active for more than 1 hour 40 minutes
    UPDATE bus_locations
    SET is_active = false
    WHERE is_active = true
    AND updated_at < NOW() - INTERVAL '1 hour 40 minutes';
    
    -- Delete corresponding trip paths for terminated trips
    DELETE FROM trip_paths
    WHERE license_plate IN (
        SELECT license_plate 
        FROM bus_locations 
        WHERE is_active = false
    );
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job using pg_cron extension
-- Note: This requires the pg_cron extension to be enabled in Supabase
-- You can also call this function periodically from your application

-- To enable pg_cron in Supabase:
-- 1. Go to Database > Extensions
-- 2. Enable "pg_cron"
-- 3. Run the following to schedule the function to run every 5 minutes:

-- SELECT cron.schedule(
--     'auto-terminate-trips',
--     '*/5 * * * *',
--     'SELECT auto_terminate_old_trips();'
-- );
