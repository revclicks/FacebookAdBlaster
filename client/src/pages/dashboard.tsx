import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import TabNavigation from "@/components/TabNavigation";
import AssetLibrary from "@/components/AssetLibrary";
import BulkLaunchBuilder from "@/components/BulkLaunchBuilder";
import ConnectedAccounts from "@/components/ConnectedAccounts";
import SubmissionLogs from "@/components/SubmissionLogs";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>("asset-library");

  const renderActiveTab = () => {
    switch (activeTab) {
      case "asset-library":
        return <AssetLibrary />;
      case "bulk-launch":
        return <BulkLaunchBuilder />;
      case "connected-accounts":
        return <ConnectedAccounts />;
      case "submission-logs":
        return <SubmissionLogs />;
      case "analytics":
        return <AnalyticsDashboard />;
      default:
        return <AssetLibrary />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      
      <div className="max-w-7xl mx-auto px-6 py-6">
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="mt-6">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
}
