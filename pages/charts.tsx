import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map, Search, ExternalLink, ChevronRight, Loader2, ZoomIn, ZoomOut, Fullscreen, Download } from 'lucide-react';
import { useRouter } from 'next/router';
import { AirportNav } from '../components/AirportNav';

type Locale = 'zh' | 'en';
type Provider = 'chartfox' | 'jeppesen';
type JeppRule = 'IFR' | 'VFR' | 'CVFR' | 'DVFR';

const CATEGORY_LABELS: Record<string, string> = {
  APT: 'GEN',
  GEN: 'GEN',
  REF: 'GEN',
  GND: 'GND',
  TAX: 'GND',
  PRK: 'GND',
  SID: 'SID',
  DEP: 'SID',
  STAR: 'STAR',
  ARR: 'STAR',
  IAP: 'APP',
  APP: 'APP',
};

const messages: Record<Locale, any> = {
  zh: {
    title: '航图查询',
    desc: '查询全球机场航图、SID/STAR、进近图等飞行程序图表。',
    placeholder: '输入 ICAO 代码',
    jeppRules: '飞行规则',
    text: {
      loading: '正在加载中',
      back: '返回服务中心',
      openExternal: '打开',
      noCharts: '该飞行规则下没有可用航图',
      selectChart: '请从左侧选择航图',
      revision: '修订',
    },
    mobile: {
      title: '提示',
      msg: '为获得完整的航图浏览体验，建议通过桌面端设备访问本页面',
      continue: '继续访问',
    },
  },
  en: {
    title: 'Charts',
    desc: 'Query airport charts, SID/STAR, approach plates and other flight procedure charts.',
    placeholder: 'Enter ICAO Code',
    jeppRules: 'Flight Rules',
    text: {
      loading: 'Loading...',
      back: 'Back to Service Center',
      openExternal: 'Open',
      noCharts: 'No charts available for this flight rule',
      selectChart: 'Select a chart from the sidebar',
      revision: 'Revision',
    },
    mobile: {
      title: 'Notice',
      msg: 'For the best charts browsing experience, please access this page from a desktop device.',
      continue: 'Continue',
    },
  }
};

interface JeppChart {
  id: string;
  index_number: string;
  name: string;
  category: string;
  image_day_url: string;
  image_night_url: string;
  thumb_day_url: string;
  thumb_night_url: string;
  revision_date: string;
}

