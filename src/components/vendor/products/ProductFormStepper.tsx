import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import {
  CheckIcon,
  XMarkIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  TagIcon,
  CubeIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useVendor } from '../../../contexts/VendorContext';
import { ProductService } from '../../../services/productService';
import { Product } from '../../../types/marketplace';

// Form data interfaces
interface ProductBasics {
  title: string;
  price: number; // in kobo
  description: string;
  category: string;
  available: boolean;
  stock: number;
}

interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

interface ProductVariant {
  id: string;
  sku: string;
  optionCombo: Record<string, string>;
  price: number; // price delta in kobo (can be negative)
  stock: number;
  available: boolean;
  imageUrl?: string;
}

interface ImageFile {
  id: string;
  file?: File;
  url: string;
  isExisting?: boolean;
  toDelete?: boolean;
}

interface FormData {
  basics: ProductBasics;
  images: ImageFile[];
  options: ProductOption[];
  variants: ProductVariant[];
  hasVariants: boolean;
}

interface ProductFormStepperProps {
  productId?: string; // For edit mode
  onSave?: (product: Product) => void;
  onCancel?: () => void;
}

const CATEGORIES = [
  'Food & Beverages',
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Health & Beauty',
  'Sports & Outdoors',
  'Books & Media',
  'Automotive',
  'Other'
];

