// GO7 Delivery Replay Export Functions
// Handles video/GIF export using Puppeteer and FFmpeg

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const puppeteer = require('puppeteer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

const storage = new Storage();

// Export replay as GIF or MP4
exports.exportReplay = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB'
  })
  .https.onCall(async (data, context) => {
    try {
      // Verify authentication
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { orderId, format = 'gif', options = {} } = data;
      
      if (!orderId) {
        throw new functions.https.HttpsError('invalid-argument', 'orderId is required');
      }

      // Fetch delivery route data
      const routeDoc = await admin.firestore().doc(`deliveryRoutes/${orderId}`).get();
      
      if (!routeDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Delivery route not found');
      }

      const routeData = routeDoc.data();
      
      // Verify user has access to this route
      if (routeData.userId !== context.auth.uid && !isAdmin(context.auth)) {
        throw new functions.https.HttpsError('permission-denied', 'Access denied');
      }

      console.log(`Starting export for order ${orderId} in ${format} format`);

      // Generate export
      const exportResult = await generateReplayExport(routeData, format, options);
      
      // Save export metadata
      await admin.firestore().collection('routeExports').add({
        orderId,
        userId: context.auth.uid,
        format,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        downloadUrl: exportResult.downloadUrl,
        fileSize: exportResult.fileSize,
        duration: exportResult.duration,
        options
      });

      return {
        success: true,
        downloadUrl: exportResult.downloadUrl,
        fileSize: exportResult.fileSize,
        duration: exportResult.duration
      };

    } catch (error) {
      console.error('Export error:', error);
      throw new functions.https.HttpsError('internal', `Export failed: ${error.message}`);
    }
  });

