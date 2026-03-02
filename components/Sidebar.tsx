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

  const displayName = (() => {
    if (loading) return "...";
    if (!profile) return "";
    if (profile.role === "student" && profile.anonymousEnabled && profile.anonymousId) {
      return profile.anonymousId;
    }
    return profile.fullName || "Complete your profile";
  })();

  const roleLabel = (() => {
    if (!profile) return "";
    if (profile.role === "counselor") return "Counselor";
    if (profile.role === "peer-mentor") return "Peer Mentor";
    return "Student";
  })();

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <Logo className="text-gray-900" />
      </div>

      <div className="border-b border-gray-200 px-6 py-4">
        <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
        <p className="mt-0.5 text-xs text-gray-500">{roleLabel}</p>
        {profile && !profile.fullName && profile.role === "student" && (
          <Link href="/student/settings" className="mt-1 block text-xs text-green-600 hover:underline">
            Add your name
          </Link>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <button
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
            text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
