/**
 * 🔔 FCM Broadcast Admin Panel
 * Send push notifications to Go7 users
 */

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Helmet } from 'react-helmet-async';
import { Send, Bell, Users, AlertCircle, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const FCMBroadcastPage = () => {
  const [title, setTitle] = useState('Book a ride today with Go7');
  const [body, setBody] = useState('Fast delivery at your fingertips. Tap to book now.');
  const [clickAction, setClickAction] = useState('/');
  const [image, setImage] = useState('');
  const [segment, setSegment] = useState('all');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const templates = [
    {
      id: 'fuel',
      label: 'Fuel today',
      title: 'Idan mi, you no go buy fuel today?',
      body: 'Fuel dey available. Order now and we go deliver am sharp sharp.',
      clickAction: '/fuel',
      segment: 'all'
    },
    {
      id: 'food',
      label: 'Breakfast hot',
      title: 'Oga, you no go chop today?',
      body: 'Breakfast dey hot for Dallish. Order am now make belle full.',
      clickAction: '/food',
      segment: 'all'
    },
    {
      id: 'airtime',
      label: 'Airtime ₦95',
      title: 'Airtime is ₦95 on Go7 today o!',
      body: 'No waste time. Buy your airtime now before promo finish.',
      clickAction: '/bills',
      segment: 'all'
    }
  ];

  const functions = getFunctions();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    // History is optional and can be loaded from Firestore later
    setHistory([]);
  };

  const applyTemplate = (t) => {
    setTitle(t.title);
    setBody(t.body);
    setClickAction(t.clickAction);
    setSegment(t.segment);
    toast.success(`Template loaded: ${t.label}`);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const sendBroadcast = httpsCallable(functions, 'sendFCMBroadcast');
      const response = await sendBroadcast({
        title: title.trim(),
        body: body.trim(),
        clickAction: clickAction.trim() || '/',
        image: image.trim() || '',
        segment
      });

      setResult(response.data);

      if (response.data.sent > 0) {
        toast.success(`Broadcast sent to ${response.data.sent} users`);
      } else {
        toast.warning('No users with push tokens found');
      }
    } catch (error) {
      console.error('FCM broadcast error:', error);
      toast.error(error.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <Helmet>
        <title>Push Broadcast - Go7 Admin</title>
      </Helmet>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-7 h-7 text-red-600" />
          Push Notifications
        </h1>
        <p className="text-gray-500 mt-1">
          Send push notifications to users who have allowed notifications on their devices.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="mb-5">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Templates</h3>
          <div className="flex flex-wrap gap-2">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="px-3 py-1.5 text-sm rounded-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notification Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Book a ride today with Go7"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Your message here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Click Action (URL)</label>
            <input
              type="text"
              value={clickAction}
              onChange={(e) => setClickAction(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="/ or /book-delivery"
            />
            <p className="text-xs text-gray-500 mt-1">Where the user lands when they tap the notification.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
            <input
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="https://go7.ng/promo.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All users with tokens</option>
              <option value="customer">Customers only</option>
              <option value="vendor">Vendors only</option>
              <option value="rider">Riders only</option>
              <option value="admin">Admins only</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-white font-medium ${
              sending || !title.trim() || !body.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Broadcast
              </>
            )}
          </button>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md border">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Broadcast Result
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-white p-3 rounded border text-center">
                <div className="text-gray-500">Total Tokens</div>
                <div className="text-xl font-bold text-gray-900">{result.total || 0}</div>
              </div>
              <div className="bg-white p-3 rounded border text-center">
                <div className="text-gray-500">Sent</div>
                <div className="text-xl font-bold text-green-600">{result.sent || 0}</div>
              </div>
              <div className="bg-white p-3 rounded border text-center">
                <div className="text-gray-500">Failed</div>
                <div className="text-xl font-bold text-red-600">{result.failed || 0}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800">
          <p className="font-semibold mb-1">Before you send</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Users must have allowed notifications in their browser or app.</li>
            <li>Make sure <code className="bg-yellow-100 px-1 rounded">VITE_FIREBASE_VAPID_KEY</code> is set in your environment.</li>
            <li>Push notifications are free. Only SMS fallback costs money.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FCMBroadcastPage;
