"""
Staff Notification Service
Sends real-time notifications via Slack, SMS, and Email when customers need assistance.

Configuration (environment variables):
- SLACK_WEBHOOK_SALES: Slack webhook for sales team
- SLACK_WEBHOOK_APPRAISAL: Slack webhook for appraisal team  
- SLACK_WEBHOOK_FINANCE: Slack webhook for finance team
- SLACK_WEBHOOK_DEFAULT: Fallback webhook if team-specific not set

- TWILIO_ACCOUNT_SID: Twilio account SID
- TWILIO_AUTH_TOKEN: Twilio auth token
- TWILIO_PHONE_NUMBER: Twilio phone to send from
- SMS_NOTIFY_SALES: Phone number(s) for sales (comma-separated)
- SMS_NOTIFY_APPRAISAL: Phone number(s) for appraisal
- SMS_NOTIFY_FINANCE: Phone number(s) for finance

- SENDGRID_API_KEY: SendGrid API key for email
- EMAIL_FROM_ADDRESS: From email address
- EMAIL_FROM_NAME: From name
- EMAIL_NOTIFY_SALES: Email(s) for sales notifications
- EMAIL_NOTIFY_APPRAISAL: Email(s) for appraisal notifications
- EMAIL_NOTIFY_FINANCE: Email(s) for finance notifications
- EMAIL_NOTIFY_DEFAULT: Default email if team-specific not set
"""

import httpx
import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("showroom_kiosk.notifications")


