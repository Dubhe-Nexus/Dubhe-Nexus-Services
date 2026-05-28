import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Clock, AlertTriangle, Map, Wind, Snowflake } from 'lucide-react';
import { useRouter } from 'next/router';

type Locale = 'zh' | 'en';

interface NOTAM {
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

interface NOTAMResponse {
  airport: string;
  total: number;
  all: NOTAM[];
  seriesA: NOTAM[];
  seriesC: NOTAM[];
  snowtam: NOTAM[];
}

type TabKey = 'all' | 'seriesA' | 'seriesC' | 'snowtam';

const messages: Record<Locale, any> = {
  zh: {
    title: '航空情报服务 (AIS)',
    desc: '查询 VHHH 香港国际机场的航行通告 (NOTAM) 和 SNOWTAM 信息。',
    placeholder: '输入 ICAO 代码',
    tabs: {
      all: 'NOTAM-ALL',
      seriesA: 'NOTAM-Series A',
      seriesC: 'NOTAM-Series C',
      snowtam: 'SNOWTAM',
    },
    labels: {
      airport: '机场',
      series: '系列',
      number: '编号',
      issueDate: '签发时间',
      startDate: '生效时间',
      endDate: '失效时间',
      body: '通告内容',
      total: '共 {{count}} 条通告',
    },
    text: {
      loading: '正在加载 NOTAM 数据...',
      noData: '未找到相关 NOTAM 数据',
      back: '返回服务中心',
      refreshedAt: '查询时间',
      noSnowtam: '无 SNOWTAM 通告',
      error: '数据请求失败',
      invalidIcao: '请输入有效的 4 位 ICAO 代码',
      notFound: '未找到该机场的 NOTAM 数据',
    },
  },
  en: {
    title: 'Aeronautical Information Service (AIS)',
    desc: 'Retrieve NOTAMs and SNOWTAM for VHHH Hong Kong International Airport.',
    placeholder: 'Enter ICAO code',
    tabs: {
      all: 'NOTAM-ALL',
      seriesA: 'NOTAM-Series A',
      seriesC: 'NOTAM-Series C',
      snowtam: 'SNOWTAM',
    },
    labels: {
      airport: 'Airport',
      series: 'Series',
      number: 'Number',
      issueDate: 'Issue Date',
      startDate: 'Start',
      endDate: 'End',
      body: 'Content',
      total: 'Total {{count}} NOTAMs',
    },
    text: {
      loading: 'Loading NOTAM data...',
      noData: 'No NOTAM data found',
      back: 'Back to Service Center',
      refreshedAt: 'Queried at',
      noSnowtam: 'No SNOWTAM',
      error: 'Data request failed',
      invalidIcao: 'Please enter a valid 4-letter ICAO code',
      notFound: 'No NOTAM data found for this airport',
    },
  },
};

const TAB_KEYS: TabKey[] = ['all', 'seriesA', 'seriesC', 'snowtam'];

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

function getSeriesColor(series: string): string {
  const colors: Record<string, string> = {
    A: 'bg-blue-100 text-blue-700',
    C: 'bg-purple-100 text-purple-700',
    D: 'bg-green-100 text-green-700',
    E: 'bg-amber-100 text-amber-700',
    W: 'bg-red-100 text-red-700',
  };
  return colors[series] || 'bg-gray-100 text-gray-700';
}

function SnowtamBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-700 text-xs font-medium">
      <Snowflake size={12} />
      SNOWTAM
    </span>
  );
}

function NOTAMCard({ notam, locale }: { notam: NOTAM; locale: Locale }) {
  const msg = messages[locale];
  return (
    <div className="border border-gray-200 rounded-xl bg-white p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${getSeriesColor(notam.series)}`}>
            Series {notam.series || '—'}
          </span>
          {notam.isSnowtam && <SnowtamBadge />}
          <span className="text-xs text-gray-400 font-mono">#{notam.number}</span>
        </div>
        <span className="text-xs text-gray-400 font-mono">{notam.icao}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-[11px]">
        <div>
          <span className="text-gray-400">{msg.labels.issueDate}</span>
          <p className="text-gray-700 font-medium mt-0.5">{formatDate(notam.issueDate)}</p>
        </div>
        <div>
          <span className="text-gray-400">{msg.labels.startDate}</span>
          <p className="text-gray-700 font-medium mt-0.5">{formatDate(notam.startDate)}</p>
        </div>
        <div className="col-span-2">
          <span className="text-gray-400">{msg.labels.endDate}</span>
          <p className="text-gray-700 font-medium mt-0.5">{formatDate(notam.endDate)}</p>
        </div>
      </div>

      <div>
        <span className="text-[11px] text-gray-400">{msg.labels.body}</span>
        <p className="text-sm text-gray-800 mt-1 leading-relaxed font-mono whitespace-pre-wrap break-words">
          {notam.body}
        </p>
      </div>
    </div>
  );
}

