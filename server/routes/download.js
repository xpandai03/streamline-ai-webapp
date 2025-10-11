const express = require('express');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/:clipId', (req, res) => {
  const { clipId } = req.params;

  // Support both "clipId" and "final-clipId" patterns
  const filename = clipId.endsWith('.mp4') ? clipId : `${clipId}.mp4`;
  const clipPath = path.join(__dirname, '../../public/temp', filename);

  if (!fs.existsSync(clipPath)) {
    logger.error(`Clip not found: ${clipId}`);
    return res.status(404).json({ error: 'Clip not found' });
  }

  res.download(clipPath, `overlap-clip-${clipId}.mp4`, (err) => {
    if (err) {
      logger.error(`Download error for ${clipId}:`, err);
      res.status(500).json({ error: 'Download failed' });
    }
  });
});

module.exports = router;
