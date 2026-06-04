-- Migración: moneda en subastas + pago en registro_subastas
-- Ejecutar en Supabase → SQL Editor

-- 1. Moneda de la subasta (ARS por defecto para registros existentes)
ALTER TABLE subastas
  ADD COLUMN IF NOT EXISTS moneda VARCHAR NOT NULL DEFAULT 'ARS';

ALTER TABLE subastas
  DROP CONSTRAINT IF EXISTS "chkMonedaSubasta";

ALTER TABLE subastas
  ADD CONSTRAINT "chkMonedaSubasta" CHECK (moneda IN ('ARS', 'USD'));

-- 2. Medio de pago y estado de pago en el registro de venta
ALTER TABLE registro_subastas
  ADD COLUMN IF NOT EXISTS medio_pago INTEGER REFERENCES medios_pago(identificador),
  ADD COLUMN IF NOT EXISTS pagado VARCHAR NOT NULL DEFAULT 'no';

ALTER TABLE registro_subastas
  DROP CONSTRAINT IF EXISTS "chkPagado";

ALTER TABLE registro_subastas
  ADD CONSTRAINT "chkPagado" CHECK (pagado IN ('si', 'no'));
