import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'edge';

const CAD_ATIS_URL = 'https://atis.cad.gov.hk/ATIS/ATISweb/atis.php';

function extractText(html: string, className: string): string | null {
  const regex = new RegExp(
    `<div\\s+class="${className}"[^>]*>([\\s\\S]*?)<\\/div>`,
    'i'
  );
  const match = html.match(regex);
  if (!match) return null;
  return match[1]
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function parseATIS(raw: string | null) {
  if (!raw) return null;

  const firstLine = raw.split('\n')[0] || '';
  const parts = firstLine.split(' ');
  const icao = parts[0] || '';
  const type = parts[1] || '';
  const infoCode = parts[3] || '';
  const timeMatch = firstLine.match(/(\d{4}Z)/);
  const time = timeMatch ? timeMatch[1] : '';

  const windMatch = raw.match(/WIND\s+(\d{3})\/(\d{2,3}KT?)/i);
  const wind = windMatch
    ? { direction: windMatch[1], speed: windMatch[2] }
    : null;

  const visMatch = raw.match(/VIS\s+([\d.]+(?:KM|SM)?)/i);
  const visibility = visMatch ? visMatch[1] : null;

  const rwyMatch = raw.match(/RWY\s+(\d{2}[LCR]?)/i);
  const runway = rwyMatch ? rwyMatch[1] : null;

  const cloudMatch = raw.match(/CLD\s+(.+?)(?=\s+(?:T\d+|$))/i);
  const cloud = cloudMatch ? cloudMatch[1] : null;

  const tempMatch = raw.match(/T(\d{2})/);
  const temperature = tempMatch ? tempMatch[1] : null;

  const dewMatch = raw.match(/DP(\d{2})/);
  const dewpoint = dewMatch ? dewMatch[1] : null;

  const qnhMatch = raw.match(/QNH\s+(\d{4})/i);
  const qnh = qnhMatch ? qnhMatch[1] : null;

  return {
    icao,
    type: type.toLowerCase() === 'arr' ? 'ARRIVAL' : 'DEPARTURE',
    infoCode,
    time,
    runway,
    wind,
    visibility,
    cloud,
    temperature,
    dewpoint,
    qnh,
    raw,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(CAD_ATIS_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-HK,zh;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({
        error: `CAD ATIS server responded with ${response.status}`,
      });
    }

    const html = await response.text();

    const arrivalRaw = extractText(html, 'data_name_arr');
    const departureRaw = extractText(html, 'data_name_dep');

    if (!arrivalRaw && !departureRaw) {
      return res.status(502).json({
        error: 'Unable to parse ATIS data from CAD website',
      });
    }

    const arrival = parseATIS(arrivalRaw);
    const departure = parseATIS(departureRaw);

    return res.status(200).json({
      airport: 'VHHH',
      airportName: 'Hong Kong International Airport',
      arrival,
      departure,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: `Failed to fetch ATIS data: ${error.message}`,
    });
  }
}
