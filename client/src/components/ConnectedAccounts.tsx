import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { startFacebookOAuth } from "@/lib/facebook-oauth";
import { Facebook, RefreshCw, Unlink, Plus } from "lucide-react";

interface FacebookAccount {
  id: number;
  name: string;
  facebookAccountId: string;
  isActive: boolean;
  tokenExpiresAt?: string;
  permissions: string[];
  createdAt: string;
}

export default function ConnectedAccounts() {
  const { toast } = useToast();

  const { data: accounts = [], isLoading } = useQuery<FacebookAccount[]>({
    queryKey: ["/api/facebook-accounts"],
  });

  const refreshTokenMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await apiRequest("POST", `/api/facebook-accounts/${accountId}/refresh`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facebook-accounts"] });
      toast({ title: "Token refreshed successfully" });
    },
    onError: (error) => {
      toast({ title: "Error refreshing token", description: error.message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (accountId: number) => {
      await apiRequest("DELETE", `/api/facebook-accounts/${accountId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facebook-accounts"] });
      toast({ title: "Account disconnected successfully" });
    },
    onError: (error) => {
      toast({ title: "Error disconnecting account", description: error.message, variant: "destructive" });
    },
  });

  const handleConnectFacebook = async () => {
    try {
      await startFacebookOAuth();
    } catch (error) {
      toast({ 
        title: "Error connecting Facebook account", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const isTokenExpiring = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expirationDate = new Date(expiresAt);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return expirationDate <= threeDaysFromNow;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPermissionStatus = (permission: string) => {
    const requiredPermissions = ['ads_management', 'ads_read', 'business_management'];
    return requiredPermissions.includes(permission);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading accounts...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Connected Accounts</h2>
            <p className="text-sm text-slate-600 mt-1">Manage your Facebook ad account connections and permissions</p>
          </div>
          <Button onClick={handleConnectFacebook} className="bg-blue-600 hover:bg-blue-700">
            <Facebook className="mr-2 h-4 w-4" />
            Connect New Account
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {accounts.map((account) => (
            <Card key={account.id} className="border border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Facebook className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{account.name}</h3>
                      <p className="text-sm text-slate-600">Account ID: {account.facebookAccountId}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${
                            isTokenExpiring(account.tokenExpiresAt) 
                              ? 'bg-orange-500' 
                              : 'bg-green-500'
                          }`}></div>
                          <span className={`text-xs font-medium ${
                            isTokenExpiring(account.tokenExpiresAt)
                              ? 'text-orange-600'
                              : 'text-green-600'
                          }`}>
                            {isTokenExpiring(account.tokenExpiresAt) ? 'Token Expiring' : 'Connected'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {account.tokenExpiresAt 
                            ? `Expires ${formatDate(account.tokenExpiresAt)}`
                            : 'Last sync: 2 minutes ago'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => refreshTokenMutation.mutate(account.id)}
                      disabled={refreshTokenMutation.isPending}
                      className={isTokenExpiring(account.tokenExpiresAt) ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      {isTokenExpiring(account.tokenExpiresAt) ? 'Refresh Token' : 'Refresh'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to disconnect this account?')) {
                          disconnectMutation.mutate(account.id);
                        }
                      }}
                      disabled={disconnectMutation.isPending}
                      className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                    >
                      <Unlink className="mr-1 h-3 w-3" />
                      Disconnect
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <div className="text-sm font-medium text-slate-900">24</div>
                    <div className="text-xs text-slate-500">Active Campaigns</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">$12,450</div>
                    <div className="text-xs text-slate-500">Monthly Spend</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">Admin</div>
                    <div className="text-xs text-slate-500">Permission Level</div>
                  </div>
                </div>

                {/* Account Permissions */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-900 mb-2">Permissions</h4>
                  <div className="flex flex-wrap gap-2">
                    {account.permissions.map((permission) => (
                      <Badge
                        key={permission}
                        variant="secondary"
                        className={
                          getPermissionStatus(permission)
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {getPermissionStatus(permission) && "✓ "}
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {accounts.length === 0 && (
            <Card className="border-2 border-dashed border-slate-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Facebook className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Connect Facebook Account</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Connect your Facebook ad account to start creating and managing campaigns.
                </p>
                <Button onClick={handleConnectFacebook} className="bg-blue-600 hover:bg-blue-700">
                  <Facebook className="mr-2 h-4 w-4" />
                  Connect Account
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Connection Instructions */}
          {accounts.length > 0 && (
            <Card className="border-2 border-dashed border-slate-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Connect Additional Facebook Account</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Connect more ad accounts to manage campaigns across multiple Facebook business accounts from one dashboard.
                </p>
                <Button onClick={handleConnectFacebook} className="bg-blue-600 hover:bg-blue-700">
                  <Facebook className="mr-2 h-4 w-4" />
                  Connect Account
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
