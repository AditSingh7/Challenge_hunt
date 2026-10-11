import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function sanitizeNext(value: unknown): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/challenges";
}

export default async function RegisterPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const next = sanitizeNext(searchParams.next);
  const user = await getSessionUser();
  if (user) redirect(next);

  return (
    <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <AuthForm mode="register" next={next} />
    </main>
  );
}
