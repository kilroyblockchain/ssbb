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

function getPrintPrepSourceUrl(sourceImageUrl: string, imageKey?: string): string {
  if (imageKey) {
    return `https://ssbb-media-prod.s3.amazonaws.com/${imageKey}`;
  }

  try {
    const url = new URL(sourceImageUrl);
    url.search = '';

    if (url.hostname === 'ssbb-media-prod.s3.us-east-1.amazonaws.com') {
      url.hostname = 'ssbb-media-prod.s3.amazonaws.com';
    }

    return url.toString();
  } catch {
    return sourceImageUrl;
  }
}

function getS3ImageKey(imageUrl: string): string | undefined {
  try {
    const url = new URL(imageUrl);

    if (
      url.hostname === 'ssbb-media-prod.s3.amazonaws.com' ||
      url.hostname === 'ssbb-media-prod.s3.us-east-1.amazonaws.com'
    ) {
      return url.pathname.replace(/^\/+/, '');
    }
  } catch {
    return undefined;
  }

  return undefined;
}

interface GeneratePrintDesignParams {
  prompt: string;
  title: string;
  description?: string;
  preset?: keyof typeof PRINT_PRESETS;
}

/**
 * Generate a design preview for approval before creating product.
 * Returns web image URL for user to review.
 */
export async function generateDesignPreview(params: {
  prompt: string;
  title: string;
}): Promise<{
  success: boolean;
  preview_url: string;
  preview_image_data?: string; // base64 for inline display
  error?: string;
}> {
  try {
    const { generateNyxImage } = await import('./image-generator.js');

    console.log('[phyllis] Generating design preview:', params.title);

    // Generate web-quality image
    const webImage = await generateNyxImage(params.prompt, 'gpt-image-2');

    // Upload to S3
    const filename = `${Date.now()}-${params.title.toLowerCase().replace(/\s+/g, '-')}-preview.png`;
    const key = `discountpunk/images/previews/${filename}`;

    await s3.send(new PutObjectCommand({
      Bucket: 'ssbb-media-prod',
      Key: key,
      Body: webImage.buffer,
      ContentType: webImage.contentType
    }));

    const previewUrl = `https://ssbb-media-prod.s3.amazonaws.com/${key}`;

    console.log('[phyllis] Design preview generated:', previewUrl);

    return {
      success: true,
      preview_url: previewUrl,
      preview_image_data: webImage.buffer.toString('base64')
    };

  } catch (error) {
    const err = error as Error;
    console.error('[phyllis] Error generating design preview:', err);
    return {
      success: false,
      preview_url: '',
      error: err.message
    };
  }
}

/**
 * Create product from an approved preview image.
 * This is step 2 after generateDesignPreview.
 */
