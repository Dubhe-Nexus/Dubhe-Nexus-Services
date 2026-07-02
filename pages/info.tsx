import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Info, Search, Clock } from 'lucide-react';
import { useRouter } from 'next/router';
import { AirportNav } from '../components/AirportNav';

type Locale = 'zh' | 'en';

const messages: Record<Locale, any> = {
  zh: {
    title: '机场数据查询',
    desc: '查询全球机场基础数据，并展示 METAR / TAF 原报文。',
    placeholder: '输入 ICAO / IATA 代码',
    labels: {
      airport: '机场',
      position: '坐标',
      elevation: '标高',
      country: '国家/地区',
      state: '州/省',
      magdec: '磁差',
      owner: '运营方',
      runways: '跑道',
      surface: '材质',
      heading: '航向',
      length: '长度',
      width: '宽度',
      rawMetar: 'METAR 原报文',
      rawTaf: 'TAF 原报文'
    },
    text: {
      none: '—',
      back: '返回服务中心',
      refreshedAt: '刷新时间'
    },
    errors: {
      invalid: '请输入有效的 ICAO 或 IATA 代码',
      notFound: '未找到该机场数据',
      serverError: '数据请求失败，请稍后再试',
      requestFailed: '请求失败'
    }
  },
  en: {
    title: 'Airport Info',
    desc: 'Query global airport data and show raw METAR/TAF.',
    placeholder: 'Enter ICAO / IATA Code',
    labels: {
      airport: 'Airport',
      position: 'Position',
      elevation: 'Elevation',
      country: 'Country',
      state: 'State/Region',
      magdec: 'Mag. Var',
      owner: 'Owner',
      runways: 'Runways',
      surface: 'Surface',
      heading: 'Heading',
      length: 'Length',
      width: 'Width',
      rawMetar: 'Raw METAR',
      rawTaf: 'Raw TAF'
    },
    text: {
      none: '—',
      back: 'Back to Service Center',
      refreshedAt: 'Refreshed'
    },
    errors: {
      invalid: 'Please enter a valid ICAO or IATA code',
      notFound: 'Airport not found',
      serverError: 'Request failed, please try again later',
      requestFailed: 'Request failed'
    }
  }
};

const toDms = (value: number, isLat: boolean) => {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60);
  const dir = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  return `${deg}°${String(min).padStart(2, '0')}'${String(sec).padStart(2, '0')}"${dir}`;
};

const formatDmsPair = (lat: any, lon: any) => {
  const latNum = typeof lat === 'number' ? lat : Number(lat);
  const lonNum = typeof lon === 'number' ? lon : Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return null;
  return `${toDms(latNum, true)}, ${toDms(lonNum, false)}`;
};

