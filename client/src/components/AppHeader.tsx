import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Bell, User } from "lucide-react";

interface FacebookAccount {
  id: number;
  name: string;
  facebookAccountId: string;
  isActive: boolean;
}

export default function AppHeader() {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const { data: facebookAccounts = [] } = useQuery<FacebookAccount[]>({
    queryKey: ["/api/facebook-accounts"],
  });

  const { data: jobStats } = useQuery({
    queryKey: ["/api/submission-jobs/stats"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const selectedAccount = facebookAccounts.find(acc => acc.id === selectedAccountId) || facebookAccounts[0];
  const pendingJobs = jobStats?.pending || 0;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">F</span>
              </div>
              <h1 className="text-xl font-semibold text-slate-900">FB Ads Bulk Tool</h1>
            </div>
            
            {/* Connected Accounts Dropdown */}
            {facebookAccounts.length > 0 && (
              <div className="flex items-center space-x-2 ml-8">
                <span className="text-sm text-slate-600">Connected Account:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="font-medium">{selectedAccount?.name || "Select Account"}</span>
                      <ChevronDown className="ml-2 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80">
                    <div className="p-3 border-b border-slate-100">
                      <h3 className="font-medium text-slate-900">Connected Accounts</h3>
                    </div>
                    {facebookAccounts.map((account) => (
                      <DropdownMenuItem
                        key={account.id}
                        onClick={() => setSelectedAccountId(account.id)}
                        className="p-3"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <div className="font-medium text-slate-900">{account.name}</div>
                              <div className="text-sm text-slate-500">ID: {account.facebookAccountId}</div>
                            </div>
                          </div>
                          {account.isActive && (
                            <Badge variant="secondary" className="text-xs">Active</Badge>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {pendingJobs > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {pendingJobs}
                </Badge>
              )}
            </Button>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-slate-900">John Doe</div>
                <div className="text-xs text-slate-500">john@example.com</div>
              </div>
              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
