const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { request } = require('undici');
const path = require('path');
const fs = require('fs');

// Function to create a welcome card
async function createWelcomeCard(member, guildConfig) {
    // Set up canvas
    const canvas = createCanvas(1024, 500);
    const ctx = canvas.getContext('2d');
    
    // Default background
    let background;
    
    if (guildConfig.welcome.cardBackground === 'default' || !guildConfig.welcome.cardBackground) {
        // Using a gradient as default background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(1, '#3498db');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        // Load custom background
        try {
            background = await loadImage(guildConfig.welcome.cardBackground);
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        } catch (error) {
            console.error('Error loading background image, using default gradient:', error);
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#2c3e50');
            gradient.addColorStop(1, '#3498db');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    // Add semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw server icon (if available)
    try {
        const serverIcon = await loadImage(member.guild.iconURL({ extension: 'png', size: 128 }));
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width - 100, 100, 50, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(serverIcon, canvas.width - 150, 50, 100, 100);
        ctx.restore();
    } catch (error) {
        console.error('Error loading server icon:', error);
    }
    
    // Draw user avatar
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 512 });
    const avatar = await loadImage(avatarURL);
    
    // Create circular avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 170, 120, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, (canvas.width / 2) - 120, 50, 240, 240);
    ctx.restore();
    
    // Add avatar border
    ctx.strokeStyle = guildConfig.welcome.cardTextColor || '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 170, 120, 0, Math.PI * 2);
    ctx.closePath();
    ctx.stroke();
    
    // Text color (default to white if not specified)
    ctx.fillStyle = guildConfig.welcome.cardTextColor || '#ffffff';
    
    // Welcome text
    ctx.font = 'bold 60px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WELCOME', canvas.width / 2, 350);
    
    // Username text
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(member.user.username, canvas.width / 2, 400);
    
    // Member count text
    ctx.font = '30px sans-serif';
    ctx.fillText(`You are member #${member.guild.memberCount}`, canvas.width / 2, 450);
    
    // Return canvas buffer
    return canvas.toBuffer();
}

async function createGoodbyeCard(member, guildConfig) {
    const canvas = createCanvas(1024, 500);
    const ctx = canvas.getContext('2d');
    
    let background;
    
    if (guildConfig.goodbye && guildConfig.goodbye.cardBackground) {
        try {
            background = await loadImage(guildConfig.goodbye.cardBackground);
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        } catch (error) {
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#34495e');
            gradient.addColorStop(1, '#e74c3c');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    } else {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#34495e');
        gradient.addColorStop(1, '#e74c3c');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    try {
        const serverIcon = await loadImage(member.guild.iconURL({ extension: 'png', size: 128 }));
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width - 100, 100, 50, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(serverIcon, canvas.width - 150, 50, 100, 100);
        ctx.restore();
    } catch (error) {
        console.error('Error loading server icon:', error);
    }
    
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 512 });
    const avatar = await loadImage(avatarURL);
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 170, 120, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, (canvas.width / 2) - 120, 50, 240, 240);
    ctx.restore();
    
    const textColor = (guildConfig.goodbye && guildConfig.goodbye.cardTextColor) || '#ffffff';
    
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 170, 120, 0, Math.PI * 2);
    ctx.closePath();
    ctx.stroke();
    
    ctx.fillStyle = textColor;
    
    ctx.font = 'bold 60px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GOODBYE', canvas.width / 2, 350);
    
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(member.user.username, canvas.width / 2, 400);
    
    ctx.font = '30px sans-serif';
    ctx.fillText(`We'll miss you!`, canvas.width / 2, 450);
    
    return canvas.toBuffer();
}

module.exports = {
    createWelcomeCard,
    createGoodbyeCard
}; 