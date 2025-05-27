import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Plus, 
  Folder, 
  Image, 
  Video, 
  FileText, 
  Edit2, 
  Trash2, 
  Move,
  MoreHorizontal
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import UploadAssetModal from './modals/UploadAssetModal';

interface Asset {
  id: number;
  name: string;
  type: 'image' | 'video' | 'text';
  folderId?: number;
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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [editingAssetName, setEditingAssetName] = useState('');
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedAsset, setDraggedAsset] = useState<Asset | null>(null);
  const [draggedFolder, setDraggedFolder] = useState<AssetFolder | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const queryClient = useQueryClient();

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['/api/asset-folders'],
    select: (data: AssetFolder[]) => data.filter(folder => 
      currentFolderId ? folder.parentId === currentFolderId : folder.parentId === null
    ),
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Fetch all assets (not filtered for folder count calculation)
  const { data: allAssets = [] } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
  });

  // Filter assets for current view
  const assets = allAssets.filter((asset: Asset) => 
    currentFolderId ? asset.folderId === currentFolderId : !asset.folderId
  );

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; parentId?: number }) =>
      apiRequest('POST', '/api/asset-folders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/asset-folders'] });
      setShowNewFolderInput(false);
      setNewFolderName('');
    },
  });

  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Asset> }) =>
      apiRequest('PATCH', `/api/assets/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/asset-folders'] });
      setEditingAssetId(null);
    },
  });

  // Update folder mutation
  const updateFolderMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<AssetFolder> }) => {
      console.log('Frontend: Starting folder rename mutation', { id, updates });
      return apiRequest('PATCH', `/api/asset-folders/${id}`, updates);
    },
    onSuccess: (data, variables) => {
      console.log('Frontend: Folder rename mutation success', { data, variables });
      console.log('Frontend: Starting cache invalidation...');
      
      queryClient.invalidateQueries({ queryKey: ['/api/asset-folders'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['/api/assets'], exact: false });
      
      console.log('Frontend: Cache invalidation complete');
    },
    onError: (error, variables) => {
      console.error('Frontend: Folder rename mutation failed', { error, variables });
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: number) =>
      apiRequest('DELETE', `/api/asset-folders/${folderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/asset-folders'] });
    },
  });

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: number) =>
      apiRequest('DELETE', `/api/assets/${assetId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
    },
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate({
      name: newFolderName.trim(),
      parentId: currentFolderId,
    });
  };

  const handleDeleteFolder = (folderId: number) => {
    if (confirm('Are you sure you want to delete this folder? This action cannot be undone.')) {
      deleteFolderMutation.mutate(folderId);
    }
  };

  const handleDeleteAsset = (assetId: number) => {
    if (confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
      deleteAssetMutation.mutate(assetId);
    }
  };

  const handleRenameFolder = (folderId: number, currentName: string) => {
    const newName = prompt('Enter new folder name:', currentName);
    if (newName && newName !== currentName) {
      // Use the existing mutation system that we know works
      updateFolderMutation.mutate({
        id: folderId,
        updates: { name: newName.trim() }
      });
    }
  };

  const handleRenameAsset = (assetId: number, currentName: string) => {
    setEditingAssetId(assetId);
    setEditingAssetName(currentName);
  };

  const saveAssetName = () => {
    if (editingAssetId && editingAssetName.trim()) {
      updateAssetMutation.mutate({
        id: editingAssetId,
        updates: { name: editingAssetName.trim() }
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: Asset | AssetFolder, type: 'asset' | 'folder') => {
    setIsDragging(true);
    if (type === 'asset') {
      setDraggedAsset(item as Asset);
    } else {
      setDraggedFolder(item as AssetFolder);
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
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: number | null) => {
    e.preventDefault();
    
    if (draggedAsset) {
      // Move asset to folder
      updateAssetMutation.mutate({
        id: draggedAsset.id,
        updates: { folderId: targetFolderId }
      });
    }
    
    handleDragEnd();
  };

  const sortedAssets = [...assets].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getAssetUrl = (asset: Asset) => {
    return `/api/assets/${asset.id}/file`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-6 w-6 text-blue-500" />;
      case 'video':
        return <Video className="h-6 w-6 text-green-500" />;
      case 'text':
        return <FileText className="h-6 w-6 text-orange-500" />;
      default:
        return <FileText className="h-6 w-6 text-slate-500" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
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
            <p className="text-sm text-slate-600 mt-1">
              Manage your creative assets and organize them into folders
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewFolderInput(true)}
              className="text-slate-700 border-slate-300 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
            <Button
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>

        {/* New Folder Input */}
        {showNewFolderInput && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <Input
                type="text"
                placeholder="Enter folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                className="flex-1"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowNewFolderInput(false);
                  setNewFolderName('');
                }}
                className="text-slate-700 border-slate-300 hover:bg-slate-100"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-6">
        {/* Current Folder Indicator */}
        {currentFolderId && (
          <div className="mb-6 flex items-center gap-2 text-sm">
            <Folder className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-slate-900">
              {folders.find(f => f.id === currentFolderId)?.name}
            </span>
            <span className="text-slate-600">Current Folder</span>
          </div>
        )}

        {/* Folders Container - Always visible at the top */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Folders</h3>
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

            {/* Folders */}
            {folders.map((folder) => (
              <Card 
                key={folder.id} 
                className={`relative cursor-pointer hover:shadow-md transition-all group ${
                  isDragging && draggedAsset 
                    ? dropTarget === folder.id 
                      ? 'border-2 border-blue-500 bg-blue-50 border-dashed' 
                      : 'border-2 border-blue-300 bg-blue-25 border-dashed hover:border-blue-400 hover:bg-blue-50'
                    : 'border border-slate-200 hover:border-blue-300'
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, folder as any, 'folder')}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, folder.id as any)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder.id as any)}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 hover:bg-blue-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameFolder(folder.id, folder.name);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 hover:bg-red-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                
                <CardContent className="p-6 text-center">
                  <div className="flex flex-col items-center" onClick={() => !isDragging && setCurrentFolderId(folder.id)}>
                    <div className="relative mb-3">
                      <Folder className={`h-12 w-12 mb-2 ${
                        isDragging && draggedAsset ? 'text-blue-500' : 'text-blue-500'
                      }`} />
                      {isDragging && draggedAsset && <Move className="h-4 w-4 text-blue-600 absolute -top-1 -right-1" />}
                    </div>
                    {isDragging && draggedAsset ? (
                      <>
                        <span className="text-sm font-medium text-blue-700 mb-1">{folder.name}</span>
                        <span className="text-xs text-blue-500">Drop here</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-slate-500 mb-1">
                          {allAssets.filter(asset => asset.folderId === folder.id).length} creatives
                        </span>
                        <span className="text-sm font-medium text-slate-800">{folder.name}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Assets Container */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3">Assets</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                        src={getAssetUrl(asset)} 
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = '<div class="text-slate-400">Failed to load</div>';
                        }}
                      />
                    )}
                    {asset.type === 'video' && (
                      <video 
                        src={getAssetUrl(asset)} 
                        className="w-full h-full object-cover"
                        muted
                        onError={(e) => {
                          const target = e.target as HTMLVideoElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = '<div class="text-slate-400">Failed to load</div>';
                        }}
                      />
                    )}
                    {asset.type === 'text' && (
                      <div className="flex items-center justify-center h-full">
                        <FileText className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Asset Info */}
                  <div className="space-y-2">
                    {/* Asset Name */}
                    {editingAssetId === asset.id ? (
                      <Input
                        value={editingAssetName}
                        onChange={(e) => setEditingAssetName(e.target.value)}
                        onBlur={saveAssetName}
                        onKeyPress={(e) => e.key === 'Enter' && saveAssetName()}
                        className="text-xs"
                        autoFocus
                      />
                    ) : (
                      <h4 
                        className="text-sm font-medium text-slate-900 truncate cursor-pointer hover:text-blue-600"
                        onClick={() => handleRenameAsset(asset.id, asset.name)}
                      >
                        {asset.name}
                      </h4>
                    )}

                    {/* Asset Metadata */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        {getAssetTypeIcon(asset.type)}
                        {asset.type}
                      </span>
                      {asset.fileSize && (
                        <span>{formatFileSize(asset.fileSize)}</span>
                      )}
                    </div>

                    {/* Asset Actions */}
                    <div className="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 hover:bg-blue-100"
                          onClick={() => handleRenameAsset(asset.id, asset.name)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 hover:bg-red-100"
                          onClick={() => handleDeleteAsset(asset.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 hover:bg-slate-100"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Upload New Card */}
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
      </div>

      <UploadAssetModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        folderId={currentFolderId}
      />
    </div>
  );
}