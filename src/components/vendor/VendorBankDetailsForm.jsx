import React, { useState, useEffect } from "react";
import { CreditCard, Save } from "lucide-react";
import toast from "react-hot-toast";
import { NIGERIAN_BANKS } from "../../constants/nigerianBanks";
import { updateVendorBankDetails } from "../../utils/vendorWalletUtils";

export default function VendorBankDetailsForm({ vendorId, initialDetails, onSaved, compact = false }) {
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d = initialDetails || {};
    setAccountName(d.accountName || "");
    setAccountNumber(d.accountNumber || "");
    setBankCode(d.bankCode || NIGERIAN_BANKS.find((b) => b.name === d.bankName)?.code || "");
  }, [initialDetails]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!vendorId) return;

    const bank = NIGERIAN_BANKS.find((b) => b.code === bankCode);
    if (!bank) {
      toast.error("Please select your bank");
      return;
    }
    if (!accountName.trim() || accountNumber.trim().length < 10) {
      toast.error("Enter valid account name and 10-digit account number");
      return;
    }

    setSaving(true);
    try {
      await updateVendorBankDetails(vendorId, {
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        bankName: bank.name,
        bankCode: bank.code,
      });
      toast.success("Bank details saved");
      onSaved?.({
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        bankName: bank.name,
        bankCode: bank.code,
      });
    } catch (err) {
      toast.error(err.message || "Could not save bank details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className={compact ? "space-y-3" : "bg-white border border-gray-200 rounded-xl p-6 space-y-4"}>
      {!compact && (
        <div className="flex items-center gap-2 mb-2">
          <CreditCard size={20} className="text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">Payout Bank Account</h3>
        </div>
      )}
      {!compact && (
        <p className="text-sm text-gray-600">
          Required for withdrawals. Must match your registered business account.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
        <select
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          required
        >
          <option value="">Select bank…</option>
          {NIGERIAN_BANKS.map((bank) => (
            <option key={bank.code} value={bank.code}>
              {bank.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account name</label>
        <input
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="As shown on bank account"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account number</label>
        <input
          type="text"
          inputMode="numeric"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="10-digit NUBAN"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          required
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
      >
        <Save size={16} />
        {saving ? "Saving…" : "Save bank details"}
      </button>
    </form>
  );
}
