-- Phase 2: Dataset Ownership
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS on_chain_dataset_id bigint;
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS on_chain_owner_verified boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS datasets_on_chain_dataset_id_idx ON datasets (on_chain_dataset_id);