export async function createProductFromPreview(params: {
  preview_url: string;
  image_key?: string;
  title: string;
  description: string;
  product_type?: 'shirt' | 'poster' | 'letter';
  colors?: string[];
}): Promise<{
  success: boolean;
  printful_product_id?: number;
  print_ready_url?: string;
  mockup_urls?: string[];
  prep_warnings?: string[];
  error?: string;
}> {
  try {
    console.log('[phyllis] Creating product from approved preview:', params.title);

    // Use ensurePhyllisProduct which handles prep + creation
    const result = await ensurePhyllisProduct({
      title: params.title,
      description: params.description,
      source_image_url: params.preview_url,
      image_key: params.image_key,
      product_type: params.product_type || 'shirt',
      colors: params.colors || ['black'],
      retail_price: '29.99'
    });

    if (!result.success) {
      throw new Error(result.error || 'Product creation failed');
    }

    console.log('[phyllis] Product created from preview:', result.printful_product_id);

    return {
      success: true,
      printful_product_id: result.printful_product_id,
      print_ready_url: result.print_ready_url,
      mockup_urls: result.mockup_urls,
      prep_warnings: result.prep_warnings
    };

  } catch (error) {
    const err = error as Error;
    console.error('[phyllis] Error creating product from preview:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Generate a print-ready design from a text prompt.
 * This combines image generation + print prep into one flow.
 */
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
    // Import image generator
    const { generateNyxImage } = await import('./image-generator.js');

    const { prompt, title, description, preset = 't-shirt' } = params;
    const dimensions = PRINT_PRESETS[preset];

    console.log('[phyllis] Generating print design from prompt:', { title, preset, dimensions });

    // 1. Generate web-quality image using GPT Image 2
    console.log('[phyllis] Step 1: Generating web image...');
    const webImage = await generateNyxImage(prompt, 'gpt-image-2');

    // Upload web image to S3 temporarily
    const webFilename = `${Date.now()}-${title.toLowerCase().replace(/\s+/g, '-')}-web.png`;
    const webKey = `discountpunk/images/generated/${webFilename}`;

    await s3.send(new PutObjectCommand({
      Bucket: 'ssbb-media-prod',
      Key: webKey,
      Body: webImage.buffer,
      ContentType: webImage.contentType
    }));

    const webUrl = `https://ssbb-media-prod.s3.amazonaws.com/${webKey}`;
    console.log('[phyllis] Web image uploaded:', webUrl);

    // 2. Prepare image for print via Phyllis
    console.log('[phyllis] Step 2: Preparing image for print...');
    const prep = await prepareImageForPrint({
      source_image_url: webUrl,
      product_type: preset === 't-shirt' ? 'shirt' : preset === 'poster-11x17' ? 'poster' : 'letter',
      remove_background: true,
      upscale: true,
      sharpen: true
    });

    if (!prep.success || !prep.printReadyUrl) {
      throw new Error(prep.error || 'Print preparation failed');
    }

    if (prep.warnings && prep.warnings.length > 0) {
      console.warn('[phyllis] Print prep warnings:', prep.warnings);
    }

    // 3. Create product with print-ready URL
    console.log('[phyllis] Step 3: Creating product...');
    const product = await createProductWithPhyllis({
      design_url: prep.printReadyUrl,
      title,
      description: description || title,
      colors: ['black']
    });

    if (!product.success) {
      throw new Error(product.error || 'Product creation failed');
    }

    console.log('[phyllis] Print design generated successfully:', {
      webUrl,
      printReadyUrl: prep.printReadyUrl,
      printfulProductId: product.printful_product_id
    });

    return {
      success: true,
      product_url: '', // Could add shop URL here
      design_300dpi: prep.printReadyUrl,
      design_web: webUrl,
      printful_product_id: product.printful_product_id,
      mockups: product.mockups
    };

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
 * Prepare a web/low-res image for print production via Phyllis print-prep service.
 * This endpoint removes background, upscales to 300 DPI dimensions, and validates quality.
 */
export async function prepareImageForPrint(params: {
  source_image_url: string;
  image_key?: string;
  client_slug?: string;
  product_type?: 'shirt' | 'poster' | 'letter';
  remove_background?: boolean;
  upscale?: boolean;
  sharpen?: boolean;
}): Promise<{
  success: boolean;
  printReadyUrl?: string;
  width?: number;
  height?: number;
  dpi?: number;
  hasAlpha?: boolean;
  qualityPassed?: boolean;
  sourceWidth?: number;
  sourceHeight?: number;
  prepMethod?: string;
  warnings?: string[];
  error?: string;
}> {
  try {
    await hydratePhyllisConfig();

    const phyllisApiKey = process.env.PHYLLIS_API_KEY;
    const phyllisBaseUrl = process.env.PHYLLIS_BASE_URL || 'https://phyllis-fills.replit.app';

    if (!phyllisApiKey) {
      throw new Error('PHYLLIS_API_KEY not configured');
    }

    const productType = params.product_type || 'shirt';
    const preset = PRINT_PRESETS[productType === 'shirt' ? 't-shirt' : productType === 'poster' ? 'poster-11x17' : 'letter'];
    const sourceImageUrl = getPrintPrepSourceUrl(params.source_image_url, params.image_key);

    console.log('[phyllis] Preparing image for print:', {
      source: sourceImageUrl,
      productType,
      targetDimensions: preset
    });

    const printPrepUrl = `${phyllisBaseUrl}/api/print-prep/process`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': phyllisApiKey
    };
    const camelCasePayload = {
      clientSlug: params.client_slug || 'discount-punk',
      sourceImageUrl,
      imageKey: params.image_key,
      productType: productType,
      targetWidth: preset.width,
      targetHeight: preset.height,
      removeBackground: params.remove_background ?? true,
      upscale: params.upscale ?? true,
      sharpen: params.sharpen ?? true
    };

    let response = await fetch(printPrepUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(camelCasePayload)
    });

    if (!response.ok) {
      let errorData = await response.json().catch(() => ({ error: 'Print prep failed' }));
      const shouldTrySnakeCase = response.status === 400 && /invalid request/i.test(String(errorData.error || ''));

      if (shouldTrySnakeCase) {
        response = await fetch(printPrepUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            client_slug: params.client_slug || 'discount-punk',
            source_image_url: sourceImageUrl,
            image_key: params.image_key,
            product_type: productType,
            target_width: preset.width,
            target_height: preset.height,
            remove_background: params.remove_background ?? true,
            upscale: params.upscale ?? true,
            sharpen: params.sharpen ?? true
          })
        });

        if (response.ok) {
          const result = await response.json();

          if (!result.success || !result.qualityPassed) {
            console.warn('[phyllis] Print prep quality check failed:', result.warnings);
            return {
              success: false,
              error: `Image quality insufficient for print: ${result.warnings?.join(', ') || 'Unknown issue'}`,
              warnings: result.warnings
            };
          }

          console.log('[phyllis] Image prepared successfully:', {
            printReadyUrl: result.printReadyUrl,
            dimensions: `${result.width}×${result.height}`,
            dpi: result.dpi
          });

          return {
            success: true,
            printReadyUrl: result.printReadyUrl,
            width: result.width,
            height: result.height,
            dpi: result.dpi,
            hasAlpha: result.hasAlpha,
            qualityPassed: result.qualityPassed,
            sourceWidth: result.sourceWidth,
            sourceHeight: result.sourceHeight,
            prepMethod: result.prepMethod,
            warnings: result.warnings
          };
        }

        errorData = await response.json().catch(() => ({ error: 'Print prep failed' }));
      }

      throw new Error(`Phyllis print-prep rejected: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.qualityPassed) {
      console.warn('[phyllis] Print prep quality check failed:', result.warnings);
      return {
        success: false,
        error: `Image quality insufficient for print: ${result.warnings?.join(', ') || 'Unknown issue'}`,
        warnings: result.warnings
      };
    }

    console.log('[phyllis] Image prepared successfully:', {
      printReadyUrl: result.printReadyUrl,
      dimensions: `${result.width}×${result.height}`,
      dpi: result.dpi
    });

    return {
      success: true,
      printReadyUrl: result.printReadyUrl,
      width: result.width,
      height: result.height,
      dpi: result.dpi,
      hasAlpha: result.hasAlpha,
      qualityPassed: result.qualityPassed,
      sourceWidth: result.sourceWidth,
      sourceHeight: result.sourceHeight,
      prepMethod: result.prepMethod,
      warnings: result.warnings
    };

  } catch (error) {
    const err = error as Error;
    console.error('[phyllis] Error preparing image for print:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Check if a product already exists in Phyllis catalog
 */
export async function findExistingProduct(params: {
  title: string;
  source_image_url?: string;
}): Promise<{
  success: boolean;
  product?: {
    id: string;
    printful_product_id: number;
    external_id: string;
    title: string;
    design_url: string;
    retail_price: string;
    mockup_urls: string[];
    active: boolean;
  };
  error?: string;
}> {
  try {
    await hydratePhyllisConfig();

    const phyllisBaseUrl = process.env.PHYLLIS_BASE_URL || 'https://phyllis-fills.replit.app';

    console.log('[phyllis] Looking for existing product:', params.title);

    const response = await fetch(`${phyllisBaseUrl}/api/products?client_slug=discount-punk`);

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }

    const data = await response.json();

    // Find product by title (case-insensitive)
    const product = data.products?.find((p: any) =>
      p.title.toLowerCase() === params.title.toLowerCase()
    );

    if (product) {
      console.log('[phyllis] Found existing product:', product.printful_product_id);
      return {
        success: true,
        product: {
          id: product.id,
          printful_product_id: product.printful_product_id,
          external_id: product.external_id,
          title: product.title,
          design_url: product.design_url,
          retail_price: product.retail_price,
          mockup_urls: product.mockup_urls,
          active: product.active
        }
      };
    }

    console.log('[phyllis] No existing product found for:', params.title);
    return {
      success: true,
      product: undefined
    };

  } catch (error) {
    const err = error as Error;
    console.error('[phyllis] Error finding existing product:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Ensure a Phyllis product exists for a given design.
 * If product doesn't exist, prepares the image and creates it.
 * This is the main entry point for on-demand product creation.
 */
export async function ensurePhyllisProduct(params: {
  title: string;
  description: string;
  source_image_url: string;
  image_key?: string;
  product_type?: 'shirt' | 'poster' | 'letter';
  colors?: string[];
  retail_price?: string;
}): Promise<{
  success: boolean;
  product_existed: boolean;
  printful_product_id?: number;
  external_id?: string;
  print_ready_url?: string;
  mockup_urls?: string[];
  retail_price?: string;
  prep_warnings?: string[];
  error?: string;
}> {
  try {
    // 1. Check if product already exists
    const existing = await findExistingProduct({
      title: params.title,
      source_image_url: params.source_image_url
    });

    if (existing.product) {
      console.log('[phyllis] Using existing product:', existing.product.printful_product_id);
      return {
        success: true,
        product_existed: true,
        printful_product_id: existing.product.printful_product_id,
        external_id: existing.product.external_id,
        print_ready_url: existing.product.design_url,
        mockup_urls: existing.product.mockup_urls,
        retail_price: existing.product.retail_price
      };
    }

    // 2. Product doesn't exist - prepare the image for print
    console.log('[phyllis] Product does not exist, preparing image for print...');

    const prep = await prepareImageForPrint({
      source_image_url: params.source_image_url,
      image_key: params.image_key,
      product_type: params.product_type || 'shirt',
      remove_background: true,
      upscale: true,
      sharpen: true
    });

    if (!prep.success || !prep.printReadyUrl || !prep.qualityPassed) {
      throw new Error(prep.error || 'Print preparation failed quality check');
    }

    // 3. Create the product with the print-ready URL
    console.log('[phyllis] Creating product with print-ready URL:', prep.printReadyUrl);

    const product = await createProductWithPhyllis({
      design_url: prep.printReadyUrl,
      source_image_url: params.source_image_url, // Pass through for traceability
      title: params.title,
      description: params.description,
      colors: params.colors || ['black']
    });

    if (!product.success) {
      throw new Error(product.error || 'Product creation failed');
    }

    console.log('[phyllis] Product created successfully:', product.printful_product_id);

    return {
      success: true,
      product_existed: false,
      printful_product_id: product.printful_product_id,
      print_ready_url: prep.printReadyUrl,
      mockup_urls: product.mockups ? Object.values(product.mockups) : undefined,
      retail_price: params.retail_price || '29.99',
      prep_warnings: prep.warnings
    };

  } catch (error) {
    const err = error as Error;
    console.error('[phyllis] Error ensuring product exists:', err);
    return {
      success: false,
      product_existed: false,
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
  source_image_url?: string;
  image_key?: string;
  client_id?: string;          // defaults to 'discountpunk'
  catalog_product_id?: number; // Printful catalog ID; Phyllis uses its default if omitted
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

    let designUrl = params.design_url;

    const sourceImageUrl = params.source_image_url || params.design_url;
    const imageKey = params.image_key || getS3ImageKey(sourceImageUrl);
    const shouldPrepareBeforeCreate = !params.design_url.includes('/print-ready/');

    if (shouldPrepareBeforeCreate) {
      console.log('[phyllis] Preparing print-ready file before product creation:', sourceImageUrl);

      const prep = await prepareImageForPrint({
        source_image_url: sourceImageUrl,
        image_key: imageKey,
        product_type: 'shirt',
        remove_background: true,
        upscale: true,
        sharpen: true
      });

      if (!prep.success || !prep.printReadyUrl || !prep.qualityPassed) {
        throw new Error(`Print prep failed before product creation: ${prep.error || 'Quality check failed'}`);
      }

      designUrl = prep.printReadyUrl;
      console.log('[phyllis] Using print-ready URL for product creation:', designUrl);
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
        design_url: designUrl,
        source_image_url: params.source_image_url || params.design_url,
        title: params.title,
        colors: params.colors || ['black'],
        description: params.description,
        client_id: params.client_id || 'discountpunk',
        ...(params.catalog_product_id ? { catalog_product_id: params.catalog_product_id } : {})
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

      // Check if this is a DPI rejection (422 status)
      if (response.status === 422 && errorData.error?.toLowerCase().includes('dpi')) {
        console.log('[phyllis] DPI rejection detected, attempting print-prep...');

        // If we have a source_image_url, try print-prep and retry
        if (params.source_image_url) {
          console.log('[phyllis] Calling print-prep with source image:', params.source_image_url);

          const prep = await prepareImageForPrint({
            source_image_url: params.source_image_url,
            image_key: params.image_key,
            product_type: 'shirt', // Default to shirt
            remove_background: true,
            upscale: true,
            sharpen: true
          });

          if (!prep.success || !prep.printReadyUrl || !prep.qualityPassed) {
            throw new Error(`Print prep failed after DPI rejection: ${prep.error || 'Quality check failed'}`);
          }

          console.log('[phyllis] Print-prep successful, retrying product creation with:', prep.printReadyUrl);

          // Retry product creation with print-ready URL
          const retryResponse = await fetch(`${phyllisBaseUrl}/api/products/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': phyllisApiKey
            },
            body: JSON.stringify({
              design_url: prep.printReadyUrl,
              source_image_url: params.source_image_url,
              title: params.title,
              colors: params.colors || ['black'],
              description: params.description,
              client_id: params.client_id || 'discountpunk',
              ...(params.catalog_product_id ? { catalog_product_id: params.catalog_product_id } : {})
            })
          });

          if (!retryResponse.ok) {
            const retryError = await retryResponse.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Phyllis rejected even after print-prep: ${retryError.error || retryResponse.statusText}`);
          }

          const retryData = await retryResponse.json();
          console.log('[phyllis] Product created successfully after print-prep:', retryData.printful_product_id);

          return {
            success: true,
            printful_product_id: retryData.printful_product_id,
            price: retryData.price,
            sizes: retryData.sizes,
            variants: retryData.variants,
            mockups: retryData.mockups
          };
        }
      }

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
