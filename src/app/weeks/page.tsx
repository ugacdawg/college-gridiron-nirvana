import { redirect } from "next/navigation";
import { parseSeason, weekHref } from "@/lib/routes";

export default async function WeeksIndex({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  redirect(weekHref(parseSeason(sp.season), 0));
}
