import nodemailer from 'nodemailer';
import type { ApprovalRequest, PricingCalculation, User } from '@shared/schema';

// Email configuration
const EMAIL_CONFIG = {
  enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  appUrl: process.env.APP_URL || 'http://localhost:5000'
};

// Create transporter
let transporter: nodemailer.Transporter | null = null;

if (EMAIL_CONFIG.enabled && EMAIL_CONFIG.smtp.auth.user && EMAIL_CONFIG.smtp.auth.pass) {
  try {
    transporter = nodemailer.createTransporter(EMAIL_CONFIG.smtp);
    console.log('Email transporter configured successfully');
  } catch (error) {
    console.warn('Failed to create email transporter:', error);
  }
}

// Email sending function
async function sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  if (!EMAIL_CONFIG.enabled) {
    console.log(`[EMAIL DISABLED] Would send to ${to}: ${subject}`);
    return true;
  }

  if (!transporter) {
    console.warn(`[EMAIL NOT CONFIGURED] Cannot send to ${to}: ${subject}`);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_CONFIG.from,
      to,
      subject,
      html: htmlContent
    });
    
    console.log(`Email sent successfully to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
}

// Format currency for emails
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

// Get calculation title from approval request
function getCalculationTitle(request: ApprovalRequest & { hotelName?: string }): string {
  return request.hotelName || request.calculationSnapshot?.hotelName || `Request #${request.id}`;
}

// Email template: Notify admins of new pending request
export async function notifyAdminsPending(
  request: ApprovalRequest & { hotelName?: string; createdByUser: { firstName?: string; lastName?: string; email: string } },
  admins: User[]
): Promise<void> {
  const requesterName = request.createdByUser.firstName && request.createdByUser.lastName 
    ? `${request.createdByUser.firstName} ${request.createdByUser.lastName}`
    : request.createdByUser.email;
    
  const calculationTitle = getCalculationTitle(request);
  const financingAmount = request.calculationSnapshot?.financingVolume || 0;
  
  const subject = `[Beyond Bookings] Approval requested by ${requesterName}: ${calculationTitle}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9ff;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Approval Request</h1>
        <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Beyond Bookings Pricing Agent</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">New Approval Request</h2>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
          <strong>${requesterName}</strong> has requested approval for a pricing calculation.
        </p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Calculation:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${calculationTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Hotel Category:</td>
              <td style="padding: 8px 0; color: #1f2937;">${request.starCategory}★</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Financing Volume:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${formatCurrency(financingAmount)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Approval Reasons:</td>
              <td style="padding: 8px 0; color: #1f2937;">${request.reasons.join(', ')}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center;">
          <a href="${EMAIL_CONFIG.appUrl}/approvals" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; 
                    font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
            Review Request
          </a>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
        <p>Beyond Bookings - Pricing Agent Platform</p>
      </div>
    </div>
  `;
  
  // Send to all admins
  for (const admin of admins) {
    try {
      await sendEmail(admin.email, subject, htmlContent);
    } catch (error) {
      console.error(`Failed to send pending notification to admin ${admin.email}:`, error);
    }
  }
}

// Email template: Notify requester of approval
export async function notifyRequesterApproved(
  request: ApprovalRequest & { hotelName?: string; createdByUser: { email: string } },
  adminUser: { firstName?: string; lastName?: string; email: string },
  calculation: { id: number }
): Promise<void> {
  const adminName = adminUser.firstName && adminUser.lastName 
    ? `${adminUser.firstName} ${adminUser.lastName}`
    : adminUser.email;
    
  const calculationTitle = getCalculationTitle(request);
  const decisionDate = new Date().toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const subject = `[Beyond Bookings] Your approval was approved`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f0fdf4;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">✓ Approved</h1>
        <p style="color: #dcfce7; margin: 10px 0 0 0; font-size: 16px;">Your request has been approved</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">Approval Confirmation</h2>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
          Great news! Your pricing calculation "<strong>${calculationTitle}</strong>" has been approved.
        </p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Approved by:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${adminName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Decision date:</td>
              <td style="padding: 8px 0; color: #1f2937;">${decisionDate}</td>
            </tr>
            ${request.adminComment ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500; vertical-align: top;">Admin comment:</td>
              <td style="padding: 8px 0; color: #1f2937; line-height: 1.5;">${request.adminComment}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="text-align: center;">
          <a href="${EMAIL_CONFIG.appUrl}/calculations" 
             style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                    color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; 
                    font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
            View Calculation
          </a>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
        <p>Beyond Bookings - Pricing Agent Platform</p>
      </div>
    </div>
  `;
  
  await sendEmail(request.createdByUser.email, subject, htmlContent);
}

// Email template: Notify requester of rejection
export async function notifyRequesterRejected(
  request: ApprovalRequest & { hotelName?: string; createdByUser: { email: string } },
  adminUser: { firstName?: string; lastName?: string; email: string },
  calculation: { id: number }
): Promise<void> {
  const adminName = adminUser.firstName && adminUser.lastName 
    ? `${adminUser.firstName} ${adminUser.lastName}`
    : adminUser.email;
    
  const calculationTitle = getCalculationTitle(request);
  const decisionDate = new Date().toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const subject = `[Beyond Bookings] Your approval was declined`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fef2f2;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">✗ Declined</h1>
        <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">Your request was not approved</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">Request Declined</h2>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
          Your pricing calculation "<strong>${calculationTitle}</strong>" was not approved. Please review the feedback below.
        </p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Declined by:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${adminName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Decision date:</td>
              <td style="padding: 8px 0; color: #1f2937;">${decisionDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 500; vertical-align: top;">Admin feedback:</td>
              <td style="padding: 8px 0; color: #1f2937; line-height: 1.5; font-style: italic;">
                ${request.adminComment || 'No additional feedback provided.'}
              </td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center;">
          <a href="${EMAIL_CONFIG.appUrl}/calculations" 
             style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); 
                    color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; 
                    font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
            Review Calculation
          </a>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
        <p>Beyond Bookings - Pricing Agent Platform</p>
      </div>
    </div>
  `;
  
  await sendEmail(request.createdByUser.email, subject, htmlContent);
}