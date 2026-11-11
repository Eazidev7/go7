import React, { useRef } from 'react';
import { Camera, ImageIcon } from 'lucide-react';

/**
 * Mobile-friendly image picker: opens camera or photo gallery on vendor dashboards.
 */
export default function VendorImageCaptureInput({
  onImageSelected,
  disabled = false,
  compact = false,
  className = '',
}) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const handleChange = (event) => {
    const file = event.target.files?.[0];
    if (file && onImageSelected) {
      onImageSelected(file);
    }
    event.target.value = '';
  };

  const btnClass = compact
    ? 'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50'
    : 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
        className={btnClass}
      >
        <Camera size={compact ? 14 : 16} />
        {compact ? 'Camera' : 'Take Photo'}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => galleryRef.current?.click()}
        className={btnClass}
      >
        <ImageIcon size={compact ? 14 : 16} />
        {compact ? 'Gallery' : 'Choose Image'}
      </button>
    </div>
  );
}
