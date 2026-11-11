/**
 * 🤖 AI Package Detection Cloud Functions
 * Analyzes package images using GPT-4 Vision
 * Returns size, weight, fragility, and vehicle recommendations
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const OpenAI = require('openai').default;

// Firestore is accessed lazily (admin not initialized at module parse time)
const getDb = () => admin.firestore();

// OpenAI client is initialized lazily inside functions (env not available at parse time)
let _openai = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

/**
 * Analyze package image using GPT-4 Vision
 * @param {string} imageUrl - Firebase Storage URL of package image
 * @param {object} bookingData - Optional booking context
 * @returns {object} Analysis results
 */
exports.analyzePackageImage = functions.https.onCall(async (data, context) => {
  try {
    const { imageUrl, bookingData } = data;

    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Validate input
    if (!imageUrl) {
      throw new functions.https.HttpsError('invalid-argument', 'Image URL is required');
    }

    console.log('📦 Analyzing package image:', imageUrl);
    console.log('📍 Booking context:', bookingData);

    // Call OpenAI GPT-4 Vision API
    const analysis = await analyzeWithGPT4Vision(imageUrl, bookingData);

    // Calculate pricing based on analysis
    const pricing = calculatePackagePricing(analysis, bookingData);

    // Save analysis to Firestore for training data
    await saveAnalysisRecord({
      userId: context.auth.uid,
      imageUrl,
      analysis,
      pricing,
      bookingData,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Analysis complete:', analysis);

    return {
      success: true,
      analysis: {
        ...analysis,
        pricing
      }
    };

  } catch (error) {
    console.error('❌ Package analysis error:', error);
    
    // Return fallback analysis on error
    if (error.code === 'resource-exhausted' || error.message.includes('quota')) {
      return {
        success: true,
        analysis: getFallbackAnalysis(),
        fallback: true,
        message: 'Using fallback analysis. Please verify details.'
      };
    }

    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Analyze image with GPT-4 Vision
 */
async function analyzeWithGPT4Vision(imageUrl, bookingData) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OpenAI API key not configured, using fallback');
    return getFallbackAnalysis();
  }

  const prompt = `You are an expert logistics package analyzer for a Nigerian delivery service.

Analyze this package image and provide:
1. Item type (e.g., Electronics, Clothing, Food, Documents, Furniture, etc.)
2. Size category: small, medium, large, or extra_large
3. Weight category: light, medium, or heavy
4. Is it fragile? (yes/no)
5. Multiple items? (yes/no)
6. Recommended vehicle: bike, tricycle, car, or van
7. Confidence score (0-100)
8. Brief reason for your assessment

Size Guidelines (Nigeria context):
- small: Fits in hand (phone, documents, small boxes) - up to 30cm
- medium: Fits in backpack (laptop, shoes, medium boxes) - 30-60cm
- large: Needs two hands (TV, suitcase, large boxes) - 60-120cm
- extra_large: Bulky items (furniture, appliances) - over 120cm

Weight Guidelines:
- light: < 2kg (can carry easily)
- medium: 2-10kg (moderately heavy)
- heavy: > 10kg (requires effort to lift)

Vehicle Guidelines:
- bike: Small, light items (documents, small packages)
- tricycle: Medium items, fragile items needing care
- car: Large items, multiple packages, valuable items
- van: Extra large items, furniture, bulk deliveries

Context:
${bookingData?.pickupAddress ? `Pickup: ${bookingData.pickupAddress}` : ''}
${bookingData?.deliveryAddress ? `Delivery: ${bookingData.deliveryAddress}` : ''}
${bookingData?.distance ? `Distance: ${bookingData.distance}km` : ''}

IMPORTANT: Be conservative with size/weight to prevent underpricing. When uncertain, estimate larger/heavier.

Response format (JSON only):
{
  "itemType": "string",
  "size": "small|medium|large|extra_large",
  "weight": "light|medium|heavy", 
  "fragile": true|false,
  "multipleItems": true|false,
  "vehicle": "bike|tricycle|car|van",
  "confidence": 0-100,
  "reason": "Brief explanation"
}`;

  try {
    const response = await getOpenAI().responses.create({
      model: 'gpt-5-nano',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: imageUrl }
          ]
        }
      ],
      store: true
    });

    const content = response.output_text;
    console.log('🤖 GPT-5 Nano response:', content);

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Validate and sanitize response
    return {
      itemType: analysis.itemType || 'Unknown',
      size: validateCategory(analysis.size, ['small', 'medium', 'large', 'extra_large'], 'medium'),
      weight: validateCategory(analysis.weight, ['light', 'medium', 'heavy'], 'medium'),
      fragile: Boolean(analysis.fragile),
      multipleItems: Boolean(analysis.multipleItems),
      vehicle: validateCategory(analysis.vehicle, ['bike', 'tricycle', 'car', 'van'], 'tricycle'),
      confidence: Math.min(100, Math.max(0, parseInt(analysis.confidence) || 70)),
      reason: analysis.reason || 'AI analysis based on image features',
      aiModel: 'gpt-5-nano',
      analyzedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ GPT-4 Vision API error:', error.message);
    
    // Return fallback on API failure
    return getFallbackAnalysis();
  }
}

/**
 * Calculate pricing based on package analysis
 */
