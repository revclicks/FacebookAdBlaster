import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Rocket, Facebook, List } from "lucide-react";

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
  ];

  return (
    <nav className="flex space-x-8 border-b border-slate-200">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant="ghost"
          className={`pb-4 px-1 h-auto rounded-none relative ${
            activeTab === tab.id
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
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
