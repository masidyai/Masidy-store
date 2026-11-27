ALTER TABLE seller_listings ADD COLUMN tax_code TEXT;

CREATE TABLE marketplace_payout_accounts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE,
  country TEXT,
  transfers_active INTEGER NOT NULL DEFAULT 0,
  payouts_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE marketplace_orders (
  id TEXT PRIMARY KEY,
  checkout_key TEXT NOT NULL UNIQUE,
  checkout_fingerprint TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  payment_intent_id TEXT UNIQUE,
  tax_calculation_id TEXT NOT NULL,
  transfer_group TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'partially_refunded', 'refunded')),
  subtotal_minor INTEGER NOT NULL CHECK (subtotal_minor >= 0),
  shipping_minor INTEGER NOT NULL CHECK (shipping_minor >= 0),
  tax_minor INTEGER NOT NULL CHECK (tax_minor >= 0),
  total_minor INTEGER NOT NULL CHECK (total_minor > 0),
  currency TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  referrer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reseller_rate_bps INTEGER,
  reseller_commission_minor INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE marketplace_seller_orders (
  id TEXT PRIMARY KEY,
  marketplace_order_id TEXT NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  seller_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'canceled', 'refunded')),
  subtotal_minor INTEGER NOT NULL CHECK (subtotal_minor >= 0),
  shipping_minor INTEGER NOT NULL CHECK (shipping_minor >= 0),
  commission_minor INTEGER NOT NULL CHECK (commission_minor >= 0),
  transfer_minor INTEGER NOT NULL CHECK (transfer_minor >= 0),
  currency TEXT NOT NULL,
  tracking_number TEXT,
  tracking_url TEXT,
  shipped_at TEXT,
  delivered_at TEXT,
  delivery_verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  transfer_status TEXT NOT NULL DEFAULT 'held'
    CHECK (transfer_status IN ('held', 'ready', 'transferred', 'reversed')),
  stripe_transfer_id TEXT UNIQUE,
  transfer_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (marketplace_order_id, seller_user_id)
);

CREATE TABLE marketplace_order_items (
  id TEXT PRIMARY KEY,
  seller_order_id TEXT NOT NULL REFERENCES marketplace_seller_orders(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES seller_listings(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor > 0),
  shipping_minor INTEGER NOT NULL CHECK (shipping_minor >= 0),
  tax_code TEXT NOT NULL
);

CREATE TABLE marketplace_referral_attributions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reseller_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rate_bps INTEGER NOT NULL CHECK (rate_bps BETWEEN 0 AND 10000),
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'held'
    CHECK (status IN ('held', 'ready', 'transferred', 'reversed', 'canceled')),
  available_at TEXT,
  stripe_transfer_id TEXT UNIQUE,
  transfer_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (order_id, reseller_user_id)
);

CREATE INDEX idx_marketplace_listings_public ON seller_listings(status, tax_code, created_at);
CREATE INDEX idx_marketplace_seller_orders_user ON marketplace_seller_orders(seller_user_id, status, created_at);
CREATE INDEX idx_marketplace_seller_orders_payout ON marketplace_seller_orders(transfer_status, delivered_at);
CREATE INDEX idx_marketplace_order_items_seller_order ON marketplace_order_items(seller_order_id);
CREATE INDEX idx_marketplace_referrals_status ON marketplace_referral_attributions(status, available_at);
CREATE INDEX idx_marketplace_orders_user ON marketplace_orders(user_id, created_at);

ALTER TABLE orders ADD COLUMN referrer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN reseller_rate_bps INTEGER;
ALTER TABLE orders ADD COLUMN reseller_commission_minor INTEGER NOT NULL DEFAULT 0;
