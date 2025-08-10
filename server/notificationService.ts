import { storage } from './storage';
import type { ApprovalRequest, User } from '@shared/schema';

// Notification service for handling notification creation and management
export class NotificationService {

  // Create notification for new pending approval request (sent to admins)
  async notifyAdminsPending(
    request: ApprovalRequest & { hotelName?: string; createdByUser: { firstName?: string; lastName?: string; email: string } },
    adminUsers: User[]
  ) {
    const userName = request.createdByUser.firstName && request.createdByUser.lastName
      ? `${request.createdByUser.firstName} ${request.createdByUser.lastName}`
      : request.createdByUser.email;
    
    const hotelName = request.hotelName || `Request #${request.id}`;
    const title = `Approval requested by ${userName}`;
    
    // Create reasons summary
    const reasonsList = request.reasons.length > 0 
      ? request.reasons.join(', ') 
      : 'Manual approval requested';
    
    const message = `
      <div class="notification-content">
        <h3>${hotelName}</h3>
        <p><strong>Star Category:</strong> ${request.starCategory}★</p>
        <p><strong>Reasons:</strong> ${reasonsList}</p>
        <p><strong>Requested by:</strong> ${userName}</p>
        <p><strong>Submitted:</strong> ${new Date(request.createdAt).toLocaleString()}</p>
        <div class="action-links">
          <a href="/approvals?request=${request.id}" class="btn-link">Review Request</a>
        </div>
      </div>
    `;

    // Create notification for each admin
    for (const admin of adminUsers) {
      await storage.createNotification({
        recipientUserId: admin.id,
        type: 'approval_pending',
        title,
        message,
        approvalRequestId: request.id,
        calculationId: request.inputSnapshot?.calculationId || null,
        status: 'unread',
        createdAt: new Date(),
      });
    }
  }

  // Create notification for approval decision (sent to requester)
  async notifyUserDecision(
    request: ApprovalRequest & { hotelName?: string },
    decisionByUser: User,
    action: 'approve' | 'reject'
  ) {
    const hotelName = request.hotelName || `Request #${request.id}`;
    const adminName = decisionByUser.firstName && decisionByUser.lastName
      ? `${decisionByUser.firstName} ${decisionByUser.lastName}`
      : decisionByUser.email;
    
    const title = action === 'approve' 
      ? `Approval granted: ${hotelName}`
      : `Approval declined: ${hotelName}`;
    
    const statusClass = action === 'approve' ? 'status-approved' : 'status-rejected';
    const statusIcon = action === 'approve' ? '✓' : '✗';
    
    let message = `
      <div class="notification-content">
        <div class="status-header ${statusClass}">
          <span class="status-icon">${statusIcon}</span>
          <h3>${hotelName}</h3>
        </div>
        <p><strong>Decision:</strong> ${action === 'approve' ? 'Approved' : 'Rejected'}</p>
        <p><strong>Decided by:</strong> ${adminName}</p>
        <p><strong>Date:</strong> ${new Date(request.decisionAt || new Date()).toLocaleString()}</p>
    `;

    // Add admin comment if provided
    if (request.adminComment) {
      const commentPreview = request.adminComment.length > 300 
        ? request.adminComment.substring(0, 300) + '...'
        : request.adminComment;
      
      message += `
        <div class="admin-comment">
          <p><strong>Admin feedback:</strong></p>
          <blockquote>${commentPreview}</blockquote>
        </div>
      `;
    }

    message += `
        <div class="action-links">
          <a href="/calculations?calculation=${request.inputSnapshot?.calculationId}" class="btn-link">View Calculation</a>
        </div>
      </div>
    `;

    await storage.createNotification({
      recipientUserId: request.createdByUserId,
      type: action === 'approve' ? 'approval_approved' : 'approval_rejected',
      title,
      message,
      approvalRequestId: request.id,
      calculationId: request.inputSnapshot?.calculationId || null,
      status: 'unread',
      createdAt: new Date(),
    });
  }

  // Get notifications for a user with pagination
  async getUserNotifications(userId: number, filters?: { status?: string; limit?: number }) {
    return await storage.getNotifications(userId, filters);
  }

  // Get unread count for a user
  async getUnreadCount(userId: number) {
    return await storage.getNotificationCount(userId);
  }

  // Mark notification as read
  async markAsRead(notificationId: number, userId: number) {
    return await storage.markNotificationAsRead(notificationId, userId);
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: number) {
    return await storage.markAllNotificationsAsRead(userId);
  }
}

export const notificationService = new NotificationService();