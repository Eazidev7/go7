import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useVendor } from '../../../contexts/VendorContext';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { ProductService } from '../../../services/productService';
import { CategoryService } from '../../../services/categoryService';
import { Product } from '../../../types/marketplace';
import { VendorCategory } from '../../../types/models';

interface ImportFromUrlProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (product: Product) => void;
}

interface ScrapedData {
  title?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  [key: string]: any; // For additional scraped fields
}

interface FieldMapping {
  title: string;
  desc: string;
  price: string;
  imageUrl: string;
  category: string;
}

const ImportFromUrl: React.FC<ImportFromUrlProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const { vendorId } = useVendor();
  const [user] = useAuthState(getAuth());
  
  // State management
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [step, setStep] = useState<'input' | 'mapping' | 'preview'>('input');
  
  // Field mapping state
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({
    title: '',
    desc: '',
    price: '',
    imageUrl: '',
    category: ''
  });
  
  // Preview product state
  const [previewProduct, setPreviewProduct] = useState<Partial<Product>>({
    title: '',
    desc: '',
    price: 0,
    imageUrl: '',
    category: '',
    available: true,
    stock: 0
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      if (!vendorId) return;
      try {
        const fetchedCategories = await CategoryService.getVendorCategories(vendorId);
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    if (isOpen && vendorId) {
      fetchCategories();
    }
  }, [isOpen, vendorId]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setScrapedData(null);
      setStep('input');
      setFieldMapping({
        title: '',
        desc: '',
        price: '',
        imageUrl: '',
        category: ''
      });
      setPreviewProduct({
        title: '',
        desc: '',
        price: 0,
        imageUrl: '',
        category: '',
        available: true,
        stock: 0
      });
      setErrors({});
    }
  }, [isOpen]);

  // Placeholder scraper function - in a real implementation, this would call an API
  const scrapeUrl = async (targetUrl: string): Promise<ScrapedData> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock scraper response based on URL patterns
    if (targetUrl.includes('amazon.com') || targetUrl.includes('ebay.com')) {
      return {
        title: 'Sample Product Title from Amazon/eBay',
        description: 'This is a sample product description that would be scraped from the product page. It includes details about the product features and specifications.',
        price: 29.99,
        imageUrl: 'https://via.placeholder.com/400x400/007bff/ffffff?text=Product+Image',
        category: 'Electronics',
        brand: 'Sample Brand',
        sku: 'SKU-12345',
        availability: 'In Stock'
      };
    } else if (targetUrl.includes('shopify.com') || targetUrl.includes('woocommerce')) {
      return {
        product_title: 'Shopify Product Example',
        product_description: 'Sample description from Shopify store with rich text formatting and product details.',
        product_price: 45.00,
        featured_image: 'https://via.placeholder.com/400x400/28a745/ffffff?text=Shopify+Product',
        product_type: 'Clothing',
        vendor: 'Sample Vendor',
        tags: 'fashion, clothing, style'
      };
    } else {
      // Generic scraper response
      return {
        title: 'Generic Product Title',
        description: 'Generic product description scraped from the provided URL.',
        price: 19.99,
        image: 'https://via.placeholder.com/400x400/6c757d/ffffff?text=Generic+Product',
        type: 'Other'
      };
    }
  };

  const handleFetchData = async () => {
    if (!url.trim()) {
      setErrors({ url: 'Please enter a valid URL' });
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setErrors({ url: 'Please enter a valid URL' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const data = await scrapeUrl(url);
      setScrapedData(data);
      
      // Auto-detect field mappings based on common field names
      const detectedMapping: FieldMapping = {
        title: '',
        desc: '',
        price: '',
        imageUrl: '',
        category: ''
      };

      Object.keys(data).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('title') || lowerKey.includes('name')) {
          detectedMapping.title = key;
        } else if (lowerKey.includes('desc') || lowerKey.includes('description')) {
          detectedMapping.desc = key;
        } else if (lowerKey.includes('price') || lowerKey.includes('cost')) {
          detectedMapping.price = key;
        } else if (lowerKey.includes('image') || lowerKey.includes('photo') || lowerKey.includes('picture')) {
          detectedMapping.imageUrl = key;
        } else if (lowerKey.includes('category') || lowerKey.includes('type')) {
          detectedMapping.category = key;
        }
      });

      setFieldMapping(detectedMapping);
      setStep('mapping');
      toast.success('Data fetched successfully! Please map the fields.');
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data from URL. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFieldMapping = (field: keyof FieldMapping, value: string) => {
    setFieldMapping(prev => ({ ...prev, [field]: value }));
  };

  const generatePreview = () => {
    if (!scrapedData) return;

    const preview: Partial<Product> = {
      title: fieldMapping.title ? String(scrapedData[fieldMapping.title] || '') : '',
      desc: fieldMapping.desc ? String(scrapedData[fieldMapping.desc] || '') : '',
      price: fieldMapping.price ? parseFloat(String(scrapedData[fieldMapping.price] || 0)) : 0,
      imageUrl: fieldMapping.imageUrl ? String(scrapedData[fieldMapping.imageUrl] || '') : '',
      category: fieldMapping.category ? String(scrapedData[fieldMapping.category] || '') : '',
      available: true,
      stock: 0
    };

    setPreviewProduct(preview);
    setStep('preview');
  };

  const updatePreviewField = (field: keyof Product, value: any) => {
    setPreviewProduct(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validatePreview = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!previewProduct.title?.trim()) {
      newErrors.title = 'Product title is required';
    }

    if (!previewProduct.price || previewProduct.price <= 0) {
      newErrors.price = 'Product price must be greater than 0';
    }

    if (!previewProduct.category?.trim()) {
      newErrors.category = 'Product category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImport = async () => {
    if (!validatePreview() || !vendorId || !user) return;

    setImporting(true);

    try {
      const productData: Omit<Product, 'id'> = {
        vendorId: vendorId,
        title: previewProduct.title!,
        desc: previewProduct.desc || '',
        price: previewProduct.price!,
        imageUrl: previewProduct.imageUrl || '',
        category: previewProduct.category!,
        available: previewProduct.available || true,
        stock: previewProduct.stock || 0,
        createdAt: new Date()
      };

      const newProduct = await ProductService.createProduct(
        vendorId,
        productData,
        user.uid
      );

      toast.success('Product imported successfully!');
      onImportSuccess?.(newProduct);
      onClose();
    } catch (error) {
      console.error('Error importing product:', error);
      toast.error('Failed to import product. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const getAvailableFields = () => {
    if (!scrapedData) return [];
    return Object.keys(scrapedData);
  };

  const renderStepContent = () => {
    switch (step) {
      case 'input':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                Product URL
              </label>
              <div className="mt-1 relative">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={`pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.url ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="https://example.com/product-page"
                />
              </div>
              {errors.url && (
                <p className="mt-1 text-sm text-red-600">{errors.url}</p>
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    Import Information
                  </h4>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>This feature will attempt to extract product information from the provided URL.</p>
                    <p className="mt-1">Supported sites: Amazon, eBay, Shopify stores, and general e-commerce sites.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-green-800">
                    Data fetched successfully
                  </h4>
                  <p className="mt-1 text-sm text-green-700">
                    Map the scraped fields to product attributes:
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(['title', 'desc', 'price', 'imageUrl', 'category'] as const).map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 capitalize">
                    {field === 'desc' ? 'Description' : field === 'imageUrl' ? 'Image URL' : field}
                    {field === 'title' || field === 'price' || field === 'category' ? ' *' : ''}
                  </label>
                  <select
                    value={fieldMapping[field]}
                    onChange={(e) => updateFieldMapping(field, e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select field...</option>
                    {getAvailableFields().map(fieldName => (
                      <option key={fieldName} value={fieldName}>
                        {fieldName} ({typeof scrapedData![fieldName]})
                      </option>
                    ))}
                  </select>
                  {fieldMapping[field] && scrapedData && (
                    <p className="mt-1 text-xs text-gray-500 truncate">
                      Preview: {String(scrapedData[fieldMapping[field]]).substring(0, 50)}...
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-md p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Raw Data Preview:</h4>
              <pre className="text-xs text-gray-600 bg-white p-2 rounded border max-h-32 overflow-y-auto">
                {JSON.stringify(scrapedData, null, 2)}
              </pre>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <EyeIcon className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    Product Preview
                  </h4>
                  <p className="mt-1 text-sm text-blue-700">
                    Review and edit the product details before importing:
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product Title *
                </label>
                <input
                  type="text"
                  value={previewProduct.title || ''}
                  onChange={(e) => updatePreviewField('title', e.target.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={previewProduct.price || ''}
                  onChange={(e) => updatePreviewField('price', parseFloat(e.target.value) || 0)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.price ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={previewProduct.desc || ''}
                  onChange={(e) => updatePreviewField('desc', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category *
                </label>
                <select
                  value={previewProduct.category || ''}
                  onChange={(e) => updatePreviewField('category', e.target.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors.category ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                >
                  <option value="">Select category...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={previewProduct.stock || ''}
                  onChange={(e) => updatePreviewField('stock', parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Image URL
                </label>
                <input
                  type="url"
                  value={previewProduct.imageUrl || ''}
                  onChange={(e) => updatePreviewField('imageUrl', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {previewProduct.imageUrl && (
                  <div className="mt-2">
                    <img
                      src={previewProduct.imageUrl}
                      alt="Preview"
                      className="h-20 w-20 object-cover rounded border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    id="available"
                    type="checkbox"
                    checked={previewProduct.available || false}
                    onChange={(e) => updatePreviewField('available', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="available" className="ml-2 block text-sm text-gray-900">
                    Product is available for sale
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <DocumentDuplicateIcon className="h-6 w-6 text-blue-600 mr-2" />
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Import Product from URL
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Step Indicator */}
                <div className="mb-6">
                  <nav aria-label="Progress">
                    <ol className="flex items-center">
                      {[
                        { id: 'input', name: 'Enter URL', status: step === 'input' ? 'current' : 'complete' },
                        { id: 'mapping', name: 'Map Fields', status: step === 'mapping' ? 'current' : step === 'preview' ? 'complete' : 'upcoming' },
                        { id: 'preview', name: 'Preview & Import', status: step === 'preview' ? 'current' : 'upcoming' }
                      ].map((stepItem, stepIdx) => (
                        <li key={stepItem.id} className={stepIdx !== 0 ? 'ml-8' : ''}>
                          <div className="relative flex items-center">
                            {stepIdx !== 0 && (
                              <div className={`absolute inset-0 flex items-center -ml-8`} aria-hidden="true">
                                <div className={`h-0.5 w-8 ${stepItem.status === 'complete' ? 'bg-blue-600' : 'bg-gray-200'}`} />
                              </div>
                            )}
                            <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                              stepItem.status === 'complete' ? 'bg-blue-600' : 
                              stepItem.status === 'current' ? 'border-2 border-blue-600 bg-white' : 
                              'border-2 border-gray-300 bg-white'
                            }`}>
                              {stepItem.status === 'complete' ? (
                                <CheckCircleIcon className="h-5 w-5 text-white" />
                              ) : (
                                <span className={`h-2.5 w-2.5 rounded-full ${
                                  stepItem.status === 'current' ? 'bg-blue-600' : 'bg-gray-300'
                                }`} />
                              )}
                            </div>
                            <span className={`ml-3 text-sm font-medium ${
                              stepItem.status === 'current' ? 'text-blue-600' : 'text-gray-500'
                            }`}>
                              {stepItem.name}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </div>

                {/* Step Content */}
                <div className="min-h-[400px]">
                  {renderStepContent()}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex items-center justify-between">
                  <div>
                    {step !== 'input' && (
                      <button
                        onClick={() => {
                          if (step === 'mapping') setStep('input');
                          if (step === 'preview') setStep('mapping');
                        }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Back
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={onClose}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    {step === 'input' && (
                      <button
                        onClick={handleFetchData}
                        disabled={loading || !url.trim()}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                            Fetching...
                          </>
                        ) : (
                          'Fetch Data'
                        )}
                      </button>
                    )}
                    {step === 'mapping' && (
                      <button
                        onClick={generatePreview}
                        disabled={!fieldMapping.title && !fieldMapping.price}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Generate Preview
                      </button>
                    )}
                    {step === 'preview' && (
                      <button
                        onClick={handleImport}
                        disabled={importing}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {importing ? (
                          <>
                            <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                            Importing...
                          </>
                        ) : (
                          'Import Product'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ImportFromUrl;