export const InfoView = ({ locale = 'zh' }: { locale?: Locale }) => {
  const router = useRouter();
  const msg = messages[locale];
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const autoLoadedCodeRef = useRef<string | null>(null);

  const refreshedAtText = useMemo(() => {
    if (!refreshedAt) return '';
    const d = refreshedAt;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
  }, [refreshedAt]);

  const airport = data?.data || null;
  const posDms = useMemo(() => formatDmsPair(airport?.lat, airport?.lon), [airport?.lat, airport?.lon]);

  const runSearch = useCallback(async (rawCode: string) => {
    const q = rawCode.trim().toUpperCase();
    if (!q || (q.length !== 3 && q.length !== 4)) {
      setError(msg.errors.invalid);
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const r = await fetch(`/api/airports/${q}`);
      if (r.ok) {
        const j = await r.json();
        setData(j);
        setRefreshedAt(new Date());
        return;
      }
      if (r.status >= 500) throw new Error(msg.errors.serverError);
      throw new Error(msg.errors.notFound);
    } catch (err: any) {
      setError(err?.message || msg.errors.requestFailed);
    } finally {
      setLoading(false);
    }
  }, [msg.errors.invalid, msg.errors.notFound, msg.errors.requestFailed, msg.errors.serverError]);

  const onSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await runSearch(code);
  };

  useEffect(() => {
    if (!router.isReady) return;
    const queryIcao = router.query?.icao;
    const raw = Array.isArray(queryIcao) ? queryIcao[0] : queryIcao;
    if (!raw) return;

    const normalized = String(raw).trim().toUpperCase();
    if (normalized.length !== 3 && normalized.length !== 4) return;

    setCode(normalized);
    if (autoLoadedCodeRef.current === normalized) return;
    autoLoadedCodeRef.current = normalized;
    void runSearch(normalized);
  }, [router.isReady, router.query, runSearch]);

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10 font-sans">
      <div className="relative overflow-hidden border border-gray-100 rounded-2xl bg-white mb-10">
        <div className="absolute inset-0 bg-linear-to-b from-gray-50 to-white" />
        <div className="relative px-8 py-10 md:px-14">
          <div className="flex items-center gap-3 text-gray-500">
            <Info size={18} strokeWidth={1.5} />
            <span className="text-[10px] tracking-[0.25em] uppercase">Airport Service</span>
          </div>
          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl md:text-5xl font-light tracking-tight text-gray-900">{msg.title}</h1>
              <p className="mt-4 text-gray-500 font-light max-w-2xl leading-relaxed">{msg.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={locale === 'en' ? '/en' : '/'}
                className="inline-flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase text-gray-700 hover:text-black"
              >
                <i data-lucide="arrow-left"></i>
                {msg.text.back}
              </a>
            </div>
          </div>

          <form onSubmit={onSearch} className="mt-10 relative">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
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
        </div>
      </div>

      <section className="pb-12">
        {loading && (
          <div className="p-8 border border-gray-100 rounded-2xl bg-white text-gray-600 font-light">{locale === 'en' ? 'Loading...' : '正在获取数据...'}</div>
        )}
        {error && !loading && (
          <div className="p-8 border border-red-100 rounded-2xl bg-white text-red-600 font-light">{error}</div>
        )}

        {airport && !loading && (
          <div className="grid grid-cols-1 gap-6">
            <AirportNav
              locale={locale}
              airport={{
                name: airport?.name,
                icaoId: airport?.icaoId,
                iataId: airport?.iataId,
                faaId: airport?.faaId,
              }}
              currentPage="info"
            />

            <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
              <div className="px-8 py-7 border-b border-gray-50">
                <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-3">{msg.labels.position}</div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 border border-gray-100 rounded-xl">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{msg.labels.position}</div>
                  <div className="text-sm text-gray-900 font-medium">{posDms || msg.text.none}</div>
                </div>
                <div className="p-5 border border-gray-100 rounded-xl">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{msg.labels.elevation}</div>
                  <div className="text-sm text-gray-900 font-medium">{airport?.elev != null ? `${airport.elev} m` : msg.text.none}</div>
                </div>
                <div className="p-5 border border-gray-100 rounded-xl">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{msg.labels.country}</div>
                  <div className="text-sm text-gray-900 font-medium">{airport?.country || msg.text.none}</div>
                </div>
                <div className="p-5 border border-gray-100 rounded-xl">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{msg.labels.state}</div>
                  <div className="text-sm text-gray-900 font-medium">{airport?.state || msg.text.none}</div>
                </div>
                <div className="p-5 border border-gray-100 rounded-xl">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{msg.labels.magdec}</div>
                  <div className="text-sm text-gray-900 font-medium">{airport?.magdec ?? msg.text.none}</div>
                </div>
                <div className="p-5 border border-gray-100 rounded-xl">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{msg.labels.owner}</div>
                  <div className="text-sm text-gray-900 font-medium">{airport?.owner || msg.text.none}</div>
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50">
                <div className="text-[10px] tracking-widest uppercase text-gray-400">{msg.labels.runways}</div>
              </div>
              <div className="p-8">
                {Array.isArray(airport?.runways) && airport.runways.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {airport.runways.map((r: any, idx: number) => (
                      <div key={r?.id || idx} className="p-5 border border-gray-100 rounded-xl">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-gray-900">{r?.id || msg.text.none}</div>
                          <div className="text-[10px] tracking-widest uppercase text-gray-400">{r?.dimension || msg.text.none}</div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-1">{msg.labels.surface}</div>
                            <div className="text-gray-900 font-medium">{r?.surface || msg.text.none}</div>
                          </div>
                          <div>
                            <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-1">{msg.labels.heading}</div>
                            <div className="text-gray-900 font-medium">{r?.alignment ?? msg.text.none}</div>
                          </div>
                          <div>
                            <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-1">{msg.labels.length}</div>
                            <div className="text-gray-900 font-medium">{r?.lengthM != null ? `${r.lengthM} m` : msg.text.none}</div>
                          </div>
                          <div>
                            <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-1">{msg.labels.width}</div>
                            <div className="text-gray-900 font-medium">{r?.widthM != null ? `${r.widthM} m` : msg.text.none}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 font-light">{msg.text.none}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-50">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400">{msg.labels.rawMetar}</div>
                </div>
                <div className="p-8">
                  <pre className="raw-metar">{airport?.rawMETAR || msg.text.none}</pre>
                </div>
              </div>

              <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-50">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400">{msg.labels.rawTaf}</div>
                </div>
                <div className="p-8">
                  <pre className="raw-taf">{airport?.rawTAF || msg.text.none}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default function Page() {
  return <InfoView locale="zh" />;
}
