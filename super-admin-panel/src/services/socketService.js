import { io } from "socket.io-client";
import { API_URL } from "@/utils/constants";

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.listeners = new Map();
    this.pendingEvents = [];
  }

  /**
   * Initialize socket connection with authentication
   */
  connect(token) {
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return this.socket;
    }

    console.log("Connecting to Socket.IO server...");

    this.socket = io(API_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      // Mobile/Background optimization
      upgrade: true,
      rememberUpgrade: true,
      // Heartbeat to maintain connection
      pingInterval: 25000,
      pingTimeout: 60000,
    });

    this.setupEventHandlers();
    return this.socket;
  }

  /**
   * Setup core socket event handlers
   */
  setupEventHandlers() {
    // Connection events
    this.socket.on("connect", () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      console.log("✓ Socket connected:", this.socket.id);

      // Send any pending events
      this.flushPendingEvents();

      // Restore all registered listeners
      this.restoreListeners();
    });

    this.socket.on("disconnect", (reason) => {
      this.connected = false;
      console.log("✗ Socket disconnected:", reason);

      // Auto-reconnect for certain disconnect reasons
      if (reason === "io server disconnect") {
        // Server disconnected us, reconnect manually
        this.socket.connect();
      }
    });

    this.socket.on("connect_error", (error) => {
      this.reconnectAttempts++;
      console.error(`Socket connection error (attempt ${this.reconnectAttempts}):`, error.message);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("Max reconnection attempts reached");
        this.disconnect();
      }
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(`↻ Socket reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`↻ Attempting to reconnect (${attemptNumber}/${this.maxReconnectAttempts})...`);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("Failed to reconnect to socket server");
    });

    // Error handling
    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    // Handle page visibility for mobile/background optimization
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && !this.connected) {
          console.log("Page visible - reconnecting socket...");
          this.socket.connect();
        }
      });
    }
  }

  /**
   * Restore all registered listeners after reconnection
   */
  restoreListeners() {
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback);
    });
  }

  /**
   * Send pending events that were queued during disconnection
   */
  flushPendingEvents() {
    if (this.pendingEvents.length === 0) return;

    console.log(`Sending ${this.pendingEvents.length} pending events`);
    this.pendingEvents.forEach(({ event, data }) => {
      this.emit(event, data);
    });
    this.pendingEvents = [];
  }

  /**
   * Join a chat room
   */
  joinChat(chatId) {
    this.emit("join:chat", chatId);
    console.log(`Joined chat room: ${chatId}`);
  }

  /**
   * Leave a chat room
   */
  leaveChat(chatId) {
    this.emit("leave:chat", chatId);
    console.log(`Left chat room: ${chatId}`);
  }

  /**
   * Emit typing start event
   */
  emitTypingStart(chatId, userName) {
    this.emit("typing:start", { chatId, userName });
  }

  /**
   * Emit typing stop event
   */
  emitTypingStop(chatId) {
    this.emit("typing:stop", { chatId });
  }

  /**
   * Emit message read event
   */
  emitMessageRead(chatId, messageIds) {
    this.emit("message:read", { chatId, messageIds });
  }

  /**
   * Listen for new messages
   */
  onNewMessage(callback) {
    this.on("chat:newMessage", callback);
  }

  /**
   * Listen for chat updates
   */
  onChatUpdated(callback) {
    this.on("chat:updated", callback);
  }

  /**
   * Listen for chat deletion
   */
  onChatDeleted(callback) {
    this.on("chat:deleted", callback);
  }

  /**
   * Listen for new chat creation
   */
  onChatCreated(callback) {
    this.on("chat:created", callback);
  }

  /**
   * Listen for typing start
   */
  onTypingStart(callback) {
    this.on("typing:start", callback);
  }

  /**
   * Listen for typing stop
   */
  onTypingStop(callback) {
    this.on("typing:stop", callback);
  }

  /**
   * Listen for message read receipts
   */
  onMessageRead(callback) {
    this.on("message:read", callback);
  }

  /**
   * Listen for user presence changes
   */
  onUserPresence(callback) {
    this.on("user:presence", callback);
  }

  /**
   * Listen for notifications
   */
  onNotification(callback) {
    this.on("notification:created", callback);
  }

  /**
   * Generic event listener with auto-registration
   */
  on(event, callback) {
    if (!this.socket) {
      console.warn(`Cannot listen to ${event}: socket not initialized`);
      return;
    }

    // Store listener for reconnection
    this.listeners.set(event, callback);

    this.socket.on(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.socket) return;

    this.listeners.delete(event);
    this.socket.off(event, callback);
  }

  /**
   * Emit event with offline queue support
   */
  emit(event, data) {
    if (!this.socket) {
      console.warn(`Cannot emit ${event}: socket not initialized`);
      return;
    }

    if (!this.connected) {
      // Queue event for later if disconnected
      console.log(`Queueing event ${event} (disconnected)`);
      this.pendingEvents.push({ event, data });
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (!this.socket) return;

    console.log("Disconnecting socket...");
    this.socket.disconnect();
    this.socket = null;
    this.connected = false;
    this.listeners.clear();
    this.pendingEvents = [];
  }

  /**
   * Check if socket is connected
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  /**
   * Get socket instance
   */
  getSocket() {
    return this.socket;
  }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;
