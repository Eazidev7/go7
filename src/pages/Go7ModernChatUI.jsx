// GO7 MODERN CHAT UI - MOBILE INTERFACE
// =====================================
// Professional chat interface matching Go7's red/white theme
// Blends UberEats + WhatsApp aesthetics with smooth animations
// Device: iPhone 14 / Pixel 7 (390x844px)

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
    updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuthContext } from "../contexts/AuthContext";

export default function Go7ModernChatUI() {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthContext();

    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hi! I've picked up your package from the vendor 📦",
            sender: "rider",
            timestamp: new Date(Date.now() - 300000),
            read: true
        },
        {
            id: 2,
            text: "Great! How long until delivery?",
            sender: "customer",
            timestamp: new Date(Date.now() - 240000),
            read: true
        },
        {
            id: 3,
            text: "About 15 minutes. I'm on my way! 🚴‍♂️",
            sender: "rider",
            timestamp: new Date(Date.now() - 180000),
            read: true
        }
    ]);

    const [newMsg, setNewMsg] = useState("");
    const [riderTyping, setRiderTyping] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const chatRoomId = bookingId || "Go7-DEMO";

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Simulate rider typing (demo)
    useEffect(() => {
        const interval = setInterval(() => {
            setRiderTyping(prev => !prev);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    // Format timestamp
    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    };

    // Send message
    const sendMessage = async () => {
        if (newMsg.trim() === "") return;

        const newMessage = {
            id: messages.length + 1,
            text: newMsg.trim(),
            sender: "customer",
            timestamp: new Date(),
            read: false
        };

        setMessages(prev => [...prev, newMessage]);
        setNewMsg("");

        // Show toast notification
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);

        // Here you would add Firebase integration
        // await addDoc(collection(db, "chats", chatRoomId, "messages"), {...});
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const quickEmojis = ["😀", "👍", "❤️", "😂", "🙏", "🚀", "📦", "✅"];

    return (
        <>
            <Helmet>
                <title>Go7 Chat – Secure Delivery Messaging</title>
            </Helmet>

            {/* Toast Notification */}
            {showToast && (
                <div
                    style={{
                        position: "fixed",
                        top: "80px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "#10B981",
                        color: "#FFFFFF",
                        padding: "12px 24px",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        zIndex: 10000,
                        fontSize: "14px",
                        fontWeight: "600",
                        animation: "slideDown 0.3s ease-out"
                    }}
                >
                    ✓ Message sent
                </div>
            )}

            {/* Main Container */}
            <div
                style={{
                    height: "100vh",
                    maxWidth: "390px",
                    margin: "0 auto",
                    backgroundColor: "#F7F7F7",
                    display: "flex",
                    flexDirection: "column",
                    fontFamily: "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
                    position: "relative",
                    overflow: "hidden"
                }}
            >
                {/* Header Bar */}
                <div
                    style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 100,
                        backgroundColor: "#FFFFFF",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)"
                    }}
                >
                    {/* Top Header */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "16px 20px",
                            borderBottom: "1px solid #F0F0F0"
                        }}
                    >
                        {/* Back Arrow */}
                        <button
                            onClick={() => navigate(-1)}
                            style={{
                                background: "none",
                                border: "none",
                                fontSize: "24px",
                                cursor: "pointer",
                                padding: "0",
                                color: "#1F2937",
                                transition: "transform 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                            ←
                        </button>

                        {/* Center: Rider Info */}
                        <div style={{ flex: 1, textAlign: "center" }}>
                            <div
                                style={{
                                    fontSize: "16px",
                                    fontWeight: "600",
                                    color: "#1F2937",
                                    marginBottom: "2px"
                                }}
                            >
                                John – Go7 Rider 🚴‍♂️
                            </div>
                            <div
                                style={{
                                    fontSize: "12px",
                                    color: "#10B981",
                                    fontWeight: "500"
                                }}
                            >
                                ● Online
                            </div>
                        </div>

                        {/* Report Icon */}
                        <button
                            onClick={() => alert("Report feature coming soon")}
                            style={{
                                background: "none",
                                border: "none",
                                fontSize: "20px",
                                cursor: "pointer",
                                padding: "0",
                                transition: "transform 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                            ⚠️
                        </button>
                    </div>

                    {/* Info Strip */}
                    <div
                        style={{
                            backgroundColor: "#F9FAFB",
                            padding: "10px 20px",
                            fontSize: "12px",
                            color: "#6B7280",
                            textAlign: "center",
                            borderBottom: "1px solid #E5E7EB"
                        }}
                    >
                        You're chatting securely via Go7 💬 Keep it professional.
                    </div>
                </div>

                {/* Chat Area */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "20px",
                        background: "linear-gradient(135deg, #FEF2F2 0%, #F7F7F7 100%)",
                        position: "relative"
                    }}
                >
                    {messages.map((msg, index) => {
                        const isCustomer = msg.sender === "customer";
                        const isRider = msg.sender === "rider";

                        return (
                            <div
                                key={msg.id}
                                style={{
                                    display: "flex",
                                    justifyContent: isCustomer ? "flex-end" : "flex-start",
                                    marginBottom: "16px",
                                    animation: "fadeSlideIn 0.4s ease-out",
                                    animationDelay: `${index * 0.05}s`,
                                    opacity: 0,
                                    animationFillMode: "forwards"
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: "75%",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: isCustomer ? "flex-end" : "flex-start"
                                    }}
                                >
                                    {/* Message Bubble */}
                                    <div
                                        style={{
                                            backgroundColor: isCustomer ? "#E51937" : "#FFFFFF",
                                            color: isCustomer ? "#FFFFFF" : "#E51937",
                                            padding: "14px 18px",
                                            borderRadius: "15px",
                                            borderTopLeftRadius: isRider ? "4px" : "15px",
                                            borderTopRightRadius: isCustomer ? "4px" : "15px",
                                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                                            wordWrap: "break-word",
                                            fontSize: "15px",
                                            lineHeight: "1.5",
                                            fontWeight: "500",
                                            position: "relative"
                                        }}
                                    >
                                        {msg.text}
                                    </div>

                                    {/* Timestamp */}
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: "#9CA3AF",
                                            marginTop: "4px",
                                            fontWeight: "500"
                                        }}
                                    >
                                        {formatTime(msg.timestamp)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Typing Indicator */}
                    {riderTyping && (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-start",
                                marginBottom: "16px",
                                animation: "fadeIn 0.3s ease-in"
                            }}
                        >
                            <div
                                style={{
                                    backgroundColor: "#FFFFFF",
                                    padding: "12px 16px",
                                    borderRadius: "15px",
                                    borderTopLeftRadius: "4px",
                                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)"
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "14px",
                                        color: "#E51937",
                                        fontStyle: "italic",
                                        fontWeight: "500"
                                    }}
                                >
                                    Rider is typing
                                    <span className="typing-dots">
                                        <span style={{ animation: "typingDot 1.4s infinite" }}>.</span>
                                        <span style={{ animation: "typingDot 1.4s infinite 0.2s" }}>.</span>
                                        <span style={{ animation: "typingDot 1.4s infinite 0.4s" }}>.</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Footer Safety Notice */}
                <div
                    style={{
                        padding: "8px 20px",
                        backgroundColor: "#F9FAFB",
                        borderTop: "1px solid #E5E7EB",
                        fontSize: "11px",
                        color: "#6B7280",
                        textAlign: "center",
                        fontWeight: "500"
                    }}
                >
                    Go7 ensures your chats are safe & monitored 🔒
                </div>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                    <div
                        style={{
                            position: "absolute",
                            bottom: "140px",
                            left: "20px",
                            backgroundColor: "#FFFFFF",
                            borderRadius: "12px",
                            padding: "12px",
                            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                            maxWidth: "280px",
                            zIndex: 50,
                            animation: "scaleIn 0.2s ease-out"
                        }}
                    >
                        {quickEmojis.map((emoji, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setNewMsg(prev => prev + emoji);
                                    setShowEmojiPicker(false);
                                    inputRef.current?.focus();
                                }}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "24px",
                                    cursor: "pointer",
                                    padding: "8px",
                                    borderRadius: "8px",
                                    transition: "transform 0.2s, background-color 0.2s"
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = "scale(1.2)";
                                    e.currentTarget.style.backgroundColor = "#FEF2F2";
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = "scale(1)";
                                    e.currentTarget.style.backgroundColor = "transparent";
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input Bar */}
                <div
                    style={{
                        position: "sticky",
                        bottom: 0,
                        backgroundColor: "#FFFFFF",
                        padding: "16px 20px",
                        boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.08)",
                        zIndex: 100
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            backgroundColor: "#F7F7F7",
                            borderRadius: "24px",
                            padding: "8px 12px",
                            border: "2px solid #E5E7EB",
                            transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = "#E51937"}
                        onBlur={(e) => e.currentTarget.style.borderColor = "#E5E7EB"}
                    >
                        {/* Emoji Picker Button */}
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            style={{
                                background: "none",
                                border: "none",
                                fontSize: "22px",
                                cursor: "pointer",
                                padding: "4px",
                                transition: "transform 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                            😀
                        </button>

                        {/* Input Field */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={newMsg}
                            onChange={(e) => setNewMsg(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type a message..."
                            style={{
                                flex: 1,
                                border: "none",
                                outline: "none",
                                backgroundColor: "transparent",
                                fontSize: "15px",
                                fontWeight: "500",
                                color: "#1F2937"
                            }}
                        />

                        {/* Attachment Icon */}
                        <button
                            onClick={() => alert("Attachment feature coming soon")}
                            style={{
                                background: "none",
                                border: "none",
                                fontSize: "20px",
                                cursor: "pointer",
                                padding: "4px",
                                color: "#9CA3AF",
                                transition: "transform 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                            📎
                        </button>

                        {/* Voice Note Icon */}
                        <button
                            onClick={() => alert("Voice note feature coming soon")}
                            style={{
                                background: "none",
                                border: "none",
                                fontSize: "20px",
                                cursor: "pointer",
                                padding: "4px",
                                color: "#E51937",
                                transition: "transform 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                            🎤
                        </button>

                        {/* Send Button */}
                        <button
                            onClick={sendMessage}
                            disabled={newMsg.trim() === ""}
                            style={{
                                backgroundColor: newMsg.trim() === "" ? "#D1D5DB" : "#E51937",
                                border: "none",
                                borderRadius: "50%",
                                width: "40px",
                                height: "40px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: newMsg.trim() === "" ? "not-allowed" : "pointer",
                                fontSize: "20px",
                                transition: "all 0.2s",
                                boxShadow: newMsg.trim() === "" ? "none" : "0 2px 8px rgba(229, 25, 55, 0.3)"
                            }}
                            onMouseOver={(e) => {
                                if (newMsg.trim() !== "") {
                                    e.currentTarget.style.transform = "scale(1.1)";
                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(229, 25, 55, 0.4)";
                                }
                            }}
                            onMouseOut={(e) => {
                                if (newMsg.trim() !== "") {
                                    e.currentTarget.style.transform = "scale(1)";
                                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(229, 25, 55, 0.3)";
                                }
                            }}
                            onMouseDown={(e) => {
                                if (newMsg.trim() !== "") {
                                    e.currentTarget.style.animation = "pulse 0.3s ease-in-out";
                                }
                            }}
                        >
                            🚀
                        </button>
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.95); }
        }

        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.3; }
          30% { opacity: 1; }
        }

        .typing-dots span {
          display: inline-block;
        }

        /* Scrollbar styling */
        div::-webkit-scrollbar {
          width: 6px;
        }

        div::-webkit-scrollbar-track {
          background: transparent;
        }

        div::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 10px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>
        </>
    );
}
