// ==========================================================
// GO7 BOOKING ID GENERATOR – Unique & Professional
// ==========================================================

/**
 * Generates a unique Go7 booking ID
 * Format: Go7-XXXXXXX (7 random alphanumeric characters)
 * Example: Go7-91K38A7, Go7-B7X402Q
 */
export function generateBookingId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Go7-${code}`;
}

/**
 * Copy booking ID to clipboard with user feedback
 */
export async function copyBookingId(bookingId) {
    if (!bookingId) {
        console.error('No booking ID provided to copy');
        return false;
    }

    try {
        await navigator.clipboard.writeText(bookingId);
        return true;
    } catch (error) {
        console.error('Failed to copy booking ID:', error);
        
        // Fallback for older browsers
        try {
            const textArea = document.createElement('textarea');
            textArea.value = bookingId;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (fallbackError) {
            console.error('Fallback copy failed:', fallbackError);
            return false;
        }
    }
}

/**
 * Validate booking ID format
 */
export function isValidBookingId(bookingId) {
    const regex = /^Go7-[A-Z0-9]{7}$/;
    return regex.test(bookingId);
}

/**
 * Format booking ID for display (with styling)
 */
export function formatBookingIdDisplay(bookingId) {
    return `<span style="
    color: #E60023;
    font-weight: 700;
    font-size: 1.125rem;
    font-family: monospace;
    background: #FEE2E2;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    display: inline-block;
    margin: 0.5rem 0;
    cursor: pointer;
    transition: all 0.2s ease;
  " onclick="navigator.clipboard.writeText('${bookingId}'); this.innerHTML='✅ Copied!'; setTimeout(() => this.innerHTML='${bookingId}', 2000);" title="Click to copy">
    ${bookingId}
  </span>`;
}
