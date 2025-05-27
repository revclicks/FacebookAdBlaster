import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { 
  Download, RefreshCw, Search, Eye, X, RotateCcw, 
  Clock, Loader, CheckCircle, AlertTriangle, 
  Facebook, ChevronLeft, ChevronRight 
} from "lucide-react";

interface SubmissionJob {
  id: number;
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  progressMessage?: string;
  errorMessage?: string;
  result?: Record<string, any>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  campaign: {
    id: number;
    name: string;
    objective: string;
    budget: string;
  };
  facebookAccount: {
    name: string;
  };
}

interface JobStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export default function SubmissionLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("today");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const { data: jobs = [], isLoading } = useQuery<SubmissionJob[]>({
    queryKey: ["/api/submission-jobs"],
    refetchInterval: 3000, // Refresh every 3 seconds for real-time updates
  });

  const { data: stats } = useQuery<JobStats>({
    queryKey: ["/api/submission-jobs/stats"],
    refetchInterval: 3000,
  });

  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest("POST", `/api/submission-jobs/${jobId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submission-jobs"] });
      toast({ title: "Job cancelled successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error cancelling job", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const retryJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest("POST", `/api/submission-jobs/${jobId}/retry`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submission-jobs"] });
      toast({ title: "Job retry initiated" });
    },
    onError: (error) => {
      toast({ 
        title: "Error retrying job", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submission-jobs"] });
      return Promise.resolve();
    },
    onSuccess: () => {
      toast({ title: "Logs refreshed" });
    },
  });

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || job.status === statusFilter;
    
    // Simple time filtering (in a real app, you'd implement proper date filtering)
    const matchesTime = true; // For demo, showing all jobs
    
    return matchesSearch && matchesStatus && matchesTime;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Loader className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-slate-600 bg-slate-100';
      case 'processing':
        return 'text-yellow-700 bg-yellow-100';
      case 'completed':
        return 'text-green-700 bg-green-100';
      case 'failed':
        return 'text-red-700 bg-red-100';
      case 'cancelled':
        return 'text-slate-600 bg-slate-100';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  const formatDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt) return '-';
    
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSeconds = Math.round(diffMs / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s`;
    const diffMinutes = Math.round(diffSeconds / 60);
    return `${diffMinutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading submission logs...</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Submission Logs</h2>
            <p className="text-sm text-slate-600 mt-1">Track campaign submissions, job statuses, and error logs</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Logs
            </Button>
            <Button 
              variant="outline" 
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Real-time Status Bar */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-blue-900">{stats?.pending || 0}</div>
                  <div className="text-sm text-blue-700">Pending</div>
                </div>
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-yellow-900">{stats?.processing || 0}</div>
                  <div className="text-sm text-yellow-700">Processing</div>
                </div>
                <Loader className="h-5 w-5 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-green-900">{stats?.completed || 0}</div>
                  <div className="text-sm text-green-700">Completed</div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-red-900">{stats?.failed || 0}</div>
                  <div className="text-sm text-red-700">Failed</div>
                </div>
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search by campaign name or job ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead>Job ID</TableHead>
              <TableHead>Campaign Name</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  No submission logs found
                </TableCell>
              </TableRow>
            ) : (
              paginatedJobs.map((job) => (
                <TableRow key={job.id} className="hover:bg-slate-50">
                  <TableCell>
                    <span className="font-mono text-sm text-slate-600">#{job.jobId.substring(0, 8)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{job.campaign.name}</div>
                    <div className="text-xs text-slate-500">
                      {job.campaign.objective} • ${job.campaign.budget} budget
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-900">{job.facebookAccount.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(job.status)} flex items-center space-x-1`}>
                      {getStatusIcon(job.status)}
                      <span className="capitalize">{job.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="w-24">
                      <Progress value={job.progress} className="h-2" />
                      <div className="text-xs text-slate-500 mt-1">
                        {job.progressMessage || (job.status === 'pending' ? 'Queued' : job.status)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-900">{formatDate(job.createdAt)}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">
                      {formatDuration(job.startedAt, job.completedAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm" title="View Details">
                        <Eye className="h-3 w-3" />
                      </Button>
                      {job.status === 'completed' && job.result?.facebookCampaignId && (
                        <Button variant="ghost" size="sm" title="View in Facebook">
                          <Facebook className="h-3 w-3" />
                        </Button>
                      )}
                      {(job.status === 'pending' || job.status === 'processing') && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Cancel Job"
                          onClick={() => cancelJobMutation.mutate(job.id)}
                          disabled={cancelJobMutation.isPending}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      {job.status === 'failed' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Retry Job"
                          onClick={() => retryJobMutation.mutate(job.id)}
                          disabled={retryJobMutation.isPending}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredJobs.length)} of {filteredJobs.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3 w-3" />
                Previous
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={currentPage === pageNum ? "bg-blue-600" : ""}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
