import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";

export default async function Home() {
  const profile = await getCurrentProfile();
  if (profile?.role === "precast") redirect("/precast");
  if (profile?.role === "safety") redirect("/safety");
  redirect("/schedule");
}
