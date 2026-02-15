# Auto-Termination Feature

## Overview
The bus tracking system now includes automatic trip termination after **1 hour 40 minutes** to prevent battery drain and ensure trips don't remain active indefinitely if the driver forgets to manually terminate.

## Implementation

### Client-Side (Driver Dashboard)
Located in `src/app/driver/page.tsx`:

1. **Automatic Timer**: When a trip starts, a 1h 40m (6,000,000ms) timer begins
2. **Countdown Display**: Shows remaining time in minutes with an orange warning indicator
3. **Auto-Cleanup**: When time expires:
   - GPS tracking stops
   - Wake lock is released
   - Bus location is marked as inactive
   - Trip path data is deleted

### Server-Side (Database Function)
Located in `auto_terminate_trips.sql`:

- SQL function `auto_terminate_old_trips()` that can be scheduled to run periodically
- Provides backup protection if client-side termination fails
- Can be scheduled using pg_cron extension in Supabase

## User Experience

### Driver View
When tracking is active, the driver sees:
- **Live GPS Feed**: Current coordinates
- **Auto-Terminate Countdown**: Orange box showing remaining minutes
- **Warning Message**: "Trip will auto-terminate after 1h 40m to prevent battery drain"

### What Happens at Auto-Termination
1. Trip automatically stops
2. GPS tracking ceases
3. Screen wake lock releases
4. Bus disappears from live map
5. Trip path is cleared from database
6. Driver can start a new trip

## Setup Instructions

### Client-Side (Already Active)
✅ No action needed - automatically works when driver starts tracking

### Server-Side (Optional but Recommended)
Run the SQL in `auto_terminate_trips.sql` in your Supabase SQL Editor:

1. **Create the function**:
   ```sql
   -- Copy and run the CREATE FUNCTION statement
   ```

2. **Enable pg_cron** (optional, for automatic scheduling):
   - Go to Supabase Dashboard → Database → Extensions
   - Enable "pg_cron"
   - Schedule the function to run every 5 minutes:
     ```sql
     SELECT cron.schedule(
         'auto-terminate-trips',
         '*/5 * * * *',
         'SELECT auto_terminate_old_trips();'
     );
     ```

## Benefits

1. **Battery Preservation**: Prevents GPS from running indefinitely
2. **Data Accuracy**: Ensures old/stale trips don't show on the map
3. **Automatic Cleanup**: Removes trip paths for terminated trips
4. **Fail-Safe**: Works even if driver closes browser without terminating
5. **User-Friendly**: Clear countdown keeps driver informed

## Technical Details

- **Duration**: 1 hour 40 minutes (100 minutes / 6,000,000 milliseconds)
- **Update Frequency**: Countdown updates every 60 seconds
- **Cleanup**: Both `bus_locations` and `trip_paths` tables are cleaned
- **Fallback**: Server-side function provides additional safety net
