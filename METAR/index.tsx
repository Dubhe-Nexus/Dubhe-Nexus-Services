import React, { useState } from 'react';
import { Search, Wind, Thermometer, Cloud, Eye, Compass, Clock, MapPin } from 'lucide-react';

const MetarQuery = () => {
  const [icao, setIcao] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icao || icao.length !== 4) {
      setError('请输入有效的 4 位 ICAO 代码');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/airports/metar/${icao.toUpperCase()}`);
      if (!response.ok) throw new Error('未找到该机场的气象数据');
      const result = await response.json();
      setData(result?.metar ?? null);
    } catch (err: any) {
      setError(err?.message || '请求失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-20 font-sans min-h-screen bg-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-light text-gray-900 mb-2">METAR 气象查询</h1>
        <p className="text-gray-400 font-light mb-12">实时获取全球机场气象观测报文及解析数据。</p>

        <form onSubmit={handleSearch} className="relative mb-12">
          <input
            type="text"
            value={icao}
            onChange={(e) => setIcao(e.target.value.toUpperCase())}
            placeholder="输入 ICAO 代码 (例如: VHHH)"
            maxLength={4}
            className="w-full px-8 py-6 bg-gray-50 border border-gray-100 rounded-[2rem] text-xl font-medium focus:outline-none focus:border-black transition-all"
          />
          <button
            type="submit"
            className="absolute right-4 top-4 p-4 bg-black text-white rounded-2xl hover:bg-gray-800 transition-colors"
          >
            <Search size={24} />
          </button>
        </form>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400 font-light">正在获取数据...</p>
          </div>
        )}

        {error && (
          <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-light mb-8">
            {error}
          </div>
        )}

        {data && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 原始报文卡片 */}
            <div className="p-8 bg-gray-900 text-white rounded-[2rem] mb-8">
              <div className="text-[10px] tracking-widest uppercase text-gray-500 mb-4">Raw METAR</div>
              <pre className="text-lg md:text-xl font-mono leading-relaxed whitespace-pre-wrap">{data.rawMETAR}</pre>
            </div>

            {/* 解析数据网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-8 border border-gray-100 rounded-[2rem] bg-white hover:border-black transition-colors">
                <div className="flex items-center gap-3 text-gray-400 mb-6">
                  <Clock size={20} strokeWidth={1.5} />
                  <span className="text-[10px] tracking-widest uppercase font-medium">观测时间</span>
                </div>
                <div className="text-2xl font-medium text-gray-900">{new Date(data.obsTime).toLocaleString()}</div>
              </div>

              <div className="p-8 border border-gray-100 rounded-[2rem] bg-white hover:border-black transition-colors">
                <div className="flex items-center gap-3 text-gray-400 mb-6">
                  <Wind size={20} strokeWidth={1.5} />
                  <span className="text-[10px] tracking-widest uppercase font-medium">风向/风速</span>
                </div>
                <div className="text-2xl font-medium text-gray-900">
                  {data.wdir === 'VRB' ? '不定向' : `${data.wdir}°`} / {data.wspd} KT
                </div>
              </div>

              <div className="p-8 border border-gray-100 rounded-[2rem] bg-white hover:border-black transition-colors">
                <div className="flex items-center gap-3 text-gray-400 mb-6">
                  <Eye size={20} strokeWidth={1.5} />
                  <span className="text-[10px] tracking-widest uppercase font-medium">能见度</span>
                </div>
                <div className="text-2xl font-medium text-gray-900">{data.visib || '未知'}</div>
              </div>

              <div className="p-8 border border-gray-100 rounded-[2rem] bg-white hover:border-black transition-colors">
                <div className="flex items-center gap-3 text-gray-400 mb-6">
                  <Thermometer size={20} strokeWidth={1.5} />
                  <span className="text-[10px] tracking-widest uppercase font-medium">气温 / 露点</span>
                </div>
                <div className="text-2xl font-medium text-gray-900">{data.temp}°C / {data.dewp}°C</div>
              </div>

              <div className="p-8 border border-gray-100 rounded-[2rem] bg-white hover:border-black transition-colors">
                <div className="flex items-center gap-3 text-gray-400 mb-6">
                  <Compass size={20} strokeWidth={1.5} />
                  <span className="text-[10px] tracking-widest uppercase font-medium">修正海压</span>
                </div>
                <div className="text-2xl font-medium text-gray-900">{data.altim} inHg</div>
              </div>

              <div className="p-8 border border-gray-100 rounded-[2rem] bg-white hover:border-black transition-colors">
                <div className="flex items-center gap-3 text-gray-400 mb-6">
                  <MapPin size={20} strokeWidth={1.5} />
                  <span className="text-[10px] tracking-widest uppercase font-medium">飞行规则</span>
                </div>
                <div className={`text-2xl font-medium ${
                  data.fltCat === 'VFR' ? 'text-green-600' :
                  data.fltCat === 'IFR' ? 'text-red-600' :
                  'text-blue-600'
                }`}>{data.fltCat}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetarQuery;
