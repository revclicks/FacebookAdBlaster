import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import UploadAssetModal from "@/components/modals/UploadAssetModal";
import { Upload, FolderPlus, Search, Grid, Folder, FileText, Edit, Trash2, Play, Plus, Move } from "lucide-react";

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

interface AssetFolder {
  id: number;
  name: string;
  parentId?: number;
  createdAt: string;
}

export default function AssetLibrary() {
  const [currentFolderId, setCurrentFolderId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterByType, setFilterByType] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [draggedAsset, setDraggedAsset] = useState<Asset | null>(null);
  const [draggedFolder, setDraggedFolder] = useState<AssetFolder | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const { data: folders = [] } = useQuery<AssetFolder[]>({
    queryKey: ["/api/asset-folders", currentFolderId],
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets", currentFolderId],
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/asset-folders", {
        name,
        parentId: currentFolderId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-folders"] });
      toast({ title: "Folder created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error creating folder", description: error.message, variant: "destructive" });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: number) => {
      await apiRequest("DELETE", `/api/assets/${assetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Asset deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting asset", description: error.message, variant: "destructive" });
    },
  });

  const moveAssetMutation = useMutation({
    mutationFn: async ({ assetId, targetFolderId }: { assetId: number, targetFolderId: number | null }) => {
      await apiRequest("PATCH", `/api/assets/${assetId}`, {
        folderId: targetFolderId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Asset moved successfully" });
    },
    onError: (error) => {
      toast({ title: "Error moving asset", description: error.message, variant: "destructive" });
    },
  });

  const moveFolderMutation = useMutation({
    mutationFn: async ({ folderId, targetFolderId }: { folderId: number, targetFolderId: number | null }) => {
      await apiRequest("PATCH", `/api/asset-folders/${folderId}`, {
        parentId: targetFolderId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-folders"] });
      toast({ title: "Folder moved successfully" });
    },
    onError: (error) => {
      toast({ title: "Error moving folder", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateFolder = () => {
    const name = prompt("Enter folder name:");
    if (name) {
      createFolderMutation.mutate(name);
    }
  };

  const handleDeleteAsset = (assetId: number) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      deleteAssetMutation.mutate(assetId);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, item: Asset | AssetFolder, type: 'asset' | 'folder') => {
    setIsDragging(true);
    if (type === 'asset') {
      setDraggedAsset(item as Asset);
      e.dataTransfer.setData('text/plain', `asset-${item.id}`);
    } else {
      setDraggedFolder(item as AssetFolder);
      e.dataTransfer.setData('text/plain', `folder-${item.id}`);
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedAsset(null);
    setDraggedFolder(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, targetFolderId: number | null) => {
    e.preventDefault();
    setDropTarget(targetFolderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drop target if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: number | null) => {
    e.preventDefault();
    
    const dragData = e.dataTransfer.getData('text/plain');
    const [type, itemId] = dragData.split('-');
    
    if (type === 'asset' && draggedAsset) {
      // Prevent dropping asset into itself or current folder
      if (draggedAsset.id === parseInt(itemId) && draggedAsset.folderId !== targetFolderId) {
        moveAssetMutation.mutate({
          assetId: draggedAsset.id,
          targetFolderId
        });
      }
    } else if (type === 'folder' && draggedFolder) {
      // Prevent dropping folder into itself or current parent
      if (draggedFolder.id === parseInt(itemId) && draggedFolder.parentId !== targetFolderId) {
        // Additional check to prevent circular references
        if (targetFolderId !== draggedFolder.id) {
          moveFolderMutation.mutate({
            folderId: draggedFolder.id,
            targetFolderId
          });
        }
      }
    }
    
    handleDragEnd();
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterByType || filterByType === 'all' || asset.type === filterByType;
    return matchesSearch && matchesType;
  });

  const sortedAssets = [...filteredAssets].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "date":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "type":
        return a.type.localeCompare(b.type);
      default:
        return 0;
    }
  });

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
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header with Actions */}
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Asset Library</h2>
            <p className="text-sm text-slate-600 mt-1">Manage your creative assets, images, videos, and text content</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={() => setIsUploadModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-[#ffffff]">
              <Upload className="mr-2 h-4 w-4" />
              Upload Assets
            </Button>
            <Button variant="outline" onClick={handleCreateFolder}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center space-x-4 mt-4">
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
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="text">Text Assets</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="type">Sort by Type</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Asset Grid */}
      <div className="p-6 relative">
        {/* Global Drop Zone Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-50 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center z-10 pointer-events-none">
            <div className="text-blue-600 font-medium text-lg">
              Drop to organize your assets
            </div>
          </div>
        )}
        {/* Breadcrumb Navigation */}
        {currentFolderId && (
          <div className="flex items-center space-x-2 mb-6 text-sm">
            <Button variant="link" className="p-0 h-auto text-blue-600" onClick={() => setCurrentFolderId(undefined)}>
              Library
            </Button>
            <span className="text-slate-400">/</span>
            <span className="text-slate-600">Current Folder</span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Root Drop Zone */}
          {currentFolderId && (
            <Card 
              className={`cursor-pointer hover:shadow-md transition-all group border-2 border-dashed ${
                dropTarget === null && isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, null)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, null)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center" onClick={() => setCurrentFolderId(undefined)}>
                  <Folder className="h-8 w-8 text-slate-400 group-hover:text-blue-500 mb-2" />
                  <span className="text-sm font-medium text-slate-700 text-center">← Back to Root</span>
                  <span className="text-xs text-slate-500">folder</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Folder Items */}
          {folders.map((folder) => (
            <Card 
              key={folder.id} 
              className={`cursor-pointer hover:shadow-md transition-all group border-2 ${
                dropTarget === folder.id && isDragging ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-slate-200'
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, folder, 'folder')}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, folder.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder.id)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center" onClick={() => setCurrentFolderId(folder.id)}>
                  <div className="relative">
                    <Folder className="h-8 w-8 text-slate-400 group-hover:text-blue-500 mb-2" />
                    {isDragging && <Move className="h-3 w-3 text-blue-500 absolute -top-1 -right-1" />}
                  </div>
                  <span className="text-sm font-medium text-slate-700 text-center">{folder.name}</span>
                  <span className="text-xs text-slate-500">folder</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Asset Items */}
          {sortedAssets.map((asset) => (
            <Card 
              key={asset.id} 
              className={`group relative hover:shadow-md transition-all border-2 ${
                draggedAsset?.id === asset.id ? 'opacity-50 border-blue-300' : 'border-transparent hover:border-slate-200'
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, asset, 'asset')}
              onDragEnd={handleDragEnd}
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
                        2:34
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
                <div className="flex items-center justify-between mb-1">
                  <Badge className={`text-xs ${getTypeColor(asset.type)}`}>
                    {asset.type.toUpperCase()}
                  </Badge>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 cursor-move" title="Drag to move">
                      <Move className="h-3 w-3 text-slate-400" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteAsset(asset.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <h4 className="text-sm font-medium text-slate-900 truncate">{asset.name}</h4>
                <p className="text-xs text-slate-500">
                  {asset.type === 'text' 
                    ? `${asset.textContent?.length || 0} characters`
                    : `${formatFileSize(asset.fileSize)}`
                  }
                </p>

                {/* Selection Checkbox */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Checkbox 
                    checked={selectedAssets.includes(asset.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedAssets([...selectedAssets, asset.id]);
                      } else {
                        setSelectedAssets(selectedAssets.filter(id => id !== asset.id));
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Upload Drop Zone */}
          <Card 
            className="border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center h-32">
              <Plus className="h-6 w-6 text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-600">Upload New</span>
            </CardContent>
          </Card>
        </div>
      </div>

      <UploadAssetModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        folderId={currentFolderId}
      />
    </div>
  );
}
