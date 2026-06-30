  import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * ChartFox 嵌入式航图接口代理
 * 参照 chart.js 的调用方式：将 iframe 重定向到 ChartFox embed 接口
 * iframe 直接从 api.chartfox.org 加载，相对路径自动正确解析
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const icao = req.query.icao;
  if (!icao || typeof icao !== 'string') {
    return res.status(400).json({ error: 'ICAO code required' });
  }

  const airport = icao.trim().toUpperCase();
  if (airport.length !== 4 || !/^[A-Z]{4}$/.test(airport)) {
    return res.status(400).json({ error: 'Invalid ICAO code (4-letter)' });
  }

  const token = process.env.CHARTFOX_PAT;
  if (!token) {
    return res.status(500).json({ error: 'CHARTFOX_PAT not configured' });
  }

  // 与 chart.js 完全一致的调用方式：?token= 传在 URL 上
  const chartfoxUrl = `https://api.chartfox.org/v2/interfaces/airport/${airport}?token=${encodeURIComponent(token)}&darkMode=true`;

  // 302 重定向：iframe 最终从 api.chartfox.org 直接加载
  // HTML 内的相对路径、API 调用全部正确解析
  res.redirect(302, chartfoxUrl);
}
