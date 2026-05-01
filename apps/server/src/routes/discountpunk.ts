import express from 'express';
import { readContent, addProduct, createProductPage, createComicPage, addVideo } from '../services/discountpunk.js';

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

export default router;
