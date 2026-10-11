import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function sanitizeNext(value: unknown): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/challenges";
}

export default async function LoginPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams;
  const next = sanitizeNext(searchParams.next);
  const user = await getSessionUser();
  if (user) redirect(next);

  const loggedOut = searchParams.loggedOut === "1";
  const registered = searchParams.registered === "1";

  const notice = registered
    ? "Account created. Sign in with your handle/email and password to enter the arena."
    : loggedOut
      ? "Signed out successfully. Authentication required to re-enter the arena."
      : undefined;

  return (
    <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <AuthForm mode="login" next={next} notice={notice} />
    </main>
  );
}
