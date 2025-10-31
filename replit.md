# Cash Management NFC POS Android Application

## Project Overview
A mobile point-of-sale application built with Capacitor and NearPay.io for accepting NFC contactless payments on Android devices. Designed for seamless tap-to-pay transactions with comprehensive transaction tracking.

**Package Name**: `app.cashmgmtnp.pos`

### Core Features
- NFC payment processing via NearPay SDK
- Native Android application built with Capacitor
- TypeScript React frontend with modern UI
- Node.js backend for transaction persistence
- PostgreSQL database managed through Drizzle ORM
- GitHub Actions CI/CD for automated APK builds
- SSL/TLS certificate management for secure NearPay communication

## Architecture
- **Mobile Platform**: Android (Capacitor)
- **Frontend**: React + TypeScript with shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Payment Integration**: NearPay SDK (v2.1.91)
- **Build System**: Gradle + GitHub Actions

## Recent Changes (January 2025)

### Package Name Migration to app.cashmgmtnp.pos
- **Date**: January 31, 2025
- **Change**: Changed package name from io.nearpay.payment to app.cashmgmtnp.pos
- **Details**:
  - **Reason**: Avoid conflicts with NearPay's official domain namespace
  - **Updated Files**:
    - android/app/build.gradle (namespace and applicationId)
    - capacitor.config.ts (appId)
    - MainActivity.java moved to app/cashmgmtnp/pos/
    - NearPayPlugin.kt moved to app/cashmgmtnp/pos/
    - capacitor.plugins.json updated
    - strings.xml package references
    - scripts/generate-keystore.sh
  - **Cleaned**: Old io/nearpay/payment directory removed
  - **Certificates**: Old keystores removed, need regeneration with new package name

### NearPay SDK Stub Classes Created
- **Date**: January 31, 2025
- **Change**: Created complete stub SDK classes matching official NearPay SDK API structure
- **Details**:
  - **Purpose**: Enable APK compilation until real NearPay SDK access is granted
  - **Package**: `io.nearpay.sdk.*` matching official SDK structure
  - **Stub Classes Created**:
    - `Environments` - SANDBOX and PRODUCTION environment enums
    - `NearPay` - Main SDK class with Builder pattern
    - `AuthenticationData.Jwt` - JWT authentication sealed class
    - `TransactionData` - Transaction result data class
    - `SetupFailure` - Setup error types (GeneralError, AuthenticationFailed, InvalidApiKey, NetworkError, DeviceNotSupported)
    - `PurchaseFailure` - Purchase error types (GeneralError, AuthenticationFailed, InvalidAmount, UserCancelled)
    - `NetworkConfiguration` - Payment network enums (DEFAULT, VISA, MASTERCARD, AMEX, MADA)
    - `UIPosition` - UI positioning enums (CENTER, CENTER_BOTTOM, BOTTOM)
    - `SetupListener` - Interface for SDK initialization callbacks
    - `PurchaseListener` - Interface for payment transaction callbacks
  - **Location**: `android/app/src/main/java/io/nearpay/sdk/`
  - **Next Step**: Replace stubs with real SDK after NearPay approval

