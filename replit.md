# Cash Management NFC POS Android Application

### Overview
This project is an Android mobile point-of-sale (POS) application that leverages Capacitor and NearPay.io for seamless NFC contactless payment processing. Its primary purpose is to enable tap-to-pay transactions on Android devices, offering a modern UI, robust backend for transaction persistence, and automated build processes. The business vision is to provide an efficient and secure mobile payment solution, simplifying transactions for businesses and enhancing customer experience. The market potential lies in offering an accessible, low-cost POS system for small to medium-sized businesses.

### User Preferences
- **Communication**: Direct and technical explanations preferred
- **Code Style**: TypeScript with comprehensive error handling
- **API Integration**: Focus on authentic data sources, no mock data
- **Mobile Platform**: Native Android app with NFC payment capability

### System Architecture
The application is built around a Capacitor-based Android mobile platform, featuring a React + TypeScript frontend utilizing shadcn/ui components for a modern user experience. The backend is developed with Express.js in TypeScript, connecting to a PostgreSQL database managed via Drizzle ORM. NearPay SDK (v2.1.91) is integrated for NFC payment processing, specifically for SoftPOS (Tap to Pay on Phone) functionality.

**Key Architectural Decisions:**
- **UI/UX**: The frontend is designed for a streamlined payment flow: amount entry → pay button → NFC tap, using shadcn/ui for consistent and modern aesthetics.
- **Technical Implementation**:
    - **NFC Payment**: Utilizes NearPay SDK (v2.1.91) for direct NFC tap-to-pay. The native Android plugin (`NearPayPlugin.kt`) is written in Kotlin for optimal SDK compatibility, with a TypeScript bridge for frontend interaction.
    - **Backend**: A Node.js (Express.js) backend handles transaction persistence.
    - **Database**: PostgreSQL with Drizzle ORM for robust data management. The database schema is simplified to focus solely on transaction history.
    - **Build System**: Gradle for Android builds, integrated with GitHub Actions for CI/CD, enabling automated APK generation and releases.
    - **Package Naming**: The application uses the package name `app.cashmgmtnp.pos` to avoid conflicts with external SDKs.
- **System Design Choices**:
    - **Modularity**: Separation of concerns between frontend, backend, and native mobile components.
    - **Security**: SSL/TLS certificate management is implemented for secure communication with the NearPay API, including a script for automated keystore and PEM generation.
    - **Environments**: Support for distinct Sandbox and Production environments for testing and live payments.
    - **Minimum SDK**: Android 5.0 (API level 21) is the minimum supported SDK, with a target of Android 14 (API level 34).
    - **Authentication**: NearPay integration uses JWT token-based authentication.

### External Dependencies
- **Payment Gateway**: NearPay SDK (v2.1.91)
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **CI/CD**: GitHub Actions