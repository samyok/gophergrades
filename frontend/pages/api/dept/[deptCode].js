import { getClassDistribtionsInDept, getDeptInfo } from "../../../lib/db";

export default async function handler(req, res) {
  if (!req.query.deptCode) {
    res
      .status(400)
      .json({ success: false, error: "Missing deptCode in query string" });
    return;
  }

  const { deptCode } = req.query;

  const info = await getDeptInfo(deptCode);

  if (info.length === 0) {
    res.status(404).json({ success: false, error: "Department not found" });
    return;
  }

  const distributions = await getClassDistribtionsInDept(deptCode);

  res.status(200).json({
    success: true,
    data: {
      ...info[0],
      distributions,
    },
  });
}
