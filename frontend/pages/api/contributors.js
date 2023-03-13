export default async function handler(req, res) {
  const contribs = await fetch(
    "https://api.github.com/repos/samyok/gophergrades/collaborators",
    {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    }
  ).then((r) => r.json());
  // get the name of each user by looping through contribs and making a request to the github api

  const contribsWithNames = await Promise.all(
    contribs.map(async (contrib) => {
      const user = await fetch(contrib.url, {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }).then((r) => r.json());
      return {
        ...user,
      };
    })
  );

  // cache this request for a month
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${60 * 60 * 24 * 30}, stale-while-revalidate=${
      60 * 60 * 24 * 30 // if loaded within a month, use the stale cache, but re-render in the background
    }`
  );

  res.status(200).json({
    success: true,
    data: contribsWithNames,
  });
}
