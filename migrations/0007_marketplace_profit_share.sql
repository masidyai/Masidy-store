ALTER TABLE orders
ADD COLUMN printful_cost_minor INTEGER NOT NULL DEFAULT 0
  CHECK (printful_cost_minor >= 0);

ALTER TABLE orders
ADD COLUMN stripe_charge_id TEXT;

ALTER TABLE orders
ADD COLUMN stripe_fee_minor INTEGER NOT NULL DEFAULT 0
  CHECK (stripe_fee_minor >= 0);

ALTER TABLE orders
ADD COLUMN stripe_fee_currency TEXT;

ALTER TABLE orders
ADD COLUMN delivered_at TEXT;

ALTER TABLE orders
ADD COLUMN refunded_minor INTEGER NOT NULL DEFAULT 0
  CHECK (refunded_minor >= 0);

ALTER TABLE orders
ADD COLUMN dispute_status TEXT NOT NULL DEFAULT 'none'
  CHECK (dispute_status IN ('none', 'open', 'won', 'lost'));

ALTER TABLE orders
ADD COLUMN dispute_id TEXT;

ALTER TABLE marketplace_orders
ADD COLUMN stripe_charge_id TEXT;

ALTER TABLE marketplace_orders
ADD COLUMN stripe_fee_minor INTEGER NOT NULL DEFAULT 0
  CHECK (stripe_fee_minor >= 0);

ALTER TABLE marketplace_orders
ADD COLUMN stripe_fee_currency TEXT;

ALTER TABLE marketplace_orders
ADD COLUMN refunded_minor INTEGER NOT NULL DEFAULT 0
  CHECK (refunded_minor >= 0);

ALTER TABLE marketplace_orders
ADD COLUMN dispute_status TEXT NOT NULL DEFAULT 'none'
  CHECK (dispute_status IN ('none', 'open', 'won', 'lost'));

ALTER TABLE marketplace_orders
ADD COLUMN dispute_id TEXT;

ALTER TABLE marketplace_referral_attributions
ADD COLUMN profit_basis_minor INTEGER NOT NULL DEFAULT 0
  CHECK (profit_basis_minor >= 0);

CREATE TABLE marketplace_seller_referral_attributions (
  id TEXT PRIMARY KEY,
  marketplace_order_id TEXT NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  seller_order_id TEXT NOT NULL REFERENCES marketplace_seller_orders(id) ON DELETE CASCADE,
  reseller_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rate_bps INTEGER NOT NULL CHECK (rate_bps BETWEEN 0 AND 10000),
  profit_basis_minor INTEGER NOT NULL DEFAULT 0 CHECK (profit_basis_minor >= 0),
  amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (amount_minor >= 0),
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'held'
    CHECK (status IN ('held', 'ready', 'transferred', 'reversed', 'canceled')),
  available_at TEXT,
  stripe_transfer_id TEXT UNIQUE,
  transfer_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (seller_order_id, reseller_user_id)
);

CREATE INDEX idx_marketplace_seller_referrals_payout
ON marketplace_seller_referral_attributions(status, available_at);

UPDATE marketplace_commission_settings
SET reseller_rate_bps = COALESCE(reseller_rate_bps, 5000),
  seller_rate_bps = COALESCE(seller_rate_bps, 500),
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 1;
