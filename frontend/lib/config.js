const searchDurations = {
  enter: 0.3,
  exit: 0.75,
};

const disabledPages = [
  "/inst/7810", // "unknown professor" -- lags too much
];

const footerOverrides = {
  samyok: {
    big: true,
    index: 0,
    role: "Website/Infrastructure Lead",
    linkedin: "https://www.linkedin.com/in/samyok",
    website: "https://yok.dev",
    github: "https://github.com/samyok",
  },
  "Kanishk-K": {
    big: true,
    index: 10,
    role: "Backend/Data Lead",
    linkedin: "https://www.linkedin.com/in/kanishk-kacholia/",
    website: "https://www.kanishkkacholia.com/",
    github: "https://github.com/kanishk-k",
  },
  JosephMcIndoo: {
    big: true,
    index: 20,
    role: "Feature Engineering",
    linkedin: "https://www.linkedin.com/in/joeyjosephmcindoo/",
    github: "https://github.com/JosephMcIndoo",
  },
};

export { searchDurations, disabledPages, footerOverrides };
