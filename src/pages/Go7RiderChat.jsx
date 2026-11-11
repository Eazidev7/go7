// GO7 RIDER CHAT (SYNCED WITH CUSTOMER CHAT)
// ------------------------------------------
// 1. Uses same Firestore database as customer chat.
// 2. Auto-connects to same booking chat ID.
// 3. Sends messages from "rider" and listens for "customer" in real time.
// 4. Clean Go7 red theme styling.
// 5. MESSAGE MODERATION: Blocks phone numbers, emails, URLs to prevent users from bypassing Go7 platform.

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    setDoc,
    updateDoc,
    getDoc
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuthContext } from "../contexts/AuthContext";

// MESSAGE SANITIZATION FUNCTION
// Blocks phone numbers (10-11 digits, +234 format), emails, URLs
function sanitizeMessage(text) {
    const patterns = [
        { regex: /\b\d{10,11}\b/g, replacement: "[blocked]" },
        { regex: /\+?234\d{9,10}/gi, replacement: "[blocked]" },
        { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: "[blocked]" },
        { regex: /https?:\/\/\S+/gi, replacement: "[blocked]" },
        { regex: /www\.\S+/gi, replacement: "[blocked]" }
    ];

    let cleanText = text;
    let wasBlocked = false;

    patterns.forEach(({ regex, replacement }) => {
        if (regex.test(cleanText)) {
            wasBlocked = true;
            cleanText = cleanText.replace(regex, replacement);
        }
    });

    return { cleanText, wasBlocked };
}

// PHONE NUMBER MASKING FOR DISPLAY
// Masks phone numbers in displayed messages (e.g., +234 123 456 789 → +234 * * 789)
function maskPhoneNumber(text) {
    return text
        .replace(/\+234\s?\d{3}\s?\d{3}\s?(\d{3})/g, "+234 * * $1")
        .replace(/\b0\d{2}\s?\d{3}\s?(\d{4})/g, "0** *** $1");
}