// Main export generation function
async function generateReplayExport(routeData, format, options) {
  const {
    width = 800,
    height = 600,
    fps = 30,
    speedMultiplier = 4,
    quality = 'medium'
  } = options;

  // Create temporary directory
  const tempDir = path.join(os.tmpdir(), `export-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Generate frames using Puppeteer
    const framesPaths = await generateFrames(routeData, {
      width,
      height,
      fps,
      speedMultiplier,
      tempDir
    });

    console.log(`Generated ${framesPaths.length} frames`);

    // Create video/GIF from frames
    const outputPath = path.join(tempDir, `replay.${format}`);
    
    if (format === 'gif') {
      await createGIF(framesPaths, outputPath, fps);
    } else {
      await createVideo(framesPaths, outputPath, fps, quality);
    }

    // Upload to Cloud Storage
    const uploadResult = await uploadFile(outputPath, routeData.orderId, format);
    
    // Get file stats
    const stats = await fs.stat(outputPath);
    
    return {
      downloadUrl: uploadResult.downloadUrl,
      fileSize: stats.size,
      duration: framesPaths.length / fps
    };

  } finally {
    // Cleanup temporary files
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }
}

// Generate frames using headless browser
async function generateFrames(routeData, options) {
  const { width, height, fps, speedMultiplier, tempDir } = options;
  const { path: routePath } = routeData;
  
  if (!routePath || routePath.length === 0) {
    throw new Error('No route data available');
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height });

  try {
    // Create HTML template for map rendering
    const htmlTemplate = createMapTemplate(routeData, width, height);
    await page.setContent(htmlTemplate);

    // Wait for map to load
    await page.waitForSelector('#map', { timeout: 30000 });
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));

    // Calculate timing
    const startTs = routePath[0].ts;
    const endTs = routePath[routePath.length - 1].ts;
    const totalDuration = endTs - startTs;
    const exportDuration = totalDuration / speedMultiplier;
    const frameCount = Math.ceil((exportDuration / 1000) * fps);
    const frameInterval = exportDuration / frameCount;

    console.log(`Generating ${frameCount} frames over ${exportDuration/1000}s`);

    const framesPaths = [];

    // Generate frames
    for (let i = 0; i < frameCount; i++) {
      const progress = i / (frameCount - 1);
      const currentTs = startTs + (totalDuration * progress);
      
      // Update marker position
      await page.evaluate((timestamp) => {
        // eslint-disable-next-line no-undef
        if (window.updateMarkerPosition) {
          // eslint-disable-next-line no-undef
          window.updateMarkerPosition(timestamp);
        }
      }, currentTs);

      // Wait for animation
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 50)));

      // Capture frame
      const framePath = path.join(tempDir, `frame-${i.toString().padStart(4, '0')}.png`);
      await page.screenshot({
        path: framePath,
        clip: { x: 0, y: 0, width, height }
      });

      framesPaths.push(framePath);
      
      if (i % 10 === 0) {
        console.log(`Generated frame ${i + 1}/${frameCount}`);
      }
    }

    return framesPaths;

  } finally {
    await browser.close();
  }
}

// Create HTML template for map rendering
function createMapTemplate(routeData, width, height) {
  const { path: routePath, orderId } = routeData;
  const googleMapsApiKey = functions.config().googlemaps?.apikey || process.env.GOOGLE_MAPS_API_KEY;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Go7 Delivery Replay Export</title>
      <style>
        body, html { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        #map { width: ${width}px; height: ${height}px; }
        #overlay {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 10px 15px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
        }
        #progress {
          position: absolute;
          bottom: 20px;
          left: 20px;
          right: 20px;
          height: 4px;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
          overflow: hidden;
        }
        #progress-bar {
          height: 100%;
          background: #ef4444;
          width: 0%;
          transition: width 0.1s ease;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div id="overlay">
        <div>Order: ${orderId}</div>
        <div id="timestamp">00:00</div>
      </div>
      <div id="progress">
        <div id="progress-bar"></div>
      </div>

      <script>
        let map, marker, polyline;
        let routeData = ${JSON.stringify(routePath)};
        let startTs = ${routePath[0].ts};
        let endTs = ${routePath[routePath.length - 1].ts};

        function initMap() {
          // Calculate map bounds
          const bounds = new google.maps.LatLngBounds();
          routeData.forEach(point => {
            bounds.extend({ lat: point.lat, lng: point.lng });
          });

          // Initialize map
          map = new google.maps.Map(document.getElementById('map'), {
            zoom: 14,
            center: bounds.getCenter(),
            disableDefaultUI: true,
            styles: [
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', stylers: [{ visibility: 'simplified' }] }
            ]
          });

          map.fitBounds(bounds, { top: 50, bottom: 80, left: 50, right: 50 });

          // Create route polyline
          polyline = new google.maps.Polyline({
            path: routeData.map(p => ({ lat: p.lat, lng: p.lng })),
            geodesic: true,
            strokeColor: '#E0001B',
            strokeOpacity: 0.8,
            strokeWeight: 4
          });
          polyline.setMap(map);

          // Create animated marker
          marker = new google.maps.Marker({
            position: { lat: routeData[0].lat, lng: routeData[0].lng },
            map: map,
            icon: {
              url: 'data:image/svg+xml,' + encodeURIComponent(\`
                <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="12" fill="#ef4444" stroke="white" stroke-width="2"/>
                  <path d="M10 16 L14 16 L16 12 L20 12 L21 16 L10 16 Z" fill="white"/>
                  <circle cx="12" cy="18" r="1.5" fill="white"/>
                  <circle cx="18" cy="18" r="1.5" fill="white"/>
                </svg>
              \`),
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 16)
            },
            zIndex: 1000
          });
        }

        // Update marker position based on timestamp
        window.updateMarkerPosition = function(timestamp) {
          const progress = Math.max(0, Math.min(1, (timestamp - startTs) / (endTs - startTs)));
          
          // Find nearest route points for interpolation
          let nearestIndex = 0;
          for (let i = 0; i < routeData.length - 1; i++) {
            if (routeData[i].ts <= timestamp && routeData[i + 1].ts >= timestamp) {
              nearestIndex = i;
              break;
            }
          }

          const point1 = routeData[nearestIndex];
          const point2 = routeData[Math.min(nearestIndex + 1, routeData.length - 1)];
          
          let lat, lng;
          if (point1.ts === point2.ts) {
            lat = point1.lat;
            lng = point1.lng;
          } else {
            const segmentProgress = (timestamp - point1.ts) / (point2.ts - point1.ts);
            lat = point1.lat + (point2.lat - point1.lat) * segmentProgress;
            lng = point1.lng + (point2.lng - point1.lng) * segmentProgress;
          }

          // Update marker position
          marker.setPosition({ lat, lng });

          // Update overlay
          const date = new Date(timestamp);
          document.getElementById('timestamp').textContent = 
            date.getMinutes().toString().padStart(2, '0') + ':' + 
            date.getSeconds().toString().padStart(2, '0');
          
          document.getElementById('progress-bar').style.width = (progress * 100) + '%';
        };
      </script>
      <script src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&callback=initMap"></script>
    </body>
    </html>
  `;
}

// Create GIF from frames using FFmpeg
async function createGIF(framesPaths, outputPath, fps) {
  return new Promise((resolve, reject) => {
    const firstFrame = framesPaths[0];
    
    ffmpeg(firstFrame)
      .inputOptions([
        `-framerate ${fps}`,
        `-pattern_type glob`,
        `-i "${path.dirname(firstFrame)}/frame-*.png"`
      ])
      .outputOptions([
        '-vf "fps=15,scale=800:-1:flags=lanczos,palettegen=reserve_transparent=0"',
        '-y'
      ])
      .output(outputPath.replace('.gif', '_palette.png'))
      .on('end', () => {
        // Second pass: create GIF with palette
        ffmpeg(firstFrame)
          .inputOptions([
            `-framerate ${fps}`,
            `-pattern_type glob`,
            `-i "${path.dirname(firstFrame)}/frame-*.png"`
          ])
          .input(outputPath.replace('.gif', '_palette.png'))
          .complexFilter([
            'fps=15,scale=800:-1:flags=lanczos [v]',
            '[v][1:v] paletteuse=dither=bayer:bayer_scale=3'
          ])
          .output(outputPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      })
      .on('error', reject)
      .run();
  });
}

// Create MP4 video from frames
async function createVideo(framesPaths, outputPath, fps, quality) {
  return new Promise((resolve, reject) => {
    const firstFrame = framesPaths[0];
    
    const qualitySettings = {
      low: ['-crf', '28'],
      medium: ['-crf', '23'],
      high: ['-crf', '18']
    };

    ffmpeg(firstFrame)
      .inputOptions([
        `-framerate ${fps}`,
        `-pattern_type glob`,
        `-i "${path.dirname(firstFrame)}/frame-*.png"`
      ])
      .outputOptions([
        '-c:v libx264',
        '-preset medium',
        ...qualitySettings[quality] || qualitySettings.medium,
        '-pix_fmt yuv420p',
        '-movflags +faststart',
        '-y'
      ])
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

// Upload file to Cloud Storage
async function uploadFile(filePath, orderId, format) {
  const bucketName = functions.config().storage?.bucket || 'go7-replay-exports';
  const fileName = `replays/${orderId}_${Date.now()}.${format}`;
  
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);
  
  await bucket.upload(filePath, {
    destination: fileName,
    metadata: {
      cacheControl: 'public, max-age=86400',
      contentType: format === 'gif' ? 'image/gif' : 'video/mp4'
    }
  });

  // Create signed URL valid for 7 days
  const [downloadUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000
  });

  return { downloadUrl };
}

// Helper function to check admin status
function isAdmin(auth) {
  return auth.token?.role === 'admin' || auth.token?.admin === true;
}

// Batch export function for admin use
exports.batchExportReplays = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB'
  })
  .https.onCall(async (data, context) => {
    try {
      // Verify admin access
      if (!context.auth || !isAdmin(context.auth)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
      }

      const { orderIds, format = 'mp4', options = {} } = data;
      
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'orderIds array is required');
      }

      const results = [];
      
      for (const orderId of orderIds) {
        try {
          const routeDoc = await admin.firestore().doc(`deliveryRoutes/${orderId}`).get();
          
          if (routeDoc.exists) {
            const exportResult = await generateReplayExport(routeDoc.data(), format, options);
            results.push({
              orderId,
              success: true,
              ...exportResult
            });
          } else {
            results.push({
              orderId,
              success: false,
              error: 'Route not found'
            });
          }
        } catch (error) {
          results.push({
            orderId,
            success: false,
            error: error.message
          });
        }
      }

      return { results };

    } catch (error) {
      console.error('Batch export error:', error);
      throw new functions.https.HttpsError('internal', `Batch export failed: ${error.message}`);
    }
  });