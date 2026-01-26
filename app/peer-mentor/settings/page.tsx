"use client";

import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import { Shield, User, LogOut, Save, Heart, Upload, Image as ImageIcon, X } from "lucide-react";
import { useState, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { compressImage as compressImageUtil, convertToBase64 as convertToBase64Util } from "@/lib/imageCompression";

export default function PeerMentorSettingsPage() {
  const { profile, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [specialization, setSpecialization] = useState(profile?.application?.specialization || "");
  const [about, setAbout] = useState(profile?.application?.about || "");
  const [profilePicture, setProfilePicture] = useState(profile?.avatar || profile?.profilePicture || "");
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
      setEditing(false);
    } catch (e) {
      console.error("Error updating profile:", e);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Note: We'll use Firestore fallback if storage is not available
    // This works on the free Spark plan

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPG, PNG, or GIF)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB. Please compress your image and try again.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Always compress images to ensure they fit in Firestore (max 400KB)
    let fileToUpload = file;
    if (file.size > 400 * 1024) {
      try {
        console.log("Compressing image...", { originalSize: file.size });
        fileToUpload = await compressImageUtil(file, { targetSizeBytes: 400 * 1024 });
        console.log("Compression complete", { 
          newSize: fileToUpload.size, 
          reduction: `${Math.round((1 - fileToUpload.size / file.size) * 100)}%` 
        });
      } catch (compressionError: any) {
        console.warn("Image compression failed:", compressionError);
        alert(compressionError?.message || "Image compression failed. Please use a smaller image.");
        setUploadingPhoto(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    setUploadingPhoto(true);

    try {
      console.log("Starting upload...", { fileSize: fileToUpload.size, fileName: fileToUpload.name });
      
      let imageUrl: string;
      
      // Use Firestore base64 storage (works on free Spark plan)
      // This is the default method since Storage requires Blaze plan
      console.log("Using Firestore storage (free method)");
      imageUrl = await convertToBase64Util(fileToUpload);
      
      setProfilePicture(imageUrl);
      
      // Save to Firestore
      if (!db) {
        setUploadingPhoto(false);
        alert("Database connection error. Please refresh the page and try again.");
        return;
      }
      console.log("Saving to Firestore...");
      await updateDoc(doc(db, "users", profile.uid), {
        avatar: imageUrl,
        profilePicture: imageUrl,
      });
      console.log("Profile picture saved successfully!");
    } catch (e: any) {
      console.error("Error uploading photo:", e);
      console.error("Error details:", {
        code: e?.code,
        message: e?.message,
        serverResponse: e?.serverResponse,
      });
      
      let errorMessage = "Upload failed. ";
      if (e?.code === "storage/unauthorized" || e?.code === "storage/permission-denied") {
        errorMessage += "Storage permissions error. Please check Firebase Storage rules or upgrade to Blaze plan.";
      } else if (e?.code === "storage/quota-exceeded") {
        errorMessage += "Storage quota exceeded.";
      } else if (e?.message?.includes("billing") || e?.message?.includes("upgrade")) {
        errorMessage += "Firebase Storage requires Blaze plan. Upgrading is free for small usage. Alternatively, the image will be stored in Firestore (limited size).";
      } else if (e?.message?.includes("too large") || e?.message?.includes("1MB")) {
        errorMessage += "Image too large for Firestore. Please use a smaller image (under 500KB) or upgrade to Blaze plan for Storage.";
      } else {
        errorMessage += `${e?.message || "Unknown error. Check browser console (F12) for details."}`;
      }
      
      alert(errorMessage);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="px-4 py-6 pb-24 md:px-8 md:py-10">
          <div className="mx-auto max-w-3xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white">Settings</h1>
              <p className="mt-2 text-gray-400">Manage your account and profile</p>
            </div>

            {/* Account Info */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/20 p-2">
                  <User className="h-5 w-5 text-emerald-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Account Information</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Full Name</p>
                  <p className="mt-1 text-white">{profile?.fullName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="mt-1 text-white">{profile?.email || "—"}</p>
                </div>
              </div>
            </div>

            {/* Profile Picture */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/20 p-2">
                  <ImageIcon className="h-5 w-5 text-emerald-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Profile Picture</h2>
              </div>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {profilePicture ? (
                    <div className="relative">
                      <img
                        src={profilePicture}
                        alt="Profile"
                        className="h-24 w-24 rounded-full object-cover border-2 border-white/20"
                      />
                      <button
                        onClick={handleRemovePhoto}
                        className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1.5 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl font-bold text-white border-2 border-white/20">
                      {profile?.fullName?.split(" ").map(n => n[0]).join("").slice(0, 2) || "P"}
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
                    id="profile-photo-upload"
                  />
                  <label
                    htmlFor="profile-photo-upload"
                    className="inline-block"
                  >
                    <Button
                      type="button"
                      disabled={uploadingPhoto}
                      variant="outline"
                      className="border-white/10 text-gray-300 hover:bg-white/10 disabled:opacity-50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className={`mr-2 h-4 w-4 ${uploadingPhoto ? "animate-pulse" : ""}`} />
                      {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                    </Button>
                  </label>
                  {uploadingPhoto && (
                    <div className="mt-2">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-full animate-pulse bg-emerald-500/50" />
                      </div>
                      <p className="mt-1 text-xs text-gray-400">Processing image...</p>
                    </div>
                  )}
                  {!uploadingPhoto && (
                    <p className="mt-2 text-xs text-gray-500">
                      JPG, PNG or GIF. Recommended: under 400KB (auto-compressed if over 2MB)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Mentor Profile */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/20 p-2">
                    <Heart className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Mentor Profile</h2>
                </div>
                {!editing && (
                  <Button
                    onClick={() => setEditing(true)}
                    variant="outline"
                    className="border-white/10 text-gray-300 hover:bg-white/10"
                  >
                    Edit
                  </Button>
                )}
              </div>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">Specialization/Area</label>
                    <Input
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g., Academic Support, Mental Health, Life Skills"
                      className="border-white/10 bg-white/5 text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">About</label>
                    <textarea
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      placeholder="Tell students about your background and how you can help..."
                      rows={4}
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditing(false);
                        setSpecialization(profile?.application?.specialization || "");
                        setAbout(profile?.application?.about || "");
                      }}
                      variant="outline"
                      className="border-white/10 text-gray-300"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Specialization</p>
                    <p className="mt-1 text-white">{profile?.application?.specialization || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">About</p>
                    <p className="mt-1 text-white whitespace-pre-wrap">{profile?.application?.about || "Not set"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/20 p-2">
                  <LogOut className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white">Sign Out</h2>
                  <p className="mt-1 text-sm text-gray-400">You'll be returned to the home screen</p>
                </div>
                <Button
                  onClick={() => void logout()}
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
