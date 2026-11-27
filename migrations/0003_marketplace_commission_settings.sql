CREATE TABLE marketplace_commission_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  reseller_rate_bps INTEGER CHECK (reseller_rate_bps BETWEEN 0 AND 10000),
  seller_rate_bps INTEGER CHECK (seller_rate_bps BETWEEN 0 AND 10000),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO marketplace_commission_settings (id, reseller_rate_bps, seller_rate_bps)
VALUES (1, NULL, NULL);
