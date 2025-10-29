# Infrastructure & Certificate Management

## NearPay SSL/TLS Certificate Setup

### Overview

NearPay requires a PEM format certificate extracted from your Android app signing keystore for API authentication. This certificate establishes a secure connection between your app and NearPay's payment processing infrastructure.

**Important:** The certificate is NOT the OpenSSL self-signed certificate approach. NearPay requires the public key extracted from your Android app signing keystore.

---

## Quick Start

### Method 1: GitHub Actions (Recommended - No Local Setup!)

**Easiest way to generate certificates without installing anything locally.**

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Add certificate generation"
   git push origin main
   ```

2. **Run the certificate generation workflow:**
   - Go to your GitHub repository
   - Click **Actions** tab
   - Select **Generate NearPay Certificates**
   - Click **Run workflow** dropdown
   - Select environment: `sandbox` or `production`
   - Click **Run workflow** button

3. **Download the certificates:**
   - Wait ~30 seconds for completion
   - Click on the completed workflow run
   - Scroll to **Artifacts** section
   - Download `nearpay-sandbox-certificates.zip` (or production)
   - Extract the zip file

4. **You'll get these files:**
   - `nearpay-sandbox.keystore` - Keep this safe!
   - `nearpay-sandbox-cert.pem` - Send to NearPay
   - `nearpay-sandbox-details.txt` - Passwords and info

✅ **Advantages:** No Java installation needed, works from anywhere, automated

### Method 2: Local Machine

**If you prefer to generate certificates locally.**

#### Prerequisites

Ensure Java JDK is installed on your local machine:

**macOS:**
```bash
brew install openjdk
```

**Ubuntu/Debian:**
```bash
sudo apt install openjdk-17-jdk
```

**Windows:**
- Download from https://adoptium.net/

**Verify installation:**
```bash
keytool -version
```

#### Generate Certificates

We provide separate certificates for sandbox and production environments:

```bash
# Clone your repository locally
git clone <your-repo-url>
cd <repo-name>

# For testing (sandbox environment)
chmod +x scripts/generate-keystore.sh
./scripts/generate-keystore.sh sandbox

