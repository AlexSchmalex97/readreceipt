import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: books } = await supabase
    .from("books")
    .select("id, title, author")
    .is("published_year", null)
    .limit(10);

  const { data: tbrBooks } = await supabase
    .from("tbr_books")
    .select("id, title, author")
    .is("published_year", null)
    .limit(10);

  let updated = 0;
  const all = [...(books || []).map(b => ({ ...b, table: "books" })), ...(tbrBooks || []).map(b => ({ ...b, table: "tbr_books" }))];

  // Process in parallel batches of 5
  for (let i = 0; i < all.length; i += 5) {
    const batch = all.slice(i, i + 5);
    await Promise.all(batch.map(async (item) => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(item.title + " " + item.author)}&maxResults=1`
        );
        if (!res.ok) return;
        const data = await res.json();
        const pd = data.items?.[0]?.volumeInfo?.publishedDate;
        if (pd) {
          const year = parseInt(pd.substring(0, 4), 10);
          if (!isNaN(year)) {
            await supabase.from(item.table).update({ published_year: year }).eq("id", item.id);
            updated++;
          }
        }
      } catch { /* skip */ }
    }));
  }

  return new Response(
    JSON.stringify({ updated, remaining: all.length - updated }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
