import { getInstructorClasses, getInstructorInfo } from "../../../lib/db";

export default async function handler(req, res) {
  if (!req.query.profCode) {
    res
      .status(400)
      .json({ success: false, error: "Missing profCode in query string" });
    return;
  }

  const { profCode } = req.query;

  const info = await getInstructorInfo(profCode);

  if (info.length === 0) {
    res.status(404).json({ success: false, error: "Professor not found" });
    return;
  }

  const distributions = await getInstructorClasses(profCode);

  res.status(200).json({
    success: true,
    data: {
      ...info[0],
      distributions,
    },
  });
}
