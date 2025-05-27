import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import AssetPickerModal from "@/components/modals/AssetPickerModal";
import { Plus, Rocket, FolderInput, Copy, Trash2, ChevronDown } from "lucide-react";

interface Campaign {
  id?: number;
  name: string;
  objective: string;
  budget: string;
  startDate: string;
  endDate: string;
  geography: string;
  ageRange: string;
  gender: string;
  placements: string;
  creativeAssetId?: number;
  status: 'draft' | 'validating' | 'valid' | 'invalid';
  validationErrors?: string[];
}

interface Asset {
  id: number;
  name: string;
  type: string;
}

interface FacebookAccount {
  id: number;
  name: string;
}

export default function BulkLaunchBuilder() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      name: "Holiday_{creative_name}_{date}",
      objective: "CONVERSIONS",
      budget: "75",
      startDate: "2024-01-15",
      endDate: "2024-01-31",
      geography: "US, CA",
      ageRange: "25-54",
      gender: "all",
      placements: "automatic",
      status: "valid",
    },
    {
      name: "Video_{creative_name}_Test_{geo}",
      objective: "VIDEO_VIEWS",
      budget: "100",
      startDate: "2024-01-20",
      endDate: "2024-02-15",
      geography: "UK, AU, NZ",
      ageRange: "18-35",
      gender: "all",
      placements: "reels",
      status: "validating",
    },
    {
      name: "Test_Campaign_",
      objective: "",
      budget: "25",
      startDate: "",
      endDate: "",
      geography: "US",
      ageRange: "",
      gender: "all",
      placements: "automatic",
      status: "invalid",
      validationErrors: ["Campaign name too short", "Missing objective", "Missing dates"],
    },
  ]);

  const [selectedCampaigns, setSelectedCampaigns] = useState<number[]>([]);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [selectedCampaignIndex, setSelectedCampaignIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: facebookAccounts = [] } = useQuery<FacebookAccount[]>({
    queryKey: ["/api/facebook-accounts"],
  });

  const bulkSubmitMutation = useMutation({
    mutationFn: async (campaignIds: number[]) => {
      // First, save all campaigns
      const savedCampaigns = [];
      for (const campaign of campaigns) {
        if (campaign.status === 'valid' && !campaign.id) {
          const response = await apiRequest("POST", "/api/campaigns", {
            ...campaign,
            facebookAccountId: facebookAccounts[0]?.id, // Use first account for demo
            budget: parseFloat(campaign.budget),
            startDate: new Date(campaign.startDate),
            endDate: new Date(campaign.endDate),
          });
          const savedCampaign = await response.json();
          savedCampaigns.push(savedCampaign);
        }
      }

      // Then submit for processing
      const response = await apiRequest("POST", "/api/campaigns/bulk-submit", {
        campaignIds: savedCampaigns.map(c => c.id),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/submission-jobs"] });
      toast({ 
        title: "Campaigns submitted successfully", 
        description: `${data.jobs.length} campaigns added to processing queue`
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error submitting campaigns", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const addRow = () => {
    setCampaigns([
      ...campaigns,
      {
        name: "",
        objective: "",
        budget: "",
        startDate: "",
        endDate: "",
        geography: "",
        ageRange: "",
        gender: "all",
        placements: "automatic",
        status: "draft",
      },
    ]);
  };

  const duplicateRow = (index: number) => {
    const campaign = { ...campaigns[index] };
    campaign.name = `${campaign.name}_copy`;
    campaign.status = "draft";
    setCampaigns([...campaigns, campaign]);
  };

  const deleteRow = (index: number) => {
    setCampaigns(campaigns.filter((_, i) => i !== index));
  };

  const updateCampaign = (index: number, field: keyof Campaign, value: any) => {
    const updated = [...campaigns];
    updated[index] = { ...updated[index], [field]: value };
    
    // Simple validation
    if (field === 'name' || field === 'objective' || field === 'startDate') {
      updated[index].status = validateCampaign(updated[index]);
    }
    
    setCampaigns(updated);
  };

  const validateCampaign = (campaign: Campaign): 'valid' | 'invalid' | 'validating' => {
    const errors = [];
    
    if (!campaign.name || campaign.name.length < 5) {
      errors.push("Campaign name too short");
    }
    if (!campaign.objective) {
      errors.push("Missing objective");
    }
    if (!campaign.startDate || !campaign.endDate) {
      errors.push("Missing dates");
    }
    
    return errors.length === 0 ? 'valid' : 'invalid';
  };

  const handleAssetSelection = (asset: Asset) => {
    if (selectedCampaignIndex !== null) {
      updateCampaign(selectedCampaignIndex, 'creativeAssetId', asset.id);
    }
    setAssetPickerOpen(false);
    setSelectedCampaignIndex(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-500';
      case 'validating':
        return 'bg-blue-400';
      case 'invalid':
        return 'bg-red-500';
      default:
        return 'bg-slate-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'valid':
        return 'Valid';
      case 'validating':
        return 'Validating';
      case 'invalid':
        return 'Invalid';
      default:
        return 'Draft';
    }
  };

  const validCount = campaigns.filter(c => c.status === 'valid').length;
  const validatingCount = campaigns.filter(c => c.status === 'validating').length;
  const invalidCount = campaigns.filter(c => c.status === 'invalid').length;
  const draftCount = campaigns.filter(c => c.status === 'draft').length;

  const canSubmit = validCount > 0 && facebookAccounts.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Bulk Campaign Builder</h2>
            <p className="text-sm text-slate-600 mt-1">Create multiple campaigns efficiently with our spreadsheet-style interface</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <FolderInput className="mr-2 h-4 w-4" />
              Load Template
            </Button>
            <Button variant="outline" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>
            <Button 
              onClick={() => bulkSubmitMutation.mutate([])}
              disabled={!canSubmit || bulkSubmitMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Rocket className="mr-2 h-4 w-4" />
              {bulkSubmitMutation.isPending ? "Launching..." : "Launch Campaigns"}
            </Button>
          </div>
        </div>

        {/* Token Helper */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Available Tokens</h4>
          <div className="flex flex-wrap gap-2">
            {['{date}', '{creative_name}', '{objective}', '{geo}', '{age_range}'].map(token => (
              <Badge key={token} variant="secondary" className="bg-blue-100 text-blue-800 font-mono text-xs">
                {token}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100">
              <TableHead className="w-[40px]">
                <Checkbox />
              </TableHead>
              <TableHead className="min-w-[250px]">Campaign Name</TableHead>
              <TableHead className="min-w-[120px]">Objective</TableHead>
              <TableHead className="min-w-[100px]">Budget</TableHead>
              <TableHead className="min-w-[120px]">Start Date</TableHead>
              <TableHead className="min-w-[120px]">End Date</TableHead>
              <TableHead className="min-w-[150px]">Geography</TableHead>
              <TableHead className="min-w-[100px]">Age Range</TableHead>
              <TableHead className="min-w-[100px]">Gender</TableHead>
              <TableHead className="min-w-[150px]">Placements</TableHead>
              <TableHead className="min-w-[180px]">Creative Asset</TableHead>
              <TableHead className="min-w-[80px]">Status</TableHead>
              <TableHead className="min-w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign, index) => (
              <TableRow key={index} className="hover:bg-slate-50">
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell>
                  <Input
                    value={campaign.name}
                    onChange={(e) => updateCampaign(index, 'name', e.target.value)}
                    className={`font-mono text-sm ${
                      campaign.status === 'invalid' && campaign.validationErrors?.includes('Campaign name too short')
                        ? 'border-red-300 bg-red-50'
                        : ''
                    }`}
                    placeholder="Holiday_{creative_name}_{date}"
                  />
                  {campaign.status === 'invalid' && campaign.validationErrors?.includes('Campaign name too short') && (
                    <div className="text-xs text-red-600 mt-1">Campaign name too short</div>
                  )}
                </TableCell>
                <TableCell>
                  <Select value={campaign.objective} onValueChange={(value) => updateCampaign(index, 'objective', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select objective..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONVERSIONS">Conversions</SelectItem>
                      <SelectItem value="LINK_CLICKS">Link Clicks</SelectItem>
                      <SelectItem value="REACH">Reach</SelectItem>
                      <SelectItem value="IMPRESSIONS">Impressions</SelectItem>
                      <SelectItem value="VIDEO_VIEWS">Video Views</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={campaign.budget}
                    onChange={(e) => updateCampaign(index, 'budget', e.target.value)}
                    placeholder="50"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={campaign.startDate}
                    onChange={(e) => updateCampaign(index, 'startDate', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={campaign.endDate}
                    onChange={(e) => updateCampaign(index, 'endDate', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={campaign.geography}
                    onChange={(e) => updateCampaign(index, 'geography', e.target.value)}
                    placeholder="US, CA, UK"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={campaign.ageRange}
                    onChange={(e) => updateCampaign(index, 'ageRange', e.target.value)}
                    placeholder="25-54"
                  />
                </TableCell>
                <TableCell>
                  <Select value={campaign.gender} onValueChange={(value) => updateCampaign(index, 'gender', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={campaign.placements} onValueChange={(value) => updateCampaign(index, 'placements', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="facebook_feeds">Facebook Feeds</SelectItem>
                      <SelectItem value="instagram_feeds">Instagram Feeds</SelectItem>
                      <SelectItem value="stories">Stories</SelectItem>
                      <SelectItem value="reels">Reels</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => {
                      setSelectedCampaignIndex(index);
                      setAssetPickerOpen(true);
                    }}
                  >
                    <span className="truncate">
                      {campaign.creativeAssetId 
                        ? assets.find(a => a.id === campaign.creativeAssetId)?.name || "Select asset..."
                        : "Select asset..."
                      }
                    </span>
                    <ChevronDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(campaign.status)}`}></div>
                    <span className="text-xs text-slate-600">{getStatusText(campaign.status)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => duplicateRow(index)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteRow(index)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer with validation summary */}
      <div className="p-6 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-slate-600">Valid: <span className="font-medium">{validCount}</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span className="text-slate-600">Validating: <span className="font-medium">{validatingCount}</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-slate-600">Invalid: <span className="font-medium">{invalidCount}</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
              <span className="text-slate-600">Draft: <span className="font-medium">{draftCount}</span></span>
            </div>
          </div>
          <div className="text-sm text-slate-600">
            Total campaigns: <span className="font-medium">{campaigns.length}</span>
          </div>
        </div>
      </div>

      <AssetPickerModal
        isOpen={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        onSelect={handleAssetSelection}
        assets={assets}
      />
    </div>
  );
}
