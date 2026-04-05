import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cloud, CloudSun, Search, Wind, Eye, Thermometer, Gauge, Clock, List } from 'lucide-react';
import { useRouter } from 'next/router';

type Locale = 'zh' | 'en';

const messages: Record<Locale, any> = {
  zh: {
    title: '气象数据查询',
    desc: '同一页面展示 METAR 与 TAF，并提供结构化解码结果。支持 ICAO / IATA 代码查询。',
    chips: ['METAR', 'TAF'],
    placeholder: '输入 ICAO / IATA 代码',
    labels: {
      airport: '机场',
      metarTime: 'METAR 发布时间',
      tafIssue: 'TAF 发布时间',
      metarRealtime: '航空例行天气报告',
      tafForecast: '终端机场天气预报',
      rawMetar: '原报文',
      rawTaf: '原报文',
      wind: '风',
      visibility: '能见度',
      tempDew: '气温 / 露点',
      qnh: '修正海平面气压',
      segments: '时间段',
      clouds: '云层'
    },
    text: {
      loading: '正在获取数据...',
      none: '—',
      noSigWx: '无显著天气',
      back: '返回服务中心',
      refreshedAt: '刷新时间',
      vrb: '不定向'
    },
    errors: {
      invalidIcao: '请输入有效的 ICAO 或 IATA 代码',
      metarNotFound: '未找到该机场的 METAR 数据',
      tafNotFound: '未找到该机场的 TAF 数据',
      metarFailed: 'METAR 获取失败',
      tafFailed: 'TAF 获取失败',
      serverError: '数据请求失败，请稍后再试',
      requestFailed: '请求失败'
    }
  },
  en: {
    title: 'Weather',
    desc: 'METAR and TAF on one page with structured decoding. Supports ICAO and IATA Code.',
    chips: ['METAR', 'TAF'],
    placeholder: 'Enter ICAO / IATA Code',
    labels: {
      airport: 'Airport',
      metarTime: 'METAR Time',
      tafIssue: 'TAF Issue',
      metarRealtime: 'Meteorological Terminal Aviation Routine Weather Report',
      tafForecast: 'Terminal Aerodrome Forecasts',
      rawMetar: 'Raw',
      rawTaf: 'Raw',
      wind: 'Wind',
      visibility: 'Visibility',
      tempDew: 'Temp / Dew',
      qnh: 'QNH',
      segments: 'Segments',
      clouds: 'Clouds'
    },
    text: {
      loading: 'Loading...',
      none: '—',
      noSigWx: 'No significant weather',
      back: 'Back to Service Center',
      refreshedAt: 'Refreshed',
      vrb: 'Variable'
    },
    errors: {
      invalidIcao: 'Please enter a valid ICAO or IATA code',
      metarNotFound: 'METAR not found',
      tafNotFound: 'TAF not found',
      metarFailed: 'Failed to fetch METAR',
      tafFailed: 'Failed to fetch TAF',
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

const cloudCoverName = (locale: Locale, cover: string) => {
  const key = String(cover || '').toUpperCase();
  const zh: Record<string, string> = {
    CLR: '晴空',
    SKC: '晴空',
    NSC: '无显著云',
    FEW: '少云',
    SCT: '疏云',
    BKN: '多云',
    OVC: '阴云'
  };
  const en: Record<string, string> = {
    CLR: 'Clear',
    SKC: 'Clear',
    NSC: 'No significant clouds',
    FEW: 'Few',
    SCT: 'Scattered',
    BKN: 'Broken',
    OVC: 'Overcast'
  };
  const map = locale === 'en' ? en : zh;
  return map[key] || null;
};

const formatCloudBaseFt = (value: any) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/ft\b/i.test(raw)) return raw;
  if (/^\d+$/.test(raw)) return `${raw} ft`;
  return raw;
};

const wrapDesc = (locale: Locale, text: string, desc: string) => {
  return locale === 'en' ? `${text} (${desc})` : `${text}（${desc}）`;
};

const decodeWxToken = (locale: Locale, token: string) => {
  const raw = String(token || '').trim().toUpperCase();
  if (!raw) return null;

  const intensityZh: Record<string, string> = { '-': '小', '+': '大', '': '中' };
  const intensityEn: Record<string, string> = { '-': 'Light', '+': 'Heavy', '': 'Moderate' };

  const descriptorZh: Record<string, string> = {
    MI: '浅薄',
    PR: '部分',
    BC: '碎片',
    DR: '低吹',
    BL: '吹',
    SH: '阵性',
    TS: '雷暴',
    FZ: '冻'
  };
  const descriptorEn: Record<string, string> = {
    MI: 'Shallow',
    PR: 'Partial',
    BC: 'Patches',
    DR: 'Low drifting',
    BL: 'Blowing',
    SH: 'Showers',
    TS: 'Thunderstorm',
    FZ: 'Freezing'
  };

  const phenomenaZh: Record<string, string> = {
    DZ: '毛雨',
    RA: '雨',
    SN: '雪',
    SG: '雪粒',
    IC: '冰晶',
    PL: '霙',
    GR: '雹',
    GS: '霰',
    UP: '不明降水',
    BR: '霭',
    FG: '雾',
    FU: '烟',
    VA: '火山灰',
    DU: '沙尘暴',
    SA: '沙',
    HZ: '霾',
    PY: '海沫、水沫',
    PO: '尘旋风',
    SQ: '飑',
    FC: '漏斗云、龙卷风、水龙卷',
    SS: '沙暴',
    DS: '尘暴'
  };
  const phenomenaEn: Record<string, string> = {
    DZ: 'Drizzle',
    RA: 'Rain',
    SN: 'Snow',
    SG: 'Snow grains',
    IC: 'Ice crystals',
    PL: 'Ice pellets',
    GR: 'Hail',
    GS: 'Small hail / snow pellets',
    UP: 'Unknown precipitation',
    BR: 'Mist',
    FG: 'Fog',
    FU: 'Smoke',
    VA: 'Volcanic ash',
    DU: 'Dust',
    SA: 'Sand',
    HZ: 'Haze',
    PY: 'Spray',
    PO: 'Dust/sand whirls',
    SQ: 'Squalls',
    FC: 'Funnel cloud / tornado / waterspout',
    SS: 'Sandstorm',
    DS: 'Duststorm'
  };

  let rest = raw;
  const intensity = rest.startsWith('-') || rest.startsWith('+') ? rest[0] : '';
  if (intensity) rest = rest.slice(1);

  let proximity = '';
  if (rest.startsWith('VC')) {
    proximity = 'VC';
    rest = rest.slice(2);
  }

  const descriptorCodes = ['MI', 'PR', 'BC', 'DR', 'BL', 'SH', 'TS', 'FZ'];
  let descriptor = '';
  const maybeDesc = rest.slice(0, 2);
  if (descriptorCodes.includes(maybeDesc)) {
    descriptor = maybeDesc;
    rest = rest.slice(2);
  }

  if (!rest) {
    if (!proximity && !descriptor && !intensity) return null;
    if (locale === 'en') {
      const parts = [intensityEn[intensity] || '', proximity ? 'Vicinity' : '', descriptorEn[descriptor] || ''].filter(Boolean);
      return parts.join(' ');
    }
    const parts = [intensityZh[intensity] || '', proximity ? '邻近' : '', descriptorZh[descriptor] || ''].filter(Boolean);
    return parts.join('');
  }

  const codes = rest.match(/.{1,2}/g) || [];
  const names = codes
    .map((c) => (locale === 'en' ? phenomenaEn[c] : phenomenaZh[c]))
    .filter(Boolean);

  if (!names.length) return null;

  if (locale === 'en') {
    const parts = [
      intensityEn[intensity] || '',
      proximity ? 'Vicinity' : '',
      descriptorEn[descriptor] || '',
      names.join(' and ')
    ].filter(Boolean);
    return parts.join(' ');
  }

  const phenomenaText = names.join('、');
  const parts = [intensityZh[intensity] || '', proximity ? '邻近' : '', descriptorZh[descriptor] || '', phenomenaText].filter(Boolean);
  return parts.join('');
};

const translateWxString = (locale: Locale, wx: any) => {
  if (!wx) return null;
  const text = String(wx).trim();
  if (!text) return null;
  const tokens = text.split(/\s+/).filter(Boolean);
  const parts = tokens.map((t) => {
    const decoded = decodeWxToken(locale, t);
    return decoded ? wrapDesc(locale, t, decoded) : t;
  });
  return parts.join(' ');
};

const formatQnh = (altim: any) => {
  if (altim === null || altim === undefined || altim === '') return null;
  if (typeof altim === 'number') {
    if (altim > 200) return `${altim} hPa`;
    if (altim > 0 && altim < 100) return `${altim.toFixed(2)} inHg`;
    return String(altim);
  }
  const s = String(altim).trim().toUpperCase();
  const q = s.match(/^Q(\d{3,4})$/);
  if (q) return `${Number(q[1])} hPa`;
  const a = s.match(/^A(\d{4})$/);
  if (a) return `${(Number(a[1]) / 100).toFixed(2)} inHg`;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (Number.isNaN(n)) return s;
    if (n > 200) return `${n} hPa`;
    if (n > 0 && n < 100) return `${n.toFixed(2)} inHg`;
    return s;
  }
  return s;
};

