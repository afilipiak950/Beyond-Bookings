import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Eye, Users, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import AppLayout from "@/components/layout/app-layout";

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
    mutationFn: ({ id, status, adminComment }: { id: number; status: string; adminComment?: string }) =>
      apiRequest(`/api/approvals/${id}`, 'PATCH', { status, adminComment }),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      setSelectedRequest(null);
      setAdminComment("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update approval request",
        variant: "destructive",
      });
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

  const handleApprovalAction = (id: number, status: 'approved' | 'rejected') => {
    updateRequestMutation.mutate({
      id,
      status,
      adminComment: adminComment || undefined
    });
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
                                  onClick={() => handleApprovalAction(request.id, 'approved')}
                                  disabled={updateRequestMutation.isPending}
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => handleApprovalAction(request.id, 'rejected')}
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
    </AppLayout>
  );
}