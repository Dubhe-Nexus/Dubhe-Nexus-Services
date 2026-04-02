import type { AppProps } from 'next/app';
import Link from 'next/link';
import Head from 'next/head';
import Script from 'next/script';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo, useState } from 'react';
import '../styles/globals.css';

type Locale = 'zh' | 'en';

const navText: Record<Locale, any> = {
  zh: {
    brand: '天枢互联 Dubhe Nexus',
    nav: [],
    switchTo: 'ENG'
  },
  en: {
    brand: 'Dubhe Nexus',
    nav: [],
    switchTo: '中'
  }
};

const getOppositeLocalePath = (path: string, locale: Locale) => {
  if (locale === 'en') {
    const next = path.startsWith('/en') ? path.slice(3) || '/' : path;
    return next === '/en' ? '/' : next;
  }
  if (path === '/') return '/en';
  return path.startsWith('/en') ? path : `/en${path}`;
};

const Navbar = ({ locale, pathname }: { locale: Locale; pathname: string }) => {
  const t = navText[locale];
  const switchHref = useMemo(() => getOppositeLocalePath(pathname, locale), [pathname, locale]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`glass-nav${scrolled ? ' scrolled' : ''}`} id="navbar">
      <div className="nav-container">
        <Link href={locale === 'en' ? '/en' : '/'} className="logo">
          <img src="https://www.dubhenexus.org/images/Dubhe%20Nexus%20Web.jpg" alt="Logo" />
          <span className="sr-only">{t.brand}</span>
        </Link>
        <div className="nav-links">
          <Link href={switchHref} className="lang-switch">
            <i data-lucide="languages"></i>
            {t.switchTo}
          </Link>
        </div>
      </div>
    </nav>
  );
};

const Footer = ({ locale }: { locale: Locale }) => {
  const year = new Date().getFullYear();
  return (
    <footer id="contact" className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="https://www.dubhenexus.org/images/Dubhe%20Nexus%201.1.jpg" alt="Logo" style={{ height: 45, borderRadius: 3 }} />
              <span>
                天枢互联创研工作室
                <br />
                Dubhe Nexus Innovation and ResearchStudio
              </span>
            </div>
            <div className="footer-social" style={{ marginTop: 12, display: 'flex', gap: 15 }}>
              <a href="https://github.com/Dubhe-Nexus" target="_blank" rel="noopener noreferrer" style={{ color: '#555', fontSize: 18, transition: 'color 0.3s' }}>
                <i className="fa-brands fa-github" />
              </a>
              <a href="https://qm.qq.com/q/w6MtG2lsIM" target="_blank" rel="noopener noreferrer" style={{ color: '#555', fontSize: 18, transition: 'color 0.3s' }}>
                <i className="fa-brands fa-qq" />
              </a>
            </div>
          </div>
          <div className="footer-contact">
            <h4>{locale === 'en' ? 'Contact Us' : '联系我们'}</h4>
            <a href="mailto:info@dubhenexus.org">info@dubhenexus.org</a>
            <a href="mailto:support@dubhenexus.org">support@dubhenexus.org</a>
          </div>
        </div>

        <div className="footer-copyright">
          <div style={{ flex: 1, textAlign: 'left' }}>
            &copy; {year} Dubhe Nexus Innovation and Research Studio
          </div>

          <div style={{ flex: 1, textAlign: 'right' }}>
            <span style={{ display: 'block', letterSpacing: '0.1em', color: '#888' }}>创新 · 构建 · 迭代 · 因势而变</span>
            <span style={{ display: 'block', letterSpacing: '0.1em', color: '#888' }}>Innovate. Construct. Iterate. Adapt.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const locale: Locale = router.pathname.startsWith('/en') ? 'en' : 'zh';

  useEffect(() => {
    const w = window as any;
    if (w?.lucide?.createIcons) w.lucide.createIcons();
  }, [router.asPath]);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,200;14..32,300;14..32,400;14..32,500;14..32,600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
      </Head>
      <Script
        src="https://unpkg.com/lucide@latest"
        strategy="afterInteractive"
        onLoad={() => {
          const w = window as any;
          if (w?.lucide?.createIcons) w.lucide.createIcons();
        }}
      />
      <Navbar locale={locale} pathname={router.asPath || router.pathname} />
      <div style={{ paddingTop: 110, flex: 1 }}>
        <Component {...pageProps} />
      </div>
      <Footer locale={locale} />
    </div>
  );
}
