import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'edge';

const FAA_NOTAM_URL = 'https://notams.aim.faa.gov/notamSearch/search';

interface NOTAM {
  icaoLocation: string;
  series: string;
  notamNumber: string;
  issueDate: string;
  startDateTime: string;
  endDateTime: string;
  body: string;
  type: string;
  qualifiers?: string;
}

interface FAA_NOTAM_RESPONSE {
  notamList: NOTAM[];
  totalPages: number;
  totalRows: number;
}

interface FlattenedNOTAM {
  id: string;
  series: string;
  number: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  icao: string;
  body: string;
  type: string;
  isSnowtam: boolean;
}

const SERIES_LABELS: Record<string, string> = {
  A: 'NOTAM-Series A',
  C: 'NOTAM-Series C',
  D: 'NOTAM-Series D',
  E: 'NOTAM-Series E',
  F: 'NOTAM-Series F',
  G: 'NOTAM-Series G',
  K: 'NOTAM-Series K',
  L: 'NOTAM-Series L',
  P: 'NOTAM-Series P',
  R: 'NOTAM-Series R',
  S: 'NOTAM-Series S',
  T: 'NOTAM-Series T',
  W: 'NOTAM-Series W',
};

function flattenNOTAMs(notams: NOTAM[], icao: string): FlattenedNOTAM[] {
  return notams
    .filter((n) => {
      const loc = (n.icaoLocation || '').toUpperCase();
      return loc === icao || loc.startsWith(icao);
    })
    .map((n, i) => ({
      id: `${n.series || 'X'}/${n.notamNumber || i}`,
      series: n.series || '',
      number: n.notamNumber || '',
      issueDate: n.issueDate || '',
      startDate: n.startDateTime || '',
      endDate: n.endDateTime || '',
      icao: n.icaoLocation || '',
      body: n.body || '',
      type: n.type || '',
      isSnowtam: (n.body || '').toUpperCase().includes('SNOWTAM') || n.type === 'S',
    }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { icao } = req.query;

  if (!icao || typeof icao !== 'string') {
    return res.status(400).json({ error: 'ICAO code required' });
  }

  const airport = icao.trim().toUpperCase();
  if (airport.length !== 4) {
    return res.status(400).json({ error: 'Invalid ICAO code' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(FAA_NOTAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'VAAHK-Service-Center/2.0',
      },
      body: JSON.stringify({
        searchType: 0,
        searchString: airport,
        format: 'json',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const text = await response.text();

    let data: FAA_NOTAM_RESPONSE;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: 'FAA NOTAM API returned invalid JSON',
        debug: text.substring(0, 200),
      });
    }

    if (!data.notamList || !Array.isArray(data.notamList)) {
      return res.status(200).json({
        airport,
        total: 0,
        all: [],
        seriesA: [],
        seriesC: [],
        snowtam: [],
      });
    }

    const allFlattened = flattenNOTAMs(data.notamList, airport);

    const sorted = [...allFlattened].sort(
      (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
    );

    return res.status(200).json({
      airport,
      total: sorted.length,
      totalPages: data.totalPages,
      totalRows: data.totalRows,
      all: sorted,
      seriesA: sorted.filter((n) => n.series === 'A'),
      seriesC: sorted.filter((n) => n.series === 'C'),
      snowtam: sorted.filter((n) => n.isSnowtam),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: `Failed to fetch NOTAM data: ${error.message}`,
    });
  }
}
