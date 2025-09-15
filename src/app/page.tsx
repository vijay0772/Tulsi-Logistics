import DashboardTabs from "@/components/dashboard/Tabs";

export default function Home() {
  return (
    <main className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white drop-shadow">Fuel & Cost Optimization</h1>
        <p className="text-white/80">Plan routes, optimize fuel stops, analyze costs and CO₂.</p>
        <DashboardTabs />
      </div>
    </main>
  );
}