### Native Plugin Rewritten in Kotlin
- **Date**: January 29, 2025
- **Change**: Converted NearPayPlugin from Java to Kotlin for proper SDK compatibility
- **Details**:
  - **Reason**: NearPay SDK is written in Kotlin with Kotlin-specific APIs that don't work well in Java
  - **Fixed**: Compilation errors with AuthenticationData, PurchaseListener, SetupListener classes
  - **API Updates**: Using correct NearPay SDK v2.x API structure:
    - `AuthenticationData.Jwt(token)` for JWT authentication
    - `PurchaseListener` with `onPurchaseApproved()` and `onPurchaseFailed()` callbacks
    - `SetupListener` for SDK initialization
    - Amount conversion to minor units (14.55 SAR = 1455)
  - **Build Configuration**: 
    - Added Kotlin plugin (kotlin-android) and kotlin-stdlib dependency
    - Kotlin version: 1.9.22
    - Java compatibility: VERSION_17 (Kotlin 1.9.22 doesn't support JVM target 21)
    - GitHub Actions: Java 17 LTS
    - Force all subprojects (including Capacitor libs) to use Java 17 in root build.gradle
  - **File**: `android/app/src/main/java/app/cashmgmtnp/pos/NearPayPlugin.kt`

### Complete Platform Migration to NearPay
- **Date**: January 29, 2025
- **Change**: Migrated from Dejavoo terminal integration to NearPay mobile NFC payments
- **Details**:
  - **Removed**: All Dejavoo SPIN API integration code
  - **Removed**: iPOS recurring payment system and customer management
  - **Removed**: Terminal configuration and complex payment flows
  - **Added**: Capacitor Android platform with NearPay SDK integration
  - **Added**: Native Android plugin (NearPayPlugin.java) for NFC payments
  - **Added**: TypeScript bridge for NearPay functionality
  - **Simplified**: Database schema to basic transactions only
  - **Simplified**: UI to streamlined payment flow: amount → pay button → NFC tap
  - **Added**: GitHub Actions workflow for automated APK building
  - **Added**: SSL/TLS certificate generation and management system

### SSL/TLS Certificate Management System
- **Date**: January 29, 2025
- **Change**: Implemented comprehensive certificate management for NearPay integration
- **Details**:
  - **Certificate Script**: Created `scripts/generate-keystore.sh` for automated keystore and PEM generation
  - **Documentation**: Added `INFRA.md` with complete certificate management guide
  - **Security**: Updated `.gitignore` to protect keystores and certificates
  - **Separation**: Distinct sandbox and production certificate workflows
  - **Integration**: Certificates required for NearPay API authentication
  - **Process**: Generate keystore → Extract PEM → Send to NearPay → Configure app signing
  - **Note**: Script requires Java JDK, run locally (not in Replit web environment)

## Previous Changes (January 2025)

### iPOS Auth Token System Configuration
- **Date**: January 29, 2025
- **Change**: Implemented centralized iPOS Auth Token storage in terminal settings for automated recurring payments
- **Details**:
  - **System-Wide Token Storage**: Added iPOS Auth Token field to terminal configuration interface
  - **Automated Token Retrieval**: Customer charge functionality now automatically uses stored system token
  - **Eliminated Manual Entry**: Removed need to enter iPOS token for each recurring charge transaction
  - **Enhanced Validation**: Added proper validation to ensure token is configured before processing charges
  - **Secure Storage**: Token securely stored in both localStorage and database through terminal settings
  - **Streamlined Workflow**: "Charge Stored Card" button seamlessly uses saved authentication token
  - **Perfect Integration**: Full compatibility with existing customer profiles and recurring billing system

### Customer Management System Implementation  
- **Date**: January 29, 2025
- **Change**: Implemented comprehensive customer profile management system with stored payment tokens for SaaS recurring billing
- **Updated**: January 29, 2025 - Modified automatic token capture to ALWAYS update customer tokens from new transactions, even if customer already has a token
- **Verified**: January 29, 2025 - Token capture system working correctly, successfully updating customer tokens when customer is selected during transactions
- **Details**:
  - **Customer Database Schema**: Added `customerProfiles` table with complete customer information and iPOS token storage
  - **Storage Layer**: Implemented `DatabaseStorage` class using Drizzle ORM for customer CRUD operations
  - **API Endpoints**: Created complete customer management endpoints:
    - `GET /api/customers` - List all customer profiles
    - `GET /api/customers/:id` - Get specific customer profile
    - `POST /api/customers` - Create new customer profile
    - `PUT /api/customers/:id` - Update customer profile
    - `POST /api/customers/:id/token` - Save iPOS token to customer profile
    - `POST /api/customers/:id/charge` - Process recurring charge using stored token
    - `GET /api/customers/:id/transactions` - Get customer transaction history
  - **Customer Management UI**: Built comprehensive React interface with:
    - Customer list with search and filtering
    - Customer profile creation and editing
    - Token status and payment method display
    - Recurring charge processing with iPOS authentication
    - Transaction history for each customer
  - **Navigation Integration**: Added "Customers" button to main cash register interface
  - **Token-Based Charging**: Full integration with iPOS Transact API for automated recurring payments
  - **Perfect for**: SaaS subscriptions, membership billing, and automated recurring payment scenarios

### iPOS Token Capture Implementation
- **Date**: January 16, 2025
- **Change**: Added comprehensive iPOS token capture functionality for SaaS recurring payments using proper API flow
- **Details**:
  - **Two-Step Process**: SPIn API token capture → iPOS Transact API token reuse
  - Created `iPosTransactService` for proper iPOS Transact API integration
  - Updated `/api/payment/token-capture` to use SPIn API and extract iPOS tokens
  - Updated `/api/payment/token-reuse` to use iPOS Transact API for recurring payments
  - Added `TokenCapture` component with iPOS authentication token configuration
  - Implemented `TokenCaptureTest` page with comprehensive workflow documentation
  - Added navigation link from main cash register to token testing
  - **Authentication**: Requires both SPIn credentials (TPN/Auth Key) and iPOS Auth Token from portal
  - Perfect for SaaS membership, subscription, and automated recurring payment scenarios

### Terminal Configuration Updates
- **Date**: January 16, 2025
- **Change**: Removed terminal IP address requirement for Dejavoo SPIN API
- **Details**: 
  - Disabled IP input field in terminal configuration
  - Updated validation to only require Terminal ID (TPN) and API Key
  - Added clarification that SPIN API communicates through cloud service
  - Terminal IP is not needed for remote API communication

### Refund Implementation
- **Date**: January 16, 2025
- **Change**: Implemented comprehensive refund functionality
- **Details**:
  - Added `/api/payment/refund-direct` endpoint
  - Created RefundUsingAPI component for testing
  - Added `/refund-test` page for refund testing
  - Updated default terminal credentials to match test environment
  - Refunds use Payment/Return endpoint with proper payload structure

### Dejavoo Integration
- **Components**: 
  - DejavooApiService.ts: Core API communication
  - dejavooService.ts: Simplified wrapper functions
  - Terminal status checking and connection management
  - Support for sales, refunds, voids, and batch operations

## User Preferences
- **Communication**: Direct and technical explanations preferred
- **Code Style**: TypeScript with comprehensive error handling
- **API Integration**: Focus on authentic data sources, no mock data
- **Mobile Platform**: Native Android app with NFC payment capability

## Key Technical Details

### NearPay Integration
- **SDK Version**: v2.1.91
- **Package Name**: io.nearpay.payment
- **Authentication**: JWT token-based
- **Environments**: Sandbox (testing) and Production (live payments)
- **Payment Method**: NFC tap-to-pay contactless
- **SDK Location**: NearPayPlugin.java (Android native)
- **TypeScript Bridge**: client/src/lib/nearpay.ts

### SSL/TLS Certificates (REQUIRED)
- **Purpose**: Secure communication with NearPay API
- **Format**: PEM certificate extracted from Android keystore
- **Sandbox**: `certs/nearpay-sandbox.keystore` and `certs/nearpay-sandbox-cert.pem`
- **Production**: `certs/nearpay-production.keystore` and `certs/nearpay-production-cert.pem`
- **Registration**: Send PEM to [email protected]
- **Generation**: Run `./scripts/generate-keystore.sh [sandbox|production]`
- **Requirements**: Java JDK with keytool command
- **Security**: All cert files gitignored, never commit keystores

### Android Build Configuration
- **Platform**: Capacitor 7.x
- **Minimum SDK**: 21 (Android 5.0)
- **Target SDK**: 34 (Android 14)
- **Build System**: Gradle
- **Signing**: Configured with sandbox/production keystores
- **APK Output**: `android/app/build/outputs/apk/`

### Payment Processing Flow
1. User enters amount in UI
2. Taps "Pay with Card" button
3. NearPay SDK initializes with JWT token
4. Customer taps NFC card on device
5. Payment processed through NearPay
6. Transaction saved to database
7. Success/error status displayed

### Database Schema
- **Transactions**: Payment history with status, amount, card details
- Simplified schema: No customer profiles, subscriptions, or recurring payments
- Fields: id, amount, status, dateTime, transactionId, cardDetails, errorMessage

### CI/CD Pipeline
- **Platform**: GitHub Actions
- **Workflow**: `.github/workflows/build-apk.yml`
- **Triggers**: Push to main, pull requests, manual dispatch
- **Process**: Install deps → Build web → Sync Capacitor → Build APK → Upload artifact
- **Releases**: Automatic GitHub releases on main branch pushes
- **Artifacts**: APK available for 30 days

## Current Status
- ✅ Capacitor Android platform configured
- ✅ NearPay SDK integrated with native plugin
- ✅ Frontend simplified to basic payment flow
- ✅ Backend API endpoints for transactions
- ✅ Database schema simplified and working
- ✅ GitHub Actions workflow for APK builds
- ✅ Certificate generation system implemented
- ⚠️ Requires: Certificate registration with NearPay
- ⚠️ Requires: JWT authentication token from NearPay
- ⚠️ Requires: Java JDK for local certificate generation