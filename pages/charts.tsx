import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Map, Search, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/router';

type Locale = 'zh' | 'en';

const messages: Record<Locale, any> = {
  zh: {
    title: '航图查询',
    desc: '查询全球机场的航图、SID/STAR、进近图等飞行程序图表。（由 ChartFox 提供）',
    placeholder: '输入 ICAO / IATA 代码',
    labels: {
      airport: '机场',
      charts: '可用航图',
    },
    text: {
      loading: '正在加载航图...',
      none: '—',
      back: '返回服务中心',
      noCharts: '未找到可用航图',
      openExternal: '在 ChartFox 打开',
    },
    errors: {
      invalidIcao: '请输入有效的 ICAO 代码',
    }
  },
  en: {
    title: 'Charts',
    desc: 'Query airport charts, SID/STAR, approach plates and other flight procedure charts worldwide. (Provided by ChartFox)',
    placeholder: 'Enter ICAO / IATA Code',
    labels: {
      airport: 'Airport',
      charts: 'Available Charts',
    },
    text: {
      loading: 'Loading charts...',
      none: '—',
      back: 'Back to Service Center',
      noCharts: 'No charts found',
      openExternal: 'Open on ChartFox',
    },
    errors: {
      invalidIcao: 'Please enter a valid ICAO code',
    }
  }
};

export const ChartsView = ({ locale = 'zh' }: { locale?: Locale }) => {
  const router = useRouter();
  const msg = messages[locale];
  const [icao, setIcao] = useState('');
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const autoLoadedCodeRef = useRef<string | null>(null);

  const embedUrl = activeCode ? `/api/charts?icao=${encodeURIComponent(activeCode)}` : null;
  const directUrl = activeCode ? `https://chartfox.org/${encodeURIComponent(activeCode)}` : null;

  const runSearch = useCallback((rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code || (code.length !== 3 && code.length !== 4)) return;
    setActiveCode(code);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const code = icao.trim().toUpperCase();
    if (!code || (code.length !== 3 && code.length !== 4)) return;
    runSearch(code);
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
    runSearch(normalized);
  }, [router.isReady, router.query, runSearch]);

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
              className="inline-flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase text-gray-700 hover:text-black shrink-0"
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
        </div>
      </div>

      {activeCode && embedUrl && (
        <div className="mt-10">
          {/* 机场标识和外链 */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">{msg.labels.airport}</span>
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-white text-xs text-gray-700">
                <span className="text-[10px] tracking-widest uppercase text-gray-400">ICAO</span>
                <span className="font-medium text-gray-900">{activeCode}</span>
              </span>
            </div>
            <a
              href={directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <ExternalLink size={16} />
              {msg.text.openExternal}
            </a>
          </div>

          {/* 内嵌 iframe */}
          <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
            <iframe
              src={embedUrl}
              title={`ChartFox ${activeCode}`}
              className="w-full border-0"
              style={{ height: '80vh', minHeight: 600 }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </div>
      )}
    </main>
  );
};

export default function ChartsPage() {
  return <ChartsView locale="zh" />;
}
