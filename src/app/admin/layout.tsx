"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user && pathname !== "/admin/login") {
        router.replace("/admin/login");
        return;
      }

      setUser(user);
      setLoading(false);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user && pathname !== "/admin/login") {
        router.replace("/admin/login");
      }
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  // 로그인 페이지는 Auth guard 없이 렌더링
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-text-secondary text-sm">인증 확인 중...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-surface-dim flex h-dvh flex-col">
      {/* Admin 헤더 */}
      <header className="bg-surface border-border flex h-12 items-center justify-between border-b px-4">
        <button
          onClick={() => router.push("/admin")}
          className="text-lg font-bold text-primary"
        >
          Admin
        </button>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/admin/login");
          }}
          className="text-text-secondary text-sm"
        >
          로그아웃
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
