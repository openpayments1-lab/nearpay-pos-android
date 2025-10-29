# NearPay SDK Stub Classes

⚠️ **These are temporary stub classes for building the APK**

## Current Status
These stub classes allow the APK to compile without the real NearPay SDK.

## To Integrate Real SDK

Once you receive the NearPay SDK from NearPay:

1. **Delete this entire directory:**
   ```bash
   rm -rf android/app/src/main/java/io/nearpay/sdk/
   ```

2. **Uncomment the dependency in `android/app/build.gradle`:**
   ```gradle
   implementation "io.nearpay:nearpay-sdk-store:2.1.91"
   ```
   Or follow NearPay's integration instructions if they provide the SDK differently.

3. **Rebuild the APK:**
   ```bash
   cd android && ./gradlew assembleRelease
   ```

## Note
The stub implementation logs warnings and doesn't actually process payments. It's only for testing the build process.
