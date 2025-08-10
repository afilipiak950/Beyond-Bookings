import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Eye, Users, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import AppLayout from "@/components/layout/app-layout";
import { AdminGuard } from "@/components/auth/AdminGuard";

interface ApprovalRequest {
  id: number;
  createdByUserId: number;
  approvedByUserId?: number;
  status: 'pending' | 'approved' | 'rejected';
  starCategory: number;
  inputSnapshot: any;
  calculationSnapshot: any;
  reasons: string[];
  adminComment?: string;
  createdAt: string;
  updatedAt: string;
  createdByUser: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export function Approvals() {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [adminComment, setAdminComment] = useState("");
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject' | null>(null);
  const [decisionRequestId, setDecisionRequestId] = useState<number | null>(null);
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: approvalRequests, isLoading, error } = useQuery({
    queryKey: ['/api/approvals', selectedStatus === 'all' ? undefined : selectedStatus],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/approvals${selectedStatus !== 'all' ? `?status=${selectedStatus}` : ''}`);
        const data = await response.json();
        console.log('API Response data:', data);
        return data;
      } catch (err) {
        console.log('API Error:', err);
        throw err;
      }
    },
    retry: false
  });

  const { data: myRequests } = useQuery({
    queryKey: ['/api/approvals/my-requests'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/approvals/my-requests');
        const data = await response.json();
        return data;
      } catch (err) {
        console.log('My requests API Error:', err);
        throw err;
      }
    }
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, action, adminComment }: { id: number; action: 'approve' | 'reject'; adminComment?: string }) =>
      apiRequest(`/api/approvals/${id}`, 'PATCH', { action, adminComment }),
    onSuccess: (data) => {
      // Handle different response scenarios
      if (data.idempotent) {
        toast({
          title: "Already Decided",
          description: data.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Decision Processed",
          description: data.message,
        });
      }
      
      // Refresh all queries
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/approvals/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/approvals/my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calculations'] });
      
      // Reset state
      setSelectedRequest(null);
      setAdminComment("");
      setDecisionAction(null);
      setDecisionRequestId(null);
      setShowDecisionDialog(false);
    },
    onError: (error: any) => {
      // Handle special case for input hash mismatch
      if (error.status === 409) {
        toast({
          title: "Inputs Changed",
          description: error.message || "The calculation inputs have changed since the approval request was created. Please ask the user to resubmit.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to process approval decision",
          variant: "destructive",
        });
      }
      setShowDecisionDialog(false);
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const formatDisplayName = (user: { email: string; firstName?: string; lastName?: string }) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email;
  };

  const getHotelNameFromRequest = (request: any) => {
    // First priority: Hotel name from the backend join
    if (request.hotelName) {
      return request.hotelName;
    }
    
    // Second priority: Try to get hotel name from calculation snapshot
    if (request.calculationSnapshot?.hotelName) {
      return request.calculationSnapshot.hotelName;
    }
    
    // Third priority: Try to get hotel name from input snapshot
    if (request.inputSnapshot?.calculationData?.hotelName) {
      return request.inputSnapshot.calculationData.hotelName;
    }
    
    // Fallback to generic request number
    return `Request #${request.id}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleApprovalAction = (id: number, action: 'approve' | 'reject') => {
    setDecisionRequestId(id);
    setDecisionAction(action);
    setAdminComment("");
    setShowDecisionDialog(true);
  };

  const confirmDecision = () => {
    if (decisionRequestId && decisionAction) {
      // Validate admin comment for rejections
      if (decisionAction === 'reject' && !adminComment.trim()) {
        toast({
          title: "Comment Required",
          description: "Please provide a comment when rejecting an approval request.",
          variant: "destructive",
        });
        return;
      }

      updateRequestMutation.mutate({
        id: decisionRequestId,
        action: decisionAction,
        adminComment: adminComment.trim() || undefined
      });
    }
  };

  const approvalRequestsData = approvalRequests?.approvalRequests || [];
  const myRequestsData = myRequests?.approvalRequests || [];



  const pendingCount = approvalRequestsData.filter((req: ApprovalRequest) => req.status === 'pending').length;
  const approvedCount = approvalRequestsData.filter((req: ApprovalRequest) => req.status === 'approved').length;
  const rejectedCount = approvalRequestsData.filter((req: ApprovalRequest) => req.status === 'rejected').length;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading approval requests...</div>
      </div>
    );
  }

  return (
    <AdminGuard>
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-100 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Approval Management</h1>
              <p className="text-gray-600">Manage pricing calculation approval requests</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Pending</p>
                    <p className="text-2xl font-bold">{pendingCount}</p>
                  </div>
                  <Clock className="h-8 w-8 opacity-90" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Approved</p>
                    <p className="text-2xl font-bold">{approvedCount}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 opacity-90" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Rejected</p>
                    <p className="text-2xl font-bold">{rejectedCount}</p>
                  </div>
                  <XCircle className="h-8 w-8 opacity-90" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Total</p>
                    <p className="text-2xl font-bold">{approvalRequestsData.length}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 opacity-90" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="all-requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all-requests">All Requests (Admin)</TabsTrigger>
            <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="all-requests" className="space-y-6">
            {/* Filter */}
            <Card className="bg-white/80 backdrop-blur-sm border border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Filter by status:</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Requests List */}
            <div className="grid gap-4">
              {approvalRequestsData.map((request: ApprovalRequest) => (
                <Card key={request.id} className="bg-white/80 backdrop-blur-sm border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getHotelNameFromRequest(request)}
                          <Badge className={`${getStatusColor(request.status)} text-white flex items-center gap-1`}>
                            {getStatusIcon(request.status)}
                            {request.status.toUpperCase()}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          By: {formatDisplayName(request.createdByUser)} • {request.starCategory} • {new Date(request.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Approval Request #{request.id}</DialogTitle>
                            <DialogDescription>
                              Review and approve or reject this pricing calculation
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            {/* Request Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Requested By</label>
                                <p className="text-sm text-gray-600">{formatDisplayName(request.createdByUser)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Star Category</label>
                                <p className="text-sm text-gray-600">{request.starCategory}</p>
                              </div>
                            </div>

                            {/* Approval Reasons */}
                            <div>
                              <label className="text-sm font-medium">Approval Required Because</label>
                              <ul className="text-sm text-gray-600 list-disc list-inside mt-1">
                                {request.reasons.map((reason, index) => (
                                  <li key={index}>{reason}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Calculation Summary */}
                            {request.calculationSnapshot && (
                              <div>
                                <label className="text-sm font-medium">Calculation Summary</label>
                                <div className="bg-gray-50 p-3 rounded-lg mt-1 text-sm">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-medium">Stars:</span> {request.calculationSnapshot.stars || 'N/A'}
                                    </div>
                                    <div>
                                      <span className="font-medium">Profit Margin:</span> {formatCurrency(request.calculationSnapshot.profitMargin || 0)}
                                    </div>
                                    <div>
                                      <span className="font-medium">Average Price:</span> {formatCurrency(request.calculationSnapshot.averagePrice || 0)}
                                    </div>
                                    <div>
                                      <span className="font-medium">Voucher Price:</span> {formatCurrency(request.calculationSnapshot.voucherPrice || 0)}
                                    </div>
                                    <div>
                                      <span className="font-medium">VAT Rate:</span> {request.calculationSnapshot.vatRate || 0}%
                                    </div>
                                    <div>
                                      <span className="font-medium">Financing Volume:</span> {formatCurrency(request.calculationSnapshot.financingVolume || 0)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Admin Comment */}
                            {request.status === 'pending' && (
                              <div>
                                <label className="text-sm font-medium">Admin Comment (Optional)</label>
                                <Textarea
                                  value={adminComment}
                                  onChange={(e) => setAdminComment(e.target.value)}
                                  placeholder="Add a comment for this approval decision..."
                                  className="mt-1"
                                />
                              </div>
                            )}

                            {request.adminComment && (
                              <div>
                                <label className="text-sm font-medium">Admin Comment</label>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mt-1">{request.adminComment}</p>
                              </div>
                            )}

                            {/* Action Buttons */}
                            {request.status === 'pending' && (
                              <div className="flex gap-3 pt-4">
                                <Button
                                  onClick={() => handleApprovalAction(request.id, 'approve')}
                                  disabled={updateRequestMutation.isPending}
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => handleApprovalAction(request.id, 'reject')}
                                  disabled={updateRequestMutation.isPending}
                                  variant="destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hotel Category:</span>
                        <span className="font-medium">{request.starCategory}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Approval Reasons:</span>
                        <span className="font-medium">{request.reasons.length} issues</span>
                      </div>
                      {request.calculationSnapshot && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Financing Volume:</span>
                          <span className="font-medium">{formatCurrency(request.calculationSnapshot.financingVolume || 0)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {approvalRequestsData.length === 0 && (
                <Card className="bg-white/80 backdrop-blur-sm border border-blue-100">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-600">No approval requests found.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-requests" className="space-y-6">
            <div className="grid gap-4">
              {myRequestsData.map((request: ApprovalRequest) => (
                <Card key={request.id} className="bg-white/80 backdrop-blur-sm border border-blue-100 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getHotelNameFromRequest(request)}
                          <Badge className={`${getStatusColor(request.status)} text-white flex items-center gap-1`}>
                            {getStatusIcon(request.status)}
                            {request.status.toUpperCase()}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {request.starCategory} • {new Date(request.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium capitalize">{request.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reasons:</span>
                        <span className="font-medium">{request.reasons.join(", ")}</span>
                      </div>
                      {request.adminComment && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-600 font-medium">Admin Comment:</span>
                          <p className="mt-1">{request.adminComment}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {myRequestsData.length === 0 && (
                <Card className="bg-white/80 backdrop-blur-sm border border-blue-100">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-600">You have no approval requests.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Admin Decision Dialog */}
      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent className="max-w-md bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {decisionAction === 'approve' ? (
                <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500">
                  <XCircle className="h-5 w-5 text-white" />
                </div>
              )}
              {decisionAction === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {decisionAction === 'approve' 
                ? 'You are approving this pricing calculation request.'
                : 'You are rejecting this pricing calculation request. Please provide feedback.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Admin Comment */}
            <div className="space-y-2">
              <Label htmlFor="admin-comment">
                {decisionAction === 'approve' ? 'Admin Comment (optional)' : 'Admin Feedback (required)'}
              </Label>
              <textarea
                id="admin-comment"
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder={
                  decisionAction === 'approve' 
                    ? 'Add optional comment about the approval...'
                    : 'Please explain why this request is being rejected...'
                }
                className="w-full min-h-[100px] p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={decisionAction === 'reject'}
              />
              {decisionAction === 'reject' && !adminComment.trim() && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Admin feedback is required when rejecting a request.
                </p>
              )}
            </div>
            
            {/* Confirmation Message */}
            <div className={`p-4 rounded-lg ${
              decisionAction === 'approve' 
                ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700' 
                : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700'
            }`}>
              <div className={`text-sm ${
                decisionAction === 'approve' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              }`}>
                {decisionAction === 'approve' 
                  ? 'The requester will be notified via email that their calculation has been approved.'
                  : 'The requester will be notified via email with your feedback and can resubmit if needed.'
                }
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDecisionDialog(false)}
              disabled={updateRequestMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDecision}
              disabled={updateRequestMutation.isPending || (decisionAction === 'reject' && !adminComment.trim())}
              className={
                decisionAction === 'approve'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }
            >
              {updateRequestMutation.isPending ? (
                <>Loading...</>
              ) : (
                <>
                  {decisionAction === 'approve' ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Approval
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Confirm Rejection
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </AppLayout>
    </AdminGuard>
  );
}