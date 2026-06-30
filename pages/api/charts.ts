export const runtime = 'edge';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const icao = url.searchParams.get('icao');
  if (!icao) {
    return new Response(JSON.stringify({ error: 'ICAO code required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const airport = icao.trim().toUpperCase();
  if (airport.length !== 4 || !/^[A-Z]{4}$/.test(airport)) {
    return new Response(JSON.stringify({ error: 'Invalid ICAO code (4-letter)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = process.env.CHARTFOX_PAT;
  if (!token) {
    return new Response(JSON.stringify({ error: 'CHARTFOX_PAT not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const chartfoxUrl = `https://api.chartfox.org/v2/interfaces/airport/${airport}?token=${encodeURIComponent(token)}&darkMode=true`;

  return Response.redirect(chartfoxUrl, 302);
}
