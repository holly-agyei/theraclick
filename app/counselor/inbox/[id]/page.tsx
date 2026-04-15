"use client";

import { useParams, useRouter } from "next/navigation";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { CounselorChatPanel } from "@/components/CounselorChatPanel";

export default function CounselorChatPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  return (
    <LayoutWrapper>
      <div className="h-[calc(100vh-64px)]">
        <CounselorChatPanel
          studentId={studentId}
          onBack={() => router.push("/counselor/inbox")}
        />
      </div>
    </LayoutWrapper>
  );
}
