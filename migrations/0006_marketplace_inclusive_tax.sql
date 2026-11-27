ALTER TABLE marketplace_seller_orders
ADD COLUMN tax_calculation_id TEXT NOT NULL DEFAULT '';

ALTER TABLE marketplace_seller_orders
ADD COLUMN tax_minor INTEGER NOT NULL DEFAULT 0 CHECK (tax_minor >= 0);
