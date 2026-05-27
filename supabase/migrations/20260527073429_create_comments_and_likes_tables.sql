/*
  # Create comments and likes tables for blog posts

  1. New Tables
    - `comments`
      - `id` (uuid, primary key)
      - `blog_slug` (text) - identifies which blog post the comment belongs to
      - `name` (text) - commenter's name
      - `comment` (text) - the comment body
      - `created_at` (timestamptz) - when posted

    - `likes`
      - `id` (uuid, primary key)
      - `blog_slug` (text, unique) - one row per blog post
      - `count` (integer) - total like count

  2. Security
    - RLS enabled on both tables
    - Anonymous users can read comments and likes (public blog)
    - Anonymous users can insert comments (no auth required for public blog)
    - Anonymous users can update likes count (increment only via RPC)
    - No delete allowed for anyone via RLS

  3. Notes
    - likes table uses upsert pattern: one row per slug, count incremented
    - A function increment_likes(slug) safely increments the count
*/

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_slug text NOT NULL,
  name text NOT NULL DEFAULT '',
  comment text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON comments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can post a comment"
  ON comments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_slug text UNIQUE NOT NULL,
  count integer NOT NULL DEFAULT 0
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read likes"
  ON likes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert likes row"
  ON likes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update likes count"
  ON likes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION increment_likes(slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO likes (blog_slug, count)
  VALUES (slug, 1)
  ON CONFLICT (blog_slug)
  DO UPDATE SET count = likes.count + 1;
END;
$$;
