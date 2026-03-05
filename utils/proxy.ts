import { NextResponse } from 'next/server';

export async function proxyToAgent(req: Request, path: string) {
  const gatewayUrl = process.env.AGENT_GATEWAY_URL;

  // Only proxy if we have a gateway URL and we are not on localhost (or forced)
  if (gatewayUrl && !gatewayUrl.includes('localhost')) {
    try {
      const url = new URL(`${gatewayUrl}${path}`);
      
      // Copy query parameters from original request
      const originalUrl = new URL(req.url);
      originalUrl.searchParams.forEach((value, key) => {
        url.searchParams.append(key, value);
      });

      console.log(`[Proxy] Forwarding to: ${url.toString()}`);

      const headers = new Headers();
      // Pass through important headers if needed
      headers.set('Cache-Control', 'no-cache');
      
      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
        next: { revalidate: 0 }
      };

      // For POST/PUT requests, forward the body
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers.get('content-type');
        if (contentType) headers.set('content-type', contentType);
        
        const body = await req.clone().text();
        if (body) fetchOptions.body = body;
      }

      const res = await fetch(url.toString(), fetchOptions);
      
      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json(
          { error: `Gateway error: ${res.statusText}`, details: errorText },
          { status: res.status }
        );
      }

      const data = await res.json();
      return NextResponse.json(data);
    } catch (error: any) {
      console.error(`[Proxy] Error forwarding to ${path}:`, error.message);
      return NextResponse.json(
        { error: `Failed to reach Agent Gateway at ${gatewayUrl}`, details: error.message },
        { status: 502 }
      );
    }
  }

  return null; // Means "continue with local logic"
}
