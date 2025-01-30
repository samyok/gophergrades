[![GopherGrades](frontend/public/images/home-og.png)](https://umn.lol)
# GopherGrades v2!

GopherGrades is a web app that allows you to look up past grades for courses at the University of Minnesota. The frontend is built with NextJS, SQLite, and ChakraUI. The backend is written in Python utilizing the pandas library to wrangle data provided to us by the [Office of Data Access and Privacy](https://ogc.umn.edu/data-access-and-privacy) and [The Office of Undergraduate Education Academic Support Resources](https://github.com/umn-asr/courses).

# Other Schools' Versions

We are excited to highlight other schools' versions of GopherGrades! Check out the University of Oregon's version of GopherGrades at [uo.zone](https://uo.zone/).

| School | Preview |
|--------|---------|
| [uo.zone](https://uo.zone/) | ![uo.zone Preview](https://uo.zone/static/homepage.png) |

If you have created your own version of GopherGrades and would like to be highlighted here, please message Samyok via Discord (@samyok) or email (sam@yok.dev).

# Running Locally
```bash
cd frontend

# make sure you have nodejs, npm, and yarn installed!
yarn install

yarn dev
# live at http://localhost:3000
```

In order to properly run the frontend you'll need to have a `GITHUB_TOKEN` environment variable set. Follow the instructions by [Github](https://docs.github.com/en/enterprise-server@3.9/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) to create one. Ensure that your personal access token has the `public_repo` scope. This will allow it to fetch collaborator information from the repository. Your `.env` file in the root of the frontend folder should look like:

```bash
GITHUB_TOKEN=your_token_here
```

# Building the Firefox Extension

```bash
# make sure you're in the root of the repository
node bin/chrome-to-firefox.js
# Firefox should start in debug mode
#   You may have to click on the extension icon in the top right of the browser
#   to give it permission to run on the current page.

# To build the extension, run
node bin/build-extensions.js

# The extension will be built to the `web-ext-artifacts` directory
```
