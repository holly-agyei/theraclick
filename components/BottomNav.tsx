"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Stethoscope, Users, Bot, MessageSquare, Mail, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";

const studentNavItems = [
  { href: "/student/dashboard", icon: Home, label: "Home" },
  { href: "/student/counselors", icon: Stethoscope, label: "Counselor" },
  { href: "/student/peer-mentors", icon: Users, label: "Mentor" },
  { href: "/student/bookings", icon: Calendar, label: "Bookings" },
  { href: "/student/chat", icon: Bot, label: "AI" },
];

const peerMentorNavItems = [
  { href: "/peer-mentor/dashboard", icon: Home, label: "Home" },
  { href: "/peer-mentor/inbox", icon: Mail, label: "Inbox" },
  { href: "/student/forums", icon: MessageSquare, label: "Forums" },
];

const counselorNavItems = [
  { href: "/counselor/dashboard", icon: Home, label: "Home" },
  { href: "/counselor/inbox", icon: Mail, label: "Inbox" },
  { href: "/counselor/availability", icon: Calendar, label: "Availability" },
  { href: "/counselor/bookings", icon: Calendar, label: "Bookings" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  
  const getNavItems = () => {
    if (!profile) return studentNavItems;
    if (profile.role === "peer-mentor") return peerMentorNavItems;
    if (profile.role === "counselor") return counselorNavItems;
    return studentNavItems;
  };
  
  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-900/95 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 transition-colors",
                isActive ? "text-emerald-400" : "text-gray-500"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
