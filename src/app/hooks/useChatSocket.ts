// hooks/useChatSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface TypingUser {
    userId: string;
    name: string;
}

interface UseChatSocketOptions {
    roomId: string;
    userId: string;
    token?: string; // if you use auth
}

export function useChatSocket({ roomId, userId, token }: UseChatSocketOptions) {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Connect
    useEffect(() => {
        if (!roomId || !userId) return;

        const socket = io(`${process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000'}/ws`, {
            query: { userId },
            auth: token ? { token } : undefined,
            transports: ['websocket'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('chat:join_room', { roomId, userId });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        // Typing indicator from others
        socket.on('chat:user_typing', (data: {
            roomId: string;
            userId: string;
            name: string;
            isTyping: boolean;
        }) => {
            if (data.roomId !== roomId || data.userId === userId) return;

            setTypingUsers((prev) => {
                if (data.isTyping) {
                    if (prev.some((u) => u.userId === data.userId)) return prev;
                    return [...prev, { userId: data.userId, name: data.name }];
                }
                return prev.filter((u) => u.userId !== data.userId);
            });
        });

        // Optional: listen for new messages, user joined/left, etc.
        // socket.on('chat:new_message', ...)

        return () => {
            socket.emit('chat:leave_room', { roomId, userId });
            socket.disconnect();
        };
    }, [roomId, userId, token]);

    // Emit typing
    const emitTyping = useCallback(
        (isTyping: boolean) => {
            if (!socketRef.current?.connected) return;

            socketRef.current.emit('chat:typing', {
                roomId,
                userId,
                isTyping,
            });
        },
        [roomId, userId],
    );

    // Call this on every keystroke
    const handleTyping = useCallback(() => {
        emitTyping(true);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            emitTyping(false);
        }, 1500); // stop after 1.5s of inactivity
    }, [emitTyping]);

    // Call this when message is sent
    const stopTyping = useCallback(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        emitTyping(false);
    }, [emitTyping]);

    return {
        socket: socketRef.current,
        isConnected,
        typingUsers,
        handleTyping,
        stopTyping,
    };
}