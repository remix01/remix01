#!/bin/bash

# Sync Prisma schema with Supabase database
echo "Syncing database schema with Supabase..."
npx prisma db push

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

echo "Database sync complete!"
