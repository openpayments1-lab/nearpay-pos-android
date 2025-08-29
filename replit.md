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

### iPOS Token Capture Implementation
- **Date**: January 16, 2025
- **Change**: Added comprehensive token capture functionality for SaaS recurring payments
- **Details**:
  - Created `TokenCapture` component for testing token capture and reuse
  - Added `/api/payment/token-capture` endpoint for initial token generation
  - Added `/api/payment/token-reuse` endpoint for subsequent payments using stored tokens
  - Implemented `TokenCaptureTest` page with comprehensive testing interface
  - Added navigation link to token capture testing from main cash register
  - Enhanced Dejavoo API service with `processSaleWithTokenCapture()` and `processTokenPayment()` methods
  - Perfect for SaaS membership, subscription, and recurring payment scenarios

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