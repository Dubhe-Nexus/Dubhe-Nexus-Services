import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { Plane, Search, RotateCw } from 'lucide-react';

declare const FLIGHT_DATA: {
  getAllFlights(): Promise<Flight[]>;
  formatAltitude(alt: number | null): string;
  formatDeptime(time: string): string;
  buildTicketHTML(flight: Flight): string;
  ensureFlightAirports(flight: Flight): void;
};

interface Flight {
  source: string;
  callsign: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  groundspeed: number;
  heading: number | null;
  departure: string;
  arrival: string;
  aircraft: string;
  cruise_altitude: string;
  cruise_tas: string;
  route: string;
  deptime: string;
  enroute_time: string;
  fuel_time: string;
  remarks: string;
  logon_time: string;
  transponder: string;
  cid: string;
  _gsRaw?: number;
}

const SOURCE_COLORS: Record<string, string> = {
  VATSIM: '#0288d1',
  ISFP: '#2aa37b',
  SkyLite: '#d4af37',
  Volanta: '#8b5cf6',
  IVAO: '#f59e0b',
  PilotEdge: '#0d9488',
  APOC: '#ec4899',
  'Plane Pal': '#06b6d4',
};

const SOURCE_KEYS = ['all', 'VATSIM', 'IVAO', 'Volanta', 'PilotEdge', 'Plane Pal', 'SkyLite', 'APOC', 'ISFP'] as const;

