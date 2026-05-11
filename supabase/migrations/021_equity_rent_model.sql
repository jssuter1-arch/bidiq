-- Switch equity_analyses to support the income capitalization model.
-- purchase_price is not used in the rent-based formula; make it optional.
ALTER TABLE equity_analyses ALTER COLUMN purchase_price DROP NOT NULL;
ALTER TABLE equity_analyses ALTER COLUMN purchase_price SET DEFAULT 0;