export const WeatherView = ({ locale = 'zh' }: { locale?: Locale }) => {
  const router = useRouter();
  const msg = messages[locale];
  const [icao, setIcao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metar, setMetar] = useState<any | null>(null);
  const [taf, setTaf] = useState<any | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const autoLoadedCodeRef = useRef<string | null>(null);

  const airportTitle = useMemo(() => {
    const name = metar?.name || taf?.name || '';
    const iata = metar?.iataId || taf?.iataId || '';
    const icaoId = metar?.icaoId || taf?.icaoId || '';
    return { name, iata, icaoId };
  }, [metar, taf]);

  const runSearch = useCallback(async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code || (code.length !== 3 && code.length !== 4)) {
      setError(msg.errors.invalidIcao);
      return;
    }
    setLoading(true);
    setError(null);
    setMetar(null);
    setTaf(null);
    try {
      const fetchJson = async (url: string, notFoundMessage: string) => {
        const r = await fetch(url);
        if (r.ok) return r.json();
        if (r.status >= 500) throw new Error(msg.errors.serverError);
        throw new Error(notFoundMessage);
      };
      const [m, t] = await Promise.allSettled([
        fetchJson(`/api/airports/metar/${code}`, msg.errors.metarNotFound),
        fetchJson(`/api/airports/taf/${code}`, msg.errors.tafNotFound)
      ]);

      const errors: string[] = [];
      const anyOk = m.status === 'fulfilled' || t.status === 'fulfilled';
      if (m.status === 'fulfilled') setMetar(m.value?.metar ?? null);
      else errors.push(m.reason?.message || msg.errors.metarFailed);
      if (t.status === 'fulfilled') setTaf(t.value?.taf ?? null);
      else errors.push(t.reason?.message || msg.errors.tafFailed);

      if (anyOk) setRefreshedAt(new Date());
      if (errors.length === 2) {
        setError(errors.join(' / '));
      }
    } catch (err: any) {
      setError(err?.message || msg.errors.requestFailed);
    } finally {
      setLoading(false);
    }
  }, [msg.errors.invalidIcao, msg.errors.metarNotFound, msg.errors.tafNotFound, msg.errors.serverError, msg.errors.metarFailed, msg.errors.tafFailed, msg.errors.requestFailed]);

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

  const obsTimeText = useMemo(() => {
    const d = toDate(metar?.obsTime);
    return d ? formatUtc(d) : null;
  }, [metar?.obsTime]);

  const issueTimeText = useMemo(() => {
    const d = toDate(taf?.issueTime);
    return d ? formatUtc(d) : null;
  }, [taf?.issueTime]);

  const qnhText = useMemo(() => {
    const v = formatQnh(metar?.altim);
    return v || null;
  }, [metar?.altim]);

  const metarCloudsLines = useMemo(() => {
    if (!Array.isArray(metar?.clouds) || !metar.clouds.length) return null;
    return metar.clouds.map((c: any) => {
      const cover = String(c.cover || '').toUpperCase();
      const coverDesc = cover ? cloudCoverName(locale, cover) : null;
      const left = coverDesc ? wrapDesc(locale, cover, coverDesc) : cover;
      const baseFt = formatCloudBaseFt(c.base);
      return `${left}${baseFt ? ` ${baseFt}` : ''}`.trim();
    });
  }, [metar?.clouds, locale]);

  const refreshedAtText = useMemo(() => {
    return refreshedAt ? formatUtc(refreshedAt) : null;
  }, [refreshedAt]);

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10 font-sans">
        <div className="relative overflow-hidden border border-gray-100 rounded-2xl bg-white">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
          <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-gray-100 blur-3xl opacity-60" />
          <div className="relative px-8 py-14 md:px-14">
            <div className="flex items-center gap-3 text-gray-500">
              <CloudSun size={18} strokeWidth={1.5} />
              <span className="text-[10px] tracking-[0.25em] uppercase">Weather Service</span>
            </div>
            <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl md:text-5xl font-light tracking-tight text-gray-900">{msg.title}</h1>
                <p className="mt-4 text-gray-500 font-light max-w-2xl leading-relaxed">
                  {msg.desc}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {msg.chips.map((c: string) => (
                  <span key={c} className="text-[10px] px-3 py-2 bg-white/70 border border-gray-100 rounded-xl text-gray-600 tracking-widest uppercase">
                    {c}
                  </span>
                ))}
                <a
                  href={locale === 'en' ? '/en' : '/'}
                  className="ml-4 inline-flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase text-gray-700 hover:text-black"
                >
                  <i data-lucide="arrow-left"></i>
                  {msg.text.back}
                </a>
              </div>
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

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 border border-gray-100 rounded-xl bg-white/60">
                <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-3">{msg.labels.airport}</div>
                <div className="text-base md:text-lg font-medium text-gray-900">{airportTitle.name || msg.text.none}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-white/70 text-xs text-gray-700">
                    <span className="text-[10px] tracking-widest uppercase text-gray-400">ICAO</span>
                    <span className="fira-code font-medium text-gray-900">{airportTitle.icaoId || msg.text.none}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-white/70 text-xs text-gray-700">
                    <span className="text-[10px] tracking-widest uppercase text-gray-400">IATA</span>
                    <span className="fira-code font-medium text-gray-900">{airportTitle.iata || msg.text.none}</span>
                  </span>
                </div>
              </div>
              <div className="p-5 border border-gray-100 rounded-xl bg-white/60">
                <div className="flex items-center gap-2 text-gray-400 mb-3">
                  <Clock size={16} strokeWidth={1.5} />
                  <span className="text-[10px] tracking-widest uppercase">{msg.labels.metarTime}</span>
                </div>
                <div className="text-base md:text-lg font-medium text-gray-900">{obsTimeText || msg.text.none}</div>
              </div>
              <div className="p-5 border border-gray-100 rounded-xl bg-white/60">
                <div className="flex items-center gap-2 text-gray-400 mb-3">
                  <List size={16} strokeWidth={1.5} />
                  <span className="text-[10px] tracking-widest uppercase">{msg.labels.tafIssue}</span>
                </div>
                <div className="text-base md:text-lg font-medium text-gray-900">{issueTimeText || msg.text.none}</div>
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

        <div className="mt-10 grid grid-cols-1 gap-10">
          <section className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
            <div className="px-8 py-7 md:px-12 border-b border-gray-50 flex items-center justify-between">
              <div>
                <div className="text-[10px] tracking-widest uppercase text-gray-400">METAR</div>
                <div className="mt-2 text-xl md:text-2xl font-light text-gray-900">{msg.labels.metarRealtime}</div>
              </div>
              <div className="text-[10px] tracking-widest uppercase text-gray-400">{metar?.fltCat || ''}</div>
            </div>

            <div className="p-7 md:p-10 flex flex-col gap-7">
              <div className="rounded-xl p-6 w-full bg-gray-50 border border-gray-100">
                <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-4">{msg.labels.rawMetar}</div>
                <pre className="fira-code text-base md:text-lg leading-relaxed whitespace-pre overflow-x-auto bg-white border border-gray-100 rounded-xl p-4 text-gray-900">{metar?.rawMETAR || msg.text.none}</pre>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <Wind size={16} strokeWidth={1.5} />
                    <span className="text-[10px] tracking-widest uppercase">{msg.labels.wind}</span>
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {metar?.wdir === 'VRB' ? msg.text.vrb : metar?.wdir !== null && metar?.wdir !== undefined ? `${metar.wdir}°` : msg.text.none}
                    {' / '}
                    {metar?.wspd ?? msg.text.none} kt
                    {metar?.windUnit === 'MPS' && metar?.wspdMps !== null && metar?.wspdMps !== undefined ? ` (${metar.wspdMps} m/s)` : ''}
                  </div>
                </div>
                {metar?.visib ? (
                  <div className="p-5 border border-gray-100 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-400 mb-3">
                      <Eye size={16} strokeWidth={1.5} />
                      <span className="text-[10px] tracking-widest uppercase">{msg.labels.visibility}</span>
                    </div>
                    <div className="text-lg font-medium text-gray-900">{metar.visib}</div>
                  </div>
                ) : null}
                <div className="p-5 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <Thermometer size={16} strokeWidth={1.5} />
                    <span className="text-[10px] tracking-widest uppercase">{msg.labels.tempDew}</span>
                  </div>
                  <div className="text-lg font-medium text-gray-900">{metar?.temp ?? msg.text.none}°C / {metar?.dewp ?? msg.text.none}°C</div>
                </div>
                <div className="p-5 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <Gauge size={16} strokeWidth={1.5} />
                    <span className="text-[10px] tracking-widest uppercase">{msg.labels.qnh}</span>
                  </div>
                  <div className="text-lg font-medium text-gray-900">{qnhText || msg.text.none}</div>
                </div>
                <div className="p-5 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <Cloud size={16} strokeWidth={1.5} />
                    <span className="text-[10px] tracking-widest uppercase">{msg.labels.clouds}</span>
                  </div>
                  {metarCloudsLines?.length ? (
                    <div className="text-lg font-medium text-gray-900 space-y-1">
                      {metarCloudsLines.map((line: string, i: number) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-lg font-medium text-gray-900">{msg.text.none}</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
            <div className="px-8 py-7 md:px-12 border-b border-gray-50">
              <div className="text-[10px] tracking-widest uppercase text-gray-400">TAF</div>
              <div className="mt-2 text-xl md:text-2xl font-light text-gray-900">{msg.labels.tafForecast}</div>
            </div>

            <div className="p-7 md:p-10 grid grid-cols-1 gap-7">
              <div className="rounded-xl p-6 bg-gray-50 border border-gray-100">
                <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-4">{msg.labels.rawTaf}</div>
                <pre className="fira-code text-base md:text-lg leading-relaxed whitespace-pre-wrap break-words overflow-x-hidden bg-white border border-gray-100 rounded-xl p-4 text-gray-900">{taf?.rawTAF || msg.text.none}</pre>
              </div>

              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <div className="px-7 py-6 border-b border-gray-50 flex items-center justify-between">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400">{msg.labels.segments}</div>
                  <div className="text-[10px] tracking-widest uppercase text-gray-400">
                    {taf?.fcsts?.length ? (locale === 'en' ? `${taf.fcsts.length} parts` : `${taf.fcsts.length} 段`) : ''}
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {(taf?.fcsts || []).map((fcst: any, idx: number) => {
                    const from = toDate(fcst?.timeFrom);
                    const to = toDate(fcst?.timeTo);
                    const timeText = from && to ? `${formatUtc(from)} - ${formatUtc(to)}` : msg.text.none;
                    const hasWind = fcst?.wdir !== null && fcst?.wdir !== undefined && fcst?.wspd !== null && fcst?.wspd !== undefined;
                    const windText = hasWind
                      ? `${fcst.wdir}° / ${fcst.wspd} kt${fcst?.windUnit === 'MPS' && fcst?.wspdMps !== null && fcst?.wspdMps !== undefined ? ` (${fcst.wspdMps} m/s)` : ''}`
                      : msg.text.none;
                    const cloudsLines = Array.isArray(fcst?.clouds) && fcst.clouds.length
                      ? fcst.clouds.map((c: any) => {
                        const cover = String(c.cover || '').toUpperCase();
                        const baseFt = formatCloudBaseFt(c.base);
                        const coverDesc = cover ? cloudCoverName(locale, cover) : null;
                        const left = coverDesc ? wrapDesc(locale, cover, coverDesc) : cover;
                        return `${left}${baseFt ? ` ${baseFt}` : ''}`.trim();
                      })
                      : null;
                    const segmentCards = [
                      { key: 'wind', label: msg.labels.wind, value: windText, show: hasWind },
                      { key: 'visib', label: msg.labels.visibility, value: fcst?.visib, show: !!fcst?.visib },
                      {
                        key: 'clouds',
                        label: msg.labels.clouds,
                        value: cloudsLines?.length ? (
                          <div className="space-y-1">
                            {cloudsLines.map((line: string, i: number) => (
                              <div key={i}>{line}</div>
                            ))}
                          </div>
                        ) : (
                          (cloudCoverName(locale, 'CLR') ? wrapDesc(locale, 'CLR', cloudCoverName(locale, 'CLR') as string) : 'CLR')
                        ),
                        show: true
                      }
                    ].filter((x) => x.show);
                    const colsClass = segmentCards.length === 1 ? 'md:grid-cols-1' : segmentCards.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';
                    return (
                      <div key={idx} className="p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-700 tracking-widest uppercase">
                              {fcst?.fcstChange || 'BASE'}
                            </span>
                            <span className="text-sm text-gray-500 font-light">{timeText}</span>
                          </div>
                          <div className="text-sm text-gray-500 font-light">{translateWxString(locale, fcst?.wxString) || msg.text.noSigWx}</div>
                        </div>

                        <div className={`mt-5 grid grid-cols-1 ${colsClass} gap-4`}>
                          {segmentCards.map((c) => (
                            <div key={c.key} className="p-5 border border-gray-100 rounded-xl">
                              <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{c.label}</div>
                              <div className="text-lg font-medium text-gray-900">{c.value || msg.text.none}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {(!taf?.fcsts || taf.fcsts.length === 0) && (
                    <div className="p-8 text-gray-500 font-light">{msg.text.none}</div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
    </main>
  );
};

export default function WeatherPage() {
  return <WeatherView locale="zh" />;
}
