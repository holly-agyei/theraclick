"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Stethoscope, 
  Users, 
  Bot, 
  MessageSquare, 
  Settings, 
  LogOut,
  Mail,
  Calendar,
  MessageCircle
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";

const studentNavItems = [
  { href: "/student/dashboard", icon: Home, label: "Dashboard" },
  { href: "/student/inbox", icon: Mail, label: "Inbox" },
  { href: "/student/counselors", icon: Stethoscope, label: "Talk to Counselor" },
  { href: "/student/peer-mentors", icon: Users, label: "Talk to Peer Mentor" },
  { href: "/student/chat", icon: Bot, label: "AI Assistance" },
  { href: "/student/bookings", icon: Calendar, label: "My Bookings" },
  { href: "/student/forums", icon: MessageSquare, label: "Forums" },
  { href: "/student/settings", icon: Settings, label: "Settings" },
];

const peerMentorNavItems = [
  { href: "/peer-mentor/dashboard", icon: Home, label: "Dashboard" },
  { href: "/peer-mentor/inbox", icon: Mail, label: "Inbox" },
  { href: "/student/forums", icon: MessageSquare, label: "Forums" },
  { href: "/peer-mentor/settings", icon: Settings, label: "Settings" },
];

const counselorNavItems = [
  { href: "/counselor/dashboard", icon: Home, label: "Dashboard" },
  { href: "/counselor/inbox", icon: Mail, label: "Inbox" },
  { href: "/counselor/availability", icon: Calendar, label: "Availability" },
  { href: "/counselor/bookings", icon: Calendar, label: "Bookings" },
  { href: "/counselor/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, profile, loading } = useAuth();
  
  const getNavItems = () => {
    if (!profile) return studentNavItems;
    if (profile.role === "peer-mentor") return peerMentorNavItems;
    if (profile.role === "counselor") return counselorNavItems;
    return studentNavItems;
  };
  
  const navItems = getNavItems();

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-gray-800/50 bg-gray-900 md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-gray-800/50 px-6">
        <Logo className="text-white" />
      </div>
      <div className="border-b border-gray-800/50 px-6 py-4">
        <p className="text-xs font-medium text-gray-500">Signed in as</p>
        <p className="mt-1 truncate text-sm font-semibold text-white">
          {loading
            ? "…"
            : profile?.role === "student" && profile.anonymousEnabled && profile.anonymousId
              ? profile.anonymousId
              : profile?.fullName || "—"}
        </p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-800/50 p-4">
        <button
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
