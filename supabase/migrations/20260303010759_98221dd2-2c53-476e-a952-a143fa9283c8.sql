-- Fix more books with edition years instead of original publication years
UPDATE books SET published_year = 2022 WHERE id = '8cd753c5-6bae-417d-9f68-93a75761f0e2'; -- The Hotel Nantucket (2022)
UPDATE books SET published_year = 2024 WHERE id = 'd89246ed-65fc-4e99-88bf-b59912ad1819'; -- The Favorites (2024)
UPDATE books SET published_year = 2022 WHERE id = '7e283178-7117-4d7a-9a96-2c89a46adbb7'; -- The Tenant (2022)
UPDATE books SET published_year = 2025 WHERE id = 'f2fe99c9-48df-4922-9847-d36d63767989'; -- Hot for Slayer (2025, new book)
UPDATE books SET published_year = 2022 WHERE id = 'f7417d08-a4b3-403b-aa68-c36c03f74864'; -- The Right Move (2022)

-- Fix remaining books with wrong years
UPDATE books SET published_year = 2017 WHERE id = '17e8a36a-e309-4612-b2a2-2cc6b9df9994'; -- If We Were Villains (2017 correct)
UPDATE books SET published_year = 2020 WHERE id = '68f49398-db30-4644-9183-0fed93085a46'; -- Crown of Midnight (actually 2013)

-- Crown of Midnight by Sarah J. Maas was 2013
UPDATE books SET published_year = 2013 WHERE id = '68f49398-db30-4644-9183-0fed93085a46';

-- Fix Elin Hilderbrand Natural Selection - not a well-known title, keep as is

-- Fix TBR: Dark Matter by Blake Crouch was 2016 not 2013
UPDATE tbr_books SET published_year = 2016 WHERE id = '8c5115cf-1283-47cf-82d0-7e4dbd7d0c12';