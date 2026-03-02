import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const url = new URL(req.url);
  const reprocessAll = url.searchParams.get("all") === "true";
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);

  const booksQuery = supabase.from("books").select("id, title, author, published_year");
  if (!reprocessAll) booksQuery.is("published_year", null);
  const { data: books } = await booksQuery.limit(limit);

  const tbrQuery = supabase.from("tbr_books").select("id, title, author, published_year");
  if (!reprocessAll) tbrQuery.is("published_year", null);
  const { data: tbrBooks } = await tbrQuery.limit(limit);

  let updated = 0;
  const all = [
    ...(books || []).map(b => ({ ...b, table: "books" })),
    ...(tbrBooks || []).map(b => ({ ...b, table: "tbr_books" })),
  ];

  // Process one at a time with delay to avoid rate limiting
  for (const item of all) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(item.title + " " + item.author)}&maxResults=20`
      );
      if (!res.ok) {
        console.log(`API ${res.status} for "${item.title}"`);
        if (res.status === 429) {
          await sleep(2000);
        }
        continue;
      }
      const data = await res.json();
      let earliest: number | undefined;
      for (const vol of (data.items || [])) {
        const pd = vol.volumeInfo?.publishedDate;
        if (pd) {
          const year = parseInt(pd.substring(0, 4), 10);
          if (!isNaN(year) && (earliest === undefined || year < earliest)) {
            earliest = year;
          }
        }
      }
      console.log(`"${item.title}" - current: ${item.published_year}, earliest: ${earliest}`);
      if (earliest !== undefined && (item.published_year === null || earliest < item.published_year)) {
        await supabase.from(item.table).update({ published_year: earliest }).eq("id", item.id);
        updated++;
      }
      await sleep(500);
    } catch (_e) {
      console.log(`Error for "${item.title}": ${_e}`);
    }
  }

  return new Response(
    JSON.stringify({ updated, total: all.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
