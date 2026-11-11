import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import toast from 'react-hot-toast';
import {
  PROMO_BANNER_SPECS,
  PROMO_BG_OPTIONS,
} from '../../constants/promoBanner';
import {
  fetchAllPromoBanners,
  createPromoBanner,
  updatePromoBanner,
  deletePromoBanner,
} from '../../services/promoBannerService';

const emptyForm = {
  discount: '',
  label: 'OFF',
  mainText: '',
  bgColor: 'bg-red-500',
  displayOrder: 0,
  isActive: true,
  linkUrl: '',
  imageUrl: '',
};

export default function PromoBannerPanel() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageMode, setImageMode] = useState('url'); // 'url' | 'upload'
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [editingStoragePath, setEditingStoragePath] = useState('');

  const loadPromos = async () => {
    setLoading(true);
    try {
      const data = await fetchAllPromoBanners();
      setPromos(data);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to load promo banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromos();
  }, []);

  useEffect(() => {
    if (imageMode === 'upload' && imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (imageMode === 'url' && form.imageUrl.trim()) {
      setPreviewUrl(form.imageUrl.trim());
      return undefined;
    }
    if (editingId && !imageFile && !form.imageUrl.trim()) {
      return undefined;
    }
    if (!editingId) setPreviewUrl('');
    return undefined;
  }, [imageFile, imageMode, form.imageUrl, editingId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setImageFile(null);
    setPreviewUrl('');
    setEditingStoragePath('');
    setImageMode('url');
  };

  const startEdit = (promo) => {
    const isExternal = promo.imageSource === 'external' || (!promo.imageStoragePath && promo.image);
    setEditingId(promo.id);
    setEditingStoragePath(promo.imageStoragePath || '');
    setForm({
      discount: promo.discount || '',
      label: promo.label || 'OFF',
      mainText: promo.mainText || '',
      bgColor: promo.bgColor || 'bg-red-500',
      displayOrder: promo.displayOrder ?? 0,
      isActive: promo.isActive !== false,
      linkUrl: promo.linkUrl || '',
      imageUrl: isExternal ? (promo.image || '') : '',
    });
    setImageFile(null);
    setPreviewUrl(promo.image || '');
    setImageMode(isExternal ? 'url' : 'upload');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.mainText.trim()) {
      toast.error('Headline text is required');
      return;
    }
    const hasFile = Boolean(imageFile);
    const hasUrl = Boolean(form.imageUrl.trim());
    if (!editingId && !hasFile && !hasUrl) {
      toast.error('Paste an external image URL or upload a file');
      return;
    }

    setSaving(true);
    try {
      const uid = getAuth().currentUser?.uid;
      if (!uid) {
        toast.error('You must be logged in as admin');
        return;
      }

      if (editingId) {
        const updates = {
          ...form,
          previousStoragePath: editingStoragePath,
        };
        if (imageMode === 'url' && hasUrl) {
          updates.imageUrl = form.imageUrl;
        } else if (imageMode === 'url' && !hasUrl) {
          delete updates.imageUrl;
        }
        await updatePromoBanner(
          editingId,
          updates,
          imageMode === 'upload' ? (imageFile || null) : null
        );
        toast.success('Promo banner updated in Firestore');
      } else {
        await createPromoBanner(
          form,
          imageMode === 'upload' ? imageFile : null,
          uid
        );
        toast.success('Promo banner saved to Firestore');
      }

      resetForm();
      await loadPromos();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to save promo banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (promo) => {
    if (!window.confirm(`Delete promo "${promo.mainText}"?`)) return;
    setSaving(true);
    try {
      await deletePromoBanner(promo.id, promo.imageStoragePath);
      toast.success('Promo banner deleted');
      if (editingId === promo.id) resetForm();
      await loadPromos();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to delete promo banner');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (promo) => {
    try {
      await updatePromoBanner(promo.id, { isActive: !promo.isActive });
      await loadPromos();
      toast.success(promo.isActive ? 'Promo hidden from homepage' : 'Promo published to homepage');
    } catch (err) {
      toast.error(err?.message || 'Failed to update promo');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Homepage Promo Banners</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage homepage carousel slides. Use an external image URL or upload to Firebase Storage — both save to Firestore and go live immediately.
        </p>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <h3 className="font-semibold text-red-900 mb-2">Banner size guide (mobile home)</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm text-red-900">
          <p><strong>Slide size:</strong> ~{PROMO_BANNER_SPECS.displayWidthPx}×{PROMO_BANNER_SPECS.displayHeightPx}px</p>
          <p><strong>Image layout:</strong> full rectangle (fills the whole slide)</p>
          <p><strong>Best upload / URL:</strong> {PROMO_BANNER_SPECS.recommendedImagePx}×{PROMO_BANNER_SPECS.recommendedHeightPx}px</p>
          <p><strong>Aspect:</strong> {PROMO_BANNER_SPECS.recommendedAspect}</p>
          <p><strong>Upload max:</strong> {PROMO_BANNER_SPECS.maxFileSizeMb}MB</p>
          <p><strong>Formats:</strong> {PROMO_BANNER_SPECS.acceptedExtensions}</p>
        </div>
        <p className="text-xs text-red-800 mt-3">
          Image fills the banner as a <strong>full rectangle</strong> (not a circle). Prefer wide landscape art; text sits on the left over a light dark gradient.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">{editingId ? 'Edit promo banner' : 'Add promo banner'}</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Discount text</span>
            <input
              type="text"
              value={form.discount}
              onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))}
              placeholder="30% or ₦500"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Label</span>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="OFF"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="text-gray-700 font-medium">Headline *</span>
          <input
            type="text"
            value={form.mainText}
            onChange={(e) => setForm((p) => ({ ...p, mainText: e.target.value }))}
            placeholder="Your Bukka Hut Faves!"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </label>

        <div className="grid md:grid-cols-3 gap-4">
          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Background</span>
            <select
              value={form.bgColor}
              onChange={(e) => setForm((p) => ({ ...p, bgColor: e.target.value }))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {PROMO_BG_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Display order</span>
            <input
              type="number"
              min="0"
              value={form.displayOrder}
              onChange={(e) => setForm((p) => ({ ...p, displayOrder: e.target.value }))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            <span className="text-gray-700 font-medium">Show on homepage</span>
          </label>
        </div>

        <label className="block text-sm">
          <span className="text-gray-700 font-medium">Link URL (optional)</span>
          <input
            type="url"
            value={form.linkUrl}
            onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))}
            placeholder="https://go7.ng/vendor/..."
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </label>

        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setImageMode('url'); setImageFile(null); }}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                imageMode === 'url' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300 text-gray-600'
              }`}
            >
              External image URL
            </button>
            <button
              type="button"
              onClick={() => setImageMode('upload')}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                imageMode === 'upload' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300 text-gray-600'
              }`}
            >
              Upload file
            </button>
          </div>

          {imageMode === 'url' ? (
            <label className="block text-sm">
              <span className="text-gray-700 font-medium">
                Image URL {editingId ? '(leave empty to keep current)' : '*'}
              </span>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                placeholder="https://example.com/promo.jpg"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <span className="text-xs text-gray-500 mt-1 block">
                Direct link to a JPG/PNG/WebP. Hotlink-protected hosts may still block — prefer a public CDN or Firebase upload.
              </span>
            </label>
          ) : (
            <label className="block text-sm">
              <span className="text-gray-700 font-medium">
                Promo image file {editingId ? '(leave empty to keep current)' : '*'}
              </span>
              <input
                type="file"
                accept={PROMO_BANNER_SPECS.acceptedExtensions}
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm"
              />
            </label>
          )}
        </div>

        {previewUrl && (
          <div className="rounded-xl overflow-hidden border border-gray-200 max-w-md">
            <div className={`relative ${form.bgColor} h-40 overflow-hidden`}>
              <div className="absolute inset-0">
                <img
                  src={previewUrl}
                  alt="Promo preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => toast.error('Preview failed — check the image URL is publicly reachable')}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/10" />
              </div>
              <div className="relative h-full flex items-center px-6">
                <div className="text-white z-10 max-w-[70%]">
                  <div className="text-white/90 text-sm mb-1">It&apos;s</div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-black">{form.discount || '—'}</span>
                    <span className="text-lg font-bold">{form.label || 'OFF'}</span>
                  </div>
                  <h4 className="text-lg font-bold">{form.mainText || 'Preview headline'}</h4>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : editingId ? 'Update banner' : 'Create banner'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Current promo banners ({promos.length})</h3>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-gray-500">Loading…</p>
        ) : promos.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No custom banners yet — the app uses default promos until you add one.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {promos.map((promo) => (
              <div key={promo.id} className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {promo.image ? (
                    <img
                      src={promo.image}
                      alt={promo.mainText}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{promo.mainText}</p>
                  <p className="text-sm text-gray-500">{promo.discount} {promo.label} · Order {promo.displayOrder ?? 0}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${promo.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {promo.isActive ? 'Live on homepage' : 'Hidden'}
                    </span>
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {promo.imageSource === 'external' || (!promo.imageStoragePath && promo.image) ? 'External URL' : 'Firebase Storage'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => startEdit(promo)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Edit</button>
                  <button type="button" onClick={() => handleToggleActive(promo)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    {promo.isActive ? 'Hide' : 'Publish'}
                  </button>
                  <button type="button" onClick={() => handleDelete(promo)} className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
