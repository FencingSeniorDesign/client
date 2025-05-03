// __tests__/networking/NetworkErrors.test.ts
import {
    NetworkErrorCode,
    NetworkError,
    ConnectionError,
    AuthenticationError,
    MessageError,
    TimeoutError,
} from '../../src/networking/NetworkErrors';

describe('NetworkErrors', () => {
    describe('NetworkError', () => {
        it('creates with default parameters', () => {
            const error = new NetworkError('Test error');

            expect(error.message).toBe('Test error');
            expect(error.name).toBe('NetworkError');
            expect(error.code).toBe(NetworkErrorCode.UNKNOWN_ERROR);
            expect(error.isRecoverable).toBe(true);
            expect(error.originalError).toBeUndefined();
        });

        it('creates with custom parameters', () => {
            const originalError = new Error('Original error');
            const error = new NetworkError('Test error', NetworkErrorCode.CONNECTION_FAILED, false, originalError);

            expect(error.message).toBe('Test error');
            expect(error.name).toBe('NetworkError');
            expect(error.code).toBe(NetworkErrorCode.CONNECTION_FAILED);
            expect(error.isRecoverable).toBe(false);
            expect(error.originalError).toBe(originalError);
        });

        it('extends Error class', () => {
            const error = new NetworkError('Test error');

            expect(error instanceof Error).toBe(true);
        });

        // Testing if stack trace is captured might be challenging in a test environment
        // But we can at least check that the error has a stack property
        it('has stack trace property', () => {
            const error = new NetworkError('Test error');

            expect(error.stack).toBeDefined();
        });
    });

    describe('ConnectionError', () => {
        it('creates with default parameters', () => {
            const error = new ConnectionError('Connection failed');

            expect(error.message).toBe('Connection failed');
            expect(error.name).toBe('ConnectionError');
            expect(error.code).toBe(NetworkErrorCode.CONNECTION_FAILED);
            expect(error.isRecoverable).toBe(true);
            expect(error.originalError).toBeUndefined();
        });

        it('creates with custom parameters', () => {
            const originalError = new Error('Original error');
            const error = new ConnectionError(
                'Connection timed out',
                NetworkErrorCode.CONNECTION_TIMEOUT,
                false,
                originalError
            );

            expect(error.message).toBe('Connection timed out');
            expect(error.name).toBe('ConnectionError');
            expect(error.code).toBe(NetworkErrorCode.CONNECTION_TIMEOUT);
            expect(error.isRecoverable).toBe(false);
            expect(error.originalError).toBe(originalError);
        });

        it('extends NetworkError class', () => {
            const error = new ConnectionError('Connection failed');

            expect(error instanceof NetworkError).toBe(true);
            expect(error instanceof Error).toBe(true);
        });
    });

    describe('AuthenticationError', () => {
        it('creates with default parameters', () => {
            const error = new AuthenticationError('Authentication failed');

            expect(error.message).toBe('Authentication failed');
            expect(error.name).toBe('AuthenticationError');
            expect(error.code).toBe(NetworkErrorCode.AUTH_FAILED);
            expect(error.isRecoverable).toBe(false); // Auth errors are not recoverable by default
            expect(error.originalError).toBeUndefined();
        });

        it('creates with custom parameters', () => {
            const originalError = new Error('Original error');
            const error = new AuthenticationError(
                'Authentication failed',
                true, // Make it recoverable
                originalError
            );

            expect(error.message).toBe('Authentication failed');
            expect(error.name).toBe('AuthenticationError');
            expect(error.code).toBe(NetworkErrorCode.AUTH_FAILED);
            expect(error.isRecoverable).toBe(true);
            expect(error.originalError).toBe(originalError);
        });

        it('extends NetworkError class', () => {
            const error = new AuthenticationError('Authentication failed');

            expect(error instanceof NetworkError).toBe(true);
            expect(error instanceof Error).toBe(true);
        });
    });

    describe('MessageError', () => {
        it('creates with default parameters', () => {
            const error = new MessageError('Invalid message format');

            expect(error.message).toBe('Invalid message format');
            expect(error.name).toBe('MessageError');
            expect(error.code).toBe(NetworkErrorCode.INVALID_MESSAGE);
            expect(error.isRecoverable).toBe(true);
            expect(error.originalError).toBeUndefined();
        });

        it('creates with custom parameters', () => {
            const originalError = new Error('Original error');
            const error = new MessageError('Message timed out', NetworkErrorCode.MESSAGE_TIMEOUT, false, originalError);

            expect(error.message).toBe('Message timed out');
            expect(error.name).toBe('MessageError');
            expect(error.code).toBe(NetworkErrorCode.MESSAGE_TIMEOUT);
            expect(error.isRecoverable).toBe(false);
            expect(error.originalError).toBe(originalError);
        });

        it('extends NetworkError class', () => {
            const error = new MessageError('Invalid message format');

            expect(error instanceof NetworkError).toBe(true);
            expect(error instanceof Error).toBe(true);
        });
    });

    describe('TimeoutError', () => {
        it('creates with default parameters', () => {
            const error = new TimeoutError('Request timed out');

            expect(error.message).toBe('Request timed out');
            expect(error.name).toBe('TimeoutError');
            expect(error.code).toBe(NetworkErrorCode.MESSAGE_TIMEOUT);
            expect(error.isRecoverable).toBe(true);
            expect(error.originalError).toBeUndefined();
        });

        it('creates with custom parameters', () => {
            const error = new TimeoutError('Connection timed out', NetworkErrorCode.CONNECTION_TIMEOUT, false);

            expect(error.message).toBe('Connection timed out');
            expect(error.name).toBe('TimeoutError');
            expect(error.code).toBe(NetworkErrorCode.CONNECTION_TIMEOUT);
            expect(error.isRecoverable).toBe(false);
        });

        it('extends NetworkError class', () => {
            const error = new TimeoutError('Request timed out');

            expect(error instanceof NetworkError).toBe(true);
            expect(error instanceof Error).toBe(true);
        });
    });

    describe('NetworkErrorCode enum', () => {
        it('has all the expected error codes', () => {
            expect(NetworkErrorCode.CONNECTION_FAILED).toBe('CONNECTION_FAILED');
            expect(NetworkErrorCode.CONNECTION_TIMEOUT).toBe('CONNECTION_TIMEOUT');
            expect(NetworkErrorCode.CONNECTION_CLOSED).toBe('CONNECTION_CLOSED');
            expect(NetworkErrorCode.AUTH_FAILED).toBe('AUTH_FAILED');
            expect(NetworkErrorCode.INVALID_MESSAGE).toBe('INVALID_MESSAGE');
            expect(NetworkErrorCode.MESSAGE_TIMEOUT).toBe('MESSAGE_TIMEOUT');
            expect(NetworkErrorCode.SERVER_ERROR).toBe('SERVER_ERROR');
            expect(NetworkErrorCode.CLIENT_ERROR).toBe('CLIENT_ERROR');
            expect(NetworkErrorCode.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
        });
    });
});
