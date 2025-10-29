# NearPay POS Android App

A mobile point-of-sale application built with React, Capacitor, and NearPay.io for accepting NFC payments on Android devices.

## Features

- 💳 **NFC Payment Processing** - Accept contactless payments using NearPay Tap to Pay
- 📱 **Native Android App** - Built with Capacitor for native performance
- 📊 **Transaction History** - Track and review all payment transactions
- 🎨 **Modern UI** - Clean, intuitive interface built with Tailwind CSS and Shadcn UI
- 🔄 **Real-time Updates** - Instant feedback on payment status

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Android Studio** (for local Android development)
- **Java JDK** (v17 or higher)

### NearPay Account Setup

1. **Register with NearPay**
   - Email [email protected] with your Android package name: `io.nearpay.payment`
   - Request sandbox credentials by emailing [email protected]
   - Wait for confirmation of registration

2. **Get Authentication Token**
   - NearPay will provide you with a JWT token, email, or phone number for authentication
   - You'll need this token to initialize the SDK in the app

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd <repo-name>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=your_database_url
   ```

4. **Initialize the database**
   ```bash
   npm run db:push
   ```

## Development

### Running Locally (Web)

```bash
npm run dev
```

The app will be available at `http://localhost:5000`

**Note:** NearPay functionality is only available on Android devices. The web version will show a warning.

### Building for Android

1. **Build the web assets**
   ```bash
   npm run build
   ```

2. **Sync with Capacitor**
   ```bash
   npx cap sync
   ```

3. **Open in Android Studio**
   ```bash
   npx cap open android
   ```

4. **Generate SSL/TLS Certificates**
   
   NearPay requires a PEM certificate from your app signing keystore:
   
   ```bash
   # Generate keystore and certificate for sandbox testing
   chmod +x scripts/generate-keystore.sh
   ./scripts/generate-keystore.sh sandbox
   ```
   
   This creates:
   - `certs/nearpay-sandbox.keystore` - For app signing
   - `certs/nearpay-sandbox-cert.pem` - Send to NearPay
   
   **Send PEM certificate to NearPay:**
   - Email: [email protected]
   - Attach: `certs/nearpay-sandbox-cert.pem`
   - Include: Package name `io.nearpay.payment` and environment "Sandbox"
   
   📖 **See INFRA.md for detailed certificate management**

5. **Configure NearPay Authentication**
   - Open `client/src/pages/CashRegister.tsx`
   - Replace `YOUR_JWT_TOKEN_HERE` with your actual NearPay JWT token
   ```typescript
   const result = await NearPay.initialize({
     authToken: 'your-actual-jwt-token',
     environment: 'sandbox' // or 'production'
   });
   ```

6. **Configure App Signing**
   
   Edit `android/app/build.gradle` to add signing configuration:
   
   ```groovy
   android {
       signingConfigs {
           debug {
               storeFile file("../../certs/nearpay-sandbox.keystore")
               storePassword "nearpaysandbox2025"
               keyAlias "nearpay-sandbox-key"
               keyPassword "nearpaysandbox2025"
           }
       }
       buildTypes {
           debug {
               signingConfig signingConfigs.debug
           }
       }
   }
   ```

7. **Build APK in Android Studio**
   - In Android Studio, select **Build > Build Bundle(s) / APK(s) > Build APK(s)**
   - The APK will be generated in `android/app/build/outputs/apk/debug/`

### Using Gradle CLI

```bash
cd android
./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

## 🔐 SSL/TLS Certificate Setup (REQUIRED)

Before your app can communicate with NearPay, you must generate and register SSL certificates.

⚠️ **Note:** This requires Java JDK installed locally. **Run on your computer, not in Replit web environment.**

### Quick Setup

#### Option 1: Using GitHub Actions (Easiest - No Local Setup Required!)

1. **Push your code to GitHub**
   ```bash
   git push origin main
   ```

2. **Generate certificates via GitHub Actions:**
   - Go to your repository on GitHub
   - Click **Actions** tab
   - Select **Generate NearPay Certificates** workflow
   - Click **Run workflow**
   - Choose environment: **sandbox**
   - Click **Run workflow** button

3. **Download the certificates:**
   - Wait for the workflow to complete (~30 seconds)
   - Click on the workflow run
   - Scroll to **Artifacts** section
   - Download **nearpay-sandbox-certificates.zip**
   - Extract the files

4. **Send PEM to NearPay:**
   - Email: [email protected]
   - Attach: `nearpay-sandbox-cert.pem`
   - Include: Package name `io.nearpay.payment` and environment "Sandbox"

5. **Keep keystore safe:**
   - Store `nearpay-sandbox.keystore` securely
   - You'll need it to sign your app

#### Option 2: Using Local Machine

```bash
# 1. Install Java JDK (if not already installed)
# macOS: brew install openjdk
# Ubuntu: sudo apt install openjdk-17-jdk
# Windows: Download from https://adoptium.net/

# 2. Clone repository locally
git clone <your-repo-url>
cd <repo-name>

# 3. Generate keystore and certificate
./scripts/generate-keystore.sh sandbox

# 4. Send PEM certificate to NearPay
# Email: [email protected]
# Attach: certs/nearpay-sandbox-cert.pem
# Include: Package name (io.nearpay.payment) and environment (Sandbox)

