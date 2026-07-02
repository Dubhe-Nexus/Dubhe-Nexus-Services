/**
 * Jeppesen 航图 API 数据代理
 * 请求 SkyLite API，返回 JSON 数据供前端渲染
 */
export const runtime = 'edge';

const VALID_RULES = ['IFR', 'VFR', 'CVFR', 'DVFR'];

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

  const rules = VALID_RULES.includes(url.searchParams.get('rules')?.toUpperCase() || '')
    ? url.searchParams.get('rules')!.toUpperCase()
    : 'IFR';

  try {
    const jeppesenUrl = `https://api.skylitefly.com/api/charts/${airport}/?version=STD&rules=${rules}`;
    const response = await fetch(jeppesenUrl);

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Jeppesen API returned ${response.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data: any = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Failed to fetch Jeppesen charts', details: error?.message || String(error) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
