-- =============================================================
-- Migration: Enable PostgreSQL extensions
-- Date: 2026-03-29
-- Description: pg_trgm (fuzzy search), unaccent (Slovenian chars),
--              postgis (geolocation for service_areas)
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
