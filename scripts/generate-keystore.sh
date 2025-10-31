#!/bin/bash

###############################################################################
# NearPay Keystore and Certificate Generation Script
# 
# This script generates:
# 1. Android keystore for app signing
# 2. PEM certificate for NearPay API authentication
#
# Prerequisites:
#   - Java JDK installed (provides keytool command)
#   - Run on your local machine or CI/CD (not in Replit web environment)
#
# Usage:
#   ./scripts/generate-keystore.sh [sandbox|production]
#
# Output location: ./certs/ (gitignored)
###############################################################################

set -e

# Check if keytool is available
if ! command -v keytool &> /dev/null; then
    echo "❌ Error: keytool not found!"
    echo ""
    echo "keytool is part of the Java Development Kit (JDK)."
    echo ""
    echo "To install:"
    echo "  • macOS: brew install openjdk"
    echo "  • Ubuntu/Debian: sudo apt install openjdk-17-jdk"
    echo "  • Windows: Download from https://adoptium.net/"
    echo ""
    exit 1
fi

# Determine environment
ENVIRONMENT=${1:-sandbox}
if [[ "$ENVIRONMENT" != "sandbox" && "$ENVIRONMENT" != "production" ]]; then
  echo "❌ Invalid environment. Use: sandbox or production"
  exit 1
fi

echo "🔐 Generating NearPay keystore and certificate for: $ENVIRONMENT"
echo ""

# Create certs directory if it doesn't exist
mkdir -p certs

# Set file names based on environment
KEYSTORE_FILE="certs/nearpay-${ENVIRONMENT}.keystore"
PEM_FILE="certs/nearpay-${ENVIRONMENT}-cert.pem"
KEY_ALIAS="nearpay-${ENVIRONMENT}-key"

# Check if keystore already exists
if [ -f "$KEYSTORE_FILE" ]; then
  echo "⚠️  Keystore already exists: $KEYSTORE_FILE"
  read -p "Do you want to overwrite it? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. Using existing keystore."
    exit 0
  fi
  rm -f "$KEYSTORE_FILE"
fi

echo "📝 Step 1: Generating Android keystore..."
echo "   You will be prompted for information."
echo ""

# Generate keystore
keytool -genkeypair -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "nearpay${ENVIRONMENT}2025" \
  -keypass "nearpay${ENVIRONMENT}2025" \
  -dname "CN=NearPay POS App, OU=Payment Systems, O=Your Company, L=San Antonio, ST=Texas, C=US"

echo ""
echo "✅ Keystore generated: $KEYSTORE_FILE"
echo ""

echo "📝 Step 2: Extracting PEM certificate..."
echo ""

# Extract PEM certificate from keystore
keytool -export -rfc \
  -alias "$KEY_ALIAS" \
  -keystore "$KEYSTORE_FILE" \
  -storepass "nearpay${ENVIRONMENT}2025" \
  -file "$PEM_FILE"

echo ""
echo "✅ PEM certificate generated: $PEM_FILE"
echo ""

# Display certificate info
echo "📋 Certificate Information:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "nearpay${ENVIRONMENT}2025" -alias "$KEY_ALIAS" | grep -A 5 "Owner:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Save keystore details
cat > "certs/nearpay-${ENVIRONMENT}-details.txt" << EOF
NearPay Keystore Details - ${ENVIRONMENT^^}
Generated: $(date)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Keystore File: $KEYSTORE_FILE
PEM Certificate: $PEM_FILE
Key Alias: $KEY_ALIAS
Store Password: nearpay${ENVIRONMENT}2025
Key Password: nearpay${ENVIRONMENT}2025

⚠️  IMPORTANT SECURITY NOTES:
- Never commit these files to git (already in .gitignore)
- Store keystore password securely (use password manager)
- Send PEM certificate to NearPay: [email protected]
- Keep keystore file safe - you need it to sign app updates

📧 Next Steps:
1. Email $PEM_FILE to [email protected]
2. Include your app package name: app.cashmgmtnp.pos
3. Specify environment: $ENVIRONMENT
4. Wait for NearPay confirmation
5. Update build.gradle with signing configuration

EOF

echo "✅ Setup complete!"
echo ""
echo "📧 NEXT STEPS:"
echo "1. Send PEM certificate to NearPay:"
echo "   📎 File: $PEM_FILE"
echo "   ✉️  To: [email protected]"
echo "   📝 Include: Package name (app.cashmgmtnp.pos) and environment ($ENVIRONMENT)"
echo ""
echo "2. Configure app signing (see INFRA.md)"
echo ""
echo "⚠️  SECURITY: Never commit certs/ directory to git!"
echo ""
echo "📄 Keystore details saved to: certs/nearpay-${ENVIRONMENT}-details.txt"
