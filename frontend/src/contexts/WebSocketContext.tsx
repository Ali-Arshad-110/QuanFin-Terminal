import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type WebSocketContextType = {
    isConnected: boolean;
    lastMessage: any;
    subscribe: (tokens: string[]) => void;
    unsubscribe: (tokens: string[]) => void;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<any>(null);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();

    const connect = () => {
        if (ws.current?.readyState === WebSocket.OPEN) return;

        // Connect to new Real-Time Endpoint
        const socket = new WebSocket('ws://127.0.0.1:8000/api/v1/market/ws/ticks');

        socket.onopen = () => {
            console.log('WS: Connected to Market Data Stream');
            setIsConnected(true);
        };

        socket.onclose = () => {
            console.log('WS: Disconnected');
            setIsConnected(false);
            // Reconnect logic
            reconnectTimeout.current = setTimeout(connect, 3000);
        };

        socket.onerror = (err) => {
            console.error('WS: Error', err);
            socket.close();
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Broadcast to consumers
                setLastMessage(data);
            } catch (e) {
                console.error('WS: Parse Error', e);
            }
        };

        ws.current = socket;
    };

    useEffect(() => {
        connect();
        return () => {
            ws.current?.close();
            clearTimeout(reconnectTimeout.current);
        };
    }, []);

    const subscribe = (tokens: string[]) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                action: "subscribe",
                tokens: tokens
            }));
        } else {
            console.warn("WS not open, cannot subscribe yet.");
        }
    };

    const unsubscribe = (tokens: string[]) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                action: "unsubscribe",
                tokens: tokens
            }));
        }
    };

    return (
        <WebSocketContext.Provider value={{ isConnected, lastMessage, subscribe, unsubscribe }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) throw new Error('useWebSocket must be used within WebSocketProvider');
    return context;
};
