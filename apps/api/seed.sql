INSERT INTO users (id, email, password_hash, display_name, handle, created_at, updated_at) VALUES 
('ninja_master_1', 'master@creamininja.com', 'dummy_hash', 'Sensei Freeze', 'sensei_freeze', datetime('now'), datetime('now')),
('creami_queen_2', 'queen@creamininja.com', 'dummy_hash', 'Creami Queen', 'creami_queen', datetime('now'), datetime('now')),
('protein_bro_3', 'bro@creamininja.com', 'dummy_hash', 'Protein Bro', 'protein_bro', datetime('now'), datetime('now'));

INSERT INTO recipes (id, author_id, title, description, category, visibility, ingredients_json, steps_json, stars_count, created_at, updated_at) VALUES 
('rec_seed_1', 'ninja_master_1', 'Classic Vanilla Bean Gelato', 'The quintessential, creamy vanilla gelato using real vanilla beans. Perfect macro balance!', 'Gelato', 'public', 
 '["2 cups whole milk", "1/2 cup heavy cream", "1 tbsp vanilla bean paste", "1/4 cup sugar", "1/2 tsp guar gum"]', 
 '["Whisk all ingredients until sugar dissolves.", "Pour into CREAMi pint and freeze upright for 24 hours.", "Install pint and spin on GELATO.", "Serve immediately or freeze for later."]', 
 42, datetime('now'), datetime('now')),

('rec_seed_2', 'protein_bro_3', 'Anabolic Peanut Butter Cup', 'Insane 50g protein peanut butter cup ice cream! Cals: 320 | P: 50g | C: 12g | F: 8g', 'Protein Ice Cream', 'public', 
 '["1 bottle Fairlife Chocolate Protein Shake", "2 tbsp PBFit powder", "1 tbsp sugar-free chocolate pudding mix", "1 mini Reese''s cup (mix-in)"]', 
 '["Mix Fairlife, PBFit, and pudding mix until smooth.", "Freeze for 24 hours.", "Spin on LITE ICE CREAM.", "Make a well in the center, add Reese''s cup, and spin on MIX-IN."]', 
 135, datetime('now', '-1 day'), datetime('now', '-1 day')),

('rec_seed_3', 'creami_queen_2', 'Tropical Dragonfruit Sorbet', 'Refreshing, vibrant, and dairy-free! Only 3 ingredients.', 'Sorbet', 'public', 
 '["1 cup frozen dragonfruit cubes", "1/2 cup pineapple juice", "1 tbsp agave nectar"]', 
 '["Blend ingredients until mostly smooth (or just pack tightly into pint).", "Freeze for 24 hours.", "Spin on SORBET setting.", "Re-spin if crumbly with a splash of extra juice."]', 
 89, datetime('now', '-2 days'), datetime('now', '-2 days'));
