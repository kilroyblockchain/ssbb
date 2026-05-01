import express from 'express';
import { readContent, addProduct, createProductPage, createComicPage } from '../services/discountpunk.js';

const router = express.Router();

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
    const { title, price, description, imagePrompt, fullDescription } = req.body;

    if (!title || !price || !description) {
      return res.status(400).json({ error: 'Missing required fields: title, price, description' });
    }

    const product = await addProduct({ title, price, description }, imagePrompt);

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
    const { issue, title, coverImagePrompt, content } = req.body;

    if (!issue || !title || !coverImagePrompt || !content) {
      return res.status(400).json({ error: 'Missing required fields: issue, title, coverImagePrompt, content' });
    }

    const pageUrl = await createComicPage(issue, title, coverImagePrompt, content);
    res.json({ success: true, pageUrl });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create comic' });
  }
});

export default router;
