-- Step 1: Remove last 2 photos (avatar pair) from items with 4+ photos
UPDATE sync_data
SET items = (
  SELECT jsonb_agg(
    CASE
      WHEN jsonb_array_length(item->'photos') >= 4 THEN
        item || jsonb_build_object('photos',
          (SELECT jsonb_agg(p) FROM jsonb_array_elements(item->'photos') WITH ORDINALITY AS t(p, pos)
           WHERE pos <= jsonb_array_length(item->'photos') - 2)
        )
      ELSE item
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE user_key = 'salvago2001';

-- Step 2: Deduplicate consecutive pairs — keep only even-indexed photos (0, 2, 4...)
-- since odd-indexed photos are duplicates of their even predecessor
UPDATE sync_data
SET items = (
  SELECT jsonb_agg(
    item || jsonb_build_object('photos',
      (SELECT jsonb_agg(p) FROM jsonb_array_elements(item->'photos') WITH ORDINALITY AS t(p, pos)
       WHERE (pos - 1) % 2 = 0)  -- keep only even positions (1,3,5... 1-based = 0,2,4... 0-based)
    )
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE user_key = 'salvago2001';
