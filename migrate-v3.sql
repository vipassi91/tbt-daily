-- Player pages: run this ONCE in the D1 console if your database was created before player pages existed.
-- It adds the switch that lets a player hide their own page. (Without it everything still works; every page is shown,
-- and the "Sembunyikan halaman" button in the admin tells you the database needs this. The admin button
-- "Perbarui registry" runs the same statement for you.) If you get "duplicate column name: hidden", it is already done.
ALTER TABLE registry ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
