const { SlashCommandBuilder } = require('@discordjs/builders');
const { AttachmentBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { request } = require('undici');
const path = require('path');
const fs = require('fs').promises;

async function getImageFromURL(url) {
    try {
        const response = await request(url);
        const buffer = await response.body.arrayBuffer();
        return await loadImage(Buffer.from(buffer));
    } catch (error) {
        console.error('Error loading image:', error);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('عرض البروفايل الخاص بك او بروفايل شخص اخر')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('الشخص الذي تريد عرض البروفايل الخاص به')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id);

        // Create canvas with high quality settings
        const canvas = createCanvas(1500, 600);
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Background (dark theme)
        ctx.fillStyle = '#0f0f0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Try to load banner
        try {
            const bannerUrl = targetUser.bannerURL({ extension: 'png', size: 4096 });
            if (!bannerUrl) {
                // If no banner, try getting it from member
                const fetchedUser = await member.user.fetch();
                const memberBannerUrl = fetchedUser.bannerURL({ extension: 'png', size: 4096 });
                if (memberBannerUrl) {
                    const banner = await getImageFromURL(memberBannerUrl);
                    if (banner) {
                        ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);
                        // Add dark overlay for better visibility
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                }
            } else {
                const banner = await getImageFromURL(bannerUrl);
                if (banner) {
                    ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);
                    // Add dark overlay for better visibility
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }
        } catch (error) {
            console.error('Error loading banner:', error);
        }

        // Load and draw user avatar
        const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 4096 });
        const avatar = await getImageFromURL(avatarUrl);
        if (!avatar) {
            return interaction.editReply('Failed to load user avatar.');
        }

        // Draw avatar with shadow
        ctx.save();
        const avatarSize = 240;
        const avatarX = 80;
        const avatarY = 80;

        // Draw avatar shadow and glow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 + 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = '#0f0f0f';
        ctx.fill();

        // Add white border glow
        ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
        ctx.shadowBlur = 35;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw avatar
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 - 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // User information with enhanced shadow
        ctx.font = 'bold 52px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textShadow = '3px 3px 6px rgba(0, 0, 0, 0.8)';
        ctx.fillText(targetUser.username, avatarX + avatarSize + 60, avatarY + 85);
        
        // Reset shadow for other elements
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;


        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw badges at bottom right
        const badgeSize = 96;
        const badgeSpacing = 24;
        const badgeY = canvas.height - badgeSize - 60;
        let badgeX = canvas.width - (badgeSize + badgeSpacing) * 4 - 60;

        // Always show all badges
        const badges = [
            'nitro.svg',
            'boost.svg',
            'partner.svg',
            'staff.svg'
        ];

        // Draw badges
        for (const badge of badges) {
            try {
                const badgePath = path.join(__dirname, '..', '..', 'assets', 'badges', badge);
                const badgeImage = await loadImage(badgePath);
                ctx.drawImage(badgeImage, badgeX, badgeY, badgeSize, badgeSize);
                badgeX += badgeSize + badgeSpacing;
            } catch (error) {
                console.error(`Error loading badge ${badge}:`, error);
            }
        }

        // Create attachment
        const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });

        // Create download button
        const downloadButton = new ButtonBuilder()
            .setCustomId('download_profile')
            .setLabel('تحميل التصميم')
            .setEmoji('🎨')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(downloadButton);

        // Send the profile card with download button
        const reply = await interaction.editReply({
            files: [attachment],
            components: [row]
        });

        // Create collector for button clicks (no timeout)
        const collector = reply.createMessageComponentCollector();

        collector.on('collect', async i => {
            if (i.customId === 'download_profile') {
                try {
                    const files = [];
                    let content = '🎨 **عناصر التصميم:**';

                    // Get and process avatar
                    const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 4096 });
                    const avatar = await getImageFromURL(avatarUrl);
                    if (avatar) {
                        const avatarCanvas = createCanvas(500, 500);
                        const avatarCtx = avatarCanvas.getContext('2d');
                        avatarCtx.drawImage(avatar, 0, 0, avatarCanvas.width, avatarCanvas.height);
                        files.push(new AttachmentBuilder(avatarCanvas.toBuffer('image/png'), { name: 'avatar.png' }));
                    }

                    // Try to get banner
                    let bannerUrl = targetUser.bannerURL({ extension: 'png', size: 4096 });
                    if (!bannerUrl) {
                        const fetchedUser = await member.user.fetch();
                        bannerUrl = fetchedUser.bannerURL({ extension: 'png', size: 4096 });
                    }

                    if (bannerUrl) {
                        const banner = await getImageFromURL(bannerUrl);
                        if (banner) {
                            const bannerCanvas = createCanvas(1500, 500);
                            const bannerCtx = bannerCanvas.getContext('2d');
                            bannerCtx.drawImage(banner, 0, 0, bannerCanvas.width, bannerCanvas.height);
                            files.push(new AttachmentBuilder(bannerCanvas.toBuffer('image/png'), { name: 'banner.png' }));
                        }
                    }

                    // Send the files
                    if (files.length > 0) {
                        await i.reply({
                            content: content,
                            files: files,
                            ephemeral: true
                        });
                    } else {
                        await i.reply({ 
                            content: '❌ لم نتمكن من تحميل الصور',
                            ephemeral: true
                        });
                    }
                } catch (error) {
                    await i.reply({ 
                        content: '❌ حدث خطأ أثناء جلب روابط التصميم', 
                        ephemeral: true 
                    });
                }
            }
        });

        // No timeout handler needed
    },
};
