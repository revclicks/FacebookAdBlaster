import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, FileText, Play } from "lucide-react";

interface Asset {
  id: number;
  name: string;
  type: 'image' | 'video' | 'text';
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  textContent?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
  assets: Asset[];
}

export default function AssetPickerModal({ isOpen, onClose, onSelect, assets }: AssetPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterByType, setFilterByType] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterByType || asset.type === filterByType;
    return matchesSearch && matchesType;
  });

  const handleSelect = () => {
    if (selectedAsset) {
      onSelect(selectedAsset);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setFilterByType("");
    setSelectedAsset(null);
    onClose();
  };

  const getAssetUrl = (asset: Asset) => {
    if (asset.type === 'text') return null;
    return `/api/assets/${asset.id}/file`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(1)}MB`;
    return `${kb.toFixed(1)}KB`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'image':
        return 'bg-blue-100 text-blue-800';
      case 'video':
        return 'bg-purple-100 text-purple-800';
      case 'text':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Creative Asset</DialogTitle>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterByType} onValueChange={setFilterByType}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="text">Text Assets</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Asset Grid */}
        <div className="flex-1 overflow-y-auto">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No assets found. Try adjusting your search or filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAssets.map((asset) => (
                <Card
                  key={asset.id}
                  className={`cursor-pointer transition-all ${
                    selectedAsset?.id === asset.id
                      ? 'ring-2 ring-blue-500 border-blue-500'
                      : 'hover:shadow-md border-slate-200'
                  }`}
                  onClick={() => setSelectedAsset(asset)}
                >
                  <CardContent className="p-3">
                    {/* Asset Preview */}
                    <div className="w-full h-24 bg-slate-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                      {asset.type === 'image' && (
                        <img 
                          src={getAssetUrl(asset)!} 
                          alt={asset.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling!.style.display = 'flex';
                          }}
                        />
                      )}
                      {asset.type === 'video' && (
                        <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
                          <Play className="h-6 w-6 text-white" />
                          <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                            Video
                          </div>
                        </div>
                      )}
                      {asset.type === 'text' && (
                        <div className="w-full h-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-green-600" />
                        </div>
                      )}
                    </div>

                    {/* Asset Info */}
                    <div className="space-y-1">
                      <Badge className={`text-xs ${getTypeColor(asset.type)}`}>
                        {asset.type.toUpperCase()}
                      </Badge>
                      <h4 className="text-sm font-medium text-slate-900 truncate" title={asset.name}>
                        {asset.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {asset.type === 'text' 
                          ? `${asset.textContent?.length || 0} characters`
                          : formatFileSize(asset.fileSize)
                        }
                      </p>
                    </div>

                    {/* Selection Indicator */}
                    {selectedAsset?.id === asset.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Selected Asset Preview */}
        {selectedAsset && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <h4 className="text-sm font-medium text-slate-900 mb-2">Selected Asset</h4>
            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                {selectedAsset.type === 'image' && (
                  <img 
                    src={getAssetUrl(selectedAsset)!} 
                    alt={selectedAsset.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                )}
                {selectedAsset.type === 'video' && (
                  <Play className="h-4 w-4 text-slate-600" />
                )}
                {selectedAsset.type === 'text' && (
                  <FileText className="h-4 w-4 text-slate-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge className={`text-xs ${getTypeColor(selectedAsset.type)}`}>
                    {selectedAsset.type.toUpperCase()}
                  </Badge>
                </div>
                <h5 className="font-medium text-slate-900 truncate">{selectedAsset.name}</h5>
                <p className="text-xs text-slate-500">
                  {selectedAsset.type === 'text' 
                    ? `${selectedAsset.textContent?.length || 0} characters`
                    : formatFileSize(selectedAsset.fileSize)
                  }
                </p>
                {selectedAsset.type === 'text' && selectedAsset.textContent && (
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {selectedAsset.textContent.substring(0, 100)}
                    {selectedAsset.textContent.length > 100 && '...'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedAsset}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Select Asset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
