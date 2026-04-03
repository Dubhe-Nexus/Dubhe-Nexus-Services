import React from 'react';
import { CloudSun, Radio, Map, Book, TowerControl, ChevronRight, Shield, MessageSquare, HelpCircle, Info } from 'lucide-react';

type Locale = 'zh' | 'en';

const text: Record<Locale, any> = {
  zh: {
    tag: 'Service Center',
    title: '服务中心',
    subtitle: '天枢互联一站式服务平台，为您提供专业的航空信息与社区支持。',
    sectionData: '数据服务',
    cards: {
      weatherTitle: '气象数据查询',
      weatherDesc: '在同一页面展示 METAR 与 TAF，并提供结构化解码结果。',
      infoTitle: '机场数据',
      infoDesc: '提供全球机场的详细数据，包括跑道信息、通信频率、导航设施等。',
      chartsTitle: '航图查询',
      chartsDesc: '提供全球机场航图、SID/STAR、进近图等飞行程序图表。',
      go: '立即前往',
      soon: '暂未开放',
      coming: 'Coming Soon'
    }
  },
  en: {
    tag: 'Service Center',
    title: 'Service Center',
    subtitle: 'A one-stop hub for aviation data and community services.',
    sectionData: 'Data Services',
    cards: {
      weatherTitle: 'Weather',
      weatherDesc: 'METAR and TAF on one page with structured decoding.',
      infoTitle: 'Airport Info',
      infoDesc: 'Global airport data including runways, location, and key metadata.',
      chartsTitle: 'Charts',
      chartsDesc: 'Airport charts, SID/STAR and approach plates.',
      go: 'Open',
      soon: 'Coming Soon',
      coming: 'Coming Soon'
    }
  }
};

const ServiceCenter = ({ locale = 'zh' }: { locale?: Locale }) => {
  const t = text[locale];
  const weatherHref = locale === 'en' ? '/en/weather' : '/weather';
  const infoHref = locale === 'en' ? '/en/info' : '/info';

  const pilotServices = [
    {
      title: t.cards.weatherTitle,
      icon: CloudSun,
      color: 'blue',
      description: t.cards.weatherDesc,
      href: weatherHref,
      status: 'available',
      features: ['METAR', 'TAF', 'Decode']
    },
    {
      title: t.cards.infoTitle,
      icon: Info,
      color: 'green',
      description: t.cards.infoDesc,
      href: infoHref,
      status: 'available'
    },
    {
      title: t.cards.chartsTitle,
      icon: Map,
      color: 'orange',
      description: t.cards.chartsDesc,
      href: '#',
      status: 'coming_soon'
    }
  ];

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10 font-sans">
      <div className="relative overflow-hidden border border-gray-100 rounded-2xl bg-white mb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-gray-100 blur-3xl opacity-60" />
        <div className="relative px-8 py-14 md:px-14">
          <div className="flex items-center gap-3 text-gray-500">
            <span className="text-[10px] tracking-[0.25em] uppercase">{t.tag}</span>
          </div>
          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl md:text-6xl font-light text-gray-900 tracking-tight">{t.title}</h1>
              <p className="mt-4 text-gray-500 font-light max-w-2xl leading-relaxed">
                {t.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-20">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-1 h-8 bg-black"></div>
          <h2 className="text-2xl font-light tracking-widest uppercase">{t.sectionData}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pilotServices.map((service, index) => (
            <a 
              key={index}
              href={service.status === 'available' ? service.href : '#'}
              className={`group relative p-10 border border-gray-100 rounded-2xl transition-all duration-500 overflow-hidden ${
                service.status === 'available' ? 'hover:border-black hover:shadow-2xl hover:-translate-y-2' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex justify-between items-start mb-8">
                <div className="p-4 bg-gray-50 rounded-2xl transition-colors group-hover:bg-black group-hover:text-white">
                  <service.icon size={32} strokeWidth={1.5} />
                </div>
                {service.status === 'coming_soon' && (
                  <span className="text-[10px] tracking-widest uppercase text-gray-400 font-medium">{t.cards.coming}</span>
                )}
              </div>
              
              <h3 className="text-2xl font-medium text-gray-900 mb-4">{service.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-8 font-light">
                {service.description}
              </p>
              
              {service.features && (
                <div className="flex gap-2 mb-8">
                  {service.features.map((f, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 bg-gray-50 text-gray-500 rounded-md tracking-wider">{f}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                <span className={`text-xs font-medium tracking-widest uppercase ${service.status === 'available' ? 'text-black' : 'text-gray-300'}`}>
                  {service.status === 'available' ? t.cards.go : t.cards.soon}
                </span>
                {service.status === 'available' && (
                  <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                )}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* 底部声明 - 参考 VAAHK */}
      <section className="bg-gray-50 rounded-2xl p-12 md:p-20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <Shield size={40} strokeWidth={1} className="text-gray-900" />
            <h2 className="text-3xl font-light tracking-tight">数据与服务声明</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <p className="text-gray-500 text-sm leading-relaxed font-light">
                本平台所提供的虚拟航空数据（包括但不限于气象报文、机场资料、频率列表等）仅供模拟飞行爱好者参考与娱乐使用。
              </p>
              <p className="text-gray-500 text-sm leading-relaxed font-light">
                气象解析器基于公开数据接口实现，结果仅供参考，不保证 100% 准确性。如有差异，请以官方航行通告（NOTAM）及权威渠道为准。
              </p>
            </div>
            <div className="space-y-6">
              <p className="text-gray-900 text-sm font-medium leading-relaxed">
                严禁将本站任何数据用于真实飞行操作、真实航空活动或商业用途。
              </p>
              <p className="text-gray-500 text-sm leading-relaxed font-light">
                天枢互联不承担任何因错误使用本站数据而导致的直接或间接法律责任。
              </p>
            </div>
          </div>
        </div>
        {/* 装饰元素 */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-50"></div>
      </section>
    </main>
  );
};

export default ServiceCenter;