export const AisView = ({ locale = 'zh' }: { locale?: Locale }) => {
  const router = useRouter();
  const msg = messages[locale];
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NOTAMResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const autoLoadedRef = useRef<string | null>(null);

  const refreshedAtText = useMemo(() => {
    if (!refreshedAt) return '';
    const d = refreshedAt;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
  }, [refreshedAt]);

  const currentList = useMemo(() => {
    if (!data) return [];
    switch (activeTab) {
      case 'seriesA': return data.seriesA;
      case 'seriesC': return data.seriesC;
      case 'snowtam': return data.snowtam;
      default: return data.all;
    }
  }, [data, activeTab]);

  const tabCounts = useMemo(() => {
    if (!data) return { all: 0, seriesA: 0, seriesC: 0, snowtam: 0 };
    return {
      all: data.total,
      seriesA: data.seriesA.length,
      seriesC: data.seriesC.length,
      snowtam: data.snowtam.length,
    };
  }, [data]);

  const runSearch = useCallback(async (rawCode: string) => {
    const q = rawCode.trim().toUpperCase();
    if (q.length !== 4) {
      setError(msg.text.invalidIcao);
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const r = await fetch(`/api/notam?icao=${encodeURIComponent(q)}`, {
        cache: 'no-store',
      });
      if (r.ok) {
        const json = await r.json();
        setData(json);
        setRefreshedAt(new Date());
        return;
      }
      if (r.status >= 500) throw new Error(msg.text.error);
      throw new Error(msg.text.notFound);
    } catch (err: any) {
      setError(err?.message || msg.text.error);
    } finally {
      setLoading(false);
    }
  }, [msg.text.invalidIcao, msg.text.notFound, msg.text.error]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(code);
  };

  useEffect(() => {
    if (!router.isReady) return;
    const queryIcao = router.query?.icao;
    const raw = Array.isArray(queryIcao) ? queryIcao[0] : queryIcao;
    if (!raw) return;

    const normalized = String(raw).trim().toUpperCase();
    if (normalized.length !== 4) return;

    setCode(normalized);
    if (autoLoadedRef.current === normalized) return;
    autoLoadedRef.current = normalized;
    void runSearch(normalized);
  }, [router.isReady, router.query, runSearch]);

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10 font-sans">
      <div className="relative overflow-hidden border border-gray-100 rounded-2xl bg-white mb-10">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
        <div className="relative px-8 py-10 md:px-14">
          <div className="flex items-center gap-3 text-gray-500 mb-4">
            <Map size={18} strokeWidth={1.5} />
            <a
              href={locale === 'en' ? '/en' : '/'}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {msg.text.back}
            </a>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
            {msg.title}
          </h1>
          <p className="text-sm text-gray-500 max-w-2xl">
            {msg.desc}
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden border border-gray-100 rounded-2xl bg-white mb-10">
        <div className="px-8 py-6 md:px-14">
          <form onSubmit={onSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={msg.placeholder}
                maxLength={4}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-gray-300 focus:bg-white focus:ring-1 focus:ring-gray-200 transition-all font-mono tracking-wider uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.trim().length !== 4}
              className="h-11 px-6 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading
                </span>
              ) : 'Search'}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="mb-8 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-gray-400">{msg.text.loading}</span>
          </div>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">{data.airport}</span>
              <span className="text-xs text-gray-400">
                {msg.labels.total.replace('{{count}}', String(data.total))}
              </span>
            </div>
            {refreshedAtText && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock size={12} strokeWidth={1.5} />
                {msg.text.refreshedAt}: {refreshedAtText}
              </span>
            )}
          </div>

          <div className="flex gap-1 mb-6 border-b border-gray-100 pb-1 overflow-x-auto">
            {TAB_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                  activeTab === key
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {key === 'snowtam' && <Snowflake size={14} strokeWidth={1.5} />}
                {msg.tabs[key]}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === key ? 'bg-white text-gray-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tabCounts[key]}
                </span>
              </button>
            ))}
          </div>

          {currentList.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <AlertTriangle size={32} className="text-gray-300 mb-3" strokeWidth={1} />
              <p className="text-sm text-gray-400">
                {activeTab === 'snowtam' ? msg.text.noSnowtam : msg.text.noData}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentList.map((notam) => (
                <NOTAMCard key={notam.id} notam={notam} locale={locale} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
};

export default function Page() {
  return <AisView locale="zh" />;
}
