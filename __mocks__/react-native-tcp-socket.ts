// Mock for react-native-tcp-socket
import { EventEmitter } from 'events';

// Create a mock socket that inherits from EventEmitter
class MockSocket extends EventEmitter {
    connect = jest.fn(() => this);
    write = jest.fn((data, callback) => {
        if (callback) callback();
        return true;
    });
    end = jest.fn();
    destroy = jest.fn();
    setEncoding = jest.fn();
    setKeepAlive = jest.fn();
    address = jest.fn(() => ({ port: 12345, address: '127.0.0.1', family: 'IPv4' }));
}

// Mock server class
class MockServer extends EventEmitter {
    listen = jest.fn();
    close = jest.fn();
}

// Main TcpSocket mock object
const TcpSocket = {
    createConnection: jest.fn(() => {
        return new MockSocket();
    }),
    createServer: jest.fn(() => {
        return new MockServer();
    }),
};

export default TcpSocket;