# For production (when ready to go live)
./scripts/generate-keystore.sh production
```

### 2. Send Certificate to NearPay

After generation, email the PEM certificate to NearPay:

**For Sandbox:**
- 📎 File: `certs/nearpay-sandbox-cert.pem`
- ✉️ To: [email protected]
- 📝 Subject: "PEM Certificate - io.nearpay.payment (Sandbox)"
- 📝 Body:
  ```
  Hello,
  
  Please register the attached PEM certificate for our NearPay integration.
  
  Package Name: io.nearpay.payment
  Environment: Sandbox
  Company: [Your Company Name]
  Contact: [Your Email]
  
  Thank you!
  ```

**For Production:**
- Same process but use `certs/nearpay-production-cert.pem`
- Mark environment as "Production"
- Wait for NearPay approval before using in production

### 3. Configure App Signing

After generating the keystore, configure Android app signing:

#### Option A: Local Build (Development)

Edit `android/app/build.gradle` to add signing configuration:

```groovy
android {
    ...
    
    signingConfigs {
        debug {
            storeFile file("../../certs/nearpay-sandbox.keystore")
            storePassword "nearpaysandbox2025"
            keyAlias "nearpay-sandbox-key"
            keyPassword "nearpaysandbox2025"
        }
        
        release {
            storeFile file("../../certs/nearpay-production.keystore")
            storePassword "nearpayproduction2025"
            keyAlias "nearpay-production-key"
            keyPassword "nearpayproduction2025"
        }
    }
    
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### Option B: CI/CD Build (GitHub Actions)

For automated builds, store keystore credentials as GitHub Secrets:

1. **Add Secrets to GitHub:**
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     ```
     NEARPAY_KEYSTORE_BASE64        (base64 encoded keystore file)
     NEARPAY_KEYSTORE_PASSWORD      nearpaysandbox2025
     NEARPAY_KEY_ALIAS              nearpay-sandbox-key
     NEARPAY_KEY_PASSWORD           nearpaysandbox2025
     ```

2. **Encode keystore to base64:**
   ```bash
   base64 -i certs/nearpay-sandbox.keystore | pbcopy
   # On Linux: base64 -w 0 certs/nearpay-sandbox.keystore | xclip
   ```

3. **Update GitHub Actions workflow:**

   The `.github/workflows/build-apk.yml` already includes steps for this. Ensure it has:

   ```yaml
   - name: Decode keystore
     run: |
       echo "${{ secrets.NEARPAY_KEYSTORE_BASE64 }}" | base64 -d > android/app/nearpay.keystore
   
   - name: Build signed APK
     env:
       KEYSTORE_PASSWORD: ${{ secrets.NEARPAY_KEYSTORE_PASSWORD }}
       KEY_ALIAS: ${{ secrets.NEARPAY_KEY_ALIAS }}
       KEY_PASSWORD: ${{ secrets.NEARPAY_KEY_PASSWORD }}
     run: |
       cd android
       ./gradlew assembleRelease
   ```

---

## Certificate Management

### File Structure

```
certs/                                    # ⚠️ GITIGNORED - Never commit!
├── nearpay-sandbox.keystore              # Android signing keystore (sandbox)
├── nearpay-sandbox-cert.pem              # PEM certificate for NearPay (sandbox)
├── nearpay-sandbox-details.txt           # Keystore information
├── nearpay-production.keystore           # Android signing keystore (production)
├── nearpay-production-cert.pem           # PEM certificate for NearPay (production)
└── nearpay-production-details.txt        # Keystore information
```

### Environment Separation

**Sandbox (Development/Testing):**
- Used during development and testing
- Connected to NearPay sandbox environment
- Test transactions only - no real money
- Certificate: `nearpay-sandbox-cert.pem`
- Keystore: `nearpay-sandbox.keystore`

**Production (Live Payments):**
- Used for real customer transactions
- Connected to NearPay production environment
- Real money processing
- Certificate: `nearpay-production-cert.pem`
- Keystore: `nearpay-production.keystore`
- ⚠️ Requires NearPay approval before use

### Certificate Rotation

Keystores are valid for 10,000 days (~27 years), but follow these best practices:

1. **Track Expiration:**
   - Set calendar reminder 30 days before expiration
   - Document expiration date in password manager

2. **Rotate Annually (Recommended):**
   - Generate new keystore/certificate pair
   - Send new PEM to NearPay
   - Test with new certificate
   - Deploy updated app

3. **Emergency Rotation (Compromise):**
   - If keystore is compromised, generate new one immediately
   - Notify NearPay to revoke old certificate
   - Deploy emergency update

### Security Best Practices

✅ **DO:**
- Store keystore passwords in a password manager
- Use different passwords for sandbox and production
- Keep backups of keystores in secure location (encrypted USB, vault)
- Limit access to production keystore (team leads only)
- Use GitHub Secrets for CI/CD credentials
- Rotate certificates annually
- Monitor certificate expiration dates

❌ **DON'T:**
- Never commit keystores or PEM files to git
- Never share keystore passwords in plain text
- Never use same keystore for multiple apps
- Never store keystores in cloud storage (Dropbox, Google Drive)
- Never email keystores (PEM certificates are OK)
- Never use production keystore for testing

---

## Troubleshooting

### Issue: Keystore password error

**Error:** `keytool error: java.io.IOException: Keystore was tampered with, or password was incorrect`

**Solution:**
- Check password in `certs/nearpay-[env]-details.txt`
- Regenerate keystore if password is lost
- Note: If you regenerate, you must send new PEM to NearPay

### Issue: Cannot find keystore file

**Error:** `FileNotFoundException: nearpay-sandbox.keystore`

**Solution:**
```bash
# Run generation script
./scripts/generate-keystore.sh sandbox

# Or check file location
ls -la certs/
```

### Issue: PEM certificate not accepted by NearPay

**Possible causes:**
- Using wrong certificate format (must be from keystore, not OpenSSL)
- Wrong environment (sandbox vs production)
- Package name mismatch

**Solution:**
1. Verify PEM was extracted from correct keystore:
   ```bash
   keytool -list -v -keystore certs/nearpay-sandbox.keystore -storepass nearpaysandbox2025
   ```

2. Confirm package name in email matches `io.nearpay.payment`

3. Contact NearPay support with keystore fingerprint

### Issue: App signature doesn't match

**Error:** `INSTALL_FAILED_UPDATE_INCOMPATIBLE`

**Solution:**
- Uninstall old version of app
- Ensure using correct keystore for build type
- Verify signing configuration in build.gradle

---

## Manual Certificate Generation

If you prefer manual steps instead of the script:

### Step 1: Generate Keystore

```bash
keytool -genkeypair -v \
  -keystore certs/nearpay-sandbox.keystore \
  -alias nearpay-sandbox-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You'll be prompted for:
# - Keystore password: (create a strong password)
# - Your name: NearPay POS App
# - Organization: Your Company Name
# - City: San Antonio
# - State: Texas
# - Country: US
```

### Step 2: Extract PEM Certificate

```bash
keytool -export -rfc \
  -alias nearpay-sandbox-key \
  -keystore certs/nearpay-sandbox.keystore \
  -file certs/nearpay-sandbox-cert.pem

# Enter keystore password when prompted
```

### Step 3: Verify Certificate

```bash
keytool -printcert -file certs/nearpay-sandbox-cert.pem
```

You should see certificate details including:
- Owner information
- Issuer information
- Validity dates
- Certificate fingerprints (SHA1, SHA256)

---

## Additional Resources

- **NearPay Documentation:** https://docs.nearpay.io
- **Android App Signing:** https://developer.android.com/studio/publish/app-signing
- **Java Keytool Reference:** https://docs.oracle.com/javase/8/docs/technotes/tools/unix/keytool.html

---

## Support

For certificate-related issues:
- **NearPay Support:** [email protected]
- **Registration:** [email protected]
- **Documentation:** https://docs.nearpay.io/en/guides/generating-keystore-pem-certificate

---

**Last Updated:** January 2025