export default function FlightsPage() {
  const [allFlights, setAllFlights] = useState<Flight[]>([]);
  const [currentSource, setCurrentSource] = useState<string>('all');
  const [currentQuery, setCurrentQuery] = useState('');
  const [updateTime, setUpdateTime] = useState('');
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const firstLoad = useRef(true);

  const filteredFlights = useMemo(() => {
    let filtered = [...allFlights];
    if (currentSource !== 'all') {
      filtered = filtered.filter((f) => f.source === currentSource);
    }
    if (currentQuery.trim()) {
      const q = currentQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (f) =>
          (f.callsign && f.callsign.toLowerCase().includes(q)) ||
          (f.name && f.name.toLowerCase().includes(q)) ||
          (f.departure && f.departure.toLowerCase().includes(q)) ||
          (f.arrival && f.arrival.toLowerCase().includes(q)) ||
          (f.aircraft && f.aircraft.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [allFlights, currentSource, currentQuery]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SOURCE_KEYS.forEach((k) => {
      if (k === 'all') {
        counts[k] = allFlights.length;
      } else {
        counts[k] = allFlights.filter((f) => f.source === k).length;
      }
    });
    return counts;
  }, [allFlights]);

  const refreshFlights = useCallback(async () => {
    if (typeof FLIGHT_DATA === 'undefined') return;
    const flights = await FLIGHT_DATA.getAllFlights();
    setAllFlights(flights);
    setUpdateTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    firstLoad.current = false;
  }, []);

  const closeDetailRow = useCallback((detailRow: HTMLTableRowElement) => {
    if (!detailRow || detailRow.classList.contains('closing')) return;
    detailRow.classList.add('closing');
    const prev = detailRow.previousElementSibling;
    if (prev) prev.classList.remove('expanded');
    const card = detailRow.querySelector('.ticket-card');
    let removed = false;
    const removeRow = () => {
      if (removed) return;
      removed = true;
      detailRow.remove();
    };
    if (card) {
      card.addEventListener('animationend', removeRow, { once: true });
    }
    setTimeout(removeRow, 400);
  }, []);

  useEffect(() => {
    const id = setInterval(refreshFlights, 1000);
    refreshFlights();
    return () => clearInterval(id);
  }, [refreshFlights]);

  useEffect(() => {
    const tbody = tbodyRef.current;
    if (!tbody) return;

    if (firstLoad.current) return;

    const sourceColors: Record<string, string> = {
      VATSIM: 'var(--tech-blue)',
      ISFP: 'var(--text-green)',
      SkyLite: 'var(--gold-color)',
      Volanta: '#8b5cf6',
      IVAO: '#f59e0b',
      PilotEdge: '#0d9488',
      APOC: '#ec4899',
      'Plane Pal': '#06b6d4',
    };

    const newKeys = new Map<string, Flight>();
    filteredFlights.forEach((f) => {
      newKeys.set(f.callsign + '|' + f.source, f);
    });

    tbody.querySelectorAll('.loading-cell').forEach((r) => r.parentElement?.remove());

    const existingRows = tbody.querySelectorAll('tr[data-flight-key]');
    const existingKeys = new Set<string>();

    existingRows.forEach((row) => {
      const htmlRow = row as HTMLElement;
      const key = htmlRow.dataset.flightKey || '';
      const flight = newKeys.get(key);
      if (flight) {
        existingKeys.add(key);
        const cells = htmlRow.children;
        if (cells.length >= 8) {
          const newAlt = FLIGHT_DATA.formatAltitude(flight.altitude);
          const newSpd = flight.groundspeed != null ? `${flight.groundspeed} kt` : '-';
          if (cells[6].textContent !== newAlt) cells[6].textContent = newAlt;
          if (cells[7].textContent !== newSpd) cells[7].textContent = newSpd;
        }
      } else {
        htmlRow.remove();
      }
    });

    newKeys.forEach((f, key) => {
      if (!existingKeys.has(key)) {
        const sourceColor = sourceColors[f.source] || 'var(--dark-grey)';
        const row = document.createElement('tr');
        row.dataset.flightKey = key;
        row.innerHTML = `<td><strong>${f.callsign || '-'}</strong></td>
          <td>${f.name || '-'}</td>
          <td style="font-size:.85rem;">${FLIGHT_DATA.formatDeptime(f.deptime)}</td>
          <td>${f.departure || '-'}</td>
          <td>${f.arrival || '-'}</td>
          <td>${f.aircraft || '-'}</td>
          <td>${FLIGHT_DATA.formatAltitude(f.altitude)}</td>
          <td>${f.groundspeed != null ? `${f.groundspeed} kt` : '-'}</td>
          <td><span style="color:${sourceColor};font-weight:500;">${f.source}</span></td>`;
        tbody.appendChild(row);
      }
    });

    if (filteredFlights.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">暂无匹配的航班数据</td></tr>';
    }
  }, [filteredFlights, allFlights.length]);

  const handleTableClick = useCallback(
    (e: React.MouseEvent) => {
      const row = (e.target as HTMLElement).closest('tr[data-flight-key]') as HTMLTableRowElement | null;
      if (!row) return;
      const key = row.dataset.flightKey || '';
      const nextRow = row.nextElementSibling as HTMLTableRowElement | null;
      if (nextRow && nextRow.classList.contains('flight-ticket-detail')) {
        closeDetailRow(nextRow);
        return;
      }
      const tbody = row.parentElement;
      if (!tbody) return;
      tbody.querySelectorAll('.flight-ticket-detail').forEach((r) => closeDetailRow(r as HTMLTableRowElement));
      const flightData = allFlights.find((f) => f.callsign + '|' + f.source === key);
      if (!flightData) return;
      const detailRow = document.createElement('tr');
      detailRow.className = 'flight-ticket-detail active';
      detailRow.innerHTML = FLIGHT_DATA.buildTicketHTML(flightData);
      row.after(detailRow);
      row.classList.add('expanded');
      FLIGHT_DATA.ensureFlightAirports(flightData);
    },
    [allFlights, closeDetailRow]
  );

  return (
    <>
      <Head>
        <title>实时航班 - 天枢互联数据服务 | Dubhe Nexus Data Service</title>
      </Head>

      <style>{`
        :root {
          --tech-blue: #0288d1;
          --text-green: #2aa37b;
          --gold-color: #d4af37;
          --dark-grey: #52606d;
          --medium-grey: #e6e8eb;
          --light-grey: #f8f9fa;
          --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes flightTicketIn {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes flightTicketOut {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .flights-page { max-width: 1320px; margin: 0 auto; padding: 2rem 2rem 4rem; }
        .flights-hero { padding: 2rem 0 1rem; }
        .flights-hero h1 { font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 200; letter-spacing: -0.02em; color: #111; }
        .flights-hero p { margin-top: .5rem; font-size: .85rem; color: #8b8b8b; font-weight: 300; }
        .flights-stats { display: flex; gap: 2rem; flex-wrap: wrap; margin: 1.25rem 0; }
        .stat-item { font-size: .85rem; color: #555; display: flex; align-items: center; gap: .5rem; }
        .stat-item i { color: #0288d1; font-size: .9rem; }
        .stat-item strong { font-weight: 500; color: #111; }
        .flights-source-filter { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 1rem; }
        .source-btn { font-size: 11px; letter-spacing: .04em; padding: 5px 14px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fff; color: #666; cursor: pointer; font-weight: 400; transition: all .15s; font-family: inherit; }
        .source-btn:hover { border-color: #aaa; color: #333; }
        .source-btn.active { background: #111; color: #fff; border-color: #111; }
        .source-btn .flights-count-badge { display: inline-block; margin-left: 3px; font-size: 9px; background: rgba(0,0,0,.06); border-radius: 8px; padding: 1px 6px; min-width: 18px; text-align: center; }
        .source-btn.active .flights-count-badge { background: rgba(255,255,255,.15); }
        .flights-search-bar { display: flex; gap: .5rem; margin-bottom: .75rem; }
        .flights-search-bar input { flex: 1; padding: .6rem 1rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: .85rem; font-family: inherit; outline: none; transition: border-color .15s; background: #fff; }
        .flights-search-bar input:focus { border-color: #aaa; }
        .flights-search-bar .btn { padding: .6rem 1.25rem; background: #111; color: #fff; border: none; border-radius: 8px; font-size: .85rem; cursor: pointer; font-weight: 400; font-family: inherit; display: flex; align-items: center; gap: .4rem; transition: opacity .15s; }
        .flights-search-bar .btn:hover { opacity: .85; }
        .flights-table-wrapper { width: 100%; overflow-x: auto; }
        .flights-table { width: 100%; border-collapse: collapse; font-size: .8rem; }
        .flights-table thead { position: sticky; top: 0; z-index: 2; }
        .flights-table th { font-size: 10px; letter-spacing: .15em; text-transform: uppercase; color: #8b8b8b; font-weight: 400; text-align: left; padding: 12px 14px; background: #f9f9f9; border-bottom: 2px solid #efefef; white-space: nowrap; }
        .flights-table td { padding: 10px 14px; border-bottom: 1px solid #efefef; color: #333; font-weight: 300; }
        .flights-table tbody tr[data-flight-key] { cursor: pointer; transition: background .12s; }
        .flights-table tbody tr[data-flight-key]:hover { background: #f9f9f9; }
        .flights-table tbody tr[data-flight-key].expanded { background: #f3f3f3; }
        .loading-cell { text-align: center; padding: 3rem 1rem !important; color: #aaa; font-size: .85rem; }
        .flight-ticket-detail.active { animation: none !important; }
        .flight-ticket-detail.closing { display: table-row !important; }
        .flight-ticket-detail.active .ticket-card { animation: flightTicketIn .35s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: top; }
        .flight-ticket-detail.closing .ticket-card { animation: flightTicketOut .25s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform-origin: top; }
        .ticket-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px 22px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .ticket-card { grid-template-columns: 1fr; } }
        .ticket-callsign { font-size: 1.05rem; font-weight: 500; color: #111; letter-spacing: -.01em; }
        .ticket-platform-badge { font-size: 10px; font-weight: 400; letter-spacing: .05em; padding: 2px 8px; border-radius: 3px; }
        .ticket-route { display: flex; align-items: center; gap: 14px; margin: 12px 0 10px; }
        .ticket-airport { font-size: 1.3rem; font-weight: 400; color: #111; letter-spacing: -.01em; }
        .ticket-airport-name { font-size: .75rem; color: #8b8b8b; margin-top: 2px; }
        .ticket-arrow { color: #ccc; font-size: 1rem; }
        .ticket-progress-section { margin: 10px 0 8px; }
        .ticket-progress-bar { height: 4px; background: #e0e0e0; border-radius: 2px; overflow: hidden; }
        .ticket-progress-fill { height: 100%; background: linear-gradient(90deg, #0288d1, #2aa37b); border-radius: 2px; transition: width .5s ease; }
        .ticket-dist-label { display: flex; justify-content: space-between; font-size: .68rem; color: #aaa; margin-top: 4px; }
        .ticket-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px; }
        .ticket-meta-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #f9f9f9; border-radius: 6px; }
        .ticket-meta-label { font-size: .68rem; color: #aaa; }
        .ticket-meta-value { font-size: .75rem; color: #333; font-weight: 400; }
        .ticket-meta-value.mono { font-family: 'Fira Code', 'JetBrains Mono', monospace; }
        .ticket-section { margin-bottom: 12px; }
        .ticket-section-title { font-size: 10px; letter-spacing: .15em; text-transform: uppercase; color: #aaa; font-weight: 400; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #efefef; }
        .ticket-detail-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: .75rem; }
        .ticket-detail-label { color: #aaa; }
        .ticket-detail-value { color: #333; font-weight: 400; }
        .ticket-detail-value.mono { font-family: 'Fira Code', 'JetBrains Mono', monospace; font-size: .72rem; }
        .ticket-latlng { font-size: .7rem; color: #8b8b8b; font-family: 'Fira Code', 'JetBrains Mono', monospace; }
        .ticket-metar-link { display: inline-flex; align-items: center; gap: 5px; font-size: .72rem; color: #0288d1; text-decoration: none; margin-top: 4px; font-weight: 400; }
        .ticket-metar-link:hover { text-decoration: underline; }
        .ticket-route-full { font-size: .72rem; color: #555; line-height: 1.5; font-family: 'Fira Code', 'JetBrains Mono', monospace; word-break: break-all; }
        @media (max-width: 768px) { .flights-page { padding: 1.25rem 1rem 3rem; } .flights-meta { grid-template-columns: 1fr; } }
      `}</style>

      <div className="flights-page">
        <div className="flights-hero">
          <h1>实时模拟飞行航班动态</h1>
        </div>

        <div className="flights-stats">
          <div className="stat-item">航班总数: <strong>{allFlights.length}</strong></div>
          <div className="stat-item"><i className="fas" style={{ fontSize: '.85rem' }}><RotateCw size={14} /></i> 数据更新: <strong>{updateTime || '-'}</strong></div>
        </div>

        <div className="flights-source-filter">
          {SOURCE_KEYS.map((src) => (
            <button
              key={src}
              className={`source-btn${currentSource === src ? ' active' : ''}`}
              onClick={() => setCurrentSource(src)}
            >
              {src === 'all' ? '全部' : src}{' '}
              <span className="flights-count-badge">{sourceCounts[src]}</span>
            </button>
          ))}
        </div>

        <div className="flights-search-bar">
          <input
            type="text"
            placeholder="搜索航班号、航司、出发地、目的地、机型..."
            value={currentQuery}
            onChange={(e) => setCurrentQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setCurrentQuery((e.target as HTMLInputElement).value)}
          />
          <button className="btn" onClick={() => setCurrentQuery(currentQuery)}>
            <Search size={14} /> 搜索
          </button>
        </div>

        <div className="flights-table-wrapper">
          <table className="flights-table">
            <thead>
              <tr>
                <th>航班号</th>
                <th>飞行员</th>
                <th>出发时间</th>
                <th>出发</th>
                <th>到达</th>
                <th>机型</th>
                <th>高度</th>
                <th>速度</th>
                <th>平台</th>
              </tr>
            </thead>
            <tbody ref={tbodyRef} onClick={handleTableClick}>
              <tr>
                <td colSpan={9} className="loading-cell">
                  <i className="fas fa-spinner fa-spin"></i> 加载中...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Script src="/flight-data.js" strategy="beforeInteractive" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    </>
  );
}
