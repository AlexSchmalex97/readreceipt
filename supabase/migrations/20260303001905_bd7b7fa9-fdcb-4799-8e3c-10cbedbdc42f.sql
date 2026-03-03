-- Fix books table: set original publication years instead of edition years
UPDATE books SET published_year = 1818 WHERE id = 'd1517c67-a6b9-4d6b-bbe6-029336ee4f3e'; -- Frankenstein
UPDATE books SET published_year = 1813 WHERE id = '419fdc54-0cef-48bd-a95d-34e885801fdb'; -- Pride and Prejudice
UPDATE books SET published_year = 2021 WHERE id = '83596674-fef0-4249-bf7a-aaa4b657f20b'; -- Project Hail Mary
UPDATE books SET published_year = 2021 WHERE id = '45a0c769-7702-482e-afc1-d9ebecf4b99c'; -- Project Hail Mary
UPDATE books SET published_year = 1872 WHERE id = '0f2adfb9-b98b-4e51-82fa-956a53118376'; -- Carmilla
UPDATE books SET published_year = 1764 WHERE id = '7fbf1cb1-5f26-4b46-b938-b5c1532d5a15'; -- Castle of Otranto
UPDATE books SET published_year = 1885 WHERE id = '65ae057a-9266-4cc4-b323-92984b7994a3'; -- Olalla
UPDATE books SET published_year = 1819 WHERE id = 'd5a59798-31f5-453d-9648-9f439779f09e'; -- The Vampyre
UPDATE books SET published_year = 1892 WHERE id = '42f32840-0a62-417c-a6cd-b3a954ed123d'; -- The Yellow Wall-Paper
UPDATE books SET published_year = 1843 WHERE id = '5ae9e677-4b8f-4d63-856b-63d4445e08bd'; -- The Tell-Tale Heart
UPDATE books SET published_year = 1937 WHERE id = '3e0fbf27-5553-4b02-94c3-af563f72e43c'; -- The Hobbit
UPDATE books SET published_year = 1933 WHERE id = 'd2184de9-f144-400e-8df2-2126d7477c5f'; -- Dreams in the Witch House
UPDATE books SET published_year = 1987 WHERE id = '1ac7e383-5161-4b66-97c2-871b15d66417'; -- Misery
UPDATE books SET published_year = 1982 WHERE id = 'fcfc7984-492d-4477-bcd2-6c613bb11c12'; -- Rita Hayworth and Shawshank
UPDATE books SET published_year = 2022 WHERE id = '1cf6a795-9b20-4078-bb43-c35197ad305d'; -- Mile High
UPDATE books SET published_year = 2014 WHERE id = 'a1e2f6b5-bbd1-436b-aa1d-f5f3abe872f4'; -- Mr. Mercedes