# 5. Wait for NearPay confirmation
# They will register your certificate in their system
```

### What Gets Generated

- `certs/nearpay-sandbox.keystore` - Android app signing keystore
- `certs/nearpay-sandbox-cert.pem` - PEM certificate for NearPay
- `certs/nearpay-sandbox-details.txt` - Keystore passwords and details

### Certificate Registration Steps

1. **Generate Certificate**
   ```bash
   ./scripts/generate-keystore.sh sandbox
   ```

2. **Email to NearPay**
   - **To:** [email protected]
   - **Subject:** PEM Certificate - io.nearpay.payment (Sandbox)
   - **Attach:** `certs/nearpay-sandbox-cert.pem`
   - **Body:**
     ```
     Hello,
     
     Please register the attached PEM certificate for our NearPay integration.
     
     Package Name: io.nearpay.payment
     Environment: Sandbox
     Company: [Your Company Name]
     Contact: [Your Email]
     
     Thank you!
     ```

3. **Wait for Confirmation**
   - NearPay will confirm certificate registration
   - Usually takes 1-2 business days

4. **For Production**
   - Repeat process with `./scripts/generate-keystore.sh production`
   - Send production certificate separately
   - Production requires additional approval

📖 **Complete certificate guide:** [INFRA.md](INFRA.md)

## Building APK with GitHub Actions

This repository includes a GitHub Actions workflow that automatically builds the APK on every push to the main branch.

### Setup

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **GitHub Actions will automatically:**
   - Install dependencies
   - Build the web assets
   - Sync with Capacitor
   - Build the APK
   - Upload the APK as an artifact
   - Create a GitHub release (on main branch)

3. **Download the APK**
   - Go to the **Actions** tab in your GitHub repository
   - Click on the latest workflow run
   - Download the `app-debug` artifact
   - Or download from the **Releases** page

### Manual Workflow Trigger

You can also manually trigger the build:
1. Go to **Actions** tab
2. Select **Build Android APK** workflow
3. Click **Run workflow**
4. Download the generated APK from the artifacts

## NearPay Integration

### SDK Configuration

The NearPay SDK is configured in `android/app/src/main/java/io/nearpay/payment/NearPayPlugin.java`

Key features:
- **Authentication**: JWT-based authentication
- **Environment**: Sandbox or Production
- **Payment Processing**: NFC tap-to-pay functionality

### Using the Payment Flow

1. **Enter Amount**: Type or select quick amount
2. **Tap Pay Button**: Initiates NearPay payment flow
3. **NFC Payment**: Customer taps card on device
4. **Confirmation**: App shows success/failure status
5. **Transaction Saved**: Payment logged to database

## Project Structure

```
.
├── android/                    # Native Android project
│   ├── app/
│   │   └── src/main/java/io/nearpay/payment/
│   │       ├── MainActivity.java
│   │       └── NearPayPlugin.java
│   └── build.gradle
├── client/                     # Frontend React app
│   └── src/
│       ├── components/         # UI components
│       ├── pages/              # Page components
│       │   ├── CashRegister.tsx
│       │   └── TransactionHistory.tsx
│       └── lib/
│           └── nearpay.ts      # NearPay TypeScript interface
├── server/                     # Backend Express server
│   ├── routes.ts               # API routes
│   └── storage.ts              # Database operations
├── shared/                     # Shared types/schema
│   └── schema.ts               # Database schema
├── .github/workflows/          # CI/CD workflows
│   └── build-apk.yml
├── capacitor.config.ts         # Capacitor configuration
└── package.json
```

## API Endpoints

### Transactions

- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get single transaction
- `POST /api/transactions` - Create new transaction
- `GET /api/health` - Health check

## Database Schema

### Transactions Table
- `id` - Serial primary key
- `amount` - Integer (cents)
- `status` - Text (approved/declined/error)
- `dateTime` - Timestamp
- `transactionId` - Text (NearPay transaction UUID)
- `cardDetails` - JSONB (card type, last4, etc.)
- `errorMessage` - Text (for failed transactions)

## Troubleshooting

### Common Issues

1. **NearPay SDK not initializing**
   - Ensure your package name `io.nearpay.payment` is registered with NearPay
   - Verify your JWT token is correct
   - Check you're using the correct environment (sandbox/production)

2. **Build fails with "package not found"**
   - Run `npm install` to ensure all dependencies are installed
   - Run `npx cap sync` to sync Capacitor plugins

3. **APK won't install on device**
   - Enable "Install from Unknown Sources" in Android settings
   - Ensure the APK is signed (debug or release)

4. **NFC not working**
   - Ensure the device has NFC capability
   - Check that NFC is enabled in device settings
   - Verify NearPay sandbox/production credentials

### Logs and Debugging

- **Android Logs**: Use Android Studio's Logcat
- **Filter by tag**: `NearPayPlugin` for payment-specific logs
- **Browser Console**: Available in web mode for debugging UI

## Environment Configuration

### Sandbox vs Production

**Sandbox Mode** (for testing):
```typescript
environment: 'sandbox'
```

**Production Mode** (for live payments):
```typescript
environment: 'production'
```

⚠️ **Important**: Always test thoroughly in sandbox mode before switching to production.

## Security Notes

### Certificates & Keystores
- **NEVER commit certificates or keystores to git** (already in .gitignore)
- Store keystore passwords securely in a password manager
- Use separate keystores for sandbox and production
- Backup keystores in secure, encrypted location
- See [INFRA.md](INFRA.md) for complete certificate security guide

### API Keys & Tokens
- Never commit JWT tokens or API keys to version control
- Use environment variables for sensitive configuration
- Rotate credentials annually
- Use GitHub Secrets for CI/CD builds

### General
- Always use HTTPS for production deployments
- Implement proper authentication for production apps
- Monitor and log all payment transactions
- Follow PCI-DSS guidelines for payment processing

## Support

For NearPay-specific issues:
- Documentation: https://docs.nearpay.io
- Support: [email protected]
- Registration: [email protected]

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Changelog

### v1.0.0
- Initial release
- NearPay integration
- Transaction history
- GitHub Actions CI/CD
- Android APK builds
