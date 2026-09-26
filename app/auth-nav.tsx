"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "@/lib/supabase-browser";
export default function AuthNav(){
  const [email,setEmail]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const supabase=supabaseBrowser();
    supabase.auth.getUser().then(({data})=>{setEmail(data.user?.email??null);setLoading(false)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setEmail(session?.user?.email??null));
    return ()=>subscription.unsubscribe();
  },[]);
  async function signOut(){await supabaseBrowser().auth.signOut();window.location.href="/"}
  if(loading)return <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-400">Loading…</span>;
  if(!email)return <Link href="/sign-in" className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold">Sign in</Link>;
  return <div className="flex items-center gap-2"><span className="hidden max-w-48 truncate rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold sm:block">{email}</span><button onClick={signOut} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold hover:bg-slate-200">Sign out</button></div>;
}