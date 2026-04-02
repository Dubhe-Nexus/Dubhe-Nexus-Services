import React, { useMemo, useState } from 'react';
import { Search, Navigation, Globe, MapPin } from 'lucide-react';

type Locale = 'zh' | 'en';

const text: Record<Locale, any> = {
  zh: {
    eyebrow: '机场资料',
    title: '机场资料查询',
    desc: '输入 ICAO / IATA 代码获取机场基础资料，并展示 METAR / TAF 原报文。',
    placeholder: '输入 ICAO / IATA 代码',
    loading: '正在获取数据...',
    invalid: '请输入有效的 ICAO(4) 或 IATA(3) 代码',
    notFound: '未找到该机场的基础数据',
    requestFailed: '请求失败',
    sections: {
      airport: '机场',
      runways: '跑道信息',
      location: '地理位置',
      raw: 'METAR / TAF 原报文'
    },
    back: '返回服务中心',
    fields: {
      country: '国家/地区',
      region: '区域',
      elevation: '标高',
      magVar: '磁差',
      length: '长度',
      width: '宽度',
      surface: '材质',
      heading: '真航向',
      lat: '纬度',
      lon: '经度',
      dms: 'DMS'
    },
    none: '—'
  },
  en: {
    eyebrow: 'Airport Data',
    title: 'Airport Information',
    desc: 'Query airport data by ICAO / IATA and show raw METAR / TAF.',
    placeholder: 'Enter ICAO / IATA code',
    loading: 'Loading...',
    invalid: 'Please enter a valid ICAO (4) or IATA (3) code',
    notFound: 'Airport not found',
    requestFailed: 'Request failed',
    sections: {
      airport: 'Airport',
      runways: 'Runways',
      location: 'Location',
      raw: 'Raw METAR / TAF'
    },
    back: 'Back to Service Center',
    fields: {
      country: 'Country',
      region: 'Region',
      elevation: 'Elevation',
      magVar: 'Mag Var',
      length: 'Length',
      width: 'Width',
      surface: 'Surface',
      heading: 'True Heading',
      lat: 'Latitude',
      lon: 'Longitude',
      dms: 'DMS'
    },
    none: '—'
  }
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const decimalToDms = (value: number, isLat: boolean) => {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60);
  const hemi = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  return `${deg}°${pad2(min)}'${pad2(sec)}"${hemi}`;
};

const runwaySurfaceLabel = (locale: Locale, value: any) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const s = raw.toUpperCase();
  const mapZh: Record<string, string> = {
    H: '硬质',
    HARD: '硬质',
    ASP: '沥青',
    ASPHALT: '沥青',
    CON: '混凝土',
    CONCRETE: '混凝土',
    G: '草地',
    GRS: '草地',
    GRASS: '草地',
    TURF: '草皮',
    GVL: '碎石',
    GRAVEL: '碎石',
    DRT: '土',
    DIRT: '土',
    W: '水上',
    WATER: '水上',
    S: '冰/雪',
    'SNOW/ICE': '冰/雪',
    SNOW: '雪',
    ICE: '冰',
    SAND: '沙地',
    CLAY: '黏土'
  };
  const mapEn: Record<string, string> = {
    H: 'Hard',
    HARD: 'Hard',
    ASP: 'Asphalt',
    ASPHALT: 'Asphalt',
    CON: 'Concrete',
    CONCRETE: 'Concrete',
    G: 'Grass',
    GRS: 'Grass',
    GRASS: 'Grass',
    TURF: 'Turf',
    GVL: 'Gravel',
    GRAVEL: 'Gravel',
    DRT: 'Dirt',
    DIRT: 'Dirt',
    W: 'Water',
    WATER: 'Water',
    S: 'Snow/Ice',
    'SNOW/ICE': 'Snow/Ice',
    SNOW: 'Snow',
    ICE: 'Ice',
    SAND: 'Sand',
    CLAY: 'Clay'
  };
  const map = locale === 'en' ? mapEn : mapZh;
  return map[s] || raw;
};

