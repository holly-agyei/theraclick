import { LoginClient } from "./LoginClient";

type Role = "student" | "peer-mentor" | "counselor";

export default async function LoginPage(props: { searchParams: Promise<{ role?: string }> }) {
  const sp = await props.searchParams;
  const r = sp.role;
  const initialRole: Role =
    r === "peer-mentor" || r === "counselor" || r === "student" ? r : "student";

  return <LoginClient initialRole={initialRole} />;
}

