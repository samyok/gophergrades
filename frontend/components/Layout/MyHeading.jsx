import Head from "next/head";

const DEFAULT_TITLE = "Gopher Grades - A Gopher Grades Project";
const DEFAULT_DESC = "View grades for past classes, professors, and more.";

const MyHeading = ({ title }) => (
  <Head>
    <title>{title || DEFAULT_TITLE}</title>
    <meta name={"description"} content={DEFAULT_DESC} />
    <link rel={"icon"} href={"/favicon.ico"} />
  </Head>
);
export default MyHeading;
