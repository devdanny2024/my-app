import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Mail, Users, FileText, Send } from "lucide-react";

const menuItems = [
  { href: "/subscribers", label: "Subscribers", icon: Users },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
];

export default function Sidebar() {
  const router = useRouter();

  return (
    <aside className="w-72 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col shadow-2xl min-h-screen">
      <div className="p-8 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Send className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              Wanzami Mailer
            </h1>
            <p className="text-purple-300 text-sm">Email Marketing Suite</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = router.pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${active ? "bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20" : "text-purple-300 hover:text-white hover:bg-white/5"}`}>
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/10">
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4 backdrop-blur-sm">
          <p className="text-purple-300 text-sm">Ready to grow your audience?</p>
          <p className="text-white font-medium text-sm">Start creating campaigns!</p>
        </div>
      </div>
    </aside>
  );
}
