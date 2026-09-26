"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const categories = ["Technology", "Music", "Gaming", "Education", "Entertainment", "Sports", "Science", "Art", "Travel", "Cooking", "Other"];
const limits = 1024 * 1024 * 1024;

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Technology");
  const [visibility, setVisibility] = useState("public");
  const [vertical, setVertical] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!file || !videoRef.current) return;
    const video = videoRef.current;
    const onMeta = () => {
      setDuration(Number.isFinite(video.duration) ? Math.round(video.duration) : null);
      setVertical(video.videoHeight > video.videoWidth);
    };
    video.addEventListener("loadedmetadata", onMeta);
    video.load();
    return () => video.removeEventListener("loadedmetadata", onMeta);
  }, [file]);

  async function publish() {
    setError("");
    setStatus("");

    if (!file) {
      setError("Choose a video file first.");
      return;
    }

    if (!title.trim()) {
      setError("Add a title.");
      return;
    }

    if (file.size > limits) {
      setError("Video files must be 1 GB or smaller.");
      return;
    }

    const supabase = supabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be signed in to upload.");
      return;
    }

    setBusy(true);

    try {
      const id = crypto.randomUUID();
      const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const bucket = visibility === "private" ? "videos-private" : "videos-public";
      const path = user.id + "/" + id + "." + extension;

      setStatus("Uploading video…");

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false
        });

      if (uploadError) throw uploadError;

      let thumbnailUrl: string | null = null;
      const video = videoRef.current;

      if (video && duration !== null) {
        try {
          video.currentTime = 0;

          await new Promise<void>((resolve) => {
            const done = () => {
              video.removeEventListener("seeked", done);
              resolve();
            };

            video.addEventListener("seeked", done);
            setTimeout(() => {
              video.removeEventListener("seeked", done);
              resolve();
            }, 1500);
          });

          const canvas = document.createElement("canvas");
          canvas.width = Math.min(video.videoWidth, 1280);
          canvas.height = Math.max(1, Math.round(canvas.width * video.videoHeight / video.videoWidth));
          canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, "image/jpeg", 0.82);
          });

          if (blob) {
            const thumbPath = user.id + "/" + id + ".jpg";
            const { error: thumbError } = await supabase.storage
              .from("video-thumbnails")
              .upload(thumbPath, blob, {
                contentType: "image/jpeg",
                cacheControl: "31536000",
                upsert: false
              });

            if (!thumbError) {
              thumbnailUrl = supabase.storage
                .from("video-thumbnails")
                .getPublicUrl(thumbPath).data.publicUrl;
            }
          }
        } catch {}
      }

      const videoUrl = visibility === "private"
        ? null
        : supabase.storage.from("videos-public").getPublicUrl(path).data.publicUrl;

      const { error: dbError } = await supabase.from("videos").insert({
        id,
        user_id: user.id,
        title: title.trim(),
        description,
        category,
        tags: [],
        thumbnail_url: thumbnailUrl,
        video_url: videoUrl,
        duration,
        orientation: vertical ? "vertical" : "horizontal",
        visibility
      });

      if (dbError) {
        await supabase.storage.from(bucket).remove([path]);

        if (thumbnailUrl) {
          await supabase.storage
            .from("video-thumbnails")
            .remove([user.id + "/" + id + ".jpg"]);
        }

        throw dbError;
      }

      setStatus("Published successfully.");
      setFile(null);
      setTitle("");
      setDescription("");
      setDuration(null);
      setVertical(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <p className="text-sm font-bold text-violet-600">CREATOR STUDIO</p>
      <h1 className="mt-2 text-4xl font-black">Upload a video</h1>

      <div className="mt-8 space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <label className="block">
          <span className="text-sm font-bold">Video file</span>
          <div className="mt-2 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mx-auto block max-w-full text-sm"
            />
            {file ? (
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                {duration !== null ? " · " + Math.floor(duration / 60) + ":" + String(duration % 60).padStart(2, "0") : ""}
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">MP4, WebM or MOV · up to 1 GB</p>
            )}
          </div>
        </label>

        <video
          ref={videoRef}
          src={file ? URL.createObjectURL(file) : undefined}
          className="hidden"
          muted
          playsInline
          preload="metadata"
        />

        <label className="block">
          <span className="text-sm font-bold">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Give your video a clear title"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 min-h-32 w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Tell viewers what they will see..."
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>

          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </div>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={vertical}
            onChange={(e) => setVertical(e.target.checked)}
            className="h-5 w-5"
          />
          <span>
            <b>Publish to VideoShare Vertical</b>
            <span className="block text-sm text-slate-500">
              Detected automatically from the video's dimensions.
            </span>
          </span>
        </label>

        {error && (
          <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        {status && (
          <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {status}
          </p>
        )}

        <button
          disabled={busy}
          onClick={publish}
          className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Publish video"}
        </button>
      </div>
    </div>
  );
}
