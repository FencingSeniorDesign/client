import NfcManager, { NfcTech, Ndef, NfcError } from 'react-native-nfc-manager';
import { Platform } from 'react-native';
import { ScoringBoxType } from './types';

export interface NFCTagData {
    version: number;          // Format version for future compatibility
    boxType: ScoringBoxType;  // TournaFence, EnPointe, or Skewered
    deviceId: string;         // BLE device MAC address
    deviceName?: string;      // Human-readable name
    timestamp?: number;       // When tag was written
}

const CURRENT_VERSION = 1;
const TAG_TYPE_PREFIX = 'TOURNAFENCE_BOX:';

class NFCService {
    private initialized: boolean = false;

    async initNFC(): Promise<boolean> {
        if (this.initialized) {
            return true;
        }

        try {
            await NfcManager.start();
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize NFC:', error);
            return false;
        }
    }

    async isNFCSupported(): Promise<boolean> {
        try {
            const isSupported = await NfcManager.isSupported();
            if (!isSupported) {
                return false;
            }

            // Check if NFC is enabled
            const isEnabled = await NfcManager.isEnabled();
            return isEnabled;
        } catch (error) {
            console.error('Error checking NFC support:', error);
            return false;
        }
    }

    async readTag(): Promise<NFCTagData | null> {
        try {
            // Ensure NFC is initialized
            await this.initNFC();

            // Request NFC technology
            await NfcManager.requestTechnology(NfcTech.Ndef, {
                alertMessage: Platform.OS === 'ios' ? 'Hold your device near the NFC tag' : undefined,
            });

            // Get NDEF message
            const tag = await NfcManager.getTag();
            if (!tag || !tag.ndefMessage || tag.ndefMessage.length === 0) {
                throw new Error('No NDEF message found on tag');
            }

            // Parse NDEF records
            const ndefMessage = tag.ndefMessage;
            const textRecord = ndefMessage.find(record => {
                // Check if it's a text record
                return record.tnf === Ndef.TNF_WELL_KNOWN && 
                       record.type && 
                       String.fromCharCode(...record.type) === 'T';
            });

            if (!textRecord || !textRecord.payload) {
                throw new Error('No text record found on tag');
            }

            // Decode text record
            const payload = textRecord.payload;
            // Skip language code bytes (first byte is length, then language code)
            const languageCodeLength = payload[0];
            const textStartIndex = 1 + languageCodeLength;
            
            // Extract text content
            const textBytes = payload.slice(textStartIndex);
            const text = String.fromCharCode(...textBytes);

            // Check if it's our tag format
            if (!text.startsWith(TAG_TYPE_PREFIX)) {
                throw new Error('Invalid tag format - not a TournaFence box tag');
            }

            // Parse JSON data
            const jsonStr = text.substring(TAG_TYPE_PREFIX.length);
            const data: NFCTagData = JSON.parse(jsonStr);

            // Validate data
            if (!data.version || !data.boxType || !data.deviceId) {
                throw new Error('Invalid tag data - missing required fields');
            }

            return data;
        } catch (error) {
            console.error('Failed to read NFC tag:', error);
            throw error;
        } finally {
            // Always cancel NFC session
            try {
                await NfcManager.cancelTechnologyRequest();
            } catch (cancelError) {
                console.error('Failed to cancel NFC session:', cancelError);
            }
        }
    }

    async writeTag(data: NFCTagData): Promise<void> {
        try {
            // Ensure NFC is initialized
            await this.initNFC();

            // Add timestamp if not provided
            if (!data.timestamp) {
                data.timestamp = Date.now();
            }

            // Set version
            data.version = CURRENT_VERSION;

            // Create text content
            const textContent = TAG_TYPE_PREFIX + JSON.stringify(data);

            // Request NFC technology
            await NfcManager.requestTechnology(NfcTech.Ndef, {
                alertMessage: Platform.OS === 'ios' ? 'Hold your device near the NFC tag to write' : undefined,
            });

            // Create NDEF message with text record
            const bytes = Ndef.encodeMessage([
                Ndef.textRecord(textContent, 'en'),
            ]);

            if (!bytes) {
                throw new Error('Failed to encode NDEF message');
            }

            // Write to tag
            await NfcManager.ndefHandler.writeNdefMessage(bytes);

            console.log('Successfully wrote NFC tag:', data);
        } catch (error) {
            console.error('Failed to write NFC tag:', error);
            
            // Provide more specific error messages
            if (error instanceof Error) {
                if (error.message.includes('Tag is not ndef')) {
                    throw new Error('This NFC tag is not compatible. Please use an NTAG215 or similar NDEF-compatible tag.');
                } else if (error.message.includes('Tag capacity')) {
                    throw new Error('Not enough space on the NFC tag. Please use a tag with more storage capacity.');
                } else if (error.message.includes('read-only')) {
                    throw new Error('This NFC tag is read-only and cannot be written to.');
                }
            }
            
            throw error;
        } finally {
            // Always cancel NFC session
            try {
                await NfcManager.cancelTechnologyRequest();
            } catch (cancelError) {
                console.error('Failed to cancel NFC session:', cancelError);
            }
        }
    }

    async cancelNFCRequest(): Promise<void> {
        try {
            await NfcManager.cancelTechnologyRequest();
        } catch (error) {
            console.error('Failed to cancel NFC request:', error);
        }
    }
}

// Export singleton instance
export const nfcService = new NFCService();