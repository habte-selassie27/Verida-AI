-- Migration: P0.8 Migrate integer columns to bigint
-- This prevents overflow for large file sizes, prices, and earnings

-- Publishers: total_earnings can exceed 2^31 for successful publishers
ALTER TABLE publishers ALTER COLUMN total_earnings TYPE bigint USING total_earnings::bigint;

-- Datasets: size_bytes can exceed 2^31 for files > 2GB (10GB max upload)
ALTER TABLE datasets ALTER COLUMN size_bytes TYPE bigint USING size_bytes::bigint;

-- Datasets: price_per_access in octas can exceed 2^31 for high-value datasets
ALTER TABLE datasets ALTER COLUMN price_per_access TYPE bigint USING price_per_access::bigint;

-- Dataset versions: size_bytes mirrors datasets
ALTER TABLE dataset_versions ALTER COLUMN size_bytes TYPE bigint USING size_bytes::bigint;

-- Access sessions: bytes_consumed can exceed 2^31 for popular datasets
ALTER TABLE access_sessions ALTER COLUMN bytes_consumed TYPE bigint USING bytes_consumed::bigint;