function calculatePackagePricing(analysis, bookingData) {
  const distance = bookingData?.distance || 5; // Default 5km

  // Base rates by vehicle type (₦ per km)
  const baseRates = {
    bike: 50,
    tricycle: 80,
    car: 120,
    van: 200
  };

  // Size multipliers
  const sizeMultipliers = {
    small: 1.0,
    medium: 1.3,
    large: 1.6,
    extra_large: 2.0
  };

  // Weight multipliers
  const weightMultipliers = {
    light: 1.0,
    medium: 1.2,
    heavy: 1.5
  };

  // Fragile premium
  const fragilePremium = analysis.fragile ? 1.3 : 1.0;

  // Multiple items premium
  const multipleItemsPremium = analysis.multipleItems ? 1.2 : 1.0;

  // Calculate base price
  const baseRate = baseRates[analysis.vehicle] || baseRates.tricycle;
  const sizeMultiplier = sizeMultipliers[analysis.size] || 1.3;
  const weightMultiplier = weightMultipliers[analysis.weight] || 1.2;

  // Final calculation
  const calculatedPrice = Math.round(
    baseRate * 
    distance * 
    sizeMultiplier * 
    weightMultiplier * 
    fragilePremium * 
    multipleItemsPremium
  );

  // Minimum price safeguards
  const minimumPrices = {
    bike: 500,
    tricycle: 800,
    car: 1500,
    van: 3000
  };

  const minimumPrice = minimumPrices[analysis.vehicle] || 800;
  const finalPrice = Math.max(calculatedPrice, minimumPrice);

  // Round to nearest 50
  const roundedPrice = Math.round(finalPrice / 50) * 50;

  return {
    estimatedPrice: roundedPrice,
    baseRate,
    distance,
    breakdown: {
      base: baseRate * distance,
      sizeAdjustment: `${((sizeMultiplier - 1) * 100).toFixed(0)}%`,
      weightAdjustment: `${((weightMultiplier - 1) * 100).toFixed(0)}%`,
      fragileCharge: analysis.fragile ? `+${((fragilePremium - 1) * 100).toFixed(0)}%` : 'N/A',
      multipleItemsCharge: analysis.multipleItems ? `+${((multipleItemsPremium - 1) * 100).toFixed(0)}%` : 'N/A'
    },
    minimumApplied: finalPrice < minimumPrice
  };
}

/**
 * Save analysis record for training data
 */
async function saveAnalysisRecord(record) {
  try {
    await getDb().collection('packageAnalyses').add(record);
    console.log('💾 Analysis record saved for training');
  } catch (error) {
    console.error('⚠️ Failed to save analysis record:', error);
    // Non-critical, don't throw
  }
}

/**
 * Get fallback analysis when AI is unavailable
 */
function getFallbackAnalysis() {
  return {
    itemType: 'Unknown - Please verify',
    size: 'medium',
    weight: 'medium',
    fragile: false,
    multipleItems: false,
    vehicle: 'tricycle',
    confidence: 40,
    reason: 'AI service temporarily unavailable. Default estimates applied. Please verify package details.',
    fallback: true,
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Validate category values
 */
function validateCategory(value, allowedValues, defaultValue) {
  return allowedValues.includes(value) ? value : defaultValue;
}

/**
 * Manual override function - update analysis with user corrections
 */
exports.updatePackageAnalysis = functions.https.onCall(async (data, context) => {
  try {
    const { analysisId, updates, userFeedback } = data;

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    // Update analysis record
    await getDb().collection('packageAnalyses').doc(analysisId).update({
      manualOverride: updates,
      userFeedback,
      overriddenBy: context.auth.uid,
      overriddenAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✏️ Manual override applied:', analysisId);

    return { success: true };

  } catch (error) {
    console.error('❌ Update error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get package analysis statistics (for admin dashboard)
 */
exports.getPackageAnalytics = functions.https.onCall(async (data, context) => {
  try {
    // Verify admin role
    if (!context.auth || !context.auth.token.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { startDate, endDate } = data;

    const snapshot = await getDb().collection('packageAnalyses')
      .where('timestamp', '>=', new Date(startDate))
      .where('timestamp', '<=', new Date(endDate))
      .get();

    const analytics = {
      totalAnalyses: snapshot.size,
      byVehicle: {},
      bySize: {},
      byWeight: {},
      averageConfidence: 0,
      manualOverrides: 0
    };

    let totalConfidence = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Count by vehicle
      analytics.byVehicle[data.analysis.vehicle] = 
        (analytics.byVehicle[data.analysis.vehicle] || 0) + 1;

      // Count by size
      analytics.bySize[data.analysis.size] = 
        (analytics.bySize[data.analysis.size] || 0) + 1;

      // Count by weight
      analytics.byWeight[data.analysis.weight] = 
        (analytics.byWeight[data.analysis.weight] || 0) + 1;

      // Average confidence
      totalConfidence += data.analysis.confidence;

      // Manual overrides
      if (data.manualOverride) {
        analytics.manualOverrides++;
      }
    });

    analytics.averageConfidence = snapshot.size > 0 
      ? Math.round(totalConfidence / snapshot.size) 
      : 0;

    return { success: true, analytics };

  } catch (error) {
    console.error('❌ Analytics error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
