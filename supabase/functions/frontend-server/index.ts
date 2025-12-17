
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

// Pinning version for stability
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

console.log("INFO: 'frontend-server' Edge Function is running.");

const BUCKET_NAME = 'website-dist';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const MIME_TYPES: Record<string, string> = {
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  txt: 'text/plain',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  map: 'application/json',
};

function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const url = new URL(req.url);
    const functionPathIndex = url.pathname.indexOf('/frontend-server');
    let filePath = functionPathIndex !== -1 ? url.pathname.substring(functionPathIndex + '/frontend-server'.length) : url.pathname;
    
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    if (filePath === '' || filePath === '/') {
      filePath = 'index.html';
    }

    const { data, error } = await supabaseClient
      .storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (error) {
      // SPA Fallback: If asset not found, try serving index.html
      // This allows paths like /tickets to be handled by React Router
      if (!filePath.includes('.')) {
        const { data: indexData, error: indexError } = await supabaseClient
          .storage
          .from(BUCKET_NAME)
          .download('index.html');

        if (indexError) {
          console.error('ERROR: index.html missing');
          return new Response('Not Found', { status: 404, headers: corsHeaders });
        }

        return new Response(indexData, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = getContentType(filePath);

    return new Response(data, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600' 
      },
      status: 200,
    });

  } catch (error: any) {
    console.error("FATAL: Frontend Server Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
