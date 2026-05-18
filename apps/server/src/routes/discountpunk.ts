import express from 'express';
import Stripe from 'stripe';
import { readContent, addProduct, createProductPage, createComicPage, addVideo, deleteProduct, deleteVideo, deleteComic } from '../services/discountpunk.js';
import { hydratePhyllisConfig } from '../services/secrets.js';
import { config } from '../config.js';

const router = express.Router();

function sanitizePhyllisAssetUrl(url: unknown): unknown {
  if (typeof url !== 'string') return url;

  if (url.includes("discount-punk/mockups/i'm-a-butt-bitch,-too-tee-mockup-0.png")) {
    return 'https://ssbb-media-prod.s3.amazonaws.com/discount-punk/mockups/im-a-butt-bitch-too-tee-mockup-0.png';
  }

  return url;
}

function sanitizePhyllisProduct(product: any): any {
  return {
    ...product,
    mockup_urls: Array.isArray(product.mockup_urls) ? product.mockup_urls.map(sanitizePhyllisAssetUrl) : product.mockup_urls,
    mockups: Array.isArray(product.mockups) ? product.mockups.map(sanitizePhyllisAssetUrl) : product.mockups,
    image: sanitizePhyllisAssetUrl(product.image)
  };
}

function getProductMockupUrl(product: any): string | undefined {
  if (!product) return undefined;

  const mockup = Array.isArray(product.mockup_urls) ? product.mockup_urls[0] : undefined;
  if (typeof mockup === 'string') return sanitizePhyllisAssetUrl(mockup) as string;

  if (product.mockups && typeof product.mockups === 'object') {
    const front = product.mockups.front;
    if (typeof front === 'string') return sanitizePhyllisAssetUrl(front) as string;

    const first = Object.values(product.mockups).find((value): value is string => typeof value === 'string');
    if (first) return sanitizePhyllisAssetUrl(first) as string;
  }

  return typeof product.image === 'string' ? sanitizePhyllisAssetUrl(product.image) as string : undefined;
}

function getProductPrintUrl(product: any): string | undefined {
  if (!product) return undefined;

  return typeof product.print_ready_url === 'string' ? product.print_ready_url
    : typeof product.design_url === 'string' ? product.design_url
      : typeof product.designUrl === 'string' ? product.designUrl
        : undefined;
}

async function fetchPhyllisProductByPrintfulId(
  phyllisBaseUrl: string,
  printfulProductId: string | number
): Promise<any | undefined> {
  const response = await fetch(`${phyllisBaseUrl}/api/products?client_slug=discount-punk`);
  if (!response.ok) {
    throw new Error(`Phyllis product lookup failed: ${response.statusText}`);
  }

  const data = await response.json();
  const products = Array.isArray(data.products) ? data.products : [];
  return products.find((product: any) => String(product.printful_product_id ?? product.provider_product_id ?? product.id) === String(printfulProductId));
}

// Initialize Stripe (will be hydrated from secrets)
let stripe: Stripe | null = null;
async function getStripe(): Promise<Stripe> {
  if (!stripe) {
    await hydratePhyllisConfig(); // This hydrates both Phyllis and Stripe keys
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' });
  }
  return stripe;
}

// Get current site content
router.get('/content', async (req, res) => {
  try {
    const content = await readContent();
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to read content' });
  }
});

// Add a new product
router.post('/product', async (req, res) => {
  try {
    const { title, price, description, imagePrompt, existingImageKey, fullDescription } = req.body;

    if (!title || !price || !description) {
      return res.status(400).json({ error: 'Missing required fields: title, price, description' });
    }

    const product = await addProduct({ title, price, description }, imagePrompt, existingImageKey);

    // Create dedicated product page if fullDescription provided
    if (fullDescription) {
      const pageUrl = await createProductPage(product, fullDescription);
      return res.json({ success: true, product, pageUrl });
    }

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to add product' });
  }
});

// Create a comic issue
router.post('/comic', async (req, res) => {
  try {
    const { issue, title, coverImagePrompt, coverImageKey, content } = req.body;

    if (!issue || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields: issue, title, content' });
    }

    if (!coverImagePrompt && !coverImageKey) {
      return res.status(400).json({ error: 'Must provide either coverImagePrompt or coverImageKey' });
    }

    const pageUrl = await createComicPage(issue, title, coverImagePrompt, coverImageKey, content);
    res.json({ success: true, pageUrl });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create comic' });
  }
});

