const { EmbedBuilder } = require('discord.js');
const UserProfile = require('../../database/schemas/userProfile');

const jobs = [
    { id: 'chef', name: 'Chef', icon: '<:c_:1369937496183541791>', salary: { min: 25, max: 50 } },
    { id: 'driver', name: 'Driver', icon: '<:d_:1369937486733639771>', salary: { min: 20, max: 40 } },
    { id: 'programmer', name: 'Programmer', icon: '<:p_:1369937477930057770>', salary: { min: 40, max: 80 } },
    { id: 'doctor', name: 'Doctor', icon: '<:dd:1369937468559851591>', salary: { min: 50, max: 100 } },
    { id: 'teacher', name: 'Teacher', icon: '<:t_:1369937458812424202>', salary: { min: 30, max: 60 } },
    { id: 'police', name: 'Police Officer', icon: '<:pp:1369937446816452628>', salary: { min: 35, max: 70 } }
];

module.exports = {
    name: 'وظيفة',
    aliases: ['jobs', 'job', 'work'],
    category: 'economy',
    description: 'Get a job to earn money',
    
    async messageExecute(message, args) {
        try {
            const userId = message.author.id;
            const guildId = message.guild.id;

            // Get user profile
            let userProfile = await UserProfile.findOne({ userId, guildId });
            if (!userProfile) {
                userProfile = new UserProfile({ userId, guildId });
            }

            // If no arguments, show available jobs
            if (!args.length) {
                const embed = new EmbedBuilder()
                    .setColor('#2f3136')
                    .setTitle('💼 Available Jobs')
                    .setDescription('Choose a job to start earning money! Use `job <name>` to apply for a job.')
                    .addFields(
                        jobs.map(job => ({
                            name: `${job.icon} ${job.name}`,
                            value: `Salary: $${job.salary.min}-${job.salary.max} per day`,
                            inline: true
                        }))
                    )
                    .setFooter({ text: 'You can collect your salary every 24 hours' })
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            // Get the job name from arguments
            const jobName = args.join(' ').toLowerCase();
            const job = jobs.find(j => j.id === jobName || j.name.toLowerCase() === jobName);

            if (!job) {
                return message.reply('❌ Invalid job name! Use the `jobs` command to see available jobs.');
            }

            // If user already has this job
            if (userProfile.job === job.id) {
                return message.reply(`❌ You are already working as a ${job.name}!`);
            }

            // Apply for the job
            userProfile.job = job.id;
            await userProfile.save();

            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🎉 New Job!')
                .setDescription(`Congratulations! You are now working as a ${job.name} ${job.icon}`)
                .addFields(
                    { name: '💰 Salary Range', value: `$${job.salary.min}-${job.salary.max} per day`, inline: true },
                    { name: '⏳ Next Salary', value: 'Use the `salary` command in 24 hours', inline: true }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in jobs command:', error);
            await message.reply('❌ An error occurred while executing the command');
        }
    }
};
