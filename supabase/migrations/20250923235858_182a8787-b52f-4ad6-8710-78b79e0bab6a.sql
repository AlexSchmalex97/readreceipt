-- Create a function to calculate zodiac sign from birthday
CREATE OR REPLACE FUNCTION public.get_zodiac_sign(birth_date DATE)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE
    WHEN birth_date IS NULL THEN NULL
    WHEN (EXTRACT(MONTH FROM birth_date) = 3 AND EXTRACT(DAY FROM birth_date) >= 21) OR 
         (EXTRACT(MONTH FROM birth_date) = 4 AND EXTRACT(DAY FROM birth_date) <= 19) THEN 'Aries'
    WHEN (EXTRACT(MONTH FROM birth_date) = 4 AND EXTRACT(DAY FROM birth_date) >= 20) OR 
         (EXTRACT(MONTH FROM birth_date) = 5 AND EXTRACT(DAY FROM birth_date) <= 20) THEN 'Taurus'
    WHEN (EXTRACT(MONTH FROM birth_date) = 5 AND EXTRACT(DAY FROM birth_date) >= 21) OR 
         (EXTRACT(MONTH FROM birth_date) = 6 AND EXTRACT(DAY FROM birth_date) <= 20) THEN 'Gemini'
    WHEN (EXTRACT(MONTH FROM birth_date) = 6 AND EXTRACT(DAY FROM birth_date) >= 21) OR 
         (EXTRACT(MONTH FROM birth_date) = 7 AND EXTRACT(DAY FROM birth_date) <= 22) THEN 'Cancer'
    WHEN (EXTRACT(MONTH FROM birth_date) = 7 AND EXTRACT(DAY FROM birth_date) >= 23) OR 
         (EXTRACT(MONTH FROM birth_date) = 8 AND EXTRACT(DAY FROM birth_date) <= 22) THEN 'Leo'
    WHEN (EXTRACT(MONTH FROM birth_date) = 8 AND EXTRACT(DAY FROM birth_date) >= 23) OR 
         (EXTRACT(MONTH FROM birth_date) = 9 AND EXTRACT(DAY FROM birth_date) <= 22) THEN 'Virgo'
    WHEN (EXTRACT(MONTH FROM birth_date) = 9 AND EXTRACT(DAY FROM birth_date) >= 23) OR 
         (EXTRACT(MONTH FROM birth_date) = 10 AND EXTRACT(DAY FROM birth_date) <= 22) THEN 'Libra'
    WHEN (EXTRACT(MONTH FROM birth_date) = 10 AND EXTRACT(DAY FROM birth_date) >= 23) OR 
         (EXTRACT(MONTH FROM birth_date) = 11 AND EXTRACT(DAY FROM birth_date) <= 21) THEN 'Scorpio'
    WHEN (EXTRACT(MONTH FROM birth_date) = 11 AND EXTRACT(DAY FROM birth_date) >= 22) OR 
         (EXTRACT(MONTH FROM birth_date) = 12 AND EXTRACT(DAY FROM birth_date) <= 21) THEN 'Sagittarius'
    WHEN (EXTRACT(MONTH FROM birth_date) = 12 AND EXTRACT(DAY FROM birth_date) >= 22) OR 
         (EXTRACT(MONTH FROM birth_date) = 1 AND EXTRACT(DAY FROM birth_date) <= 19) THEN 'Capricorn'
    WHEN (EXTRACT(MONTH FROM birth_date) = 1 AND EXTRACT(DAY FROM birth_date) >= 20) OR 
         (EXTRACT(MONTH FROM birth_date) = 2 AND EXTRACT(DAY FROM birth_date) <= 18) THEN 'Aquarius'
    WHEN (EXTRACT(MONTH FROM birth_date) = 2 AND EXTRACT(DAY FROM birth_date) >= 19) OR 
         (EXTRACT(MONTH FROM birth_date) = 3 AND EXTRACT(DAY FROM birth_date) <= 20) THEN 'Pisces'
    ELSE 'Unknown'
  END;
$$;