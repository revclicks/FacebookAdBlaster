import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  MousePointer, 
  DollarSign, 
  Users, 
  BarChart3,
  Calendar,
  Download,
  Filter
} from "lucide-react";
import { useState } from "react";

interface CampaignMetrics {
  campaignId: number;
  campaignName: string;
  adAccountName: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  frequency: number;
  reach: number;
  dateRange: string;
}

interface AnalyticsOverview {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  averageCTR: number;
  averageCPC: number;
  averageROAS: number;
  activeCampaigns: number;
  spendChange: number;
  impressionsChange: number;
  clicksChange: number;
  conversionsChange: number;
}

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState("7d");
  const [selectedMetric, setSelectedMetric] = useState("spend");

  // Fetch analytics overview data
  const { data: overview, isLoading: overviewLoading } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/analytics/overview", dateRange],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch campaign metrics data
  const { data: campaigns, isLoading: campaignsLoading } = useQuery<CampaignMetrics[]>({
    queryKey: ["/api/analytics/campaigns", dateRange],
    refetchInterval: 30000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-slate-500";
  };

  if (overviewLoading || campaignsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-200 rounded mb-2"></div>
                <div className="h-8 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h2>
          <p className="text-slate-600 mt-1">Track campaign performance and key metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-slate-600">Total Spend</span>
              </div>
              {overview && getChangeIcon(overview.spendChange)}
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {overview ? formatCurrency(overview.totalSpend) : "$0"}
            </div>
            {overview && (
              <p className={`text-sm ${getChangeColor(overview.spendChange)}`}>
                {overview.spendChange > 0 ? '+' : ''}{formatPercentage(overview.spendChange)} vs last period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-slate-600">Impressions</span>
              </div>
              {overview && getChangeIcon(overview.impressionsChange)}
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {overview ? formatNumber(overview.totalImpressions) : "0"}
            </div>
            {overview && (
              <p className={`text-sm ${getChangeColor(overview.impressionsChange)}`}>
                {overview.impressionsChange > 0 ? '+' : ''}{formatPercentage(overview.impressionsChange)} vs last period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <MousePointer className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-slate-600">Clicks</span>
              </div>
              {overview && getChangeIcon(overview.clicksChange)}
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {overview ? formatNumber(overview.totalClicks) : "0"}
            </div>
            {overview && (
              <p className={`text-sm ${getChangeColor(overview.clicksChange)}`}>
                {overview.clicksChange > 0 ? '+' : ''}{formatPercentage(overview.clicksChange)} vs last period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-slate-600">Conversions</span>
              </div>
              {overview && getChangeIcon(overview.conversionsChange)}
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {overview ? formatNumber(overview.totalConversions) : "0"}
            </div>
            {overview && (
              <p className={`text-sm ${getChangeColor(overview.conversionsChange)}`}>
                {overview.conversionsChange > 0 ? '+' : ''}{formatPercentage(overview.conversionsChange)} vs last period
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">Avg CTR</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {overview ? formatPercentage(overview.averageCTR) : "0%"}
            </div>
            <p className="text-sm text-slate-500">Click-through rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-slate-600">Avg CPC</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {overview ? formatCurrency(overview.averageCPC) : "$0"}
            </div>
            <p className="text-sm text-slate-500">Cost per click</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-slate-600">Avg ROAS</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {overview ? `${overview.averageROAS.toFixed(2)}x` : "0x"}
            </div>
            <p className="text-sm text-slate-500">Return on ad spend</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-slate-600">Active Campaigns</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {overview ? overview.activeCampaigns : "0"}
            </div>
            <p className="text-sm text-slate-500">Currently running</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Campaign Performance</span>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spend">Sort by Spend</SelectItem>
                <SelectItem value="impressions">Sort by Impressions</SelectItem>
                <SelectItem value="clicks">Sort by Clicks</SelectItem>
                <SelectItem value="conversions">Sort by Conversions</SelectItem>
                <SelectItem value="roas">Sort by ROAS</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Ad Account</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Spend</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Impressions</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Clicks</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">CTR</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">CPC</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Conversions</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {campaigns && campaigns.length > 0 ? (
                  campaigns.map((campaign) => (
                    <tr key={campaign.campaignId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-slate-900">{campaign.campaignName}</div>
                          <div className="text-sm text-slate-500">{campaign.dateRange}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-700">{campaign.adAccountName}</div>
                      </td>
                      <td className="text-right py-3 px-4 font-medium">
                        {formatCurrency(campaign.spend)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatNumber(campaign.impressions)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatNumber(campaign.clicks)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Badge variant={campaign.ctr > 2 ? "default" : "secondary"} className="bg-blue-100 text-blue-800 border-blue-200">
                          {formatPercentage(campaign.ctr)}
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatCurrency(campaign.cpc)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatNumber(campaign.conversions)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Badge variant={campaign.roas > 3 ? "default" : "secondary"} className="bg-blue-100 text-blue-800 border-blue-200">
                          {campaign.roas.toFixed(2)}x
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500">
                      No campaign data available for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}