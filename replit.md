# Cash Register Application with Dejavoo SPIN Integration

## Project Overview
A robust payment processing application integrating Dejavoo SPIN credit card terminal with advanced transaction management capabilities, designed for seamless and intelligent financial transactions.

### Core Features
- TypeScript React frontend with comprehensive UI interactions
- Node.js backend with Dejavoo SPIN API integration
- PostgreSQL database managed through Drizzle ORM
- Advanced transaction processing workflows
- Intelligent error validation and API request management
- Enhanced refund and terminal configuration functionality

## Architecture
- **Frontend**: React + TypeScript with shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Payment Integration**: Dejavoo SPIN REST API
- **State Management**: React Context API

## Recent Changes (January 2025)

### Customer Management System Implementation
- **Date**: January 29, 2025
- **Change**: Implemented comprehensive customer profile management system with stored payment tokens for SaaS recurring billing
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
- **Terminal Integration**: Cloud-based SPIN API preferred over direct IP communication

## Key Technical Details

### Terminal Configuration
- **Required Fields**: Terminal ID (TPN), API Key (Auth Key)
- **Optional Fields**: Terminal IP (not used for SPIN API)
- **API Endpoints**: Uses Dejavoo cloud service URLs
- **Test Credentials**: z11invtest69 (TPN), JZiRUusizc (Auth Key)

### Payment Processing
- **Sales**: Payment/Sale endpoint
- **Refunds**: Payment/Return endpoint (independent operations)
- **Voids**: Payment/Void endpoint
- **Status**: Payment/Status endpoint for connection testing

### Database Schema
- **Users**: Authentication and user management
- **Transactions**: Payment history and details
- **Settings**: Terminal configuration storage
- **Card Details**: Secure card information storage

## Current Status
- Application running successfully on port 5000
- Terminal configuration UI functional
- Refund functionality implemented and testable
- Database integration working with PostgreSQL
- Real-time transaction processing active