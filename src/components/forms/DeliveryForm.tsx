import React, { useState, useEffect } from 'react';
import { deliverySchema, DeliveryFormData, validateField } from '../../lib/validation';
import Field from './Field';

interface DeliveryFormProps {
  selectedArea?: string;
  onFormChange?: (formData: Partial<DeliveryFormData>) => void;
  onSubmit?: (formData: DeliveryFormData) => void;
  onFieldFocus?: (fieldName: 'pickup' | 'dropoff' | null) => void;
  formData?: Partial<DeliveryFormData>;
}

const DeliveryForm: React.FC<DeliveryFormProps> = ({
  selectedArea,
  onFormChange,
  onSubmit,
  onFieldFocus,
  formData: externalFormData
}) => {
  const [formData, setFormData] = useState<Partial<DeliveryFormData>>({
    packageSize: 'small',
    deliveryPriority: 'standard',
    paymentMethod: 'pod_cash',
    pickupOption: 'now'
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof DeliveryFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof DeliveryFormData, boolean>>>({}); 

  // Update form data when external data changes
  useEffect(() => {
    if (externalFormData) {
      setFormData(prev => ({ ...prev, ...externalFormData }));
    }
  }, [externalFormData]);  // Prefill pickup address when area is selected
  useEffect(() => {
    if (selectedArea && !formData.pickupAddress) {
      setFormData(prev => ({
        ...prev,
        pickupAddress: selectedArea
      }));
    }
  }, [selectedArea, formData.pickupAddress]);

  // Notify parent of form changes
  useEffect(() => {
    onFormChange?.(formData);
  }, [formData, onFormChange]);

  const handleFieldChange = (name: keyof DeliveryFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate field on change if it was already touched
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error || undefined
      }));
    }
  };

  const handleFieldBlur = (name: keyof DeliveryFormData, value: any) => {
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error || undefined
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate entire form
    try {
      const validatedData = deliverySchema.parse(formData);
      setErrors({});
      onSubmit?.(validatedData);
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as any;
        const newErrors: Partial<Record<keyof DeliveryFormData, string>> = {};
        
        zodError.issues.forEach((issue: any) => {
          const fieldName = issue.path[0] as keyof DeliveryFormData;
          newErrors[fieldName] = issue.message;
        });
        
        setErrors(newErrors);
        
        // Mark all fields as touched to show errors
        const touchedFields: Partial<Record<keyof DeliveryFormData, boolean>> = {};
        Object.keys(formData).forEach(key => {
          touchedFields[key as keyof DeliveryFormData] = true;
        });
        setTouched(touchedFields);
      }
    }
  };

  const isFormValid = () => {
    try {
      deliverySchema.parse(formData);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Addresses Section */}
      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-wide text-gray-500 font-medium">Delivery Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Pickup Address"
            name="pickupAddress"
            type="text"
            placeholder="Enter pickup location"
            value={formData.pickupAddress}
            onChange={(e) => handleFieldChange('pickupAddress', e.target.value)}
            onBlur={(e) => handleFieldBlur('pickupAddress', e.target.value)}
            onFocus={() => onFieldFocus?.('pickup')}
            error={errors.pickupAddress}
            required
          />
          
          <Field
            label="Dropoff Address"
            name="dropoffAddress"
            type="text"
            placeholder="Enter delivery destination"
            value={formData.dropoffAddress}
            onChange={(e) => handleFieldChange('dropoffAddress', e.target.value)}
            onBlur={(e) => handleFieldBlur('dropoffAddress', e.target.value)}
            onFocus={() => onFieldFocus?.('dropoff')}
            error={errors.dropoffAddress}
            required
          />
        </div>
      </div>

      {/* Pickup Time Section */}
      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-wide text-gray-500 font-medium">Pickup Time</h3>
        
        <div className="space-y-4">
          <Field
            label="When should we pickup?"
            name="pickupOption"
            as="select"
            value={formData.pickupOption}
            onChange={(e) => handleFieldChange('pickupOption', e.target.value)}
            onBlur={(e) => handleFieldBlur('pickupOption', e.target.value)}
            error={errors.pickupOption}
            required
          >
            <option value="now">Now (within 30 minutes)</option>
            <option value="scheduled">Schedule for later</option>
          </Field>

          {formData.pickupOption === 'scheduled' && (
            <Field
              label="Scheduled Pickup Time"
              name="scheduledPickupTime"
              type="datetime-local"
              min={new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16)}
              value={formData.scheduledPickupTime}
              onChange={(e) => handleFieldChange('scheduledPickupTime', e.target.value)}
              onBlur={(e) => handleFieldBlur('scheduledPickupTime', e.target.value)}
              error={errors.scheduledPickupTime}
              required
              helpText="Pickup will be scheduled at least 30 minutes from now"
            />
          )}
        </div>
      </div>

      {/* Package & Priority Section */}
      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-wide text-gray-500 font-medium">Package Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Package Size"
            name="packageSize"
            as="select"
            value={formData.packageSize}
            onChange={(e) => handleFieldChange('packageSize', e.target.value)}
            onBlur={(e) => handleFieldBlur('packageSize', e.target.value)}
            error={errors.packageSize}
            required
          >
            <option value="small">Small (≤5kg)</option>
            <option value="medium">Medium (5-15kg)</option>
            <option value="large">Large (15-30kg)</option>
          </Field>
          
          <Field
            label="Delivery Priority"
            name="deliveryPriority"
            as="select"
            value={formData.deliveryPriority}
            onChange={(e) => handleFieldChange('deliveryPriority', e.target.value)}
            onBlur={(e) => handleFieldBlur('deliveryPriority', e.target.value)}
            error={errors.deliveryPriority}
            required
          >
            <option value="standard">Standard (2-3 hours)</option>
            <option value="express">Express (1-2 hours)</option>
            <option value="immediate">Immediate (&lt;60 minutes)</option>
          </Field>
        </div>

        <Field
          label="Package Description"
          name="description"
          as="textarea"
          placeholder="Optional description of package contents"
          maxLength={240}
          rows={3}
          value={formData.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          onBlur={(e) => handleFieldBlur('description', e.target.value)}
          error={errors.description}
        />
      </div>

      {/* Contact Information Section */}
      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-wide text-gray-500 font-medium">Contact Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Sender Name"
            name="senderName"
            type="text"
            placeholder="Full name of sender"
            value={formData.senderName}
            onChange={(e) => handleFieldChange('senderName', e.target.value)}
            onBlur={(e) => handleFieldBlur('senderName', e.target.value)}
            error={errors.senderName}
            required
          />
          
          <Field
            label="Sender Phone"
            name="senderPhone"
            type="tel"
            placeholder="08166205600"
            value={formData.senderPhone}
            onChange={(e) => handleFieldChange('senderPhone', e.target.value)}
            onBlur={(e) => handleFieldBlur('senderPhone', e.target.value)}
            error={errors.senderPhone}
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Recipient Name"
            name="recipientName"
            type="text"
            placeholder="Full name of recipient"
            value={formData.recipientName}
            onChange={(e) => handleFieldChange('recipientName', e.target.value)}
            onBlur={(e) => handleFieldBlur('recipientName', e.target.value)}
            error={errors.recipientName}
            required
          />
          
          <Field
            label="Recipient Phone"
            name="recipientPhone"
            type="tel"
            placeholder="08166205600"
            value={formData.recipientPhone}
            onChange={(e) => handleFieldChange('recipientPhone', e.target.value)}
            onBlur={(e) => handleFieldBlur('recipientPhone', e.target.value)}
            error={errors.recipientPhone}
            required
          />
        </div>
      </div>

      {/* Payment Method Section */}
      <div className="space-y-4">
        <h3 className="text-xs uppercase tracking-wide text-gray-500 font-medium">Payment Method</h3>
        
        <div className="space-y-3">
          {[
            { 
              value: 'online', 
              label: 'Online', 
              description: 'Pay with card or digital wallet (coming soon)',
              disabled: true
            },
            { 
              value: 'pod_cash', 
              label: 'PoD – Cash', 
              description: 'Pay cash to rider when package is delivered'
            },
            { 
              value: 'pod_transfer', 
              label: 'PoD – Transfer', 
              description: 'Transfer payment to rider upon delivery'
            }
          ].map((method) => (
            <label key={method.value} className={`
              flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors
              ${formData.paymentMethod === method.value 
                ? 'border-red-500 bg-red-50' 
                : 'border-gray-200 hover:border-gray-300'
              }
              ${method.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}>
              <input
                type="radio"
                name="paymentMethod"
                value={method.value}
                checked={formData.paymentMethod === method.value}
                onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}
                disabled={method.disabled}
                className="mt-1 text-red-600 focus:ring-red-500"
              />
              <div>
                <div className="font-medium text-gray-900">{method.label}</div>
                <div className="text-sm text-gray-600">{method.description}</div>
              </div>
            </label>
          ))}
        </div>
        {errors.paymentMethod && (
          <p className="text-sm text-red-600">{errors.paymentMethod}</p>
        )}
      </div>

      {/* Terms and Conditions */}
      <div className="space-y-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="agreeToTerms"
            checked={formData.agreeToTerms || false}
            onChange={(e) => handleFieldChange('agreeToTerms', e.target.checked)}
            onBlur={(e) => handleFieldBlur('agreeToTerms', e.target.checked)}
            className="mt-1 text-red-600 focus:ring-red-500 rounded"
            required
          />
          <div className="text-sm">
            <span className="text-gray-700">I agree to the </span>
            <a href="/terms" className="text-red-600 hover:text-red-700 underline">
              Terms and Conditions
            </a>
            <span className="text-gray-700"> and </span>
            <a href="/privacy" className="text-red-600 hover:text-red-700 underline">
              Privacy Policy
            </a>
            <span className="text-red-500 ml-1">*</span>
          </div>
        </label>
        {errors.agreeToTerms && (
          <p className="text-sm text-red-600">{errors.agreeToTerms}</p>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="submit"
          disabled={!isFormValid()}
          className={`
            flex-1 px-6 py-3 rounded-lg font-semibold transition-colors
            ${isFormValid()
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Book Delivery
        </button>
        
        <button
          type="button"
          className="flex-1 px-6 py-3 border border-red-600 text-red-700 rounded-lg font-semibold hover:bg-red-50 transition-colors"
        >
          Check Delivery Rates
        </button>
      </div>
    </form>
  );
};

export default DeliveryForm;