class NotificationService:
    """Handles sending notifications to staff via Slack and SMS"""
    
    def __init__(self, settings):
        self.settings = settings
        self._twilio_client = None
    
    @property
    def twilio_client(self):
        """Lazy-load Twilio client"""
        if self._twilio_client is None and self.settings.is_sms_configured:
            try:
                from twilio.rest import Client
                self._twilio_client = Client(
                    self.settings.twilio_account_sid,
                    self.settings.twilio_auth_token
                )
            except ImportError:
                logger.warning("Twilio package not installed. SMS notifications disabled.")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
        return self._twilio_client
    
    async def notify_staff(
        self,
        notification_type: str,
        message: str,
        session_id: str,
        vehicle_stock: Optional[str] = None,
        customer_name: Optional[str] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send notification to appropriate staff.
        
        Args:
            notification_type: "sales", "appraisal", or "finance"
            message: Brief description of what customer needs
            session_id: Kiosk session ID for reference
            vehicle_stock: Stock number of vehicle (if applicable)
            customer_name: Customer name (if known)
            additional_context: Extra info like budget, trade-in details
            
        Returns:
            Dict with status and details of notifications sent
        """
        results = {
            "slack_sent": False,
            "sms_sent": False,
            "email_sent": False,
            "errors": [],
            "notification_type": notification_type,
            "timestamp": datetime.now().isoformat()
        }
        
        # Build notification content
        notification = self._build_notification(
            notification_type=notification_type,
            message=message,
            session_id=session_id,
            vehicle_stock=vehicle_stock,
            customer_name=customer_name,
            additional_context=additional_context
        )
        
        # Send Slack notification
        slack_result = await self._send_slack(notification_type, notification)
        results["slack_sent"] = slack_result.get("success", False)
        if slack_result.get("error"):
            results["errors"].append(f"Slack: {slack_result['error']}")
        
        # Send SMS notification
        sms_result = await self._send_sms(notification_type, notification)
        results["sms_sent"] = sms_result.get("success", False)
        if sms_result.get("error"):
            results["errors"].append(f"SMS: {sms_result['error']}")
        
        # Send Email notification
        email_result = await self._send_email(notification_type, notification)
        results["email_sent"] = email_result.get("success", False)
        if email_result.get("error"):
            results["errors"].append(f"Email: {email_result['error']}")
        
        # Log the notification attempt
        any_sent = results["slack_sent"] or results["sms_sent"] or results["email_sent"]
        if any_sent:
            channels = []
            if results["slack_sent"]:
                channels.append("Slack")
            if results["sms_sent"]:
                channels.append("SMS")
            if results["email_sent"]:
                channels.append("Email")
            logger.info(f"Staff notification sent via {', '.join(channels)}: {notification_type} - {message[:50]}...")
        else:
            logger.warning(f"Staff notification failed: {results['errors']}")
        
        return results
    
    def _build_notification(
        self,
        notification_type: str,
        message: str,
        session_id: str,
        vehicle_stock: Optional[str] = None,
        customer_name: Optional[str] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Build notification payload"""
        
        # Emoji based on type
        emoji_map = {
            "sales": "🚗",
            "vehicle_request": "🚙",
            "appraisal": "🔄",
            "finance": "💰"
        }
        emoji = emoji_map.get(notification_type, "📢")
        
        # Title
        titles = {
            "sales": "Sales Assistance Requested",
            "vehicle_request": "Vehicle Bring-Up Requested",
            "appraisal": "Trade-In Appraisal Requested",
            "finance": "Finance Help Requested"
        }
        title = titles.get(notification_type, "Customer Assistance Needed")
        
        # Dashboard link
        # TODO: set to real deployed frontend URL via env var
        frontend_base = os.environ.get("FRONTEND_BASE_URL", "http://localhost:3000")
        dashboard_url = f"{frontend_base}/#salesDashboard?session={session_id}"
        
        return {
            "emoji": emoji,
            "title": title,
            "notification_type": notification_type,
            "message": message,
            "session_id": session_id,
            "vehicle_stock": vehicle_stock,
            "customer_name": customer_name or "Guest Customer",
            "dashboard_url": dashboard_url,
            "additional_context": additional_context or {},
            "timestamp": datetime.now(timezone(timedelta(hours=-5))).strftime("%I:%M %p EST")
        }
    
    async def _send_slack(self, notification_type: str, notification: Dict[str, Any]) -> Dict[str, Any]:
        """Send Slack webhook notification"""
        
        webhook_url = self.settings.get_slack_webhook(notification_type)
        
        if not webhook_url:
            return {"success": False, "error": "No Slack webhook configured"}
        
        # Build Slack message with blocks for rich formatting
        slack_payload = {
            "text": f"{notification['emoji']} {notification['title']}: {notification['message']}",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"{notification['emoji']} {notification['title']}",
                        "emoji": True
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*{notification['message']}*"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": f"*Customer:*\n{notification['customer_name']}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": f"*Time:*\n{notification['timestamp']}"
                        }
                    ]
                }
            ]
        }
        
        # Add vehicle info if present
        if notification.get("vehicle_stock"):
            context = notification.get("additional_context", {})
            vehicle_info = context.get("vehicle_info", {})
            
            # Build vehicle description
            if vehicle_info:
                year = vehicle_info.get("year", "")
                make = vehicle_info.get("make", "")
                model = vehicle_info.get("model", "")
                trim = vehicle_info.get("trim", "")
                color = vehicle_info.get("exteriorColor", "")
                msrp = vehicle_info.get("msrp")
                sale_price = vehicle_info.get("salePrice")
                
                vehicle_desc = f"{year} {make} {model}"
                if trim:
                    vehicle_desc += f" {trim}"
                
                vehicle_text = f"*Vehicle:* {vehicle_desc}\n*Stock #:* {notification['vehicle_stock']}"
                if color:
                    vehicle_text += f"\n*Color:* {color}"
                if sale_price:
                    vehicle_text += f"\n*Price:* ${sale_price:,.0f}"
                elif msrp:
                    vehicle_text += f"\n*MSRP:* ${msrp:,.0f}"
                
                slack_payload["blocks"].append({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": vehicle_text
                    }
                })
            else:
                slack_payload["blocks"].append({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Vehicle:* Stock #{notification['vehicle_stock']}"
                    }
                })
        
        # Add additional context if present
        context = notification.get("additional_context", {})
        if context.get("budget"):
            slack_payload["blocks"].append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Budget:* ${context['budget']:,.0f}"
                }
            })
        
        if context.get("trade_in"):
            slack_payload["blocks"].append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Trade-In:* {context['trade_in']}"
                }
            })
        
        # Add vehicle badge button (green with Year Make Model)
        context = notification.get("additional_context", {})
        vehicle_info = context.get("vehicle_info", {})
        
        if vehicle_info:
            year = vehicle_info.get("year", "")
            make = vehicle_info.get("make", "")
            model = vehicle_info.get("model", "")
            vehicle_label = f"🚗 {year} {make} {model}".strip()
        elif notification.get("vehicle_stock"):
            vehicle_label = f"🚗 Stock #{notification['vehicle_stock']}"
        else:
            vehicle_label = "🚗 Vehicle Request"
        
        slack_payload["blocks"].append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": vehicle_label,
                        "emoji": True
                    },
                    "url": f"{os.environ.get('FRONTEND_BASE_URL', 'http://localhost:3000')}/#vehicleDetail?stock={notification.get('vehicle_stock', '')}",
                    "style": "primary"
                }
            ]
        })
        
        # Add divider and session ID footer
        slack_payload["blocks"].extend([
            {"type": "divider"},
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Session: `{notification['session_id'][:12]}...` | NH Chevy Showroom Kiosk"
                    }
                ]
            }
        ])
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(webhook_url, json=slack_payload)
                
                if response.status_code == 200:
                    return {"success": True}
                else:
                    return {
                        "success": False, 
                        "error": f"Slack returned {response.status_code}: {response.text[:100]}"
                    }
        except httpx.TimeoutException:
            return {"success": False, "error": "Slack webhook timeout"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _send_sms(self, notification_type: str, notification: Dict[str, Any]) -> Dict[str, Any]:
        """Send SMS notification via Twilio"""
        
        if not self.settings.is_sms_configured:
            return {"success": False, "error": "SMS not configured"}
        
        phone_numbers = self.settings.get_sms_numbers(notification_type)
        
        if not phone_numbers:
            return {"success": False, "error": f"No phone numbers for {notification_type}"}
        
        client = self.twilio_client
        if not client:
            return {"success": False, "error": "Twilio client not available"}
        
        # Build SMS message (keep it concise)
        sms_parts = [
            f"{notification['emoji']} SHOWROOM KIOSK: {notification['title']}",
            f"",
            notification['message']
        ]
        
        if notification.get("vehicle_stock"):
            sms_parts.append(f"Vehicle: Stock #{notification['vehicle_stock']}")
        
        sms_parts.append(f"Customer: {notification['customer_name']}")
        sms_parts.append(f"Time: {notification['timestamp']}")
        
        sms_body = "\n".join(sms_parts)
        
        # Send to all configured numbers
        sent_count = 0
        errors = []
        
        for phone in phone_numbers:
            try:
                client.messages.create(
                    body=sms_body,
                    from_=self.settings.twilio_phone_number,
                    to=phone
                )
                sent_count += 1
            except Exception as e:
                errors.append(f"{phone}: {str(e)}")
        
        if sent_count > 0:
            return {"success": True, "sent_to": sent_count}
        else:
            return {"success": False, "error": "; ".join(errors)}
    
    async def _send_email(self, notification_type: str, notification: Dict[str, Any]) -> Dict[str, Any]:
        """Send email notification via SendGrid or SMTP"""
        
        if not self.settings.is_email_configured:
            return {"success": False, "error": "Email not configured"}
        
        recipients = self.settings.get_email_recipients(notification_type)
        
        if not recipients:
            return {"success": False, "error": f"No email recipients for {notification_type}"}
        
        # Build email content
        subject = f"🚨 {notification['title']} - Showroom Kiosk"
        
        # HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .header {{ background: #1a5f2a; color: white; padding: 20px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 24px; }}
                .content {{ padding: 20px; }}
                .alert-box {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; }}
                .info-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }}
                .info-label {{ color: #666; font-weight: bold; }}
                .info-value {{ color: #333; }}
                .cta-button {{ display: inline-block; background: #1a5f2a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }}
                .footer {{ background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{notification['emoji']} {notification['title']}</h1>
                </div>
                <div class="content">
                    <div class="alert-box">
                        <strong>Customer Request:</strong><br>
                        {notification['message']}
                    </div>
                    
                    <div class="info-row">
                        <span class="info-label">Customer:</span>
                        <span class="info-value">{notification['customer_name']}</span>
                    </div>
                    
                    <div class="info-row">
                        <span class="info-label">Time:</span>
                        <span class="info-value">{notification['timestamp']}</span>
                    </div>
        """
        
        if notification.get("vehicle_stock"):
            html_body += f"""
                    <div class="info-row">
                        <span class="info-label">Vehicle:</span>
                        <span class="info-value">Stock #{notification['vehicle_stock']}</span>
                    </div>
            """
        
        context = notification.get("additional_context", {})
        if context.get("budget"):
            html_body += f"""
                    <div class="info-row">
                        <span class="info-label">Budget:</span>
                        <span class="info-value">${context['budget']:,.0f}</span>
                    </div>
            """
        
        if context.get("trade_in"):
            html_body += f"""
                    <div class="info-row">
                        <span class="info-label">Trade-In:</span>
                        <span class="info-value">{context['trade_in']}</span>
                    </div>
            """
        
        html_body += f"""
                    <a href="{notification['dashboard_url']}" class="cta-button">
                        📊 View in Dashboard
                    </a>
                </div>
                <div class="footer">
                    Session ID: {notification['session_id'][:12]}... | NH Chevy Showroom Kiosk
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text fallback
        text_body = f"""
{notification['emoji']} {notification['title']}

{notification['message']}

Customer: {notification['customer_name']}
Time: {notification['timestamp']}
"""
        if notification.get("vehicle_stock"):
            text_body += f"Vehicle: Stock #{notification['vehicle_stock']}\n"
        
        text_body += f"\nView in Dashboard: {notification['dashboard_url']}"
        
        # Send via SendGrid if configured
        if self.settings.sendgrid_api_key:
            return await self._send_email_sendgrid(recipients, subject, html_body, text_body)
        
        # Fall back to SMTP
        return await self._send_email_smtp(recipients, subject, html_body, text_body)
    
    async def _send_email_sendgrid(
        self, 
        recipients: List[str], 
        subject: str, 
        html_body: str, 
        text_body: str
    ) -> Dict[str, Any]:
        """Send email via SendGrid API"""
        
        payload = {
            "personalizations": [{"to": [{"email": r} for r in recipients]}],
            "from": {
                "email": self.settings.email_from_address,
                "name": self.settings.email_from_name
            },
            "subject": subject,
            "content": [
                {"type": "text/plain", "value": text_body},
                {"type": "text/html", "value": html_body}
            ]
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self.settings.sendgrid_api_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code in [200, 202]:
                    return {"success": True, "sent_to": len(recipients)}
                else:
                    return {
                        "success": False,
                        "error": f"SendGrid returned {response.status_code}: {response.text[:100]}"
                    }
        except httpx.TimeoutException:
            return {"success": False, "error": "SendGrid timeout"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _send_email_smtp(
        self, 
        recipients: List[str], 
        subject: str, 
        html_body: str, 
        text_body: str
    ) -> Dict[str, Any]:
        """Send email via SMTP"""
        
        if not self.settings.smtp_host:
            return {"success": False, "error": "SMTP not configured"}
        
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.settings.email_from_name} <{self.settings.email_from_address}>"
            msg["To"] = ", ".join(recipients)
            
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))
            
            # Connect and send
            if self.settings.smtp_use_tls:
                server = smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(self.settings.smtp_host, self.settings.smtp_port)
            
            if self.settings.smtp_username and self.settings.smtp_password:
                server.login(self.settings.smtp_username, self.settings.smtp_password)
            
            server.sendmail(
                self.settings.email_from_address,
                recipients,
                msg.as_string()
            )
            server.quit()
            
            return {"success": True, "sent_to": len(recipients)}
        except Exception as e:
            return {"success": False, "error": str(e)}


# Singleton instance
_notification_service: Optional[NotificationService] = None


def get_notification_service() -> NotificationService:
    """Get or create notification service instance"""
    global _notification_service
    
    if _notification_service is None:
        from app.core.settings import get_settings
        _notification_service = NotificationService(get_settings())
    
    return _notification_service
