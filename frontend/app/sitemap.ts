import { MetadataRoute } from "next";
import {
  getEveryClassCode,
  getEveryDepartmentCode,
  getEveryProfessorCode,
} from "../lib/db";

const cleanPrimaryID = (id: { toString: () => string }) => {
  return id?.toString().replaceAll(" ", "") ?? "undefined!";
};

const cleanDescription = (desc: string) => {
  return (
    desc?.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() ?? "undefined part two!"
  );
};

const getAllRoutes = async () => {
  const courses = await getEveryClassCode();

  const courseXML = courses.map(
    (course: {
      dept_abbr: { toString: () => string };
      course_num: { toString: () => string };
      class_desc: string;
    }) => ({
      url: `https://umn.lol/class/${course.dept_abbr}
      ${course.course_num}/${cleanDescription(course.class_desc)}`,
      // image: `https://umn.lol/api/image/class/${cleanPrimaryID(
      //   course.class_name
      // )}`,
      changeFrequency: "yearly",
    })
  );

  const profs = await getEveryProfessorCode();

  const profXML = profs.map(
    (prof: { id: { toString: () => string }; name: string }) => ({
      url: `https://umn.lol/inst/${cleanPrimaryID(prof.id)}/${cleanDescription(
        prof.name
      )}`,
      // image: `https://umn.lol/api/image/prof/${cleanPrimaryID(prof.prof_name)}`,
      changeFrequency: "yearly",
    })
  );

  const depts = await getEveryDepartmentCode();

  const deptXML = depts.map(
    (dept: { dept_abbr: { toString: () => string }; dept_name: string }) => ({
      url: `https://umn.lol/dept/${cleanPrimaryID(
        dept.dept_abbr
      )}/${cleanDescription(dept.dept_name)}`,
      // image: `https://umn.lol/api/image/dept/${cleanPrimaryID(dept.dept_name)}`,
      changeFrequency: "yearly",
    })
  );

  const indexPage = {
    url: "https://umn.lol/",
    // image: "https://umn.lol/images/advert.png",
    changeFrequency: "monthly",
  };

  return [indexPage, ...courseXML, ...profXML, ...deptXML];
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // get number of items in the sitemap and divide by 10000 (Google's limit is 50000, so we stay well below that)
  const sm = await getAllRoutes();
  // const sitemapChunks = [];
  // const chunkSize = 10000;
  // for (let i = 0; i < sm.length; i += chunkSize) {
  //   sitemapChunks.push(sm.slice(i, i + chunkSize));
  // }
  return sm;
  // return sitemapChunks.map((_, index) => ({
  //   id: index,
  // }));
}

// export default async function sitemap({ id }) {
//   const sm = await getAllRoutes();
//   const sitemapChunks = [];
//   const chunkSize = 10000;
//   for (let i = 0; i < sm.length; i += chunkSize) {
//     sitemapChunks.push(sm.slice(i, i + chunkSize));
//   }
//   return sitemapChunks[id];
// }
