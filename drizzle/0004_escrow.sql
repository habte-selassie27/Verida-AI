-- Phase 4: Escrow
CREATE TABLE IF NOT EXISTS escrow_entries (
  id serial PRIMARY KEY,
  on_chain_escrow_id bigint,
  buyer_address text NOT NULL,
  publisher_address text NOT NULL,
  dataset_id integer REFERENCES datasets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  amount_octas bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  dispute_reason text
);

CREATE INDEX IF NOT EXISTS escrow_buyer_address_idx ON escrow_entries (buyer_address);
CREATE INDEX IF NOT EXISTS escrow_dataset_id_idx ON escrow_entries (dataset_id);
CREATE INDEX IF NOT EXISTS escrow_status_idx ON escrow_entries (status);
