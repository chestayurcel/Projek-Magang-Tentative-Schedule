import { Sidebar } from "@/components/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-kai-bg">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
           <h2 className="text-xl font-semibold text-kai-blue tracking-tight">Panel Admin</h2>
           <div className="flex items-center space-x-4">
             {/* Profile placeholder */}
             <div className="w-10 h-10 rounded-full bg-kai-orange text-white flex items-center justify-center font-bold text-lg shadow-sm">
                A
             </div>
           </div>
        </header>
        <div className="flex-1 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
