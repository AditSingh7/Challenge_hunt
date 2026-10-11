import { redirect } from "next/navigation";
import { getSessionUserRecord } from "@/lib/auth";
import AdminPanel from "@/components/admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUserRecord();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/profile");

  return (
    <main className="w-full max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
      <AdminPanel />
    </main>
  );
}
