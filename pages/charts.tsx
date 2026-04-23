import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map, Search, Clock, Eye } from 'lucide-react';
import { useRouter } from 'next/router';

type Locale = 'zh' | 'en';

const messages: Record<Locale, any> = {
  zh: {
    title: '航图查询',
    desc: '查询全球机场的航图、SID/STAR、进近图等飞行程序图表。（由 ChartFox 提供）',
    placeholder: '输入 ICAO / IATA 代码',
    labels: {
      airport: '机场',
      chartsTime: '航图更新时间',
      charts: '可用航图',
      approach: '进近图',
      departure: '出发程序 (SID)',
      arrival: '到达程序 (STAR)',
      airport_diagram: '机场图',
      runway: '跑道'
    },
    text: {
      loading: '正在加载航图...',
      none: '—',
      back: '返回服务中心',
      refreshedAt: '查询时间',
      noCharts: '未找到可用航图'
    },
    errors: {
      invalidIcao: '请输入有效的 ICAO 或 IATA 代码',
      chartsNotFound: '未找到该机场的航图数据',
      failed: '航图查询失败',
      serverError: '数据请求失败，请稍后再试',
      requestFailed: '请求失败'
    }
  },
  en: {
    title: 'Charts',
    desc: 'Query airport charts, SID/STAR, approach plates and other flight procedure charts worldwide. (Provided by ChartFox)',
    placeholder: 'Enter ICAO / IATA Code',
    labels: {
      airport: 'Airport',
      chartsTime: 'Charts Updated',
      charts: 'Available Charts',
      approach: 'Approach Charts',
      departure: 'Departure Procedures (SID)',
      arrival: 'Arrival Procedures (STAR)',
      airport_diagram: 'Airport Diagram',
      runway: 'Runway'
    },
    text: {
      loading: 'Loading charts...',
      none: '—',
      back: 'Back to Service Center',
      refreshedAt: 'Query Time',
      noCharts: 'No charts found'
    },
    errors: {
      invalidIcao: 'Please enter a valid ICAO or IATA code',
      chartsNotFound: 'Charts not found for this airport',
      failed: 'Failed to fetch charts',
      serverError: 'Request failed, please try again later',
      requestFailed: 'Request failed'
    }
  }
};

const toDate = (value: any) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    const ms = value < 1000000000000 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const formatUtc = (d: Date) => {
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} UTC ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
};

