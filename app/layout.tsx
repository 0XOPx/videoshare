"use client";
import type {Metadata} from "next";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "@/lib/supabase-browser";
import "./globals.css";
export const metadata:Metadata={title:"VideoShare — Watch, discover, create",description:"A modern video-sharing platform with personalized discovery and VideoShare Vertical."};
export default function RootLayout({children}:{children:React.ReactNode}){
  const [email,setEmail]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const supabase=supabaseBrowser();
    supabase.auth.getUser().then(({data})=>{setEmail(data.user?.email??null);setLoading(false)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setEmail(session?.user?.email??null));
    return ()=>subscription.unsubscribe();
  },[]);
  async function signOut(){await supabaseBrowser().auth.signOut();window.location.href="/"}
  return <html lang="en"><body><header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-[1500px] items-center gap-5 px-4 sm:px-6"><Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-sm text-white">V</span>VideoShare</Link><nav className="hidden items-center gap-1 lg:flex"><Link href="/" className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-100">Home</Link><Link href="/explore" className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-100">Explore</Link><Link href="/vertical" className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-100">VideoShare Vertical</Link><Link href="/" className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-100">Subscriptions</Link><Link href="/" className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-100">Library</Link></nav><div className="ml-auto flex items-center gap-2"><Link href="/search" className="hidden min-w-56 rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-500 md:block">Search VideoShare…</Link><Link href="/upload" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">Create</Link>{loading?<span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-400">Loading…</span>:email?<div className="flex items-center gap-2"><span className="hidden max-w-48 truncate rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold sm:block">{email}</span><button onClick={signOut} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold hover:bg-slate-200">Sign out</button></div>:<Link href="/sign-in" className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold">Sign in</Link>}</div></div></header><main className="mx-auto w-full max-w-[1500px] px-4 pt-6 sm:px-6">{children}</main><nav className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur lg:hidden"><Link href="/" className="rounded-xl px-3 py-2 text-xs font-bold">Home</Link><Link href="/explore" className="rounded-xl px-3 py-2 text-xs font-bold">Explore</Link><Link href="/vertical" className="rounded-xl px-3 py-2 text-xs font-bold">Vertical</Link><Link href="/upload" className="rounded-xl px-3 py-2 text-xs font-bold">Create</Link><Link href="/" className="rounded-xl px-3 py-2 text-xs font-bold">Library</Link></nav></body></html>
}