import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { Topbar } from "@/components/ui/topbar";
import { NavigationProvider } from "@/lib/navigation-context";
import { NavigationProgress } from "@/components/shared/navigation-progress";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authId, user.id),
    with: { company: true },
  });

  if (!dbUser) {
    redirect("/onboarding");
  }

  const companyName = dbUser.company?.name ?? "Mon entreprise";

  return (
    <NavigationProvider>
      <NavigationProgress />
      <SidebarProvider>
        <AppSidebar companyName={companyName} userEmail={user.email ?? ""} />
        <SidebarInset>
          <Topbar/>
          <main className="flex-1 p-6 min-h-screen ml-[260px]">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NavigationProvider>
  );
}
