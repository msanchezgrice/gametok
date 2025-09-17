#!/bin/bash

# Script to manually trigger likability computation
# Run this periodically or set up as a cron job on your server

SUPABASE_URL="https://zpthvazjsiagqadifzmh.supabase.co"
SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"  # Replace with your actual service role key

echo "Triggering likability computation..."

curl -X POST "$SUPABASE_URL/functions/v1/compute-likability" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

echo "Done!"