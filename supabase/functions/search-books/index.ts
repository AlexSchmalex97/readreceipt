const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function fetchBooks(url: string, attempts = 3): Promise<Response> {
  let lastResp: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ReadReceipt/1.0 (+https://readreceipt.lovable.app)',
        'Referer': 'https://readreceipt.lovable.app',
      },
    });
    if (resp.ok) return resp;
    lastResp = resp;
    // Retry only on transient upstream errors
    if (![500, 502, 503, 504, 429].includes(resp.status)) return resp;
    await new Promise((r) => setTimeout(r, 300 * (i + 1)));
  }
  return lastResp!;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, maxResults } = await req.json();
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing query' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GOOGLE_BOOKS_API_KEY');
    const limit = maxResults || 15;
    const base = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}`;
    const withKey = apiKey ? `${base}&key=${apiKey}` : base;

    let response = await fetchBooks(withKey);

    // If keyed request fails with transient/forbidden error, try without key
    if (!response.ok && apiKey && [403, 500, 502, 503, 504].includes(response.status)) {
      console.warn(`Keyed request failed with ${response.status}, retrying without key`);
      response = await fetchBooks(base);
    }

    if (!response.ok) {
      const text = await response.text();
      console.error(`Google Books API error: ${response.status}`, text);
      return new Response(
        JSON.stringify({ error: 'Google Books API error', status: response.status }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