const ProductFormStepper: React.FC<ProductFormStepperProps> = ({
  productId,
  onSave,
  onCancel
}) => {
  const navigate = useNavigate();
  const { vendorId } = useVendor();
  const [user] = useAuthState(getAuth());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    basics: {
      title: '',
      price: 0,
      description: '',
      category: '',
      available: true,
      stock: 0
    },
    images: [],
    options: [],
    variants: [],
    hasVariants: false
  });

  const isEditMode = Boolean(productId);

  // Steps configuration
  const steps = [
    { id: 1, name: 'Basics', icon: DocumentTextIcon },
    { id: 2, name: 'Images', icon: PhotoIcon },
    { id: 3, name: 'Variants', icon: TagIcon },
    { id: 4, name: 'Review', icon: EyeIcon }
  ];

  // Load product for edit mode
  useEffect(() => {
    if (isEditMode && productId && vendorId) {
      loadProduct();
    }
  }, [isEditMode, productId, vendorId]);

  const loadProduct = async () => {
    if (!productId || !vendorId) return;

    try {
      setLoading(true);
      const product = await ProductService.getProduct(vendorId, productId);
      
      if (product) {
        setFormData({
          basics: {
            title: product.title,
            price: product.price,
            description: product.desc || '',
            category: product.category,
            available: product.available,
            stock: product.stock || 0
          },
          images: product.imageUrl ? [{
            id: '1',
            url: product.imageUrl,
            isExisting: true
          }] : [],
          options: product.productOptions?.map((opt, idx) => ({
            id: `opt-${idx}`,
            name: opt.name,
            values: opt.values
          })) || [],
          variants: product.variants?.map((variant, idx) => ({
            id: `var-${idx}`,
            sku: variant.sku,
            optionCombo: variant.optionCombo,
            price: variant.price - product.price, // Calculate delta
            stock: variant.stock,
            available: variant.available
          })) || [],
          hasVariants: product.hasVariants || false
        });
      }
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Basics
        if (!formData.basics.title.trim()) {
          newErrors.title = 'Title is required';
        }
        if (formData.basics.price < 0) {
          newErrors.price = 'Price must be 0 or greater';
        }
        if (!formData.basics.category) {
          newErrors.category = 'Category is required';
        }
        break;

      case 2: // Images - optional validation
        // Images are optional, no validation needed
        break;

      case 3: // Variants
        if (formData.hasVariants) {
          if (formData.options.length === 0) {
            newErrors.options = 'At least one option is required for variants';
          }
          formData.options.forEach((option, idx) => {
            if (!option.name.trim()) {
              newErrors[`option-${idx}-name`] = 'Option name is required';
            }
            if (option.values.length === 0) {
              newErrors[`option-${idx}-values`] = 'At least one value is required';
            }
          });
        }
        break;

      case 4: // Review
        // Final validation - combine all previous validations
        const step1Valid = validateStep(1);
        const step3Valid = validateStep(3);
        return step1Valid && step3Valid;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step navigation
  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3 && formData.hasVariants) {
        generateVariants();
      }
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  // Form handlers
  const updateBasics = (field: keyof ProductBasics, value: any) => {
    setFormData(prev => ({
      ...prev,
      basics: { ...prev.basics, [field]: value }
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Image handling
  const handleImageUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newImages: ImageFile[] = fileArray.map(file => ({
      id: `img-${Date.now()}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file)
    }));

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  };

  const removeImage = (imageId: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map(img => 
        img.id === imageId 
          ? { ...img, toDelete: true }
          : img
      ).filter(img => !img.toDelete || img.isExisting)
    }));
  };

  const reorderImages = (dragIndex: number, hoverIndex: number) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      const dragImage = newImages[dragIndex];
      newImages.splice(dragIndex, 1);
      newImages.splice(hoverIndex, 0, dragImage);
      return { ...prev, images: newImages };
    });
  };

  // Options handling
  const addOption = () => {
    const newOption: ProductOption = {
      id: `opt-${Date.now()}`,
      name: '',
      values: ['']
    };
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, newOption]
    }));
  };

  const updateOption = (optionId: string, field: 'name', value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map(opt =>
        opt.id === optionId ? { ...opt, [field]: value } : opt
      )
    }));
  };

  const updateOptionValues = (optionId: string, values: string[]) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map(opt =>
        opt.id === optionId ? { ...opt, values } : opt
      )
    }));
  };

  const removeOption = (optionId: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter(opt => opt.id !== optionId)
    }));
  };

  // Generate variants from options
  const generateVariants = () => {
    if (!formData.hasVariants || formData.options.length === 0) {
      setFormData(prev => ({ ...prev, variants: [] }));
      return;
    }

    const combinations = generateCombinations(formData.options);
    const newVariants: ProductVariant[] = combinations.map((combo, idx) => {
      const sku = `${formData.basics.title.substring(0, 3).toUpperCase()}-${Object.values(combo).join('-').replace(/\s+/g, '')}-${idx + 1}`;
      
      // Check if variant already exists
      const existingVariant = formData.variants.find(v => 
        JSON.stringify(v.optionCombo) === JSON.stringify(combo)
      );

      return existingVariant || {
        id: `var-${Date.now()}-${idx}`,
        sku,
        optionCombo: combo,
        price: 0, // Price delta
        stock: 0,
        available: true
      };
    });

    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  const generateCombinations = (options: ProductOption[]): Record<string, string>[] => {
    if (options.length === 0) return [];
    
    const [firstOption, ...restOptions] = options;
    if (restOptions.length === 0) {
      return firstOption.values.map(value => ({ [firstOption.name]: value }));
    }
    
    const restCombinations = generateCombinations(restOptions);
    const combinations: Record<string, string>[] = [];
    
    firstOption.values.forEach(value => {
      restCombinations.forEach(restCombo => {
        combinations.push({ [firstOption.name]: value, ...restCombo });
      });
    });
    
    return combinations;
  };

  const updateVariant = (variantId: string, field: keyof ProductVariant, value: any) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map(variant =>
        variant.id === variantId ? { ...variant, [field]: value } : variant
      )
    }));
  };

  // Save product
  const saveProduct = async () => {
    if (!validateStep(4) || !vendorId || !user) return;

    try {
      setSaving(true);

      // Upload new images
      const newImageFiles = formData.images
        .filter(img => img.file && !img.toDelete)
        .map(img => img.file!);

      let imageUrls: string[] = [];
      if (newImageFiles.length > 0) {
        imageUrls = await ProductService.uploadImages(vendorId, newImageFiles);
      }

      // Keep existing images that aren't marked for deletion
      const existingImageUrls = formData.images
        .filter(img => img.isExisting && !img.toDelete)
        .map(img => img.url);

      const allImageUrls = [...existingImageUrls, ...imageUrls];
      const primaryImageUrl = allImageUrls[0] || '';

      // Prepare product data
      const productData: Omit<Product, 'id'> = {
        vendorId: vendorId,
        title: formData.basics.title,
        desc: formData.basics.description,
        price: formData.basics.price,
        imageUrl: primaryImageUrl,
        category: formData.basics.category,
        available: formData.basics.available,
        stock: formData.basics.stock,
        createdAt: new Date(),
        hasVariants: formData.hasVariants,
        productOptions: formData.hasVariants ? formData.options.map(opt => ({
          name: opt.name,
          values: opt.values
        })) : undefined,
        variants: formData.hasVariants ? formData.variants.map(variant => ({
          sku: variant.sku,
          optionCombo: variant.optionCombo,
          price: formData.basics.price + variant.price, // Add delta to base price
          stock: variant.stock,
          available: variant.available,
          key: variant.sku, // Add required key property
          name: Object.values(variant.optionCombo).join(' - ') // Generate name from options
        })) : undefined
      };

      let savedProduct: Product;
      
      if (isEditMode && productId) {
        // Update existing product
        savedProduct = await ProductService.updateProduct(
          vendorId,
          productId,
          productData,
          user.uid
        );
      } else {
        // Create new product
        savedProduct = await ProductService.createProduct(
          vendorId,
          productData,
          user.uid
        );
      }

      toast.success(`Product ${isEditMode ? 'updated' : 'created'} successfully!`);
      
      if (onSave) {
        onSave(savedProduct);
      } else {
        navigate('/vendor/products');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} product`);
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(files);
    }
  };

  const formatPrice = (priceInKobo: number) => {
    return `₦${(priceInKobo / 100).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {isEditMode ? 'Update your product information' : 'Create a new product for your store'}
            </p>
          </div>
          <button
            onClick={onCancel || (() => navigate('/vendor/products'))}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, stepIdx) => (
              <li key={step.id} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                <div className="flex items-center">
                  <button
                    onClick={() => goToStep(step.id)}
                    className={`relative w-8 h-8 flex items-center justify-center rounded-full border-2 ${
                      currentStep === step.id
                        ? 'border-blue-600 bg-blue-600'
                        : currentStep > step.id
                        ? 'border-green-600 bg-green-600'
                        : 'border-gray-300 bg-white'
                    } hover:border-blue-500 transition-colors`}
                  >
                    {currentStep > step.id ? (
                      <CheckIcon className="w-4 h-4 text-white" />
                    ) : (
                      <step.icon className={`w-4 h-4 ${
                        currentStep === step.id ? 'text-white' : 'text-gray-500'
                      }`} />
                    )}
                  </button>
                  <span className={`ml-3 text-sm font-medium ${
                    currentStep === step.id
                      ? 'text-blue-600'
                      : currentStep > step.id
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                </div>
                {stepIdx !== steps.length - 1 && (
                  <div className="absolute top-4 left-4 -ml-px mt-0.5 h-0.5 w-full bg-gray-300" />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="bg-white shadow rounded-lg p-6">
        {/* Step 1: Basics */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Product Basics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="md:col-span-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Product Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.basics.title}
                  onChange={(e) => updateBasics('title', e.target.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="Enter product title"
                />
                {errors.title && (
                  <p className="mt-1 text-sm" style={{ color: '#E1251B' }}>{errors.title}</p>
                )}
              </div>

              {/* Price */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price (₦) *
                </label>
                <input
                  type="number"
                  id="price"
                  min="0"
                  step="0.01"
                  value={formData.basics.price / 100}
                  onChange={(e) => updateBasics('price', Math.round(parseFloat(e.target.value || '0') * 100))}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.price ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="0.00"
                />
                {errors.price && (
                  <p className="mt-1 text-sm" style={{ color: '#E1251B' }}>{errors.price}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category *
                </label>
                <select
                  id="category"
                  value={formData.basics.category}
                  onChange={(e) => updateBasics('category', e.target.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.category ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm" style={{ color: '#E1251B' }}>{errors.category}</p>
                )}
              </div>

              {/* Stock */}
              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  id="stock"
                  min="0"
                  value={formData.basics.stock}
                  onChange={(e) => updateBasics('stock', parseInt(e.target.value || '0'))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="0"
                />
              </div>

              {/* Available */}
              <div className="flex items-center">
                <input
                  id="available"
                  type="checkbox"
                  checked={formData.basics.available}
                  onChange={(e) => updateBasics('available', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="available" className="ml-2 block text-sm text-gray-900">
                  Product is available for purchase
                </label>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={formData.basics.description}
                  onChange={(e) => updateBasics('description', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Describe your product..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Images */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Product Images</h3>
            <p className="text-sm text-gray-600">
              Add images to showcase your product. You can drag and drop files or click to browse.
            </p>

            {/* Image Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
            >
              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Upload images
                </button>
                <span className="text-gray-500"> or drag and drop</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF up to 10MB each
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Image Preview Grid */}
            {formData.images.filter(img => !img.toDelete).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Images ({formData.images.filter(img => !img.toDelete).length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {formData.images
                    .filter(img => !img.toDelete)
                    .map((image, index) => (
                    <div
                      key={image.id}
                      className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden"
                    >
                      <img
                        src={image.url}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {index === 0 && (
                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          Primary
                        </div>
                      )}
                      <button
                        onClick={() => removeImage(image.id)}
                        aria-label="Remove image"
                        className="absolute top-2 right-2 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white"
                        style={{ backgroundColor: '#E1251B' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C41E17'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E1251B'}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Variants/Options */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Product Variants</h3>
              <div className="flex items-center">
                <input
                  id="hasVariants"
                  type="checkbox"
                  checked={formData.hasVariants}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    hasVariants: e.target.checked,
                    options: e.target.checked ? prev.options : [],
                    variants: e.target.checked ? prev.variants : []
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="hasVariants" className="ml-2 block text-sm text-gray-900">
                  This product has variants (size, color, etc.)
                </label>
              </div>
            </div>

            {formData.hasVariants ? (
              <div className="space-y-6">
                {/* Options */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-gray-900">Product Options</h4>
                    <button
                      onClick={addOption}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Option
                    </button>
                  </div>

                  {formData.options.map((option, optionIndex) => (
                    <div key={option.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Option Name (e.g., Size, Color)
                          </label>
                          <input
                            type="text"
                            value={option.name}
                            onChange={(e) => updateOption(option.id, 'name', e.target.value)}
                            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                              errors[`option-${optionIndex}-name`] ? 'border-red-300' : ''
                            }`}
                            placeholder="Enter option name"
                          />
                          {errors[`option-${optionIndex}-name`] && (
                            <p className="mt-1 text-sm" style={{ color: '#E1251B' }}>{errors[`option-${optionIndex}-name`]}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeOption(option.id)}
                          aria-label={`Remove option: ${option.name || 'Untitled option'}`}
                          className="ml-4 p-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2"
                          style={{ color: '#E1251B' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#C41E17'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#E1251B'}
                          onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px rgba(225, 37, 27, 0.5)'}
                          onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Values (one per line)
                        </label>
                        <textarea
                          rows={3}
                          value={option.values.join('\n')}
                          onChange={(e) => updateOptionValues(
                            option.id,
                            e.target.value.split('\n').filter(v => v.trim())
                          )}
                          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                            errors[`option-${optionIndex}-values`] ? 'border-red-300' : ''
                          }`}
                          placeholder="Small&#10;Medium&#10;Large"
                        />
                        {errors[`option-${optionIndex}-values`] && (
                          <p className="mt-1 text-sm" style={{ color: '#E1251B' }}>{errors[`option-${optionIndex}-values`]}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {errors.options && (
                    <p className="text-sm" style={{ color: '#E1251B' }}>{errors.options}</p>
                  )}
                </div>

                {/* Generated Variants Preview */}
                {formData.options.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-900">
                        Generated Variants ({formData.variants.length})
                      </h4>
                      <button
                        onClick={generateVariants}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Regenerate Variants
                      </button>
                    </div>

                    {formData.variants.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Variant
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                SKU
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Price Delta (₦)
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Stock
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Available
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {formData.variants.map((variant) => (
                              <tr key={variant.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {Object.entries(variant.optionCombo).map(([key, value]) => (
                                    <span key={key} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-1">
                                      {key}: {value}
                                    </span>
                                  ))}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="text"
                                    value={variant.sku}
                                    onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                                    className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={variant.price / 100}
                                    onChange={(e) => updateVariant(variant.id, 'price', Math.round(parseFloat(e.target.value || '0') * 100))}
                                    className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="number"
                                    min="0"
                                    value={variant.stock}
                                    onChange={(e) => updateVariant(variant.id, 'stock', parseInt(e.target.value || '0'))}
                                    className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={variant.available}
                                    onChange={(e) => updateVariant(variant.id, 'available', e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">This product doesn't have variants</p>
                <p className="text-sm">Enable variants above to add different sizes, colors, or other options</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Review & Save</h3>
            <p className="text-sm text-gray-600">
              Review your product information before saving.
            </p>

            {/* Product Summary */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Product Information</h4>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Title</dt>
                      <dd className="text-sm text-gray-900">{formData.basics.title}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Price</dt>
                      <dd className="text-sm text-gray-900">{formatPrice(formData.basics.price)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Category</dt>
                      <dd className="text-sm text-gray-900">{formData.basics.category}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Stock</dt>
                      <dd className="text-sm text-gray-900">{formData.basics.stock}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="text-sm text-gray-900">
                        {formData.basics.available ? 'Available' : 'Unavailable'}
                      </dd>
                    </div>
                    {formData.basics.description && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                        <dd className="text-sm text-gray-900">{formData.basics.description}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Images */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">
                    Images ({formData.images.filter(img => !img.toDelete).length})
                  </h4>
                  {formData.images.filter(img => !img.toDelete).length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {formData.images
                        .filter(img => !img.toDelete)
                        .slice(0, 6)
                        .map((image, index) => (
                        <div key={image.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={image.url}
                            alt={`Product image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No images uploaded</p>
                  )}
                </div>
              </div>

              {/* Variants Summary */}
              {formData.hasVariants && formData.variants.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-4">
                    Variants ({formData.variants.length})
                  </h4>
                  <div className="space-y-2">
                    {formData.variants.slice(0, 5).map((variant) => (
                      <div key={variant.id} className="flex items-center justify-between text-sm">
                        <span>
                          {Object.entries(variant.optionCombo).map(([key, value]) => (
                            <span key={key} className="mr-2">
                              {key}: {value}
                            </span>
                          ))}
                        </span>
                        <span className="text-gray-500">
                          {formatPrice(formData.basics.price + variant.price)} • Stock: {variant.stock}
                        </span>
                      </div>
                    ))}
                    {formData.variants.length > 5 && (
                      <p className="text-sm text-gray-500">
                        +{formData.variants.length - 5} more variants
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Validation Errors */}
            {Object.keys(errors).length > 0 && (
              <div className="rounded-md p-4" style={{ backgroundColor: '#FFF4F3', borderColor: '#E1251B', borderWidth: '1px' }}>
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5" style={{ color: '#E1251B' }} />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium" style={{ color: '#121212' }}>
                      Please fix the following errors:
                    </h4>
                    <ul className="mt-2 text-sm list-disc list-inside" style={{ color: '#121212' }}>
                      {Object.entries(errors).map(([key, error]) => (
                        <li key={key}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Previous
          </button>

          <div className="flex space-x-3">
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Next
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={saveProduct}
                disabled={saving || Object.keys(errors).length > 0}
                className="inline-flex items-center px-6 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 mr-2" />
                    {isEditMode ? 'Update Product' : 'Create Product'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductFormStepper;