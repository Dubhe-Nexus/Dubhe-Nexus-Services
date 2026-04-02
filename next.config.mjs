const config = {
  async rewrites() {
    const bffPort = process.env.BFF_PORT || "3001";
    const apiBase = (process.env.API_BASE || (process.env.NODE_ENV === "production"
      ? "https://api.dubhenexus.org"
      : `http://localhost:${bffPort}`)).replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

export default config;
