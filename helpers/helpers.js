const { EmbedBuilder } = require('discord.js');

module.exports = {
    CreateCustomEmbed: async (title, content, command) => {
        const embed = new EmbedBuilder()
            .setTitle(`/${command}`)
            .setColor('#DAF7A6')
            .addFields(
                {
                    name: title,
                    value: content
                }
            )
        return embed;
    }
}