export default function Go7RiderChat() {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthContext();

    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [customerTyping, setCustomerTyping] = useState(false);
    const [customerInfo, setCustomerInfo] = useState({
        name: "Customer",
        status: "online",
        avatar: "🧍‍♂️"
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deliveryStatus, setDeliveryStatus] = useState(null);
    const [showBlockedWarning, setShowBlockedWarning] = useState(false);

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const chatRoomId = bookingId || "Go7-NTX72PK"; // Use bookingId from URL or default

    // Listen for delivery status to disable chat after delivery
    useEffect(() => {
        if (!chatRoomId) return;

        const chatRoomRef = doc(db, "chats", chatRoomId);
        const unsubscribe = onSnapshot(chatRoomRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setDeliveryStatus(data?.deliveryStatus || null);
            }
        });

        return () => unsubscribe();
    }, [chatRoomId]);

    // Initialize chat room
    useEffect(() => {
        const initChatRoom = async () => {
            try {
                const chatRoomRef = doc(db, "chats", chatRoomId);
                await setDoc(chatRoomRef, {
                    bookingId: chatRoomId,
                    createdAt: serverTimestamp(),
                    lastMessage: null,
                    participants: {
                        customer: "customer_pending",
                        rider: user?.uid || "rider_user"
                    }
                }, { merge: true });
                setIsLoading(false);
            } catch (err) {
                console.error("Error initializing chat room:", err);
                setError("Failed to initialize chat. Please try again.");
                setIsLoading(false);
            }
        };

        initChatRoom();
    }, [chatRoomId, user]);

    // Listen to messages
    useEffect(() => {
        if (isLoading) return;

        const q = query(
            collection(db, "chats", chatRoomId, "messages"),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const msgs = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setMessages(msgs);
                setError(null);
            },
            (err) => {
                console.error("Error fetching messages:", err);
                setError("Failed to load messages. Please check your connection.");
            }
        );

        return () => unsubscribe();
    }, [chatRoomId, isLoading]);

    // Listen to typing status
    useEffect(() => {
        if (isLoading) return;

        const typingRef = doc(db, "chats", chatRoomId, "status", "typing");
        const unsubscribe = onSnapshot(typingRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const currentUser = user?.uid || "rider_user";
                setCustomerTyping(data.customer && data.typingUser !== currentUser);
            }
        });

        return () => unsubscribe();
    }, [chatRoomId, user, isLoading]);

    // Send message
    // Send message with sanitization
    const sendMessage = async () => {
        if (newMsg.trim() === "" || isLoading) return;

        // Check if delivery is completed
        if (deliveryStatus === "delivered" || deliveryStatus === "completed") {
            setError("Chat is closed. Delivery has been completed.");
            return;
        }

        try {
            // Sanitize message
            const { cleanText, wasBlocked } = sanitizeMessage(newMsg.trim());

            // Show warning if content was blocked
            if (wasBlocked) {
                setShowBlockedWarning(true);
                setTimeout(() => setShowBlockedWarning(false), 5000);

                // Log flagged message to reports collection
                await addDoc(collection(db, "reports"), {
                    bookingId: chatRoomId,
                    sender: "rider",
                    senderName: user?.displayName || "Rider",
                    senderId: user?.uid || "rider_user",
                    originalMessage: newMsg.trim(),
                    sanitizedMessage: cleanText,
                    timestamp: serverTimestamp(),
                    type: "blocked_content"
                });
            }

            // Add sanitized message to Firestore
            await addDoc(collection(db, "chats", chatRoomId, "messages"), {
                text: cleanText,
                sender: "rider",
                senderName: user?.displayName || "Rider",
                senderId: user?.uid || "rider_user",
                timestamp: serverTimestamp(),
                read: false,
                wasModerated: wasBlocked
            });

            // Update last message in chat room
            const chatRoomRef = doc(db, "chats", chatRoomId);
            await updateDoc(chatRoomRef, {
                lastMessage: cleanText,
                lastMessageTime: serverTimestamp(),
                lastMessageSender: "rider"
            });

            setNewMsg("");
            setIsTyping(false);

            // Clear typing status
            const typingRef = doc(db, "chats", chatRoomId, "status", "typing");
            await updateDoc(typingRef, {
                rider: false,
                typingUser: null
            });
        } catch (err) {
            console.error("Error sending message:", err);
            setError("Failed to send message. Please try again.");
        }
    };

    // Handle typing
    const handleTyping = async (e) => {
        const value = e.target.value;
        setNewMsg(value);

        if (!isTyping && value.length > 0) {
            setIsTyping(true);
            try {
                const typingRef = doc(db, "chats", chatRoomId, "status", "typing");
                await setDoc(typingRef, {
                    rider: true,
                    typingUser: user?.uid || "rider_user",
                    timestamp: serverTimestamp()
                }, { merge: true });
            } catch (err) {
                console.error("Error updating typing status:", err);
            }
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to clear typing status
        typingTimeoutRef.current = setTimeout(async () => {
            setIsTyping(false);
            try {
                const typingRef = doc(db, "chats", chatRoomId, "status", "typing");
                await updateDoc(typingRef, {
                    rider: false,
                    typingUser: null
                });
            } catch (err) {
                console.error("Error clearing typing status:", err);
            }
        }, 2000);
    };

    // Handle Enter key
    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Format timestamp
    const formatTime = (timestamp) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading) {
        return (
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                backgroundColor: "#fafafa"
            }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
                    <p style={{ color: "#666" }}>Loading chat...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Chat with Customer - Go7 Rider</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            </Helmet>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100vh",
                    backgroundColor: "#fff",
                    maxWidth: "100%",
                    margin: "0 auto",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        backgroundColor: "#E30000",
                        color: "#fff",
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        boxShadow: "0 2px 8px rgba(227, 0, 0, 0.2)",
                        position: "sticky",
                        top: 0,
                        zIndex: 100
                    }}
                >
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            background: "rgba(255, 255, 255, 0.2)",
                            border: "none",
                            borderRadius: "50%",
                            width: "40px",
                            height: "40px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "white",
                            fontSize: "20px",
                            transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}
                    >
                        ←
                    </button>

                    <div
                        style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            background: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "24px",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
                        }}
                    >
                        {customerInfo.avatar}
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "600", fontSize: "18px" }}>
                            Chat with Customer 🧍‍♂️
                        </div>
                        <div style={{ fontSize: "13px", opacity: 0.9 }}>
                            {customerTyping ? "Typing..." : `Order: ${chatRoomId}`}
                        </div>
                    </div>

                    <div
                        style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: "#22c55e",
                            boxShadow: "0 0 8px rgba(34, 197, 94, 0.6)"
                        }}
                        title="Online"
                    />
                </div>

                {/* Error Banner */}
                {error && (
                    <div
                        style={{
                            backgroundColor: "#fee2e2",
                            color: "#991b1b",
                            padding: "12px 20px",
                            textAlign: "center",
                            fontSize: "14px",
                            borderBottom: "1px solid #fca5a5"
                        }}
                    >
                        ⚠️ {error}
                    </div>
                )}

                {/* Messages Container */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "20px",
                        backgroundColor: "#f9fafb",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                >
                    {messages.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
                            <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
                            <p style={{ fontSize: "16px", marginBottom: "8px" }}>No messages yet</p>
                            <p style={{ fontSize: "14px" }}>Start the conversation with your customer!</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isRider = msg.sender === "rider";
                            const showTimestamp = index === 0 ||
                                (index > 0 && messages[index - 1].sender !== msg.sender);

                            return (
                                <div
                                    key={msg.id || index}
                                    style={{
                                        display: "flex",
                                        justifyContent: isRider ? "flex-end" : "flex-start",
                                        marginBottom: "12px",
                                        animation: "slideIn 0.3s ease-out"
                                    }}
                                >
                                    <div
                                        style={{
                                            maxWidth: "75%",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: isRider ? "flex-end" : "flex-start"
                                        }}
                                    >
                                        {showTimestamp && (
                                            <div
                                                style={{
                                                    fontSize: "11px",
                                                    color: "#9ca3af",
                                                    marginBottom: "4px",
                                                    paddingLeft: isRider ? "0" : "12px",
                                                    paddingRight: isRider ? "12px" : "0"
                                                }}
                                            >
                                                {msg.senderName || (msg.sender === "rider" ? "You" : "Customer")} • {formatTime(msg.timestamp)}
                                            </div>
                                        )}
                                        <div
                                            style={{
                                                backgroundColor: isRider ? "#E30000" : "#ffffff",
                                                color: isRider ? "#ffffff" : "#1f2937",
                                                padding: "12px 16px",
                                                borderRadius: isRider ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                                                wordWrap: "break-word",
                                                fontSize: "15px",
                                                lineHeight: "1.5"
                                            }}
                                        >
                                            {maskPhoneNumber(msg.text)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Typing Indicator */}
                    {customerTyping && (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-start",
                                marginBottom: "12px"
                            }}
                        >
                            <div
                                style={{
                                    backgroundColor: "#ffffff",
                                    padding: "12px 16px",
                                    borderRadius: "20px 20px 20px 4px",
                                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                                    display: "flex",
                                    gap: "4px"
                                }}
                            >
                                <span className="typing-dot" style={{ animation: "typing 1.4s infinite" }}>●</span>
                                <span className="typing-dot" style={{ animation: "typing 1.4s infinite 0.2s" }}>●</span>
                                <span className="typing-dot" style={{ animation: "typing 1.4s infinite 0.4s" }}>●</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Safety Banner */}
                {showBlockedWarning && (
                    <div
                        style={{
                            backgroundColor: "#FEF3C7",
                            border: "1px solid #FCD34D",
                            color: "#92400E",
                            padding: "12px 20px",
                            fontSize: "14px",
                            fontWeight: "500",
                            animation: "slideDown 0.3s ease-out"
                        }}
                    >
                        ⚠️ Your message contained blocked content (phone number, email, or URL). Please keep conversations professional.
                    </div>
                )}

                <div
                    style={{
                        backgroundColor: "#F3F4F6",
                        padding: "10px 20px",
                        borderTop: "1px solid #e5e7eb",
                        fontSize: "13px",
                        color: "#6B7280",
                        textAlign: "center"
                    }}
                >
                    💡 Keep conversations professional. Avoid sharing personal contact info.
                </div>

                {/* Chat Closed Banner for Completed Deliveries */}
                {(deliveryStatus === "delivered" || deliveryStatus === "completed") && (
                    <div
                        style={{
                            backgroundColor: "#D1FAE5",
                            border: "1px solid #6EE7B7",
                            color: "#065F46",
                            padding: "16px 20px",
                            fontSize: "15px",
                            fontWeight: "600",
                            textAlign: "center"
                        }}
                    >
                        ✅ Chat closed — Delivery has been completed
                    </div>
                )}

                {/* Input Box */}
                <div
                    style={{
                        display: "flex",
                        padding: "16px 20px",
                        borderTop: "1px solid #e5e7eb",
                        backgroundColor: "#ffffff",
                        gap: "12px",
                        alignItems: "flex-end",
                        boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.05)"
                    }}
                >
                    <input
                        type="text"
                        value={newMsg}
                        onChange={handleTyping}
                        onKeyPress={handleKeyPress}
                        placeholder={
                            deliveryStatus === "delivered" || deliveryStatus === "completed"
                                ? "Chat is closed"
                                : "Type your message..."
                        }
                        disabled={deliveryStatus === "delivered" || deliveryStatus === "completed"}
                        style={{
                            flex: 1,
                            border: "2px solid #e5e7eb",
                            borderRadius: "24px",
                            padding: "12px 20px",
                            outline: "none",
                            fontSize: "15px",
                            transition: "border-color 0.2s",
                            backgroundColor: (deliveryStatus === "delivered" || deliveryStatus === "completed") ? "#E5E7EB" : "#f9fafb",
                            cursor: (deliveryStatus === "delivered" || deliveryStatus === "completed") ? "not-allowed" : "text",
                            opacity: (deliveryStatus === "delivered" || deliveryStatus === "completed") ? 0.6 : 1
                        }}
                        onFocus={(e) => {
                            if (deliveryStatus !== "delivered" && deliveryStatus !== "completed") {
                                e.target.style.borderColor = "#E30000";
                            }
                        }}
                        onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={newMsg.trim() === "" || deliveryStatus === "delivered" || deliveryStatus === "completed"}
                        style={{
                            backgroundColor: newMsg.trim() === "" ? "#9ca3af" : "#E30000",
                            color: "#fff",
                            border: "none",
                            borderRadius: "24px",
                            padding: "12px 24px",
                            cursor: newMsg.trim() === "" ? "not-allowed" : "pointer",
                            fontWeight: "600",
                            fontSize: "15px",
                            transition: "all 0.2s",
                            boxShadow: newMsg.trim() === "" ? "none" : "0 2px 8px rgba(227, 0, 0, 0.3)",
                            minWidth: "80px"
                        }}
                        onMouseOver={(e) => {
                            if (newMsg.trim() !== "") {
                                e.currentTarget.style.backgroundColor = "#c50000";
                                e.currentTarget.style.transform = "scale(1.02)";
                            }
                        }}
                        onMouseOut={(e) => {
                            if (newMsg.trim() !== "") {
                                e.currentTarget.style.backgroundColor = "#E30000";
                                e.currentTarget.style.transform = "scale(1)";
                            }
                        }}
                    >
                        Send
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes typing {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .typing-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #9ca3af;
        }
      `}</style>
        </>
    );
}
