const withMDX = require("@next/mdx")({
  extension: /\.mdx?$/,
  options: {
    // If you use remark-gfm, you'll need to use next.config.mjs
    // as the package is ESM only
    // https://github.com/remarkjs/remark-gfm#install
    remarkPlugins: [],
    rehypePlugins: [],
    // If you use `MDXProvider`, uncomment the following line.
    // providerImportSource: "@mdx-js/react",
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  reactStrictMode: true,
  rewrites: async () => {
    return [
      {
        source: "/stats/:match*",
        destination: "https://dash.umn.lol/:match*",
      },
      {
        source: "/class/:courseCode/:path*",
        destination: "/class/:courseCode",
      },
      {
        source: "/inst/:profCode/:path*",
        destination: "/inst/:profCode",
      },
      {
        source: "/dept/:deptCode/:path*",
        destination: "/dept/:deptCode",
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
        destination: "https://www.socialcoding.net/",
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
      {
        source: "/prof/:profCode*",
        destination: "/inst/:profCode*",
        permanent: false,
      },
    ];
  },
};

module.exports = withMDX(nextConfig);
