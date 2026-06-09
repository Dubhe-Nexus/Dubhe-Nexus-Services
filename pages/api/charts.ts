import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'edge';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { icao } = req.query;
  if (!icao || typeof icao !== 'string') {
    return res.status(400).json({ error: 'ICAO required' });
  }

  const token =
    process.env.CHARTFOX_TOKEN || process.env.CHARTFOX_API_TOKEN || process.env.CHARTFOX_PERSONAL_TOKEN || '';

  try {
    const tokenValue = token.trim();
    const tokenKind = tokenValue.startsWith('eyJ') ? 'jwt' : tokenValue.includes('|') ? 'pat' : tokenValue ? 'other' : 'missing';

    if (!tokenValue) {
      return res.status(500).json({
        error: 'Missing ChartFox token'
      });
    }

    const callCharts = async (airport: string, headers: Record<string, string>) => {
      const url = `https://api.chartfox.org/v2/airports/${airport}/charts`;
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      const text = await response.text();
      if (text.trim().startsWith('<')) {
        return {
          ok: false as const,
          status: 500,
          payload: { error: 'API Endpoint Error', message: 'Endpoint returned HTML instead of JSON.', debug: text.substring(0, 100) }
        };
      }

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        return {
          ok: false as const,
          status: 500,
          payload: { error: 'Invalid API Response', message: 'Endpoint returned non-JSON content.' }
        };
      }

      if (!response.ok) {
        return { ok: false as const, status: response.status, payload: { error: 'ChartFox API Error', details: data } };
      }

      return { ok: true as const, status: 200, payload: data };
    };

    const input = icao.trim().toUpperCase();
    if (input.length !== 3 && input.length !== 4) {
      return res.status(400).json({ error: 'Invalid airport code' });
    }

    let airport = input;
    if (input.length === 3) {
      try {
        const r = await fetch(`https://api.dubhenexus.org/airports/${encodeURIComponent(input)}`, {
          headers: { Accept: 'application/json' }
        });
        if (r.ok) {
          const j: any = await r.json();
          const resolved = j?.data?.icao || j?.data?.data?.icao || null;
          if (resolved && typeof resolved === 'string' && resolved.trim().length === 4) {
            airport = resolved.trim().toUpperCase();
          }
        }
      } catch {
      }
    }

    let result:
      | { ok: true; status: number; payload: any }
      | { ok: false; status: number; payload: any };
    let authMode: 'bearer' | 'x-api-key' = 'bearer';

    const baseHeaders = {
      Accept: 'application/json',
      'User-Agent': 'VAAHK-Service-Center/2.0'
    };

    result = await callCharts(airport, { ...baseHeaders, Authorization: `Bearer ${tokenValue}` });
    if (!result.ok && (result.status === 401 || result.status === 403)) {
      authMode = 'x-api-key';
      result = await callCharts(airport, { ...baseHeaders, 'X-API-Key': tokenValue });
    }

    if (!result.ok) {
      return res.status(result.status).json({
        ...result.payload,
        authMode,
        tokenKind,
        tokenLength: tokenValue.length
      });
    }

    const data = result.payload;

    const chartList = data.data || data.charts || [];

    return res.status(200).json({
      icao: airport,
      airportName: data.airport?.name || data.name || airport,
      data: chartList,
      authMode,
      tokenKind
    });

  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Server Error', 
      message: error.message 
    });
  }
}
