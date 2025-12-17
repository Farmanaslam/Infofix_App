
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

console.log("INFO: 'hyper-api' Edge Function is running.");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    )

    let body;
    try {
        const text = await req.text();
        body = text ? JSON.parse(text) : {};
    } catch {
        body = {};
    }

    const { name } = body;
    if (!name) {
       return new Response(
        JSON.stringify({ message: "API active. Provide 'name' in JSON body." }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    const { data: customer, error } = await supabaseClient
      .from('customers')
      .select('*')
      .ilike('name', `%${name}%`)
      .limit(1)
      .single();

    if (error) {
        if (error.code === 'PGRST116') {
             return new Response(
                JSON.stringify({ error: `Customer '${name}' not found.` }),
                { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
            )
        }
        throw error;
    }

    return new Response(
      JSON.stringify({ customer }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (error: any) {
    console.error("FATAL: Hyper API Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      },
    )
  }
});
