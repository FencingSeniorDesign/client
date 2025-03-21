// src/networking/NetworkErrors.ts
// Defines custom error types for network-related issues

/**
 * Error codes for networking operations
 */
export enum NetworkErrorCode {
  // Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_CLOSED = 'CONNECTION_CLOSED',
  
  // Authentication errors
  AUTH_FAILED = 'AUTH_FAILED',
  
  // Message errors
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  MESSAGE_TIMEOUT = 'MESSAGE_TIMEOUT',
  
  // Server errors
  SERVER_ERROR = 'SERVER_ERROR',
  
  // Client errors
  CLIENT_ERROR = 'CLIENT_ERROR',
  
  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Base class for all network-related errors
 */
export class NetworkError extends Error {
  code: NetworkErrorCode;
  isRecoverable: boolean;
  originalError?: any;
  
  constructor(
    message: string, 
    code: NetworkErrorCode = NetworkErrorCode.UNKNOWN_ERROR, 
    isRecoverable = true,
    originalError?: any
  ) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
    this.isRecoverable = isRecoverable;
    this.originalError = originalError;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }
}

/**
 * Error thrown when a connection attempt fails
 */
export class ConnectionError extends NetworkError {
  constructor(
    message: string, 
    code: NetworkErrorCode = NetworkErrorCode.CONNECTION_FAILED,
    isRecoverable = true,
    originalError?: any
  ) {
    super(message, code, isRecoverable, originalError);
    this.name = 'ConnectionError';
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends NetworkError {
  constructor(
    message: string,
    isRecoverable = false,
    originalError?: any
  ) {
    super(message, NetworkErrorCode.AUTH_FAILED, isRecoverable, originalError);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when a message is invalid
 */
export class MessageError extends NetworkError {
  constructor(
    message: string,
    code: NetworkErrorCode = NetworkErrorCode.INVALID_MESSAGE,
    isRecoverable = true,
    originalError?: any
  ) {
    super(message, code, isRecoverable, originalError);
    this.name = 'MessageError';
  }
}

/**
 * Error thrown when a request times out
 */
export class TimeoutError extends NetworkError {
  constructor(
    message: string,
    code: NetworkErrorCode = NetworkErrorCode.MESSAGE_TIMEOUT,
    isRecoverable = true
  ) {
    super(message, code, isRecoverable);
    this.name = 'TimeoutError';
  }
}