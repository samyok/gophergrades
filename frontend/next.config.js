/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  rewrites: async () => {
    return [
      {
        source: "/stats/:match*",
        destination: "https://analytics.umami.is/:match*",
      },
    ];
  },
  redirects: async () => {
    return [
      {
        source: "/chrome",
        destination:
          "https://chrome.google.com/webstore/detail/gophergrades-past-grades/lhekbajaehiokcacoaeicphgdnmeaedp",
        permanent: true,
      },
      {
        source: "/firefox",
        destination:
          "https://addons.mozilla.org/en-US/firefox/addon/gophergrades/",
        permanent: true,
      },
      {
        source: "/social-coding",
        destination: "https://discord.gg/ctcXWjUJqZ",
        permanent: true,
      },
      {
        source: "/ext",
        destination: "/firefox",
        permanent: false,
        has: [
          {
            type: "header",
            key: "User-Agent",
            value: "(.*Firefox.*)",
          },
        ],
      },
      {
        source: "/ext",
        destination: "/chrome",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
