"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const currentTab = pathname.startsWith('/admin/bulk')
    ? '/admin/bulk'
    : pathname.startsWith('/admin/check')
    ? '/admin/check'
    : pathname.startsWith('/admin/courses')
    ? '/admin/courses'
    : pathname.startsWith('/admin/feedback')
    ? '/admin/feedback'
    : '/admin';

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

      {/* 탭 네비게이션 */}
      <Tabs value={currentTab} onValueChange={(value) => router.push(value)} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 h-12">
          <TabsTrigger value="/admin" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            장소 목록
          </TabsTrigger>
          <TabsTrigger value="/admin/bulk" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            검색 & 일괄 관리
          </TabsTrigger>
          <TabsTrigger value="/admin/check" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            장소 점검
          </TabsTrigger>
          <TabsTrigger value="/admin/courses" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            코스
          </TabsTrigger>
          <TabsTrigger value="/admin/feedback" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            피드백
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
