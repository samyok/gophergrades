import Head from "next/head";

const DEFAULT_TITLE = "Gopher Grades - A Social Coding Project";
const DEFAULT_DESC = "View grades for past classes, professors, and more.";

const publicURL = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : "";
const MyHeading = ({
  title,
  imageURL = `${publicURL}/images/advert-small.png`,
}) => (
  <Head>
    <title>{title || DEFAULT_TITLE}</title>
    <meta name={"description"} content={DEFAULT_DESC} />
    <link rel={"icon"} href={"/favicon.ico"} />
    <meta name={"theme-color"} content={"#5B0013"} />
    <meta property={"og:type"} content={"website"} />
    <meta property={"og:url"} content={"https://umn.lol/"} />
    <meta property={"og:title"} content={title || DEFAULT_TITLE} />
    <meta property={"og:description"} content={DEFAULT_DESC} />
    {imageURL && (
      <>
        <meta property={"og:image"} content={imageURL} />
        <meta property={"twitter:image"} content={imageURL} />
      </>
    )}
    <meta property={"twitter:card"} content={"summary_large_image"} />
    <meta
      property={"twitter:url"}
      content={
        process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : ""
      }
    />
    <meta property={"twitter:title"} content={title || DEFAULT_TITLE} />
    <meta property={"twitter:description"} content={DEFAULT_DESC} />
    <script
      async
      defer
      data-website-id={"67c6918e-d23c-42aa-a392-cad37e4eeaee"}
      data-domains={"umn.lol"}
      data-host-url={"https://dash.umn.lol"}
      src={"/dash.js"}
    />
  </Head>
);
export default MyHeading;
