-- Phase 5: Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id serial PRIMARY KEY,
  subscriber_address text NOT NULL,
  dataset_id integer REFERENCES datasets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tier text NOT NULL,
  started_at timestamp with time zone NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  active boolean NOT NULL DEFAULT true,
  payments_made integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_subscriber_idx ON subscriptions (subscriber_address);
CREATE INDEX IF NOT EXISTS subscriptions_dataset_idx ON subscriptions (dataset_id);
CREATE INDEX IF NOT EXISTS subscriptions_active_idx ON subscriptions (active, expires_at);
