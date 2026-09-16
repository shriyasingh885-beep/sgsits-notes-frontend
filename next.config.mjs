/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // react-pdf / pdfjs-dist pulls an optional Node `canvas` binding we never
    // use in the browser — stub it so webpack doesn't try to bundle it.
    config.resolve.alias.canvas = false;
    return config;
  },
  async redirects() {
    return [
      // Dashboard → root (the new signed-in home)
      { source: "/dashboard", destination: "/", permanent: true },
      // Subject → subjects (singular → plural)
      { source: "/subject/:id", destination: "/subjects/:id", permanent: true },
      // Resource → notes
      { source: "/resource/:id", destination: "/notes/:id", permanent: true },
      // Search → notes (q/type/year/sort pass through automatically)
      { source: "/search", destination: "/notes", permanent: false },
      // Library → bookmarks
      { source: "/library", destination: "/bookmarks", permanent: true },
      // Upload → uploads
      { source: "/upload", destination: "/uploads", permanent: true },
    ];
  },
};

export default nextConfig;
