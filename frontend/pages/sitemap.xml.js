import {
  getEveryClassCode,
  getEveryDepartmentCode,
  getEveryProfessorCode,
} from "../lib/db";

const cleanPrimaryID = (id) => {
  return id.toString().replaceAll(" ", "");
};

const cleanDescription = (desc) => {
  return desc.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
};

async function generateSiteMap() {
  const startXML = `<?xml version="1.0" encoding="UTF-8"?>`;

  const courses = await getEveryClassCode();

  const courseXML = courses.map(
    (course) => `
  <url>
    <loc>https://umn.lol/course/${cleanPrimaryID(
      course.class_name
    )}/${cleanDescription(course.class_desc)}</loc>
    <image:image>
      <image:loc>https://umn.lol/api/image/class/${cleanPrimaryID(
        course.class_name
      )}</image:loc>
    </image:image>
  </url>`
  );

  const profs = await getEveryProfessorCode();

  const profXML = profs.map(
    (prof) => `
  <url>
    <loc>https://umn.lol/inst/${cleanPrimaryID(prof.id)}/${cleanDescription(
      prof.name
    )}</loc>
    <image:image>
      <image:loc>https://umn.lol/api/image/prof/${cleanPrimaryID(
        prof.id
      )}</image:loc>
    </image:image>
    </url>`
  );

  const depts = await getEveryDepartmentCode();

  const deptXML = depts.map(
    (dept) => `
  <url>
    <loc>https://umn.lol/dept/${cleanPrimaryID(
      dept.dept_abbr
    )}/${cleanDescription(dept.dept_name)}</loc>
    <image:image>
      <image:loc>https://umn.lol/api/image/dept/${cleanPrimaryID(
        dept.dept_abbr
      )}</image:loc>
    </image:image>
    </url>`
  );

  const indexPage = `
  <url>
    <loc>https://umn.lol/</loc>
    <image:image>
      <image:loc>https://umn.lol/images/advert.png</image:loc>
    </image:image>
  </url>
  `;

  return `${startXML}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${indexPage}
${courseXML.join("\n")}
${profXML.join("\n")}
${deptXML.join("\n")}
</urlset>`;
  /*
    <url>
    <loc>https://example.com/sample1.html</loc>
    <image:image>
      <image:loc>https://example.com/image.jpg</image:loc>
    </image:image>
    <image:image>
      <image:loc>https://example.com/photo.jpg</image:loc>
    </image:image>
  </url>
  <url>
    <loc>https://example.com/sample2.html</loc>
    <image:image>
      <image:loc>https://example.com/picture.jpg</image:loc>
    </image:image>
  </url>
   */
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

export async function getServerSideProps({ res }) {
  // We generate the XML sitemap with the posts data
  const sitemap = await generateSiteMap();

  res.setHeader("Content-Type", "text/xml");
  // we send the XML to the browser
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default SiteMap;
