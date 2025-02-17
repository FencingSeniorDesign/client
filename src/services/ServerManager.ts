// ServerManager.ts
import TcpSocket from 'react-native-tcp-socket';
import Zeroconf from 'react-native-zeroconf';

class ServerManager {
    private server: TcpSocket.Server | null = null;
    private zeroconf: Zeroconf = new Zeroconf();

    isServerRunning(): boolean {
        return this.server !== null;
    }

    startServer(
        onSuccess?: () => void,
        // Explicitly type the error parameter as 'unknown' (or 'any' or 'Error')
        onError?: (error: unknown) => void
    ) {
        if (this.server) {
            onSuccess?.();
            return;
        }

        const newServer = TcpSocket.createServer((socket) => {
            socket.on('data', (data) => {
                console.log('Received data:', data.toString());
                socket.write('Echo server: ' + data);
            });

            socket.on('error', (socketError) => {
                console.error('Socket error:', socketError);
            });

            socket.on('close', () => {
                console.log('Connection closed');
            });
        });

        newServer.listen({ port: 12345, host: '0.0.0.0' }, () => {
            console.log('Server started on port 12345');
            this.server = newServer;

            this.zeroconf.publishService(
                '_fencing-tournament._tcp',
                'tcp',
                'local.',
                'Fencing Tournament Server',
                12345,
                {}
            );

            this.zeroconf.on('published', (service) => {
                console.log('Service published:', service);
            });

            onSuccess?.();
        });

        // Use the typed 'error' here
        newServer.on('error', (error) => {
            console.error('Server error:', error);
            onError?.(error);
        });

        newServer.on('close', () => {
            console.log('Server closed');
            this.server = null;
        });
    }

    stopServer(onStopped?: () => void) {
        if (this.server) {
            this.server.close(() => {
                console.log('Server stopped');
                this.server = null;
                this.zeroconf.unpublishService('Fencing Tournament Server');
                onStopped?.();
            });
        }
    }
}

export default new ServerManager();
