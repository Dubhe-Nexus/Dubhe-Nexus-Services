const config = {
  async rewrites() {
    const apiBase = "https://data.dubhenexus.org/api";
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
