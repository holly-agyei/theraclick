"use client";

import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import {
  LogOut,
  Save,
  Heart,
  Upload,
  Camera,
  X,
  ChevronRight,
} from "lucide-react";
import { useState, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  compressImage as compressImageUtil,
  convertToBase64 as convertToBase64Util,
} from "@/lib/imageCompression";

export default function PeerMentorSettingsPage() {
  const { profile, logout } = useAuth();
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [specialization, setSpecialization] = useState(
    profile?.application?.specialization || ""
  );
  const [about, setAbout] = useState(profile?.application?.about || "");
  const [profilePicture, setProfilePicture] = useState(
    profile?.avatar || profile?.profilePicture || ""
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = async () => {
    if (!profile || !db) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        application: {
          specialization: specialization.trim(),
          about: about.trim(),
        },
        avatar: profilePicture || null,
        profilePicture: profilePicture || null,
      });
      setEditingProfile(false);
    } catch (e) {
      console.error("Error updating profile:", e);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !profile) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPG, PNG, or GIF)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(
        "Image size must be less than 5MB. Please compress your image and try again."
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    let fileToUpload = file;
    if (file.size > 400 * 1024) {
      try {
        fileToUpload = await compressImageUtil(file, {
          targetSizeBytes: 400 * 1024,
        });
      } catch (compressionError: any) {
        console.warn("Image compression failed:", compressionError);
        alert(
          compressionError?.message ||
            "Image compression failed. Please use a smaller image."
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    setUploadingPhoto(true);

    try {
      const imageUrl = await convertToBase64Util(fileToUpload);
      setProfilePicture(imageUrl);

      if (!db) {
        setUploadingPhoto(false);
        alert(
          "Database connection error. Please refresh the page and try again."
        );
        return;
      }

      await updateDoc(doc(db, "users", profile.uid), {
        avatar: imageUrl,
        profilePicture: imageUrl,
      });
    } catch (e: any) {
      console.error("Error uploading photo:", e);

      let errorMessage = "Upload failed. ";
      if (
        e?.code === "storage/unauthorized" ||
        e?.code === "storage/permission-denied"
      ) {
        errorMessage +=
          "Storage permissions error. Please check Firebase Storage rules or upgrade to Blaze plan.";
      } else if (e?.code === "storage/quota-exceeded") {
        errorMessage += "Storage quota exceeded.";
      } else if (
        e?.message?.includes("billing") ||
        e?.message?.includes("upgrade")
      ) {
        errorMessage +=
          "Firebase Storage requires Blaze plan. Upgrading is free for small usage.";
      } else if (
        e?.message?.includes("too large") ||
        e?.message?.includes("1MB")
      ) {
        errorMessage +=
          "Image too large for Firestore. Please use a smaller image (under 500KB).";
      } else {
        errorMessage += `${e?.message || "Unknown error. Check browser console for details."}`;
      }

      alert(errorMessage);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!profile || !db) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        avatar: null,
        profilePicture: null,
      });
      setProfilePicture("");
    } catch (e) {
      console.error("Error removing photo:", e);
      alert("Failed to remove photo");
    }
  };

  const initials =
    profile?.fullName
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2) || "P";

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gray-50/80">
        <div className="px-4 py-6 pb-28 md:px-8 md:py-10">
          <div className="mx-auto max-w-lg">
            <h1 className="mb-6 text-2xl font-bold text-gray-900">Settings</h1>

            {/* Profile Card */}
            <div className="mb-2 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt="Profile"
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-green-500 ring-offset-2"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-green-600 flex items-center justify-center text-lg font-bold text-white ring-2 ring-green-500 ring-offset-2">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900 truncate">
                    {profile?.fullName || "—"}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {profile?.email || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Section */}
            <p className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Profile
            </p>
            <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
              {/* Edit Profile Row */}
              <button
                onClick={() => setEditingProfile(!editingProfile)}
                className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
                  <Heart className="h-5 w-5 text-orange-500" />
                </div>
                <p className="flex-1 text-left text-sm font-medium text-gray-900">
                  Edit Profile
                </p>
                <ChevronRight
                  className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                    editingProfile ? "rotate-90" : ""
                  }`}
                />
              </button>

              {editingProfile && (
                <div className="border-t border-gray-100 px-4 py-4">
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-500">
                        Specialization / Area
                      </label>
                      <Input
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g., Academic Support, Mental Health, Life Skills"
                        className="border-gray-200 bg-gray-50 text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-500">
                        About
                      </label>
                      <textarea
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        placeholder="Tell students about your background and how you can help..."
                        rows={3}
                        className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingProfile(false);
                          setSpecialization(
                            profile?.application?.specialization || ""
                          );
                          setAbout(profile?.application?.about || "");
                        }}
                        variant="outline"
                        size="sm"
                        className="border-gray-200 text-gray-600"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100" />

              {/* Change Photo Row */}
              <button
                onClick={() => setEditingPhoto(!editingPhoto)}
                className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Camera className="h-5 w-5 text-blue-500" />
                </div>
                <p className="flex-1 text-left text-sm font-medium text-gray-900">
                  Change Photo
                </p>
                <ChevronRight
                  className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                    editingPhoto ? "rotate-90" : ""
                  }`}
                />
              </button>

              {editingPhoto && (
                <div className="border-t border-gray-100 px-4 py-4">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      {profilePicture ? (
                        <div className="relative">
                          <img
                            src={profilePicture}
                            alt="Profile"
                            className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                          />
                          <button
                            onClick={handleRemovePhoto}
                            className="absolute -top-1 -right-1 rounded-full bg-red-500 p-1 hover:bg-red-600 transition-colors"
                          >
                            <X className="h-3.5 w-3.5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-green-600 flex items-center justify-center text-xl font-bold text-white border-2 border-gray-200">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        disabled={uploadingPhoto}
                        variant="outline"
                        size="sm"
                        className="border-gray-200 text-gray-700 hover:bg-gray-100"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload
                          className={`mr-1.5 h-3.5 w-3.5 ${
                            uploadingPhoto ? "animate-pulse" : ""
                          }`}
                        />
                        {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                      </Button>
                      {uploadingPhoto && (
                        <div className="mt-2">
                          <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
                            <div className="h-full w-1/2 animate-pulse bg-green-500 rounded-full" />
                          </div>
                        </div>
                      )}
                      {!uploadingPhoto && (
                        <p className="mt-1.5 text-xs text-gray-400">
                          JPG, PNG or GIF. Max 5MB.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Account Section */}
            <p className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Account
            </p>
            <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => void logout()}
                className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <LogOut className="h-5 w-5 text-red-500" />
                </div>
                <p className="flex-1 text-left text-sm font-medium text-gray-900">
                  Logout
                </p>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
              </button>
            </div>

            <p className="mt-8 text-center text-xs text-gray-400">
              TheraClick v1.0
            </p>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
