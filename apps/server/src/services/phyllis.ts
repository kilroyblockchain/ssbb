import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { hydratePhyllisConfig } from './secrets.js';

const s3 = new S3Client({ region: 'us-east-1' });

// Print size presets (pixels at 300 DPI)
const PRINT_PRESETS = {
  't-shirt': { width: 3600, height: 4500 },      // 12" × 15" at 300 DPI
  'poster-11x17': { width: 3300, height: 5100 }, // 11" × 17" at 300 DPI
  'letter': { width: 2550, height: 3300 }        // 8.5" × 11" at 300 DPI
};

interface GeneratePrintDesignParams {
  prompt: string;
  title: string;
  description?: string;
  preset?: keyof typeof PRINT_PRESETS;
}

export async function generatePrintDesign(params: GeneratePrintDesignParams): Promise<{
  success: boolean;
  product_url: string;
  design_300dpi: string;
  design_web: string;
  printful_product_id?: number;
  mockups?: Record<string, string>;
  error?: string;
}> {
  try {
    // Hydrate Phyllis API key from secrets
    await hydratePhyllisConfig();

    const phyllisApiKey = process.env.PHYLLIS_API_KEY;
    const phyllisBaseUrl = process.env.PHYLLIS_BASE_URL || 'https://phyllis-fills.replit.app';

    if (!phyllisApiKey) {
      throw new Error('PHYLLIS_API_KEY not configured');
    }

    const { prompt, title, description, preset = 't-shirt' } = params;
    const dimensions = PRINT_PRESETS[preset];

    console.log('[phyllis] Generating print design:', { title, preset, dimensions });

    // TODO: For now, we'll use Gemini to generate the image
    // In the future, this could use GPT Image 2.0 or other models
    // For MVP, let's just validate the flow without actual image generation

    // For now, return error asking user to provide a design URL
    // Once we add image generation, we'll generate here
    throw new Error('Image generation not yet implemented. Please use an existing 300 DPI design URL with Phyllis directly.');

  } catch (error) {
    const err = error as Error;
    console.error('[phyllis] Error generating print design:', err);
    return {
      success: false,
      product_url: '',
      design_300dpi: '',
      design_web: '',
      error: err.message
    };
  }
}

/**
 * Call Phyllis Fills API to create a product from an existing design URL
 */
export async function createProductWithPhyllis(params: {
  design_url: string;
  title: string;
  description: string;
  colors?: string[];
}): Promise<{
  success: boolean;
  printful_product_id?: number;
  price?: number;
  sizes?: string[];
  variants?: Record<string, number>;
  mockups?: Record<string, string>;
  error?: string;
}> {
  try {
    await hydratePhyllisConfig();

    const phyllisApiKey = process.env.PHYLLIS_API_KEY;
    const phyllisBaseUrl = process.env.PHYLLIS_BASE_URL || 'https://phyllis-fills.replit.app';

    if (!phyllisApiKey) {
      throw new Error('PHYLLIS_API_KEY not configured');
    }

    console.log('[phyllis] Creating product with Phyllis Fills:', params.title);

    // Call Phyllis API
    const response = await fetch(`${phyllisBaseUrl}/api/products/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': phyllisApiKey
      },
      body: JSON.stringify({
        design_url: params.design_url,
        title: params.title,
        colors: params.colors || ['black'],
        description: params.description,
        client_id: 'discountpunk'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Phyllis rejected: ${errorData.error || response.statusText}`);
    }

    const productData = await response.json();
    console.log('[phyllis] Product created successfully:', productData.printful_product_id);

    return {
      success: true,
      printful_product_id: productData.printful_product_id,
      price: productData.price,
      sizes: productData.sizes,
      variants: productData.variants,
      mockups: productData.mockups
    };

  } catch (error) {
    const err = error as Error;
    console.error('[phyllis] Error creating product:', err);
    return {
      success: false,
      error: err.message
    };
  }
}
