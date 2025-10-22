#!/bin/bash
# Test SMTP port connectivity

echo "Testing SMTP port connectivity..."
echo ""

echo "Testing smtp.zoho.com:25..."
timeout 5 bash -c "echo > /dev/tcp/smtp.zoho.com/25" 2>/dev/null && echo "✅ Port 25 is OPEN" || echo "❌ Port 25 is BLOCKED"

echo "Testing smtp.zoho.com:465..."
timeout 5 bash -c "echo > /dev/tcp/smtp.zoho.com/465" 2>/dev/null && echo "✅ Port 465 is OPEN" || echo "❌ Port 465 is BLOCKED"

echo "Testing smtp.zoho.com:587..."
timeout 5 bash -c "echo > /dev/tcp/smtp.zoho.com/587" 2>/dev/null && echo "✅ Port 587 is OPEN" || echo "❌ Port 587 is BLOCKED"

echo "Testing smtp.zoho.com:2525..."
timeout 5 bash -c "echo > /dev/tcp/smtp.zoho.com/2525" 2>/dev/null && echo "✅ Port 2525 is OPEN" || echo "❌ Port 2525 is BLOCKED"

echo ""
echo "Testing alternative providers..."
echo "Testing smtp.gmail.com:587..."
timeout 5 bash -c "echo > /dev/tcp/smtp.gmail.com/587" 2>/dev/null && echo "✅ Gmail port 587 is OPEN" || echo "❌ Gmail port 587 is BLOCKED"

echo ""
echo "If all ports are blocked, your VPS provider restricts outbound SMTP."
echo "Solution: Use an HTTP API-based email service (SendGrid, Mailgun, etc.)"
