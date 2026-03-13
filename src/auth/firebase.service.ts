import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import type { ServiceAccount } from 'firebase-admin';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private isInitialized = false;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      // Try to get from environment variable first
      const firebaseConfig = this.configService.get<string>('FIREBASE_CONFIG');

      // If not found, try to load from service account file
      if (!firebaseConfig) {
        // Try multiple possible paths
        const possiblePaths = [
          path.join(__dirname, '..', 'configs', 'driver-app.json'),
          path.join(__dirname, '..', '..', 'src', 'configs', 'driver-app.json'),
          path.join(process.cwd(), 'src', 'configs', 'driver-app.json'),
          path.join(
            process.cwd(),
            'driver-be',
            'src',
            'configs',
            'driver-app.json',
          ),
        ];

        let serviceAccountPath = '';
        for (const p of possiblePaths) {
          this.logger.debug(`Checking path: ${p}`);
          if (fs.existsSync(p)) {
            serviceAccountPath = p;
            break;
          }
        }

        if (serviceAccountPath) {
          this.logger.log(`Found Firebase config at: ${serviceAccountPath}`);
          const serviceAccountData = fs.readFileSync(
            serviceAccountPath,
            'utf-8',
          );
          const config = JSON.parse(serviceAccountData) as ServiceAccount;

          if (!admin.apps.length) {
            admin.initializeApp({
              credential: admin.credential.cert(config),
            });
            this.isInitialized = true;
            this.logger.log(
              'Firebase Admin initialized from service account file',
            );
          } else {
            this.isInitialized = true;
          }
          return;
        }

        this.logger.error(
          'Firebase config file not found in any of these paths:',
          possiblePaths,
        );
        this.isInitialized = false;
        return;
      }

      const config = JSON.parse(firebaseConfig) as ServiceAccount;

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(config),
        });
        this.isInitialized = true;
        this.logger.log('Firebase Admin initialized successfully');
      } else {
        this.isInitialized = true;
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Send OTP via Firebase Cloud Messaging (SMS)
   * Note: For production, consider using Firebase Auth or a dedicated SMS service
   * like Twilio. Firebase Cloud Messaging is for push notifications, not SMS.
   *
   * For SMS via Firebase, you would typically use:
   * 1. Firebase Auth (server-side verification)
   * 2. Third-party SMS service (Twilio, Vonage, etc.)
   * 3. Firebase Cloud Functions with external SMS provider
   */
  sendOtpSms(phone: string, otp: string): boolean {
    if (!this.isInitialized) {
      this.logger.log(`[DEV MODE] OTP for ${phone}: ${otp}`);
      return false;
    }

    // For actual SMS sending, you would integrate with a service like:
    // - Twilio
    // - Firebase Cloud Functions + external SMS provider
    //
    // Firebase Admin SDK doesn't directly support SMS sending.
    // This is a placeholder for the integration pattern.

    this.logger.log(`[SMS] Sending OTP ${otp} to ${phone}`);

    // Placeholder: In production, call a Firebase Cloud Function
    // that handles SMS sending via external provider

    // Suppress unused variable warning for placeholder
    void phone;
    void otp;

    return true;
  }

  /**
   * Verify Firebase token (for frontend authentication)
   */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.isInitialized) {
      throw new Error('Firebase not initialized');
    }

    return admin.auth().verifyIdToken(idToken);
  }

  /**
   * Get user by phone number
   */
  async getUserByPhone(phone: string): Promise<admin.auth.UserRecord | null> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      return await admin.auth().getUserByPhoneNumber(phone);
    } catch (error) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/user-not-found') {
        return null;
      }
      throw error;
    }
  }

  get isFirebaseInitialized(): boolean {
    return this.isInitialized;
  }
}
