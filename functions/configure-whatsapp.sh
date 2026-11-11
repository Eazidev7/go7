#!/bin/bash
# 🔐 GO7 WHATSAPP FIREBASE ENVIRONMENT CONFIGURATION
# Sets up Firebase Functions config for WhatsApp Cloud API
# Date: October 23, 2025
# Location: Abeokuta, Nigeria

echo "═══════════════════════════════════════════════════════════"
echo "🔐 GO7 WhatsApp Cloud API - Firebase Configuration"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI detected"
echo ""

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged into Firebase. Logging in..."
    firebase login
fi

echo "✅ Firebase authentication verified"
echo ""

# Get current project
CURRENT_PROJECT=$(firebase use 2>&1 | grep "Active Project" | awk '{print $3}')
echo "📋 Current Firebase Project: $CURRENT_PROJECT"
echo ""

# Prompt for WhatsApp credentials
echo "═══════════════════════════════════════════════════════════"
echo "📱 Enter WhatsApp Cloud API Credentials"
echo "═══════════════════════════════════════════════════════════"
echo ""

read -p "WhatsApp Access Token (starts with EAA...): " ACCESS_TOKEN
read -p "WhatsApp Phone Number ID: " PHONE_ID
read -p "Go7 Support Number (e.g., 2348012345678): " SUPPORT_NUMBER

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📝 Enter Message Template Names"
echo "═══════════════════════════════════════════════════════════"
echo ""

read -p "Confirmed Template Name [go7_confirmed]: " TEMPLATE_CONFIRMED
TEMPLATE_CONFIRMED=${TEMPLATE_CONFIRMED:-go7_confirmed}

read -p "Out for Delivery Template Name [go7_out_for_delivery]: " TEMPLATE_OUT_FOR_DELIVERY
TEMPLATE_OUT_FOR_DELIVERY=${TEMPLATE_OUT_FOR_DELIVERY:-go7_out_for_delivery}

read -p "Delivered Template Name [go7_delivered]: " TEMPLATE_DELIVERED
TEMPLATE_DELIVERED=${TEMPLATE_DELIVERED:-go7_delivered}

read -p "Webhook Verify Token [GO7_WEBHOOK_2025]: " VERIFY_TOKEN
VERIFY_TOKEN=${VERIFY_TOKEN:-GO7_WEBHOOK_2025}

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🚀 Setting Firebase Functions Config..."
echo "═══════════════════════════════════════════════════════════"
echo ""

# Set WhatsApp credentials
echo "📤 Setting WhatsApp access token..."
firebase functions:config:set whatsapp.access_token="$ACCESS_TOKEN"

echo "📤 Setting WhatsApp phone number ID..."
firebase functions:config:set whatsapp.phone_id="$PHONE_ID"

# Set template names
echo "📤 Setting template names..."
firebase functions:config:set whatsapp.template_confirmed="$TEMPLATE_CONFIRMED"
firebase functions:config:set whatsapp.template_out_for_delivery="$TEMPLATE_OUT_FOR_DELIVERY"
firebase functions:config:set whatsapp.template_delivered="$TEMPLATE_DELIVERED"

# Set Go7 configuration
echo "📤 Setting Go7 support number..."
firebase functions:config:set whatsapp.support_number="$SUPPORT_NUMBER"

echo "📤 Setting webhook verify token..."
firebase functions:config:set whatsapp.verify_token="$VERIFY_TOKEN"

# Also set for template-based notifications (legacy compatibility)
echo "📤 Setting legacy template config..."
firebase functions:config:set whatsapp.meta_token="$ACCESS_TOKEN"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Configuration Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Display current config
echo "📋 Current Firebase Functions Config:"
echo ""
firebase functions:config:get

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📝 Next Steps:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "1. Deploy functions:"
echo "   firebase deploy --only functions"
echo ""
echo "2. Test integration:"
echo "   - Update any order status to CONFIRMED, OUT_FOR_DELIVERY, or DELIVERED"
echo "   - Check WhatsApp message on customer phone"
echo ""
echo "3. Monitor logs:"
echo "   firebase functions:log --only sendWhatsAppCloudNotification"
echo ""
echo "4. Validate config:"
echo "   Call validateWhatsAppConfig function from your app"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🎉 Ready to deploy!"
echo "═══════════════════════════════════════════════════════════"