export const ChartsView = ({ locale = 'zh' }: { locale?: Locale }) => {
  const router = useRouter();
  const msg = messages[locale];
  const [icao, setIcao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartsData, setChartsData] = useState<any | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const autoLoadedCodeRef = useRef<string | null>(null);

  const airportTitle = useMemo(() => {
    const name = chartsData?.airportName || '';
    const icaoId = chartsData?.icao || '';
    return { name, icaoId };
  }, [chartsData]);

  const runSearch = useCallback(async (rawCode: string) => {
    let code = rawCode.trim().toUpperCase();

    if (!code || (code.length !== 3 && code.length !== 4)) {
      setError(msg.errors.invalidIcao);
      return;
    }

    setLoading(true);
    setError(null);
    setChartsData(null);
    try {
      const r = await fetch(`/api/charts?icao=${encodeURIComponent(code)}`);
      if (r.ok) {
        const result = await r.json();
        setChartsData({
          icao: code,
          airportName: result.airportName,
          charts: result.data // 对应后端传回的 transformedData.data
        });
        setRefreshedAt(new Date());
        return;
      }
      if (r.status === 404) {
        throw new Error(msg.errors.chartsNotFound);
      }
      if (r.status >= 500) throw new Error(msg.errors.serverError);
      if (r.status === 403) throw new Error('API authorization failed');
      throw new Error(msg.errors.failed);
    } catch (err: any) {
      setError(err?.message || msg.errors.requestFailed);
    } finally {
      setLoading(false);
    }
  }, [msg.errors.invalidIcao, msg.errors.chartsNotFound, msg.errors.failed, msg.errors.serverError, msg.errors.requestFailed]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(icao);
  };

  useEffect(() => {
    if (!router.isReady) return;
    const queryIcao = router.query?.icao;
    const raw = Array.isArray(queryIcao) ? queryIcao[0] : queryIcao;
    if (!raw) return;

    const normalized = String(raw).trim().toUpperCase();
    if (normalized.length !== 3 && normalized.length !== 4) return;

    setIcao(normalized);
    if (autoLoadedCodeRef.current === normalized) return;
    autoLoadedCodeRef.current = normalized;
    void runSearch(normalized);
  }, [router.isReady, router.query, runSearch]);

  const refreshedAtText = useMemo(() => {
    return refreshedAt ? formatUtc(refreshedAt) : null;
  }, [refreshedAt]);

const groupedCharts = useMemo(() => {
  if (!chartsData?.charts) return {};
  
  const grouped: Record<string, any[]> = {};
  chartsData.charts.forEach((chart: any) => {
    // V2 字段通常是 type，V1 有时是 chart_type
    const rawType = chart.type || chart.chart_type || 'other';
    // 统一转换为小写进行匹配
    const type = rawType.toLowerCase();
    
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(chart);
  });
  return grouped;
}, [chartsData?.charts]);

  const chartTypeLabel = (type: string) => {
    const typeMap: Record<string, Record<Locale, string>> = {
      approach: { zh: '进近图', en: 'Approach Charts' },
      departure: { zh: '出发程序 (SID)', en: 'Departure Procedures (SID)' },
      arrival: { zh: '到达程序 (STAR)', en: 'Arrival Procedures (STAR)' },
      airport_diagram: { zh: '机场图', en: 'Airport Diagram' }
    };
    return typeMap[type]?.[locale] || type;
  };

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10 font-sans">
      <div className="relative overflow-hidden border border-gray-100 rounded-2xl bg-white">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-gray-100 blur-3xl opacity-60" />
        <div className="relative px-8 py-14 md:px-14">
          <div className="flex items-center gap-3 text-gray-500">
            <Map size={18} strokeWidth={1.5} />
            <span className="text-[10px] tracking-[0.25em] uppercase">Charts Service</span>
          </div>
          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl md:text-5xl font-light tracking-tight text-gray-900">{msg.title}</h1>
              <p className="mt-4 text-gray-500 font-light max-w-2xl leading-relaxed">
                {msg.desc}
              </p>
            </div>
            <a
              href={locale === 'en' ? '/en' : '/'}
              className="inline-flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase text-gray-700 hover:text-black"
            >
              <i data-lucide="arrow-left"></i>
              {msg.text.back}
            </a>
          </div>

          <form onSubmit={handleSearch} className="mt-10 relative">
            <input
              type="text"
              value={icao}
              onChange={(e) => setIcao(e.target.value.toUpperCase())}
              placeholder={msg.placeholder}
              maxLength={4}
              className="w-full px-7 py-5 bg-white border border-gray-200 rounded-xl text-lg font-medium focus:outline-none focus:border-black transition-all"
            />
            <button
              type="submit"
              className="absolute right-3 top-3 px-5 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Search size={20} />
            </button>
          </form>

          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 font-light">
            <Clock size={14} strokeWidth={1.5} />
            <span className="tracking-widest uppercase">{msg.text.refreshedAt}</span>
            <span className="text-gray-700">{refreshedAtText || msg.text.none}</span>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 border border-gray-100 rounded-xl bg-white/60">
              <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-3">{msg.labels.airport}</div>
              <div className="text-base md:text-lg font-medium text-gray-900">{airportTitle.name || msg.text.none}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-white/70 text-xs text-gray-700">
                  <span className="text-[10px] tracking-widest uppercase text-gray-400">ICAO</span>
                  <span className="fira-code font-medium text-gray-900">{airportTitle.icaoId || msg.text.none}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-14">
          <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 font-light">{msg.text.loading}</p>
        </div>
      )}

      {error && (
        <div className="mt-8 p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-light">
          {error}
        </div>
      )}

      {chartsData && !loading && (
        <div className="mt-10">
          {Object.keys(groupedCharts).length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {Object.entries(groupedCharts).map(([chartType, charts]) => (
                <section key={chartType} className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
                  <div className="px-8 py-7 md:px-12 border-b border-gray-50">
                    <div className="text-[10px] tracking-widest uppercase text-gray-400">{chartType}</div>
                    <div className="mt-2 text-xl md:text-2xl font-light text-gray-900">{chartTypeLabel(chartType)}</div>
                  </div>
                  <div className="p-7 md:p-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(charts as any[]).map((chart: any, idx: number) => (
                        <div key={idx} className="p-5 border border-gray-100 rounded-xl hover:border-black/20 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">
                                {chart.runway ? `${msg.labels.runway} ${chart.runway}` : msg.labels.airport_diagram}
                              </div>
                              <div className="text-sm font-medium text-gray-900">{chart.name || chart.chartName || msg.text.none}</div>
                            </div>
                            {chart.effectiveDate && (
                              <div className="text-xs text-gray-500 text-right whitespace-nowrap">
                                {new Date(chart.effective_date || chart.effectiveDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          {chart.pdf_url && (
                            <a
                              href={chart.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 rounded-lg transition-colors"
                            >
                              <Eye size={14} />
                              {locale === 'en' ? 'View' : '查看'}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="p-8 border border-gray-100 rounded-2xl bg-white text-gray-500 font-light text-center">
              {msg.text.noCharts}
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export default function ChartsPage() {
  return <ChartsView locale="zh" />;
}
