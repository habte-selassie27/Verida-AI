-- Phase 7: Revenue Tracking
CREATE TABLE IF NOT EXISTS on_chain_payments (
  id serial PRIMARY KEY,
  payer_address text NOT NULL,
  payee_address text NOT NULL,
  amount_octas bigint NOT NULL,
  fee_octas bigint NOT NULL,
  dataset_id integer,
  payment_type text NOT NULL,
  tx_hash text NOT NULL UNIQUE,
  timestamp timestamp with time zone NOT NULL,
  synced_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS on_chain_payments_payee_idx ON on_chain_payments (payee_address);
CREATE INDEX IF NOT EXISTS on_chain_payments_dataset_idx ON on_chain_payments (dataset_id);
CREATE INDEX IF NOT EXISTS on_chain_payments_timestamp_idx ON on_chain_payments (timestamp);
