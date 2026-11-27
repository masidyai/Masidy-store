ALTER TABLE marketplace_orders
ADD COLUMN seller_rate_bps INTEGER NOT NULL DEFAULT 0
  CHECK (seller_rate_bps BETWEEN 0 AND 9999);

CREATE UNIQUE INDEX idx_marketplace_order_items_unique_listing
ON marketplace_order_items(seller_order_id, listing_id);
