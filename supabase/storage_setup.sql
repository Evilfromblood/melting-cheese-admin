-- ============================================================
-- Supabase Storage Setup for Melting Cheese: menu-images bucket
-- ============================================================

-- 1. Create public bucket 'menu-images' if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'menu-images',
    'menu-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- 2. Storage Policies for 'menu-images'
-- Public read access so customer storefront and admin can view food pictures
DROP POLICY IF EXISTS "Public can view menu images" ON storage.objects;
CREATE POLICY "Public can view menu images"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'menu-images');

-- Authenticated staff upload policy
DROP POLICY IF EXISTS "Authenticated staff can upload menu images" ON storage.objects;
CREATE POLICY "Authenticated staff can upload menu images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'menu-images');

-- Authenticated staff update/overwrite policy
DROP POLICY IF EXISTS "Authenticated staff can update menu images" ON storage.objects;
CREATE POLICY "Authenticated staff can update menu images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'menu-images');

-- Authenticated staff delete policy
DROP POLICY IF EXISTS "Authenticated staff can delete menu images" ON storage.objects;
CREATE POLICY "Authenticated staff can delete menu images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'menu-images');
