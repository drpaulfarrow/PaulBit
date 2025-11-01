import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../utils/apiConfig';

const SOCKET_URL = getSocketUrl();

export function useNegotiationSocket(publisherId) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    // WebSocket disabled - no negotiation-agent service available
    if (!publisherId || !SOCKET_URL) {
      // Silently disable - this is expected in production
      return;
    }

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      
      // Subscribe to publisher's negotiations
      socket.emit('subscribe:publisher', publisherId);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    // Listen for negotiation events
    socket.on('negotiation:initiated', (data) => {
      console.log('Negotiation initiated:', data);
      setLastEvent({ type: 'initiated', data, timestamp: Date.now() });
    });

    socket.on('negotiation:round', (data) => {
      console.log('Negotiation round:', data);
      setLastEvent({ type: 'round', data, timestamp: Date.now() });
    });

    socket.on('negotiation:accepted', (data) => {
      console.log('Negotiation accepted:', data);
      setLastEvent({ type: 'accepted', data, timestamp: Date.now() });
    });

    socket.on('negotiation:rejected', (data) => {
      console.log('Negotiation rejected:', data);
      setLastEvent({ type: 'rejected', data, timestamp: Date.now() });
    });

    // Cleanup
    return () => {
      if (socket) {
        socket.emit('unsubscribe:publisher', publisherId);
        socket.disconnect();
      }
    };
  }, [publisherId]);

  return {
    isConnected,
    lastEvent,
    socket: socketRef.current
  };
}

export default useNegotiationSocket;
