"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Users, Heart } from "lucide-react";

type Role = "student" | "peer-mentor" | "counselor";

export default function RoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const router = useRouter();
  const [isRouting, setIsRouting] = useState(false);

  const roles = [
    {
      id: "student" as Role,
      icon: GraduationCap,
      title: "Student",
      description: "Get support, connect with peers, and access mental health resources",
    },
    {
      id: "peer-mentor" as Role,
      icon: Users,
      title: "Peer Mentor",
      description: "Support fellow students through their mental health journey",
    },
    {
      id: "counselor" as Role,
      icon: Heart,
      title: "Counselor",
      description: "Provide professional mental health support and guidance",
    },
  ];

  const handleContinue = async () => {
    if (!selectedRole) return;
    setIsRouting(true);
    if (selectedRole === "student") {
      router.push("/login?role=student");
      return;
    }
    router.push(`/login?role=${selectedRole}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-3 text-center text-3xl font-bold text-gray-900 md:text-4xl lg:text-5xl">
          How would you like to join?
        </h1>
        <p className="mb-12 text-center text-lg text-gray-600 md:text-xl lg:text-2xl">
          Choose the role that best describes you
        </p>

        <div className="mb-8 grid gap-6 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? "border-primary-400 border-2" : "border-gray-200"
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full md:h-20 md:w-20 ${
                        isSelected ? "bg-primary-100" : "bg-gray-100"
                      }`}
                    >
                      <Icon
                        className={`h-8 w-8 md:h-10 md:w-10 ${
                          isSelected ? "text-primary-600" : "text-gray-600"
                        }`}
                      />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-gray-900 md:text-2xl">
                      {role.title}
                    </h3>
                    <p className="text-sm text-gray-600 md:text-base">{role.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mb-8 rounded-lg bg-primary-50 p-5 md:p-6">
          <div className="flex gap-4">
            <div className="mt-0.5 shrink-0">
              <svg
                className="h-6 w-6 text-primary-600 md:h-7 md:w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-700 md:text-base lg:text-lg">
              You can change your role later in settings. All roles prioritize
              privacy and confidentiality.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            className="w-full bg-primary-400 text-white hover:bg-primary-500 disabled:opacity-50 md:w-auto md:px-12 md:text-lg"
            onClick={handleContinue}
            disabled={!selectedRole || isRouting}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

