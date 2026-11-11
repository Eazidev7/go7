import React, { useState, useEffect } from 'react';
import { XCircleIcon, PlusCircleIcon, TrashIcon } from '@heroicons/react/24/solid';

// Define types for the component
export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  sku: string;
  optionCombo: Record<string, string>;
  price: number;
  stock: number;
  available: boolean;
}

interface ProductVariantStepperProps {
  basePrice: number;
  initialOptions?: ProductOption[];
  initialVariants?: ProductVariant[];
  onVariantsChange: (options: ProductOption[], variants: ProductVariant[]) => void;
}

// Step type for the stepper
type Step = 'base' | 'options' | 'generate' | 'grid';

const ProductVariantStepper: React.FC<ProductVariantStepperProps> = ({
  basePrice,
  initialOptions = [],
  initialVariants = [],
  onVariantsChange
}) => {
  // Current step in the stepper
  const [currentStep, setCurrentStep] = useState<Step>('base');
  
  // Options for the product (e.g., Size, Color)
  const [options, setOptions] = useState<ProductOption[]>(initialOptions.length > 0 ? 
    initialOptions : [{ name: '', values: [''] }]);
  
  // Generated product variants
  const [variants, setVariants] = useState<ProductVariant[]>(initialVariants);
  
  // Update parent component when variants change
  useEffect(() => {
    // Only update if options have names and values
    const validOptions = options.filter(opt => 
      opt.name.trim() !== '' && opt.values.some(v => v.trim() !== '')
    );
    
    onVariantsChange(validOptions, variants);
  }, [variants, options, onVariantsChange]);

  // Add a new option
  const addOption = () => {
    setOptions([...options, { name: '', values: [''] }]);
  };

  // Remove an option
  const removeOption = (index: number) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  // Update option name
  const updateOptionName = (index: number, name: string) => {
    const newOptions = [...options];
    newOptions[index].name = name;
    setOptions(newOptions);
  };

  // Add a new value to an option
  const addOptionValue = (optionIndex: number) => {
    const newOptions = [...options];
    newOptions[optionIndex].values.push('');
    setOptions(newOptions);
  };

  // Update option value
  const updateOptionValue = (optionIndex: number, valueIndex: number, value: string) => {
    const newOptions = [...options];
    newOptions[optionIndex].values[valueIndex] = value;
    setOptions(newOptions);
  };

  // Remove an option value
  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    const newOptions = [...options];
    newOptions[optionIndex].values.splice(valueIndex, 1);
    setOptions(newOptions);
  };

  // Generate all possible combinations of options
  const generateVariants = () => {
    // Filter out empty options and values
    const validOptions = options.filter(opt => 
      opt.name.trim() !== '' && opt.values.some(v => v.trim() !== '')
    ).map(opt => ({
      name: opt.name.trim(),
      values: opt.values.filter(v => v.trim() !== '')
    }));

    if (validOptions.length === 0) {
      return;
    }

    // Function to generate all combinations of options
    const generateCombinations = (
      optionIndex: number, 
      currentCombo: Record<string, string> = {}
    ): Record<string, string>[] => {
      if (optionIndex >= validOptions.length) {
        return [currentCombo];
      }

      const option = validOptions[optionIndex];
      const combinations: Record<string, string>[] = [];

      option.values.forEach(value => {
        const newCombo = { ...currentCombo, [option.name]: value };
        combinations.push(...generateCombinations(optionIndex + 1, newCombo));
      });

      return combinations;
    };

    // Generate all possible combinations
    const combinations = generateCombinations(0);

    // Create variants from combinations
    const newVariants: ProductVariant[] = combinations.map(combo => {
      // Check if variant already exists to preserve its values
      const existingVariant = variants.find(v => 
        Object.keys(combo).every(key => v.optionCombo[key] === combo[key])
      );

      // Generate a SKU from the product options
      const sku = Object.values(combo).join('-').toLowerCase().replace(/\s+/g, '-');

      return existingVariant ? existingVariant : {
        sku,
        optionCombo: combo,
        price: basePrice,
        stock: 0,
        available: true
      };
    });

    setVariants(newVariants);
    setCurrentStep('grid');
  };

  // Update a variant's property
  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const newVariants = [...variants];
    
    if (field === 'price' || field === 'stock') {
      // Ensure numeric values
      newVariants[index][field] = Number(value);
    } else if (field === 'available') {
      // Toggle boolean
      newVariants[index][field] = value;
    } else if (field === 'sku') {
      // Update SKU as string
      newVariants[index][field] = value;
    }
    
    setVariants(newVariants);
  };

  // Remove a variant
  const removeVariant = (index: number) => {
    const newVariants = [...variants];
    newVariants.splice(index, 1);
    setVariants(newVariants);
  };

  // Apply base price to all variants
  const applyBasePriceToAll = () => {
    const newVariants = variants.map(variant => ({
      ...variant,
      price: basePrice
    }));
    setVariants(newVariants);
  };

  // Set all variants to available/unavailable
  const setAllAvailability = (available: boolean) => {
    const newVariants = variants.map(variant => ({
      ...variant,
      available
    }));
    setVariants(newVariants);
  };

  // Set stock for all variants
  const setAllStock = (stock: number) => {
    const newVariants = variants.map(variant => ({
      ...variant,
      stock
    }));
    setVariants(newVariants);
  };

  // Render the stepper
  return (
    <div className="space-y-6">
      {/* Stepper header */}
      <nav aria-label="Progress" className="mb-6">
        <ol className="flex items-center">
          <li className={`relative pr-8 sm:pr-20 ${currentStep === 'base' ? 'text-red-600' : 'text-gray-500'}`}>
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="h-0.5 w-full bg-gray-200"></div>
            </div>
            <button
              onClick={() => setCurrentStep('base')}
              className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                currentStep === 'base' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white border-2 border-gray-300'
              }`}
            >
              1
            </button>
            <span className="absolute top-10 left-0 text-sm font-medium">Base</span>
          </li>
          
          <li className={`relative pr-8 sm:pr-20 ${currentStep === 'options' ? 'text-red-600' : 'text-gray-500'}`}>
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="h-0.5 w-full bg-gray-200"></div>
            </div>
            <button
              onClick={() => setCurrentStep('options')}
              className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                currentStep === 'options' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white border-2 border-gray-300'
              }`}
            >
              2
            </button>
            <span className="absolute top-10 left-0 text-sm font-medium">Options</span>
          </li>
          
          <li className={`relative pr-8 sm:pr-20 ${currentStep === 'generate' ? 'text-red-600' : 'text-gray-500'}`}>
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="h-0.5 w-full bg-gray-200"></div>
            </div>
            <button
              onClick={() => setCurrentStep('generate')}
              className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                currentStep === 'generate' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white border-2 border-gray-300'
              }`}
            >
              3
            </button>
            <span className="absolute top-10 left-0 text-sm font-medium">Generate</span>
          </li>
          
          <li className={`relative ${currentStep === 'grid' ? 'text-red-600' : 'text-gray-500'}`}>
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="h-0.5 w-full bg-gray-200"></div>
            </div>
            <button
              onClick={() => variants.length > 0 && setCurrentStep('grid')}
              className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                currentStep === 'grid' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white border-2 border-gray-300'
              }`}
            >
              4
            </button>
            <span className="absolute top-10 left-0 text-sm font-medium">Variants</span>
          </li>
        </ol>
      </nav>

      {/* Step content */}
      <div className="mt-10">
        {currentStep === 'base' && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Base Product</h4>
            <p className="text-sm text-gray-500">
              Set up your base product details before adding variants. Once you've set the base price and other details, you can proceed to define options.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCurrentStep('options')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Next: Define Options
              </button>
            </div>
          </div>
        )}

        {currentStep === 'options' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-medium text-gray-900">Product Options</h4>
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <PlusCircleIcon className="h-5 w-5 mr-1 text-gray-400" />
                Add Option
              </button>
            </div>
            
            <p className="text-sm text-gray-500">
              Define options like Size, Color, etc. and their possible values. These will be used to generate all possible variants.
            </p>

            {options.map((option, optionIndex) => (
              <div key={optionIndex} className="border border-gray-200 rounded-md p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-full">
                    <label htmlFor={`option-name-${optionIndex}`} className="block text-sm font-medium text-gray-700">
                      Option Name
                    </label>
                    <input
                      type="text"
                      id={`option-name-${optionIndex}`}
                      value={option.name}
                      onChange={(e) => updateOptionName(optionIndex, e.target.value)}
                      placeholder="e.g. Size, Color, Material"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOption(optionIndex)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-500"
                    title="Remove option"
                    aria-label="Remove option"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">
                      Option Values
                    </label>
                    <button
                      type="button"
                      onClick={() => addOptionValue(optionIndex)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Add Value
                    </button>
                  </div>

                  {option.values.map((value, valueIndex) => (
                    <div key={valueIndex} className="flex items-center mt-1">
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateOptionValue(optionIndex, valueIndex, e.target.value)}
                        placeholder="e.g. Small, Red, Cotton"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeOptionValue(optionIndex, valueIndex)}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-500"
                        title="Remove option value"
                        aria-label="Remove option value"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep('base')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep('generate')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Next: Generate Variants
              </button>
            </div>
          </div>
        )}

        {currentStep === 'generate' && (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-gray-900">Generate Variants</h4>
            <p className="text-sm text-gray-500">
              Review your options and generate all possible combinations as variants. 
              This will create a variant for each unique combination of option values.
            </p>

            <div className="bg-gray-50 p-4 rounded-md">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Options Summary</h5>
              {options.filter(opt => opt.name.trim() !== '').map((option, index) => (
                <div key={index} className="text-sm mb-2">
                  <span className="font-medium">{option.name}:</span>{' '}
                  {option.values
                    .filter(v => v.trim() !== '')
                    .join(', ')}
                </div>
              ))}
              
              <div className="mt-4 text-sm">
                <span className="font-medium">Total variants to generate:</span>{' '}
                {options
                  .filter(opt => opt.name.trim() !== '')
                  .reduce((acc, opt) => 
                    acc * opt.values.filter(v => v.trim() !== '').length, 1)}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep('options')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Back
              </button>
              <button
                type="button"
                onClick={generateVariants}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Generate Variants
              </button>
            </div>
          </div>
        )}

        {currentStep === 'grid' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-medium text-gray-900">Variant Grid</h4>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={applyBasePriceToAll}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Apply Base Price to All
                </button>
                <button
                  type="button"
                  onClick={() => setAllAvailability(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={() => setAllAvailability(false)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Disable All
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-500">
              Set prices, stock levels, and availability for each variant. You can also modify the SKU if needed.
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    {options
                      .filter(opt => opt.name.trim() !== '')
                      .map((option, index) => (
                        <th
                          key={index}
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          {option.name}
                        </th>
                      ))}
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      SKU
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Price
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Stock
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Available
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {variants.map((variant, index) => (
                    <tr key={index}>
                      {options
                        .filter(opt => opt.name.trim() !== '')
                        .map((option, optIndex) => (
                          <td key={optIndex} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {variant.optionCombo[option.name]}
                          </td>
                        ))}
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                          title="SKU"
                          aria-label="SKU"
                          placeholder="SKU"
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variant.price}
                          onChange={(e) => updateVariant(index, 'price', e.target.value)}
                          className="block w-24 border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                          title="Price"
                          aria-label="Price"
                          placeholder="Price"
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <input
                          type="number"
                          min="0"
                          value={variant.stock}
                          onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                          className="block w-20 border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                          title="Stock"
                          aria-label="Stock"
                          placeholder="Stock"
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <input
                          type="checkbox"
                          checked={variant.available}
                          onChange={(e) => updateVariant(index, 'available', e.target.checked)}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          title="Available"
                          aria-label="Available"
                        />
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep('generate')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Back
              </button>
              <div className="text-sm text-gray-500 pt-2">
                {variants.length} variants configured
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductVariantStepper;
