-- Phase 3: Access Control (on-chain grant tracking)
ALTER TABLE access_sessions ADD COLUMN IF NOT EXISTS on_chain_granted boolean DEFAULT false;
ALTER TABLE access_sessions ADD COLUMN IF NOT EXISTS grant_tx_hash text;
