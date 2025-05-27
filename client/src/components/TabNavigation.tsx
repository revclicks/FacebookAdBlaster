import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Rocket, Facebook, List, BarChart3 } from "lucide-react";

interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function TabNavigation({ activeTab, setActiveTab }: TabNavigationProps) {
  const { data: jobStats } = useQuery({
    queryKey: ["/api/submission-jobs/stats"],
    refetchInterval: 5000,
  });

  const pendingJobs = (jobStats?.pending || 0) + (jobStats?.processing || 0);

  const tabs = [
    {
      id: "asset-library",
      label: "Asset Library",
      icon: FolderOpen,
    },
    {
      id: "bulk-launch",
      label: "Bulk Launch",
      icon: Rocket,
    },
    {
      id: "connected-accounts",
      label: "Connected Accounts",
      icon: Facebook,
    },
    {
      id: "submission-logs",
      label: "Submission Logs",
      icon: List,
      badge: pendingJobs > 0 ? pendingJobs : undefined,
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
    },
  ];

  return (
    <nav className="flex space-x-8 border-b border-slate-200">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant="ghost"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground py-2 pb-4 px-1 h-auto rounded-none relative border-b-2 border-blue-600 text-[#334155]"
          onClick={() => setActiveTab(tab.id)}
        >
          <tab.icon className="mr-2 h-4 w-4" />
          {tab.label}
          {tab.badge && (
            <Badge 
              variant="secondary" 
              className="ml-2 bg-orange-100 text-orange-700 hover:bg-orange-100"
            >
              {tab.badge}
            </Badge>
          )}
        </Button>
      ))}
    </nav>
  );
}
