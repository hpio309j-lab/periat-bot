const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fetch = require('node-fetch');
const sharp = require('sharp');
const path = require("path");

function registerCustomFonts() {
    try {
        GlobalFonts.registerFromPath(path.join(__dirname, 'fonts', 'Roboto-Bold.ttf'), 'Roboto');
        GlobalFonts.registerFromPath(path.join(__dirname, 'fonts', 'Roboto-Regular.ttf'), 'Roboto');
        GlobalFonts.registerFromPath(path.join(__dirname, 'fonts', 'Roboto-Italic.ttf'), 'Roboto');
        console.log("✅ Custom fonts registered successfully.");
    } catch (error) {
        console.error("❌ Error registering custom fonts:", error);
    }
}
registerCustomFonts();

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

function wrapAndTruncateText(ctx, text, x, y, maxWidth, maxChars, lineHeight) {
    let truncatedText = text;
    if (truncatedText.length > maxChars) {
        truncatedText = truncatedText.substring(0, maxChars - 3) + '...';
    }

    const words = truncatedText.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, y);
            line = words[n] + ' ';
            y += lineHeight;
        }
        else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), x, y);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    return ctx;
}

async function getImageBuffer(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            throw new Error(`Unsupported image type: ${contentType}`);
        }
        const buffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(buffer);

        const jpegBuffer = await sharp(imageBuffer)
            .jpeg()
            .toBuffer();

        return jpegBuffer;
    } catch (error) {
        console.error("❌ Error fetching or converting image buffer:", error);
        throw error;
    }
}

async function generateMusicCard(song, currentTime, totalTime, queue) {
    try {
        if (!song) {
            throw new Error("Song object is undefined.");
        }

        const width = 1200;
        const height = 500;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        ctx.antialias = 'subpixel';

        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#141E30');
        gradient.addColorStop(1, '#243B55');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(20, 30, 48, 0.3)';
        ctx.fillRect(0, 0, width, height);

        const thumbnailSize = 300;
        const thumbnailX = 50;
        const thumbnailY = (height - thumbnailSize) / 2;
        let thumbnail;
        try {
            if (!song.thumbnail) {
                console.warn("⚠️ No thumbnail URL provided, using default image.");
                thumbnail = await loadImage(path.join(__dirname, 'images', 'default-thumbnail.jpg'));
            } else {
                const thumbnailBuffer = await getImageBuffer(song.thumbnail);
                thumbnail = await loadImage(thumbnailBuffer);
            }
        } catch (error) {
            console.error("❌ Error loading thumbnail:", error);
            try {
                thumbnail = await loadImage(path.join(__dirname, 'images', 'default-thumbnail.jpg'));
            } catch (fallbackError) {
                console.error("❌ Error loading default thumbnail:", fallbackError);
                return null;
            }
        }

        ctx.save();
        drawRoundedRect(ctx, thumbnailX, thumbnailY, thumbnailSize, thumbnailSize, 20);
        ctx.clip();
        ctx.drawImage(thumbnail, thumbnailX, thumbnailY, thumbnailSize, thumbnailSize);
        ctx.restore();

        ctx.strokeStyle = '#66FCF1';
        ctx.lineWidth = 5;
        drawRoundedRect(ctx, thumbnailX, thumbnailY, thumbnailSize, thumbnailSize, 20);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 50px Roboto';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        const maxTitleWidth = 700;
        const maxTitleChars = 50;
        wrapAndTruncateText(ctx, song.name, 400, 50, maxTitleWidth, maxTitleChars, 60);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#66FCF1';
        ctx.font = '28px Roboto';
        const authorText = song.user ? `By ${song.user.username}` : 'By Unknown';
        const maxAuthorWidth = 700;
        const maxAuthorChars = 40;
        wrapAndTruncateText(ctx, authorText, 400, 290, maxAuthorWidth, maxAuthorChars, 35);

        if (song.album && song.album.name) {
            ctx.fillStyle = '#C5C6C7';
            ctx.font = '24px Roboto';
            const albumText = `Album: ${song.album.name}`;
            const maxAlbumWidth = 700;
            const maxAlbumChars = 50;
            wrapAndTruncateText(ctx, albumText, 400, 210, maxAlbumWidth, maxAlbumChars, 30);
        }

        if (song.genre || song.releaseDate) {
            ctx.fillStyle = '#C5C6C7';
            ctx.font = '24px Roboto';
            const genreText = song.genre ? `Genre: ${song.genre}` : '';
            const releaseDateText = song.releaseDate ? `Released: ${song.releaseDate}` : '';
            const combinedText = [genreText, releaseDateText].filter(text => text).join(' | ');
            const maxInfoWidth = 700;
            const maxInfoChars = 60;
            wrapAndTruncateText(ctx, combinedText, 400, 260, maxInfoWidth, maxInfoChars, 30);
        }

        const progressBarWidth = 700;
        const progressBarHeight = 30;
        const progressBarX = 400;
        const progressBarY = 330;
        ctx.fillStyle = '#3A3B3C';
        drawRoundedRect(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, 15);
        ctx.fill();

        const progress = Math.min(currentTime / totalTime, 1) * progressBarWidth;
        const gradientProgress = ctx.createLinearGradient(progressBarX, 0, progressBarX + progress, 0);
        gradientProgress.addColorStop(0, '#66FCF1');
        gradientProgress.addColorStop(1, '#45A29E');
        ctx.fillStyle = gradientProgress;
        drawRoundedRect(ctx, progressBarX, progressBarY, progress, progressBarHeight, 15);
        ctx.fill();

        ctx.fillStyle = '#C5C6C7';
        ctx.font = '20px Roboto';
        const currentFormatted = formatTime(currentTime);
        const totalFormatted = formatTime(totalTime);
        ctx.fillText(`${currentFormatted} / ${totalFormatted}`, progressBarX, progressBarY + 40);

        ctx.fillStyle = '#C5C6C7';
        ctx.font = '20px Roboto';
        ctx.fillText(`Volume: ${queue.volume}%`, 400, 390);
        const repeatModeText = queue.repeatMode === 0 ? "Off" :
            queue.repeatMode === 1 ? "Repeat Song" :
                "Repeat Queue";
        ctx.fillText(`Repeat: ${repeatModeText}`, 600, 390);

        ctx.strokeStyle = '#66FCF1';
        ctx.lineWidth = 5;
        drawRoundedRect(ctx, 20, 20, width - 40, height - 40, 25);
        ctx.stroke();

        const buffer = canvas.toBuffer();
        console.log("💾 Music card image buffer generated.");
        return buffer;
    } catch (error) {
        console.error("❌ Error generating music card:", error);
        return null;
    }
}

module.exports = generateMusicCard;