-- Fix TBR books table
UPDATE tbr_books SET published_year = 1975 WHERE id = 'c13d503c-c4a0-4c81-9b2c-4669d4e19d1f'; -- Salem's Lot
UPDATE tbr_books SET published_year = 1872 WHERE title = 'Carmilla' AND published_year != 1872;
UPDATE tbr_books SET published_year = 1897 WHERE id = '7a3123bb-758e-4e5c-8469-1a195ff722a2'; -- Dracula
UPDATE tbr_books SET published_year = 1868 WHERE id = 'ba76d036-f185-49ff-b43d-0fde96ae2bbd'; -- Little Women
UPDATE tbr_books SET published_year = 1866 WHERE id = '40b835ee-fb4f-4435-83ca-c652d57ab91a'; -- Crime and Punishment
UPDATE tbr_books SET published_year = 1864 WHERE id = 'ee4b5133-14ca-4831-a750-75c77600bc6c'; -- Notes from Underground
UPDATE tbr_books SET published_year = 1847 WHERE id = '88cc4a67-4b84-49a9-926b-83bc92e4b448'; -- Jane Eyre
UPDATE tbr_books SET published_year = 1986 WHERE id = 'bde91eb2-66fe-491e-b471-cef763aae186'; -- It
UPDATE tbr_books SET published_year = 1994 WHERE id = 'bae78f65-37be-4a99-ba0a-1a6080972053'; -- Insomnia
UPDATE tbr_books SET published_year = 1981 WHERE id = 'db311dbe-5c80-4080-9c9f-cc236bdb23ec'; -- Cujo
UPDATE tbr_books SET published_year = 1983 WHERE id = 'd9b26ed6-d8fc-4966-a7a7-0ed48c802074'; -- Christine
UPDATE tbr_books SET published_year = 1978 WHERE id = '988d6ae7-1bd2-4bd4-9f6e-68e71b2fb427'; -- Night Shift
UPDATE tbr_books SET published_year = 1999 WHERE id = '96e1709e-6a17-47af-b313-bab3f731e9bd'; -- Hearts in Atlantis
UPDATE tbr_books SET published_year = 1992 WHERE id = '67adaefa-ab4f-48ab-9e46-79b9325cad13'; -- Gerald's Game
UPDATE tbr_books SET published_year = 1980 WHERE id = '1c221b96-246c-48dd-82ee-558b242fb930'; -- Firestarter
UPDATE tbr_books SET published_year = 2013 WHERE id = '5e6fd581-2297-4368-90e2-46bb901c9e81'; -- Doctor Sleep
UPDATE tbr_books SET published_year = 1993 WHERE id = 'b2ad7ab3-76b1-4f6b-a7d3-80074716d305'; -- Dolores Claiborne
UPDATE tbr_books SET published_year = 1984 WHERE id = 'd136176f-1970-4cfb-84a1-7edc7e9b16f1'; -- Dragons of Autumn Twilight
UPDATE tbr_books SET published_year = 1985 WHERE id = 'a3eba4f1-4701-4877-bc2f-aaa4b9936915'; -- Dragons of Winter Night
UPDATE tbr_books SET published_year = 1986 WHERE id = 'c6a77422-7b16-4afa-9cec-52609ad4930d'; -- Dragons of Spring Dawning
UPDATE tbr_books SET published_year = 1995 WHERE id = '417d239e-c6b9-4b71-9d70-a0a6a9038651'; -- Dragons of Summer Flame (correct)
UPDATE tbr_books SET published_year = 2006 WHERE id = '57b82058-59b4-4f16-bc0e-e6a21bf76272'; -- Mistborn
UPDATE tbr_books SET published_year = 2017 WHERE id = '3fe1193f-0a07-4448-b036-c258b60fb9e8'; -- Oathbringer (correct)
UPDATE tbr_books SET published_year = 2005 WHERE id = '6b577e4f-3cfd-488d-9649-bb337c372d30'; -- Percy Jackson Lightning Thief
UPDATE tbr_books SET published_year = 2006 WHERE id = '85c31f96-c1e4-4c1b-ae9d-6570b0cc6b1c'; -- Percy Jackson Sea of Monsters
UPDATE tbr_books SET published_year = 2007 WHERE id = 'e8e8d3c9-bde3-4e51-b32e-3e6e5c36b5da'; -- Percy Jackson Titan's Curse
UPDATE tbr_books SET published_year = 2008 WHERE id = '6470c882-dd51-4ce7-a82d-4d25a8fc6c78'; -- Percy Jackson Battle of Labyrinth (correct)
UPDATE tbr_books SET published_year = 2009 WHERE id = '7f9a0f4d-e42e-446a-a208-c8b7e63739d2'; -- Percy Jackson Last Olympian (correct)
UPDATE tbr_books SET published_year = 2013 WHERE id = '8c5115cf-1283-47cf-82d0-7e4dbd7d0c12'; -- Dark Matter (Blake Crouch)
UPDATE tbr_books SET published_year = 2005 WHERE id = '3c900bc0-dbcc-4d84-8e5a-0904e78a5250'; -- Midnight Sun was 2020 (correct actually)
UPDATE tbr_books SET published_year = 2020 WHERE id = '3c900bc0-dbcc-4d84-8e5a-0904e78a5250'; -- Midnight Sun (2020, correct)