// Add a video from gallery
router.post('/video', async (req, res) => {
  try {
    const { title, description, videoKey, thumbnailKey } = req.body;

    if (!title || !description || !videoKey) {
      return res.status(400).json({ error: 'Missing required fields: title, description, videoKey' });
    }

    const video = await addVideo({ title, description, videoKey, thumbnailKey });
    res.json({ success: true, video });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to add video' });
  }
});

// Delete a product by title
router.delete('/product/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const deleted = await deleteProduct(decodeURIComponent(title));

    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete product' });
  }
});

// Delete a video by title
router.delete('/video/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const deleted = await deleteVideo(decodeURIComponent(title));

    if (!deleted) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete video' });
  }
});

// Delete a comic by title
router.delete('/comic/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const deleted = await deleteComic(decodeURIComponent(title));

    if (!deleted) {
      return res.status(404).json({ error: 'Comic not found' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete comic' });
  }
});

// Proxy to Phyllis product catalog
router.get('/products', async (req, res) => {
  try {
    await hydratePhyllisConfig();
    const phyllisBaseUrl = process.env.PHYLLIS_BASE_URL || 'https://phyllis-fills.replit.app';

    const response = await fetch(`${phyllisBaseUrl}/api/products?client_slug=discount-punk`);
    if (!response.ok) {
      throw new Error(`Phyllis API returned ${response.status}`);
    }

    const data = await response.json();
    const products = Array.isArray(data.products) ? data.products.map(sanitizePhyllisProduct) : data.products;
    res.json({ ...data, products });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch products from Phyllis' });
  }
});

// Create Stripe checkout session via Phyllis
router.post('/checkout/create-session', async (req, res) => {
  try {
    const { printful_product_id, size, quantity = 1, success_url, cancel_url } = req.body;

    if (!Array.isArray(req.body.items) && (!printful_product_id || !size)) {
      return res.status(400).json({ error: 'Missing required fields: items, or printful_product_id and size' });
    }

    await hydratePhyllisConfig();
    const phyllisApiKey = process.env.PHYLLIS_API_KEY;
    const phyllisBaseUrl = process.env.PHYLLIS_BASE_URL || 'https://phyllis-fills.replit.app';

    if (!phyllisApiKey) {
      throw new Error('PHYLLIS_API_KEY not configured');
    }

    let checkoutBody: Record<string, unknown>;
    if (Array.isArray(req.body.items)) {
      checkoutBody = {
        items: req.body.items,
        success_url: success_url || 'https://discountpunk.com/success.html',
        cancel_url: cancel_url || 'https://discountpunk.com/shop.html'
      };
    } else {
      const product = await fetchPhyllisProductByPrintfulId(phyllisBaseUrl, printful_product_id);
      const imageUrl = getProductMockupUrl(product);
      const printUrl = getProductPrintUrl(product);

      checkoutBody = {
        printful_product_id,
        size,
        quantity,
        items: product ? [{
          productTitle: product.title || product.name || 'Discount Punk Tee',
          productType: product.product_type || product.productType || 'tshirt',
          imageUrl,
          printUrl,
          size,
          quantity,
          price: Number(product.price || 29.99)
        }] : undefined,
        success_url: success_url || 'https://discountpunk.com/success.html',
        cancel_url: cancel_url || 'https://discountpunk.com/shop.html'
      };
    }

    console.log('[discountpunk] Creating checkout session:', {
      printful_product_id,
      size,
      quantity,
      itemCount: Array.isArray(checkoutBody.items) ? checkoutBody.items.length : 0
    });

    const response = await fetch(`${phyllisBaseUrl}/api/discountpunk/checkout/create-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': phyllisApiKey
      },
      body: JSON.stringify(checkoutBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Phyllis checkout failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    console.log('[discountpunk] Checkout session created:', data.url);
    res.json(data);
  } catch (err) {
    console.error('[discountpunk] Checkout error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create checkout session' });
  }
});

export default router;
