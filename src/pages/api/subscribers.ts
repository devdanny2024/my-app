import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabase";

type CSVRow = { email: string; name?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { subscribers } = req.body as { subscribers: CSVRow[] };
    if (!subscribers || !Array.isArray(subscribers) || subscribers.length === 0) {
      return res.status(400).json({ error: "No subscribers provided" });
    }

    // Perform upsert to handle conflicts on 'email'
    const { data, error, count } = await supabase
      .from("subscribers")
      .upsert(subscribers, { onConflict: "email", count: "exact" })
      .select();

    if (error) {
      console.error("Supabase upsert error:", error);
      return res.status(500).json({ error: error.message });
    }

    const insertedCount = count ?? subscribers.length;
    return res.status(200).json({ inserted: insertedCount, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}