export default function InfoQuery({ locale = 'zh' }: { locale?: Locale }) {
  const t = text[locale];
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = result?.data ?? null;
  const runways = Array.isArray(data?.runways) ? data.runways : [];

  const airportTitle = useMemo(() => {
    const name = data?.name || '';
    const iata = data?.iataId || '';
    const icaoId = data?.icaoId || '';
    return { name, iata, icaoId };
  }, [data?.name, data?.iataId, data?.icaoId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = code.trim().toUpperCase();
    if (!q || (q.length !== 3 && q.length !== 4)) {
      setError(t.invalid);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`/api/airports/${q}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || t.notFound);
      }
      setResult(payload);
    } catch (err: any) {
      setError(err?.message || t.requestFailed);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const latText = typeof data?.lat === 'number' ? data.lat.toFixed(4) : '—';
  const lonText = typeof data?.lon === 'number' ? data.lon.toFixed(4) : '—';
  const dmsText = typeof data?.lat === 'number' && typeof data?.lon === 'number'
    ? `${decimalToDms(data.lat, true)}, ${decimalToDms(data.lon, false)}`
    : t.none;

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10 font-sans">
      <div className="relative overflow-hidden border border-gray-100 rounded-2xl bg-white">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-gray-100 blur-3xl opacity-60" />
        <div className="relative px-8 py-14 md:px-14">
          <div className="flex items-center gap-3 text-gray-500">
            <MapPin size={18} strokeWidth={1.5} />
            <span className="text-[10px] tracking-[0.25em] uppercase">{t.eyebrow}</span>
            <a
              href={locale === 'en' ? '/en' : '/'}
              className="ml-auto inline-flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase text-gray-700 hover:text-black"
            >
              <i data-lucide="arrow-left"></i>
              {t.back}
            </a>
          </div>
          <div className="mt-6">
            <h1 className="text-3xl md:text-5xl font-light tracking-tight text-gray-900">{t.title}</h1>
            <p className="mt-4 text-gray-500 font-light max-w-2xl leading-relaxed">
              {t.desc}
            </p>
          </div>

          <form onSubmit={handleSearch} className="mt-10 relative">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t.placeholder}
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

      {loading && (
        <div className="text-center py-14">
          <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 font-light">{t.loading}</p>
        </div>
      )}

      {error && (
        <div className="mt-8 p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-light">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-10 grid grid-cols-1 gap-8">
          <section className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
            <div className="p-7 md:p-10">
              <div className="rounded-xl p-6 bg-gray-50 border border-gray-100">
                <div className="text-[10px] tracking-widest uppercase text-gray-400">{t.sections.airport}</div>
                <div className="mt-3 text-xl md:text-2xl font-light text-gray-900">{airportTitle.name || t.none}</div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-white text-xs text-gray-700">
                    <span className="text-[10px] tracking-widest uppercase text-gray-400">ICAO</span>
                    <span className="fira-code font-medium text-gray-900">{airportTitle.icaoId || t.none}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-white text-xs text-gray-700">
                    <span className="text-[10px] tracking-widest uppercase text-gray-400">IATA</span>
                    <span className="fira-code font-medium text-gray-900">{airportTitle.iata || t.none}</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
            <div className="px-8 py-7 md:px-12 border-b border-gray-50 flex items-center gap-3">
              <Globe size={16} strokeWidth={1.5} className="text-gray-400" />
              <div>
                <div className="text-[10px] tracking-widest uppercase text-gray-400">{locale === 'en' ? 'BASIC' : '基本资料'}</div>
                <div className="mt-2 text-xl md:text-2xl font-light text-gray-900">{locale === 'en' ? 'Basic Information' : '基本资料'}</div>
              </div>
            </div>
            <div className="p-7 md:p-10 grid grid-cols-1 gap-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 border border-gray-100 rounded-xl bg-white/60">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{t.fields.country}</div>
                  <div className="text-base md:text-lg font-medium text-gray-900">{data.country || t.none}</div>
                </div>
                <div className="p-5 border border-gray-100 rounded-xl bg-white/60">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{t.fields.region}</div>
                  <div className="text-base md:text-lg font-medium text-gray-900">{data.state || t.none}</div>
                </div>
                <div className="p-5 border border-gray-100 rounded-xl bg-white/60">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{t.fields.elevation}</div>
                  <div className="text-base md:text-lg font-medium text-gray-900">{data.elev !== null && data.elev !== undefined ? `${data.elev} ft` : t.none}</div>
                </div>
                <div className="p-5 border border-gray-100 rounded-xl bg-white/60">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{t.fields.magVar}</div>
                  <div className="text-base md:text-lg font-medium text-gray-900">{data.magdec !== null && data.magdec !== undefined ? `${data.magdec}°` : t.none}</div>
                </div>
              </div>

              <div className="p-5 border border-gray-100 rounded-xl bg-white/60">
                <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{t.fields.dms}</div>
                <div className="text-base md:text-lg font-medium text-gray-900">{dmsText}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 border border-gray-100 rounded-xl bg-white/60">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{t.fields.lat}</div>
                  <div className="text-base md:text-lg font-medium text-gray-900">{latText}</div>
                </div>
                <div className="p-5 border border-gray-100 rounded-xl bg-white/60">
                  <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">{t.fields.lon}</div>
                  <div className="text-base md:text-lg font-medium text-gray-900">{lonText}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
            <div className="px-8 py-7 md:px-12 border-b border-gray-50">
              <div className="text-[10px] tracking-widest uppercase text-gray-400">RAW</div>
              <div className="mt-2 text-xl md:text-2xl font-light text-gray-900">{locale === 'en' ? 'Weather Data (Raw)' : '天气数据（原报文）'}</div>
            </div>
            <div className="p-7 md:p-10 grid grid-cols-1 gap-5">
              <div className="rounded-xl p-6 bg-gray-50 border border-gray-100">
                <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-4">METAR</div>
                <pre className="fira-code text-base md:text-lg leading-relaxed whitespace-pre overflow-x-auto bg-white border border-gray-100 rounded-xl p-4 text-gray-900">{data.rawMETAR || t.none}</pre>
              </div>
              <div className="rounded-xl p-6 bg-gray-50 border border-gray-100">
                <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-4">TAF</div>
                <pre className="fira-code text-base md:text-lg leading-relaxed whitespace-pre-wrap break-words overflow-x-hidden bg-white border border-gray-100 rounded-xl p-4 text-gray-900">{data.rawTAF || t.none}</pre>
              </div>
            </div>
          </section>

          <section className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
            <div className="px-8 py-7 md:px-12 border-b border-gray-50 flex items-center gap-3">
              <Navigation size={16} strokeWidth={1.5} className="text-gray-400" />
              <div>
                <div className="text-[10px] tracking-widest uppercase text-gray-400">{locale === 'en' ? 'RUNWAYS' : '跑道信息'}</div>
                <div className="mt-2 text-xl md:text-2xl font-light text-gray-900">{locale === 'en' ? 'Runways' : '跑道信息'}</div>
              </div>
            </div>

            <div className="p-7 md:p-10">
              {runways.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {runways.map((r: any, idx: number) => (
                    <div key={idx} className="p-6 border border-gray-100 rounded-2xl bg-white hover:border-black transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-xl font-mono font-medium text-gray-900">{r?.id || t.none}</div>
                      </div>
                      <div className="mt-5 grid grid-cols-1 gap-3">
                        <div className="flex items-center justify-between text-sm font-light">
                          <span className="text-gray-400">{t.fields.length}</span>
                          <span className="text-gray-900">{r?.lengthM !== null && r?.lengthM !== undefined ? `${r.lengthM} m` : t.none}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-light">
                          <span className="text-gray-400">{t.fields.width}</span>
                          <span className="text-gray-900">{r?.widthM !== null && r?.widthM !== undefined ? `${r.widthM} m` : t.none}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-light">
                          <span className="text-gray-400">{t.fields.surface}</span>
                          <span className="text-gray-900">{runwaySurfaceLabel(locale, r?.surface) || t.none}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-light">
                          <span className="text-gray-400">{t.fields.heading}</span>
                          <span className="text-gray-900">{r?.alignment !== null && r?.alignment !== undefined ? `${r.alignment}°` : t.none}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 font-light">{t.none}</div>
              )}
            </div>
          </section>

          <section className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
            <div className="px-8 py-7 md:px-12 border-b border-gray-50">
              <div className="text-[10px] tracking-widest uppercase text-gray-400">{locale === 'en' ? 'CHARTS' : '航图'}</div>
              <div className="mt-2 text-xl md:text-2xl font-light text-gray-900">{locale === 'en' ? 'Latest Airport Charts' : '最近机场航图'}</div>
            </div>
            <div className="p-7 md:p-10">
              <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
                <iframe
                  title="Charts"
                  src={`https://portal.skylitefly.com/charts?icao=${encodeURIComponent(airportTitle.icaoId || '')}&embedding=1`}
                  style={{ width: '100%', height: '860px', border: 0 }}
                  loading="lazy"
                />
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
