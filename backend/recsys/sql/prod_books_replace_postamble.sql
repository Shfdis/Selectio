-- Reset Books Id sequence after bulk insert (safe with TRUNCATE ... RESTART IDENTITY + new rows).
SELECT setval(
  pg_get_serial_sequence('crud."Books"', 'Id'),
  COALESCE((SELECT MAX("Id") FROM crud."Books"), 1),
  true
);

COMMIT;