export const ChartsView = ({ locale = 'zh' }: { locale?: Locale }) => {
  const router = useRouter();
  const msg = messages[locale];
  const [icao, setIcao] = useState('');
  const [activeIcao, setActiveIcao] = useState<string | null>(null);
  const [airportData, setAirportData] = useState<any | null>(null);
  const [provider, setProvider] = useState<Provider>('chartfox');
  const [jeppRule, setJeppRule] = useState<JeppRule>('IFR');

  // Jeppesen state
  const [jeppCharts, setJeppCharts] = useState<JeppChart[]>([]);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [jeppLoading, setJeppLoading] = useState(false);
  const [jeppActiveCategory, setJeppActiveCategory] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [chartImageLoading, setChartImageLoading] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const autoLoadedCodeRef = useRef<string | null>(null);

  const isChartfox = provider === 'chartfox';

  const embedUrl = activeIcao && isChartfox
    ? `/api/chartfox?icao=${encodeURIComponent(activeIcao)}`
    : null;

  const directUrl = activeIcao
    ? isChartfox
      ? `https://chartfox.org/${encodeURIComponent(activeIcao)}`
      : `https://ww2.jeppesen.com/charts/`
    : null;

  const providerLabel = isChartfox ? 'ChartFox' : 'Jeppesen';

  const CATEGORY_ORDER = ['GEN', 'GND', 'SID', 'STAR', 'APP'];

  // Jeppesen 按分类分组
  const jeppGrouped = useMemo(() => {
    const groups: Record<string, JeppChart[]> = {};
    for (const c of jeppCharts) {
      const raw = c.category || 'OTHER';
      let cat = CATEGORY_LABELS[raw] || raw;

      // 针对 API 中的 APT 类型进行细分，10-9/20-9 等地面图表归为 GND
      if (raw === 'APT' && c.index_number && c.index_number.includes('-9')) {
        cat = 'GND';
      }

      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    }
    return groups;
  }, [jeppCharts]);

  // 可用分类列表（按顺序）
  const jeppCategories = useMemo(
    () => CATEGORY_ORDER.filter((cat) => jeppGrouped[cat]?.length),
    [jeppGrouped]
  );

  // 当前选中分类的图表列表
  const jeppFilteredCharts = useMemo(() => {
    if (!jeppActiveCategory) return [];
    return jeppGrouped[jeppActiveCategory] || [];
  }, [jeppGrouped, jeppActiveCategory]);

  const selectedChart = useMemo(
    () => jeppCharts.find((c) => c.id === selectedChartId) || null,
    [jeppCharts, selectedChartId]
  );

  useEffect(() => {
    setZoom(1);
    if (selectedChartId) {
      setChartImageLoading(true);
    }
  }, [selectedChartId]);

  // 仅在移动端设备显示提示横幅
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768;
    if (isMobile) setShowMobileWarning(true);
  }, []);

  const fetchJeppesen = useCallback(async (icaoCode: string, rules: JeppRule) => {
    setJeppLoading(true);
    setSelectedChartId(null);
    setJeppActiveCategory(null);
    try {
      const r = await fetch(`/api/jeppesen?icao=${icaoCode}&rules=${rules}`);
      if (r.ok) {
        const json = await r.json();
        const charts: JeppChart[] = json?.data?.charts || [];
        setJeppCharts(charts);
        if (charts.length > 0) setSelectedChartId(charts[0].id);
      } else {
        setJeppCharts([]);
      }
    } catch {
      setJeppCharts([]);
    }
    setJeppLoading(false);
  }, []);

  // 数据加载完成后，根据 URL 中的 chartId 自动选中对应航图
  useEffect(() => {
    if (!router.isReady || jeppCharts.length === 0) return;
    if (jeppCategories.length > 0 && !jeppActiveCategory) {
      setJeppActiveCategory(jeppCategories[0]);
    }
    const qChartId = router.query?.chartId;
    const rawChartId = Array.isArray(qChartId) ? qChartId[0] : qChartId;
    if (!rawChartId) return;
    const match = jeppCharts.find(
      (c) => c.index_number === rawChartId || c.id === rawChartId
    );
    if (match) {
      setSelectedChartId(match.id);
      // 自动切换到对应的分类
      for (const cat of jeppCategories) {
        const group = jeppGrouped[cat];
        if (group?.some((c) => c.id === match.id)) {
          setJeppActiveCategory(cat);
          break;
        }
      }
    }
  }, [router.isReady, router.query?.chartId, jeppCharts, jeppCategories, jeppGrouped]);

  const handleFullscreen = useCallback(() => {
    if (!imageContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      imageContainerRef.current.requestFullscreen();
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!selectedChart) return;
    const a = document.createElement('a');
    a.href = selectedChart.image_day_url;
    a.download = `${selectedChart.index_number}_${selectedChart.name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [selectedChart]);

  const doSearch = useCallback(async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (code.length !== 3 && code.length !== 4) return;

    const r = await fetch(`/api/airports/${code}`).catch(() => null);
    if (r?.ok) {
      const j = await r.json();
      const d = j?.data || j;
      const resolvedIcao = d?.icaoId || d?.icao || code;
      setAirportData(d);
      setActiveIcao(resolvedIcao);
      if (!isChartfox) fetchJeppesen(resolvedIcao, jeppRule);
    } else {
      setAirportData(null);
      setActiveIcao(code);
      if (!isChartfox) fetchJeppesen(code, jeppRule);
    }
  }, [isChartfox, jeppRule, fetchJeppesen]);

  const handleSearch = useCallback(() => {
    const val = inputRef.current?.value || '';
    const code = val.trim().toUpperCase();
    if (code.length === 3 || code.length === 4) doSearch(code);
  }, [doSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSearch(); }
  }, [handleSearch]);

  const handleRuleChange = useCallback((rule: JeppRule) => {
    setJeppRule(rule);
    if (activeIcao) fetchJeppesen(activeIcao, rule);
  }, [activeIcao, fetchJeppesen]);

  const handleProviderChange = useCallback((p: Provider) => {
    setProvider(p);
    if (p === 'jeppesen' && activeIcao) fetchJeppesen(activeIcao, jeppRule);
  }, [activeIcao, jeppRule, fetchJeppesen]);

  useEffect(() => {
    if (!router.isReady) return;

    const q = router.query;
    const queryIcao = q?.icao;
    const raw = Array.isArray(queryIcao) ? queryIcao[0] : queryIcao;

    // 从 URL 读取 provider
    const qProvider = q?.provider;
    const rawProvider = Array.isArray(qProvider) ? qProvider[0] : qProvider;
    if (rawProvider === 'chartfox' || rawProvider === 'jeppesen') {
      setProvider(rawProvider);
    }

    // 从 URL 读取 rules
    const qRules = q?.rules;
    const rawRules = Array.isArray(qRules) ? qRules[0] : qRules;
    if (rawRules && ['IFR', 'VFR', 'CVFR', 'DVFR'].includes(rawRules.toUpperCase())) {
      setJeppRule(rawRules.toUpperCase() as JeppRule);
    }

    if (!raw) return;
    const normalized = String(raw).trim().toUpperCase();
    if (normalized.length !== 3 && normalized.length !== 4) return;
    setIcao(normalized);
    if (autoLoadedCodeRef.current === normalized) return;
    autoLoadedCodeRef.current = normalized;
    doSearch(normalized);
  }, [router.isReady, router.query, doSearch]);

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10 font-sans">
      {/* 移动端全屏遮罩弹窗 */}
      {showMobileWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
          <div className="mx-4 max-w-sm w-full text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h2 className="text-xl font-medium text-gray-900 mb-3">{msg.mobile.title}</h2>
            <p className="text-sm text-gray-500 font-light leading-relaxed mb-8">{msg.mobile.msg}</p>
            <button
              type="button"
              onClick={() => setShowMobileWarning(false)}
              className="w-full px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              {msg.mobile.continue}
            </button>
          </div>
        </div>
      )}
      {/* Hero */}
      <div className="relative overflow-hidden border border-gray-100 rounded-2xl bg-white">
        <div className="absolute inset-0 bg-linear-to-b from-gray-50 to-white" />
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-gray-100 blur-3xl opacity-60" />
        <div className="relative px-8 py-14 md:px-14">
          <div className="flex items-center gap-3 text-gray-500">
            <Map size={18} strokeWidth={1.5} />
            <span className="text-[10px] tracking-[0.25em] uppercase">Charts Query</span>
          </div>
          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl md:text-5xl font-light tracking-tight text-gray-900">{msg.title}</h1>
              <p className="mt-4 text-gray-500 font-light max-w-2xl leading-relaxed">{msg.desc}</p>
            </div>
            <a
              href={locale === 'en' ? '/en' : '/'}
              className="inline-flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase text-gray-700 hover:text-black shrink-0"
            >
              <i data-lucide="arrow-left"></i>
              {msg.text.back}
            </a>
          </div>
          <div className="mt-10 relative">
            <input
              ref={inputRef}
              type="text"
              value={icao}
              onChange={(e) => setIcao(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder={msg.placeholder}
              maxLength={4}
              className="w-full px-7 py-5 bg-white border border-gray-200 rounded-xl text-lg font-medium focus:outline-none focus:border-black transition-all"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="absolute right-3 top-3 px-5 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Search size={20} />
            </button>
          </div>
        </div>
      </div>

      {activeIcao && (
        <div className="mt-10 grid grid-cols-1 gap-6">
          <AirportNav
            locale={locale}
            airport={{
              name: airportData?.name,
              icaoId: activeIcao,
              iataId: airportData?.iataId,
              faaId: airportData?.faaId,
            }}
            currentPage="charts"
          />

          {/* 数据源切换 + 规则 */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
                {(['chartfox', 'jeppesen'] as Provider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleProviderChange(p)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                      provider === p ? 'bg-black text-white' : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    {p === 'chartfox' ? 'ChartFox' : 'Jeppesen'}
                  </button>
                ))}
              </div>
              {!isChartfox && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tracking-widest uppercase text-gray-400">{msg.jeppRules}</span>
                  <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
                    {(['IFR', 'VFR', 'CVFR', 'DVFR'] as JeppRule[]).map((rule) => (
                      <button
                        key={rule}
                        type="button"
                        onClick={() => handleRuleChange(rule)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                          jeppRule === rule ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
                        }`}
                      >
                        {rule}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <a
              href={directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <ExternalLink size={16} />
              {msg.text.openExternal} {providerLabel}
            </a>
          </div>

          {/* 内容区 */}
          {isChartfox && embedUrl ? (
            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
              <iframe
                key={`chartfox-${activeIcao}`}
                src={embedUrl}
                title={`ChartFox ${activeIcao}`}
                className="w-full border-0"
                style={{ height: '80vh', minHeight: 600 }}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
              <a
                href="https://www.chartfox.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-end gap-3 px-6 py-3 border-t border-gray-100 bg-white hover:bg-gray-50 transition-colors group"
              >
                <span className="text-[13px] tracking-widest uppercase text-gray-300 group-hover:text-gray-400 transition-colors">Powered by</span>
                <img
                  src="https://chartfox.org/images/ChartFoxLogoDark.svg"
                  alt="ChartFox"
                  className="h-4 w-auto object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                />
              </a>
            </div>
          ) : jeppLoading ? (
            <div className="border border-gray-100 rounded-2xl bg-white p-20 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-gray-400 mr-3" />
              <span className="text-gray-400 font-light">{msg.text.loading}</span>
            </div>
          ) : jeppCharts.length === 0 ? (
            <div className="border border-gray-100 rounded-2xl bg-white p-20 text-center">
              <p className="text-gray-400 font-light">{msg.text.noCharts}</p>
            </div>
          ) : (
            <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
              {/* 顶部分类标签 */}
              <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                {jeppCategories.map((cat) => {
                  const count = (jeppGrouped[cat] || []).length;
                  const active = cat === jeppActiveCategory;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setJeppActiveCategory(cat);
                        const firstInCat = jeppGrouped[cat]?.[0];
                        if (firstInCat) setSelectedChartId(firstInCat.id);
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? 'bg-black text-white'
                          : 'text-gray-500 hover:text-black hover:bg-gray-100'
                      }`}
                    >
                      {cat}
                      <span className={`ml-1.5 text-[10px] ${active ? 'text-white/60' : 'text-gray-400'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* 左右内容区 */}
              <div className="flex" style={{ height: '78vh', minHeight: 560 }}>
              <div className="w-80 shrink-0 border-r border-gray-100 overflow-y-auto bg-white">
                {jeppActiveCategory && jeppFilteredCharts.map((chart) => {
                    const isSelected = chart.id === selectedChartId;
                    return (
                      <button
                        key={chart.id}
                        type="button"
                        onClick={() => setSelectedChartId(chart.id)}
                        className={`w-full text-left px-5 py-3 border-b border-gray-50 flex items-start gap-3 transition-colors ${
                          isSelected ? 'bg-black/5 border-l-2 border-l-black' : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                          <img
                            src={chart.thumb_day_url}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-medium text-gray-900 truncate">{chart.index_number}</div>
                          <div className="text-[10px] text-gray-500 truncate mt-0.5">{chart.name}</div>
                          <div className="text-[9px] text-gray-400 mt-1">{msg.text.revision}: {chart.revision_date}</div>
                        </div>
                        <ChevronRight size={14} className={`shrink-0 mt-2 transition-colors ${isSelected ? 'text-black' : 'text-gray-300'}`} />
                      </button>
                    );
                  })}
              </div>

              {/* 右侧大图 */}
              <div className="flex-1 bg-gray-100 flex flex-col min-w-0">
                {selectedChart ? (
                  <div className="flex-1 flex flex-col min-h-0 bg-white m-4 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{selectedChart.index_number}</span>
                        <span className="text-xs text-gray-400 ml-2">{selectedChart.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                            className="p-1 hover:bg-white rounded text-gray-500 hover:text-black transition-colors"
                          >
                            <ZoomOut size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setZoom(1)}
                            className="px-2 text-[10px] font-medium text-gray-500 hover:text-black min-w-12 text-center transition-colors"
                          >
                            {Math.round(zoom * 100)}%
                          </button>
                          <button
                            type="button"
                            onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                            className="p-1 hover:bg-white rounded text-gray-500 hover:text-black transition-colors"
                          >
                            <ZoomIn size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleFullscreen}
                            className="p-1.5 hover:bg-gray-50 rounded text-gray-400 hover:text-black transition-colors"
                            title={locale === 'zh' ? '全屏' : 'Fullscreen'}
                          >
                            <Fullscreen size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={handleDownload}
                            className="p-1.5 hover:bg-gray-50 rounded text-gray-400 hover:text-black transition-colors"
                            title={locale === 'zh' ? '下载' : 'Download'}
                          >
                            <Download size={14} />
                          </button>
                        </div>
                        <span className="text-[10px] text-gray-400">{msg.text.revision}: {selectedChart.revision_date}</span>
                      </div>
                    </div>
                    <div ref={imageContainerRef} className="flex-1 overflow-auto relative bg-gray-50/50">
                      {chartImageLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 z-10">
                          <Loader2 size={24} className="animate-spin text-gray-400 mb-3" />
                          <span className="text-gray-400 text-sm font-light">{msg.text.loading}</span>
                        </div>
                      )}
                      <div
                        className="flex items-center justify-center min-h-full min-w-full p-4 transition-all duration-200"
                        style={{ width: `${zoom * 100}%` }}
                      >
                        <img
                          src={selectedChart.image_day_url}
                          alt={`${selectedChart.index_number} ${selectedChart.name}`}
                          className="max-w-full h-auto rounded shadow-sm"
                          style={{ maxHeight: zoom === 1 ? 'calc(78vh - 120px)' : 'none' }}
                          onLoad={() => setChartImageLoading(false)}
                          onError={() => setChartImageLoading(false)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 font-light text-sm">{msg.text.selectChart}</p>
                  </div>
                )}
              </div>
            </div>
            {/* Powered by */}
            {provider === 'jeppesen' && (
              <a
                href="https://www.skylitefly.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-end gap-3 px-6 py-3 border-t border-gray-100 bg-white hover:bg-gray-50 transition-colors group"
              >
                <img
                  src="https://www.dubhenexus.org/images/Skylite-Powered-By.png"
                  alt="SkyLite"
                  className="h-4 w-auto object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                />
              </a>
            )}
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