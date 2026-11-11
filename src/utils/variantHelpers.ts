import { ProductOption, ProductVariant } from '../types/models';

/**
 * Utility functions for generating product variants from options
 */
export class VariantGenerator {
  /**
   * Generate all possible combinations from product options
   */
  static generateOptionCombinations(options: ProductOption[]): Record<string, string>[] {
    // Filter out empty options and values
    const validOptions = options.filter(opt => 
      opt.name.trim() !== '' && opt.values.some(v => v.value.trim() !== '')
    ).map(opt => ({
      name: opt.name.trim(),
      values: opt.values.filter(v => v.value.trim() !== '').map(v => v.value.trim())
    }));

    if (validOptions.length === 0) {
      return [];
    }

    return this.generateCombinationsRecursive(validOptions, 0);
  }

  /**
   * Recursive function to generate all combinations
   */
  private static generateCombinationsRecursive(
    options: { name: string; values: string[] }[],
    optionIndex: number,
    currentCombo: Record<string, string> = {}
  ): Record<string, string>[] {
    if (optionIndex >= options.length) {
      return [currentCombo];
    }

    const option = options[optionIndex];
    const combinations: Record<string, string>[] = [];

    option.values.forEach(value => {
      const newCombo = { ...currentCombo, [option.name]: value };
      combinations.push(...this.generateCombinationsRecursive(options, optionIndex + 1, newCombo));
    });

    return combinations;
  }

  /**
   * Generate variants from option combinations
   */
  static generateVariantsFromOptions(
    options: ProductOption[],
    basePrice: number,
    baseStock: number = 0,
    productTitle: string = 'Product',
    existingVariants: ProductVariant[] = []
  ): ProductVariant[] {
    const combinations = this.generateOptionCombinations(options);
    
    if (combinations.length === 0) {
      return [];
    }

    return combinations.map((combo, index) => {
      // Check if variant already exists to preserve its values
      const existingVariant = existingVariants.find(v => 
        this.compareCombinations(v.optionCombination, combo)
      );

      if (existingVariant) {
        return existingVariant;
      }

      // Generate a SKU from the product options
      const sku = this.generateVariantSKU(productTitle, combo, index);

      // Calculate price modifiers from options
      const priceModifiers = this.calculatePriceModifiers(combo, options);
      const finalPrice = basePrice + priceModifiers;

      return {
        id: `var-${Date.now()}-${index}`,
        name: this.generateVariantName(combo),
        sku,
        price: finalPrice,
        stock: baseStock,
        available: true,
        optionCombination: combo,
        images: []
      };
    });
  }

  /**
   * Generate a variant name from option combination
   */
  static generateVariantName(combination: Record<string, string>): string {
    return Object.entries(combination)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }

  /**
   * Generate a SKU for a variant
   */
  static generateVariantSKU(
    productTitle: string,
    combination: Record<string, string>,
    index: number
  ): string {
    const titlePrefix = productTitle.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    const comboSuffix = Object.values(combination)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 20);
    
    return `${titlePrefix || 'PRD'}-${comboSuffix}-${index + 1}`;
  }

  /**
   * Calculate price modifiers from option values
   */
  static calculatePriceModifiers(
    combination: Record<string, string>,
    options: ProductOption[]
  ): number {
    let totalModifier = 0;

    Object.entries(combination).forEach(([optionName, selectedValue]) => {
      const option = options.find(opt => opt.name === optionName);
      if (option) {
        const optionValue = option.values.find(val => val.value === selectedValue);
        if (optionValue) {
          totalModifier += optionValue.priceModifier;
        }
      }
    });

    return totalModifier;
  }

  /**
   * Compare two option combinations for equality
   */
  static compareCombinations(
    combo1: Record<string, string>,
    combo2: Record<string, string>
  ): boolean {
    const keys1 = Object.keys(combo1).sort();
    const keys2 = Object.keys(combo2).sort();
    
    if (keys1.length !== keys2.length) {
      return false;
    }
    
    return keys1.every((key, index) => 
      key === keys2[index] && combo1[key] === combo2[key]
    );
  }

  /**
   * Validate that options are properly formatted for variant generation
   */
  static validateOptions(options: ProductOption[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.length === 0) {
      errors.push('At least one option is required for variant generation');
      return { valid: false, errors };
    }

    options.forEach((option, index) => {
      if (!option.name || option.name.trim() === '') {
        errors.push(`Option ${index + 1}: Name is required`);
      }

      if (!option.values || option.values.length === 0) {
        errors.push(`Option ${index + 1}: At least one value is required`);
      } else {
        const validValues = option.values.filter(v => v.value && v.value.trim() !== '');
        if (validValues.length === 0) {
          errors.push(`Option ${index + 1}: At least one non-empty value is required`);
        }

        // Check for duplicate values
        const valueSet = new Set(validValues.map(v => v.value.trim().toLowerCase()));
        if (valueSet.size !== validValues.length) {
          errors.push(`Option ${index + 1}: Duplicate values found`);
        }
      }
    });

    // Check for duplicate option names
    const optionNames = options
      .filter(opt => opt.name && opt.name.trim() !== '')
      .map(opt => opt.name.trim().toLowerCase());
    const uniqueNames = new Set(optionNames);
    if (uniqueNames.size !== optionNames.length) {
      errors.push('Duplicate option names found');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get the maximum number of variants that can be generated
   */
  static getMaxVariantCount(options: ProductOption[]): number {
    const validOptions = options.filter(opt => 
      opt.name.trim() !== '' && opt.values.some(v => v.value.trim() !== '')
    );

    if (validOptions.length === 0) {
      return 0;
    }

    return validOptions.reduce((total, option) => {
      const validValues = option.values.filter(v => v.value.trim() !== '');
      return total * validValues.length;
    }, 1);
  }

  /**
   * Update existing variants when options change
   */
  static updateVariantsFromOptions(
    options: ProductOption[],
    existingVariants: ProductVariant[],
    basePrice: number,
    productTitle: string = 'Product'
  ): ProductVariant[] {
    const newCombinations = this.generateOptionCombinations(options);
    
    // Remove variants that no longer match any combination
    const validVariants = existingVariants.filter(variant =>
      newCombinations.some(combo => 
        this.compareCombinations(variant.optionCombination, combo)
      )
    );

    // Add new variants for combinations that don't exist
    const newVariants: ProductVariant[] = [];
    newCombinations.forEach((combo, index) => {
      const existingVariant = validVariants.find(v =>
        this.compareCombinations(v.optionCombination, combo)
      );

      if (!existingVariant) {
        const sku = this.generateVariantSKU(productTitle, combo, index);
        const priceModifiers = this.calculatePriceModifiers(combo, options);
        const finalPrice = basePrice + priceModifiers;

        newVariants.push({
          id: `var-${Date.now()}-${index}`,
          name: this.generateVariantName(combo),
          sku,
          price: finalPrice,
          stock: 0,
          available: true,
          optionCombination: combo,
          images: []
        });
      }
    });

    return [...validVariants, ...newVariants];
  }
}
