import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { url, filename } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const videoResponse = await fetch(url);
    if (!videoResponse.ok) throw new Error(`Failed to fetch video`);

    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'video.mp4'}"`);
    res.setHeader('Content-Type', videoResponse.headers.get('content-type') || 'video/mp4');

    if (videoResponse.body && typeof videoResponse.body.pipe === 'function') {
      videoResponse.body.pipe(res);
    } else {
      const buffer = await videoResponse.buffer();
      res.send(buffer);
    }

  } catch (error) {
    res.status(500).json({ error: 'Failed to download video' });
  }
}
