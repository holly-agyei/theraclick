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
  ChevronDown,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";
import { useState, useRef, useEffect } from "react";

const studentNavItems = [
  { href: "/student/dashboard", icon: Home, label: "Dashboard" },
  { href: "/student/inbox", icon: Mail, label: "Inbox" },
  { href: "/student/counselors", icon: Stethoscope, label: "Counselors" },
  { href: "/student/peer-mentors", icon: Users, label: "Mentors" },
  { href: "/student/chat", icon: Bot, label: "AI Chat" },
  { href: "/student/bookings", icon: Calendar, label: "Bookings" },
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
    return profile.fullName || "User";
  })();

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = (() => {
    if (!profile) return "";
    if (profile.role === "counselor") return "Counselor";
    if (profile.role === "peer-mentor") return "Peer Mentor";
    return "Student";
  })();

  return (
    <header className="hidden md:block sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
        {/* Logo */}
        <Link href={navItems[0]?.href || "/"} className="shrink-0">
          <Logo className="text-gray-900" size="sm" />
        </Link>

        {/* Nav links */}
        <nav className="flex flex-1 items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                  isActive
                    ? "text-green-700 bg-green-50"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 translate-y-[9px] rounded-full bg-green-600" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
              {initials || "?"}
            </div>
            <div className="hidden text-left lg:block">
              <p className="max-w-[120px] truncate text-sm font-medium text-gray-900">
                {displayName}
              </p>
              <p className="text-[11px] text-gray-500">{roleLabel}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              <div className="border-b border-gray-100 px-4 py-2.5 lg:hidden">
                <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
                <p className="text-[11px] text-gray-500">{roleLabel}</p>
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  void logout();
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
