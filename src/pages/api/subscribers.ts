import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabase";

type CSVRow = { email: string; name?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET: Fetch all subscribers with optional search
  if (req.method === "GET") {
    try {
      const { search, page = "1", limit = "50" } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      let query = supabase
        .from("subscribers")
        .select("*", { count: "exact" });

      // Apply search filter if provided
      if (search && typeof search === "string") {
        query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
      }

      // Apply pagination
      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limitNum - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("Supabase fetch error:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        subscribers: data || [],
        total: count || 0,
        page: pageNum,
        limit: limitNum,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: String(err) });
    }
  }

  // POST: Add subscribers
  if (req.method === "POST") {
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

  // DELETE: Unsubscribe a subscriber
  if (req.method === "DELETE") {
    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Subscriber ID required" });
      }

      const { error } = await supabase
        .from("subscribers")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Supabase delete error:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, message: "Subscriber removed" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: String(err) });
    }
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}