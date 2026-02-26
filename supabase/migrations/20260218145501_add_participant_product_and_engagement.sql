/*
  # Add product, customer type, and session engagement fields

  ## Changes

  ### participants table
  - `product` (text, default ''): The Mitratech product the participant is using
  - `customer_type` (text, default 'new'): Whether they are a 'new' or 'established' customer

  ### session_participants table
  - `engagement` (text, nullable): Subjective engagement rating for the session — 'red', 'yellow', or 'green'

  ## Notes
  - Both new participant columns default to empty/new so existing rows are unaffected
  - engagement is nullable so existing session_participant rows stay valid
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'product'
  ) THEN
    ALTER TABLE participants ADD COLUMN product text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'customer_type'
  ) THEN
    ALTER TABLE participants ADD COLUMN customer_type text NOT NULL DEFAULT 'new';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_participants' AND column_name = 'engagement'
  ) THEN
    ALTER TABLE session_participants ADD COLUMN engagement text;
  END IF;
END $$;
