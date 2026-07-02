import React from 'react';
import { Map, CloudSun, Info } from 'lucide-react';

type Locale = 'zh' | 'en';
type Page = 'charts' | 'weather' | 'info';

interface AirportData {
  name?: string;
  icaoId?: string;
  iataId?: string;
  faaId?: string;
}

const navLabels: Record<Locale, Record<string, string>> = {
  zh: {
    charts: '航图',
    weather: '气象',
    info: '机场资料',
  },
  en: {
    charts: 'Charts',
    weather: 'Weather',
    info: 'Info',
  },
};

export const AirportNav = ({
  locale,
  airport,
  currentPage,
}: {
  locale: Locale;
  airport: AirportData;
  currentPage: Page;
}) => {
  const labels = navLabels[locale];
  const icao = airport?.icaoId || '';
  const prefix = locale === 'en' ? '/en' : '';

  const navItems: { key: Page; label: string; href: string; icon: React.ReactNode }[] = [
    {
      key: 'charts',
      label: labels.charts,
      href: `${prefix}/charts?icao=${icao}`,
      icon: <Map size={14} strokeWidth={1.5} />,
    },
    {
      key: 'weather',
      label: labels.weather,
      href: `${prefix}/weather?icao=${icao}`,
      icon: <CloudSun size={14} strokeWidth={1.5} />,
    },
    {
      key: 'info',
      label: labels.info,
      href: `${prefix}/info?icao=${icao}`,
      icon: <Info size={14} strokeWidth={1.5} />,
    },
  ];

  return (
    <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
      <div className="px-8 py-7 md:px-12 border-b border-gray-50">
        {/* 机场名称和代码 */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-[10px] tracking-widest uppercase text-gray-400 mb-2">
              {locale === 'en' ? 'Airport' : '机场'}
            </div>
            <div className="text-xl md:text-2xl font-light text-gray-900">
              {airport?.name || (locale === 'en' ? 'Loading...' : '加载中...')}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {icao && (
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-white text-xs text-gray-700">
                <span className="text-[10px] tracking-widest uppercase text-gray-400">ICAO</span>
                <span className="font-medium text-gray-900">{icao}</span>
              </span>
            )}
            {airport?.iataId && (
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-white text-xs text-gray-700">
                <span className="text-[10px] tracking-widest uppercase text-gray-400">IATA</span>
                <span className="font-medium text-gray-900">{airport.iataId}</span>
              </span>
            )}
            {airport?.faaId && (
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-white text-xs text-gray-700">
                <span className="text-[10px] tracking-widest uppercase text-gray-400">FAA</span>
                <span className="font-medium text-gray-900">{airport.faaId}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 导航链接 */}
      {icao && (
        <div className="px-8 py-4 md:px-12 bg-gray-50/50">
          <div className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => {
              const isActive = item.key === currentPage;
              return isActive ? (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-xs font-medium"
                >
                  {item.icon}
                  {item.label}
                </span>
              ) : (
                <a
                  key={item.key}
                  href={item.href}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:border-black hover:text-black transition-colors text-xs font-medium"
                >
                  {item.icon}
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
