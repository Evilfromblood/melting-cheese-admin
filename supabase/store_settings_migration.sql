-- ============================================================
-- Melting Cheese: store_settings Table, RLS & Realtime
-- ============================================================

-- 1. Create store_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS store_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_open BOOLEAN NOT NULL DEFAULT true,
    closed_message TEXT DEFAULT 'Kitchen is currently closed. Opens at 11:00 AM!',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure default row exists
INSERT INTO store_settings (id, is_open, closed_message)
VALUES (1, true, 'Kitchen is currently closed. Opens at 11:00 AM!')
ON CONFLICT (id) DO NOTHING;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Public can view store settings" ON store_settings;
CREATE POLICY "Public can view store settings"
    ON store_settings FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated admins can update store settings" ON store_settings;
CREATE POLICY "Authenticated admins can update store settings"
    ON store_settings FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Enable Supabase Realtime for store_settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'store_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE store_settings;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
