const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function generateDefaultThumbnail() {
    const size = 300;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#141E30');
    gradient.addColorStop(1, '#243B55');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Music note symbol
    ctx.fillStyle = '#66FCF1';
    ctx.font = 'bold 150px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♪', size/2, size/2);

    // Add a subtle glow effect
    ctx.shadowColor = '#66FCF1';
    ctx.shadowBlur = 20;
    ctx.fillText('♪', size/2, size/2);

    // Save the image
    const buffer = canvas.toBuffer('image/jpeg');
    const outputPath = path.join(__dirname, 'images', 'default-thumbnail.jpg');
    fs.writeFileSync(outputPath, buffer);
    console.log('✅ Default thumbnail generated successfully');
}

generateDefaultThumbnail().catch(console.error);
