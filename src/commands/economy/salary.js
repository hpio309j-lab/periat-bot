const { EmbedBuilder } = require('discord.js');
const UserProfile = require('../../database/schemas/userProfile');

const jobConfig = {
    programmer: { 
        min: 40, 
        max: 80,
        icon: '👨‍💻',
        description: 'Write code and develop software applications'
    },
    doctor: { 
        min: 50, 
        max: 100,
        icon: '👨‍⚕️',
        description: 'Treat patients and save lives'
    },
    teacher: { 
        min: 30, 
        max: 60,
        icon: '👨‍🏫',
        description: 'Educate students and shape minds'
    },
    police: { 
        min: 35, 
        max: 70,
        icon: '👮',
        description: 'Protect and serve the community'
    },
    chef: { 
        min: 25, 
        max: 50,
        icon: '👨‍🍳',
        description: 'Create delicious dishes'
    },
    driver: { 
        min: 20, 
        max: 40,
        icon: '🚗',
        description: 'Transport people and goods'
    }
};

module.exports = {
    name: 'راتب',
    aliases: ['salary', 'sal'],
    category: 'economy',
    description: 'Collect your daily salary from your job',
    
    async messageExecute(message, args) {
        try {
            const userId = message.author.id;
            const guildId = message.guild.id;

            // Get user profile
            let userProfile = await UserProfile.findOne({ userId, guildId });
            if (!userProfile) {
                userProfile = new UserProfile({ userId, guildId });
            }

            // Check if user has a job
            if (!userProfile.job) {
                return message.reply('❌ You don\'t have a job! Use the `jobs` command to get one.');
            }

            // Check if job exists in config
            const jobDetails = jobConfig[userProfile.job];
            if (!jobDetails) {
                return message.reply('❌ Your job position seems to be invalid. Please use the `jobs` command to get a new job.');
            }

            // Check cooldown
            const cooldown = 24 * 60 * 60 * 1000; // 24 hours
            const lastSalary = userProfile.cooldowns?.salary || 0;
            const timeLeft = lastSalary + cooldown - Date.now();

            if (timeLeft > 0) {
                const hours = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
                return message.reply(`❌ You must wait ${hours}h ${minutes}m before collecting your salary again`);
            }

            // Calculate salary
            const { min, max, icon } = jobDetails;
            const salary = Math.floor(Math.random() * (max - min + 1)) + min;

            // Update user profile
            userProfile.balance += salary;
            userProfile.cooldowns.salary = Date.now();
            userProfile.stats.totalSalary = (userProfile.stats.totalSalary || 0) + salary;
            await userProfile.save();

            // Format numbers
            const formattedSalary = salary.toLocaleString('en-US');
            const formattedBalance = userProfile.balance.toLocaleString('en-US');
            const formattedTotal = userProfile.stats.totalSalary.toLocaleString('en-US');

            // Create embed
            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle(`${icon} Salary Received`)
                .setDescription(`You received your salary as a ${userProfile.job}!`)
                .addFields(
                    { name: '💵 Amount', value: `$${formattedSalary}`, inline: true },
                    { name: '💳 Current Balance', value: `$${formattedBalance}`, inline: true },
                    { name: '📊 Total Earnings', value: `$${formattedTotal}`, inline: true }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in salary command:', error);
            await message.reply('❌ An error occurred while executing the command');
        }
    }
};
