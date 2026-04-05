const config = {
  async rewrites() {
    const bffPort = process.env.BFF_PORT || "3001";
    const apiBase = (process.env.API_BASE || "https://api.dubhenexus.org").replace(/\/$/, "");
    return [
      {
        source: "/api/airports/:path*",
        destination: `${apiBase}/airport/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

export default config;
