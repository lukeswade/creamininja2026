-- Demo seed data for CreamiNinja (safe to re-run)
-- Password for all demo accounts: CreamiNinja123!

PRAGMA foreign_keys = ON;

-- Clean previous demo data (order matters because of FK constraints)
DELETE FROM stars WHERE user_id LIKE 'usr_demo_%';
DELETE FROM recipe_shares WHERE shared_with_user_id LIKE 'usr_demo_%' OR shared_by_user_id LIKE 'usr_demo_%';
DELETE FROM friendships WHERE user_id LIKE 'usr_demo_%' OR friend_id LIKE 'usr_demo_%';
DELETE FROM friend_requests WHERE from_user_id LIKE 'usr_demo_%' OR to_user_id LIKE 'usr_demo_%';
DELETE FROM sessions WHERE user_id LIKE 'usr_demo_%';
DELETE FROM recipes WHERE author_id LIKE 'usr_demo_%';
DELETE FROM users WHERE id LIKE 'usr_demo_%';

-- Demo users
INSERT INTO users (id, email, password_hash, display_name, handle, avatar_key) VALUES
  ('usr_demo_luke',  'luke@creamininja.com',  'pbkdf2_sha256$150000$H92vie-AduESYqG84v_MLQ$CsKx4xanMm1ENO7z2UKhfNiLIlAEhXioV7Uguu2wNno',  'Luke',  'luke',  NULL),
  ('usr_demo_zoe',   'zoe@creamininja.com',   'pbkdf2_sha256$150000$ZBalWtbbRIu8Ty6iswsuRw$y_yJnVfxXn9x4TgiEk0wOYc1i_WaZ__DW_NX1P6YVnY',   'Zoe',   'zoe',   NULL),
  ('usr_demo_kenji', 'kenji@creamininja.com', 'pbkdf2_sha256$150000$81p5dWzMvqQozSjzPcoDVQ$u5trYVEG6rfDPCbVe3EBypwlPT2GO1HZ7ImA5S8h2Vc', 'Kenji', 'kenji', NULL),
  ('usr_demo_ava',   'ava@creamininja.com',   'pbkdf2_sha256$150000$dQtWZIzS66AHDAuGGtjOzA$8PYBCr4Eom42b9kFj8Huepag_Hy_pmLTDzXT-GYdUTs',   'Ava',   'ava',   NULL);

-- Friend graph (mutual rows)
INSERT INTO friendships (user_id, friend_id) VALUES
  ('usr_demo_luke','usr_demo_zoe'),
  ('usr_demo_zoe','usr_demo_luke'),
  ('usr_demo_luke','usr_demo_kenji'),
  ('usr_demo_kenji','usr_demo_luke');

-- A pending request (Ava -> Zoe)
INSERT INTO friend_requests (id, from_user_id, to_user_id, status) VALUES
  ('frq_demo_ava_zoe', 'usr_demo_ava', 'usr_demo_zoe', 'pending');

-- Demo recipes (ingredients_json + steps_json are JSON arrays)
INSERT INTO recipes
  (id, author_id, title, description, category, visibility, ingredients_json, steps_json, image_key, stars_count)
VALUES
  ('rcp_demo_snickerdoodle', 'usr_demo_luke',
   'Snickerdoodle Protein Ice Cream',
   'Cinnamon-forward, high-protein base with a soft-cookie vibe after a respin.',
   'Ice Cream', 'public',
   '["1 cup Fairlife milk (or whole milk)","1 scoop vanilla whey protein","1 tbsp sugar-free vanilla pudding mix","1 tsp cinnamon","Pinch of salt","Optional: 1 tsp brown sugar or sweetener"]',
   '["Blend all ingredients until fully smooth.","Pour into a Ninja CREAMi pint. Freeze 24 hours.","Spin on Lite Ice Cream.","Respin with 1–2 tbsp milk if crumbly.","Optional: Add crushed cookies and use Mix-In."]',
   NULL, 5),

  ('rcp_demo_mango_lassi', 'usr_demo_zoe',
   'Mango Lassi Sorbet',
   'Bright mango + tangy yogurt for a sorbet that reads like a lassi.',
   'Sorbet', 'restricted',
   '["1 cup mango chunks (fresh or frozen)","1/2 cup plain Greek yogurt","1/4 cup milk","1 tbsp honey (or to taste)","Squeeze of lime","Pinch of salt"]',
   '["Blend until very smooth.","Freeze 24 hours.","Spin on Sorbet.","Respin if needed.","Top with tajín or mint."]',
   NULL, 2),

  ('rcp_demo_affogato', 'usr_demo_kenji',
   'Midnight Affogato Gelato',
   'Dark chocolate gelato built for espresso pours. Not too sweet.',
   'Gelato', 'public',
   '["1 cup whole milk","1/2 cup heavy cream","2 tbsp cocoa powder","2 tbsp sugar","1 tsp vanilla","Pinch of salt"]',
   '["Whisk cocoa + sugar with a splash of milk into a paste.","Add remaining milk/cream, vanilla, salt; whisk smooth.","Freeze 24 hours.","Spin on Gelato.","Serve with espresso poured over."]',
   NULL, 7),

  ('rcp_demo_bourbon_maple', 'usr_demo_kenji',
   'Bourbon Maple “Creamy”',
   'Adult-friendly: subtle bourbon aroma with maple depth.',
   'Adult', 'private',
   '["1 cup half-and-half","2 tbsp maple syrup","1 tbsp sugar","1–2 tbsp bourbon","Pinch of salt"]',
   '["Stir until sugar dissolves.","Freeze 24 hours.","Spin on Ice Cream.","Respin with 1 tbsp half-and-half.","Optional: Mix-In toasted pecans."]',
   NULL, 0),

  ('rcp_demo_blueberry_slush', 'usr_demo_ava',
   'Blueberry Lemon Slushie',
   'Fast, bright, and kid-friendly. Works great with frozen berries.',
   'Slushie', 'public',
   '["1.5 cups blueberries (frozen)","1/3 cup lemon juice","1/2 cup water","2–3 tbsp sugar (or to taste)","Pinch of salt"]',
   '["Blend until uniform.","Freeze 24 hours.","Spin on Slushie.","Respin once if needed.","Serve immediately."]',
   NULL, 1);

-- Explicit share: Kenji shares the private bourbon recipe with Luke
INSERT INTO recipe_shares (id, recipe_id, shared_with_user_id, shared_by_user_id) VALUES
  ('shr_demo_bourbon_to_luke', 'rcp_demo_bourbon_maple', 'usr_demo_luke', 'usr_demo_kenji');

-- Stars (and fix cached stars_count to match)
INSERT INTO stars (user_id, recipe_id) VALUES
  ('usr_demo_zoe', 'rcp_demo_snickerdoodle'),
  ('usr_demo_kenji', 'rcp_demo_snickerdoodle'),
  ('usr_demo_ava', 'rcp_demo_snickerdoodle'),
  ('usr_demo_luke', 'rcp_demo_affogato'),
  ('usr_demo_zoe', 'rcp_demo_affogato'),
  ('usr_demo_luke', 'rcp_demo_mango_lassi'),
  ('usr_demo_kenji', 'rcp_demo_mango_lassi'),
  ('usr_demo_luke', 'rcp_demo_blueberry_slush');

UPDATE recipes SET stars_count = (
  SELECT COUNT(*) FROM stars s WHERE s.recipe_id = recipes.id
) WHERE id LIKE 'rcp_demo_%';
