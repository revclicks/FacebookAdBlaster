import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileText, X } from "lucide-react";

interface UploadAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId?: number;
}

export default function UploadAssetModal({ isOpen, onClose, folderId }: UploadAssetModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [textAssetName, setTextAssetName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const uploadFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadedAssets = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);
        if (folderId) {
          formData.append('folderId', folderId.toString());
        }

        // Update progress
        setUploadProgress(((i + 1) / files.length) * 100);

        const response = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers: {
            'x-user-id': '1', // Mock user ID for demo
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const asset = await response.json();
        uploadedAssets.push(asset);
      }

      return uploadedAssets;
    },
    onSuccess: (assets) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ 
        title: "Assets uploaded successfully", 
        description: `${assets.length} asset(s) uploaded` 
      });
      handleClose();
    },
    onError: (error) => {
      toast({ 
        title: "Upload failed", 
        description: error.message, 
        variant: "destructive" 
      });
      setUploadProgress(0);
    },
  });

  const createTextAssetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/assets/text", {
        name: textAssetName,
        textContent,
        folderId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Text asset created successfully" });
      handleClose();
    },
    onError: (error) => {
      toast({ 
        title: "Error creating text asset", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setTextAssetName("");
    setTextContent("");
    setUploadProgress(0);
    onClose();
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      uploadFilesMutation.mutate(selectedFiles);
    }
  };

  const handleCreateTextAsset = () => {
    if (textAssetName && textContent) {
      createTextAssetMutation.mutate();
    }
  };

  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(1)}MB`;
    return `${kb.toFixed(1)}KB`;
  };

  const getFileTypeColor = (type: string) => {
    if (type.startsWith('image/')) return 'bg-blue-100 text-blue-800';
    if (type.startsWith('video/')) return 'bg-purple-100 text-purple-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Assets</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="files" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="files">Upload Files</TabsTrigger>
            <TabsTrigger value="text">Create Text Asset</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4">
            {/* File Upload Area */}
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 mb-1">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-slate-500">
                Supports: Images (JPG, PNG, GIF, WebP), Videos (MP4, MOV, AVI), Text files
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/*,video/*,.txt,.json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({selectedFiles.length})</Label>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getFileTypeColor(file.type)}`}>
                          {file.type.split('/')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{file.name}</div>
                          <div className="text-xs text-slate-500">{formatFileSize(file.size)}</div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-slate-500 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploadFilesMutation.isPending && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-slate-600">Uploading files... {Math.round(uploadProgress)}%</p>
              </div>
            )}

            {/* Upload Button */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploadFilesMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploadFilesMutation.isPending ? "Uploading..." : `Upload ${selectedFiles.length} File(s)`}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-name">Asset Name</Label>
                <Input
                  id="text-name"
                  placeholder="e.g., Holiday Headlines, Product Descriptions"
                  value={textAssetName}
                  onChange={(e) => setTextAssetName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="text-content">Text Content</Label>
                <Textarea
                  id="text-content"
                  placeholder="Enter your ad copy, headlines, descriptions, or other text content..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-slate-500">
                  {textContent.length} characters
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTextAsset}
                disabled={!textAssetName || !textContent || createTextAssetMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FileText className="mr-2 h-4 w-4" />
                {createTextAssetMutation.isPending ? "Creating..." : "Create Text Asset"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
