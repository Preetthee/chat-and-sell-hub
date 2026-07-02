import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin, initials } from "@/hooks/use-auth";
import { toast } from "sonner";
import { logAuth } from "@/lib/auth-log";
import { Camera, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Deshi Cart" },
      { name: "description", content: "Manage your Deshi Cart profile, view your account details, and access your developer dashboard if available." },
      { property: "og:title", content: "Profile — Deshi Cart" },
      { property: "og:description", content: "Manage your Deshi Cart profile and account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type ProfileFields = {
  display_name: string;
  phone: string;
  bio: string;
  address: string;
  city: string;
  country: string;
};

const EMPTY: ProfileFields = {
  display_name: "",
  phone: "",
  bio: "",
  address: "",
  city: "",
  country: "",
};

const DUMMY: ProfileFields = {
  display_name: "New Customer",
  phone: "+880 1700 000000",
  bio: "Mango enthusiast and gadget collector based in Dhaka.",
  address: "House 42, Road 7, Dhanmondi",
  city: "Dhaka",
  country: "Bangladesh",
};

function ProfilePage() {
  const { user, loading } = useAuth();
  const { isAdmin } = useIsAdmin(user);
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [fields, setFields] = useState<ProfileFields>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setProfileLoading(true);
    supabase
      .from("profiles")
      .select("display_name, phone, bio, address, city, country, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          logAuth("profile:load:error", { message: error.message });
          toast.error("Could not load profile", { description: error.message });
        } else if (data) {
          setFields({
            display_name: data.display_name ?? "",
            phone: data.phone ?? "",
            bio: data.bio ?? "",
            address: data.address ?? "",
            city: data.city ?? "",
            country: data.country ?? "",
          });
          const stored = data.avatar_url ?? null;
          setAvatarPath(stored);
          if (stored && stored.startsWith(`${user.id}/`)) {
            // private bucket — sign it
            supabase.storage
              .from("avatars")
              .createSignedUrl(stored, 60 * 60 * 24 * 7)
              .then(({ data: signed }) => {
                if (!cancelled) setAvatarUrl(signed?.signedUrl ?? null);
              });
          } else {
            // OAuth-provided external URL stored as-is
            setAvatarUrl(stored);
          }
        }
        setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
        <Header />
        <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-32">
          <div className="flex items-center gap-3 text-sm text-stone-500">
            <span className="size-3 animate-pulse rounded-full bg-brand-mango" />
            Loading your profile…
          </div>
        </div>
      </div>
    );
  }

  const oauthAvatar = (user.user_metadata?.avatar_url as string | undefined) || null;
  const displayAvatar = avatarUrl || oauthAvatar;
  const name =
    fields.display_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email ||
    "You";

  async function signOut() {
    setSigningOut(true);
    logAuth("profile:signout:start", { userId: user!.id });
    await supabase.auth.signOut();
    logAuth("profile:signout:ok");
    toast.success("Signed out");
    navigate({ to: "/", replace: true });
  }

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const payload = {
      id: user.id,
      email: user.email,
      display_name: fields.display_name.trim() || null,
      phone: fields.phone.trim() || null,
      bio: fields.bio.trim() || null,
      address: fields.address.trim() || null,
      city: fields.city.trim() || null,
      country: fields.country.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    setSaving(false);
    if (error) {
      logAuth("profile:save:error", { message: error.message });
      toast.error("Could not save profile", { description: error.message });
      return;
    }
    logAuth("profile:save:ok");
    toast.success("Profile updated");
    setEditing(false);
  }

  function fillDummy() {
    setFields(DUMMY);
    setEditing(true);
    toast.info("Filled with sample info — edit as you like, then save.");
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    // Whitelist file type + extension. Browser-supplied file.type and file.name
    // are both untrusted; verify magic bytes and only allow real image formats.
    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
    };
    const sniff = await sniffImageType(file);
    if (!sniff) {
      toast.error("Only JPG, PNG, GIF or WebP images are allowed.");
      return;
    }
    const ext = MIME_TO_EXT[sniff];
    setUploadingAvatar(true);
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: sniff });
    if (upErr) {
      setUploadingAvatar(false);
      toast.error("Upload failed", { description: upErr.message });
      return;
    }
    // If previous file had a different extension, remove it
    if (avatarPath && avatarPath !== path && avatarPath.startsWith(`${user.id}/`)) {
      await supabase.storage.from("avatars").remove([avatarPath]);
    }
    const { error: dbErr } = await supabase
      .from("profiles")
      .upsert({ id: user.id, email: user.email, avatar_url: path, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (dbErr) {
      setUploadingAvatar(false);
      toast.error("Could not save avatar", { description: dbErr.message });
      return;
    }
    const { data: signed } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    setAvatarPath(path);
    setAvatarUrl(signed?.signedUrl ?? null);
    setUploadingAvatar(false);
    toast.success("Avatar updated");
  }

  async function removeAvatar() {
    if (!user || !avatarPath) return;
    setUploadingAvatar(true);
    if (avatarPath.startsWith(`${user.id}/`)) {
      await supabase.storage.from("avatars").remove([avatarPath]);
    }
    await supabase
      .from("profiles")
      .upsert({ id: user.id, email: user.email, avatar_url: null, updated_at: new Date().toISOString() }, { onConflict: "id" });
    setAvatarPath(null);
    setAvatarUrl(null);
    setUploadingAvatar(false);
    toast.success("Avatar removed");
  }

  const set = (k: keyof ProfileFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-brand-surface font-sans text-brand-ink">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="relative">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-20 rounded-full object-cover ring-2 ring-brand-mango/30"
                />
              ) : (
                <div className="grid size-20 place-items-center rounded-full bg-brand-leaf text-2xl font-bold text-white ring-2 ring-brand-leaf/30">
                  {initials(name)}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Change avatar"
                className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-brand-ink text-white shadow ring-2 ring-white hover:opacity-90 disabled:opacity-50"
              >
                <Camera className="size-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onAvatarChange}
              />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">{name}</h1>
              <p className="text-sm text-stone-500">{user.email}</p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                {uploadingAvatar && <span className="text-stone-500">Uploading…</span>}
                {avatarPath && avatarPath.startsWith(`${user.id}/`) && !uploadingAvatar && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="inline-flex items-center gap-1 text-stone-500 hover:text-red-600"
                  >
                    <Trash2 className="size-3" /> Remove avatar
                  </button>
                )}
              </div>
              {isAdmin && (
                <span className="mt-2 inline-block rounded-full bg-brand-mango/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-brand-mango">
                  Developer
                </span>
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-stone-100 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">About you</h2>
              {!editing ? (
                <div className="flex gap-2">
                  <button
                    onClick={fillDummy}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                  >
                    Use sample info
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-lg bg-brand-ink px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    disabled={saving}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="rounded-lg bg-brand-mango px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>

            {profileLoading ? (
              <p className="mt-4 text-sm text-stone-400">Loading your info…</p>
            ) : editing ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Display name">
                  <input value={fields.display_name} onChange={set("display_name")} className={inputCls} />
                </Field>
                <Field label="Phone">
                  <input value={fields.phone} onChange={set("phone")} className={inputCls} />
                </Field>
                <Field label="Address" full>
                  <input value={fields.address} onChange={set("address")} className={inputCls} />
                </Field>
                <Field label="City">
                  <input value={fields.city} onChange={set("city")} className={inputCls} />
                </Field>
                <Field label="Country">
                  <input value={fields.country} onChange={set("country")} className={inputCls} />
                </Field>
                <Field label="Bio" full>
                  <textarea
                    rows={3}
                    value={fields.bio}
                    onChange={set("bio")}
                    className={inputCls + " min-h-[80px] resize-y"}
                  />
                </Field>
              </div>
            ) : (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <Row label="Display name" value={fields.display_name} />
                <Row label="Phone" value={fields.phone} />
                <Row label="Address" value={fields.address} full />
                <Row label="City" value={fields.city} />
                <Row label="Country" value={fields.country} />
                <Row label="Bio" value={fields.bio} full />
              </dl>
            )}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {isAdmin && (
              <Link
                to="/dev"
                className="rounded-xl bg-brand-mango px-4 py-3 text-center text-sm font-semibold text-white hover:opacity-90"
              >
                Open Dev Dashboard
              </Link>
            )}
            <button
              onClick={signOut}
              disabled={signingOut}
              className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-brand-ink hover:bg-stone-50 disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-mango";

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-stone-800">{value || <span className="text-stone-400">—</span>}</dd>
    </div>
  );
}