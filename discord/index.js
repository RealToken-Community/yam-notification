import { Client, GatewayIntentBits, blockQuote } from 'discord.js';
import { readFileSync, writeFileSync, existsSync, closeSync, openSync, mkdirSync } from 'fs';
import { schedule } from "node-cron";
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import 'dotenv/config';

import RealtController from '../controllers/realtController.js';
import UserController from '../controllers/userController.js';
import commands from './commands.js';

const {
    NODE_ENV,
    USER_TEST_ID,
    TOKEN,
    ROLE_ALERT,
    ROLE_FR,
    ROLE_EN,
    GUILD_ID,
    APPLICATION_ID,
    CHANNEL_INFORMATION,
    CHANNEL_COMMANDS,
} = process.env;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const flags = ['🇺🇸', '🇫🇷'];
let lastIds = {};
let params = {};
let messageAlertId;
let messageLanguageId;

const blockQuoteContent = (delta, quantity, id, name, lang = 'en') => {
    let content;
    switch (lang) {
        case 'fr':
            content = `:house_with_garden: :alarm_clock: Nouvelle offre intéressante sur le YAM :alarm_clock: :house_with_garden:\n:house_with_garden: ${name}\n\n${delta}\n:1234: Quantité disponible : ${quantity}\n\n:link: Lien pour y accéder : https://yam.realtoken.network/offer/${id}\n`;
            break;
        case 'en':
            content = `:house_with_garden: :alarm_clock: New interesting offer on the YAM :alarm_clock: :house_with_garden:\n:house_with_garden: ${name}\n\n${delta}\n:1234: Available quantity: ${quantity}\n\n:link: Link to access it: https://yam.realtoken.network/offer/${id}\n`;
            break;
    }

    return blockQuote(content);
}

const yamOffer = async () => {
    const guild = client.guilds.cache.get(GUILD_ID);

    const offers = await RealtController.getOffers({
        first: 50,
        orderBy: 'id',
        orderDirection: 'desc'
    });

    const newOffer = offers
        .filter((offer) => offer.id > lastIds.id)
        .sort((a, b) => a.id - b.id);

    if (!newOffer.length) {
        return;
    }

    const property = JSON.parse(await readFileSync('json/tokens.json', 'utf-8'));

    if (!property) {
        console.error('No property found');
        return;
    }


    for (const offer of newOffer) {
        const { id, availableAmount, offerToken, buyer } = offer;
        const { address, name } = offerToken;

        lastIds.id = id;
        writeFileSync('json/lastId.json', JSON.stringify(lastIds));

        const initialPrice = +property.find((prop) => prop.uuid.toLowerCase() === address.toLowerCase())?.tokenPrice;

        if (!initialPrice) {
            console.error('No initial price found');
            continue;
        }

        if (buyer) { // if the offer is private
            continue;
        }

        let deltaPrice = (initialPrice / offer.price.price) * 100 - 100;

        const users = NODE_ENV === 'prod' ? (
            await UserController.getUsersFromParams({
                deltaPrice: deltaPrice * -1,
                availableAmount,
                blacklist: address
            })
        ) : (
            NODE_ENV === 'dev' && USER_TEST_ID
        ) ? (
            [{ userId: USER_TEST_ID, lang: 'fr' }]) : [];

        if (!users?.length) {
            continue;
        }

        if (Math.sign(deltaPrice) > -1) {
            deltaPrice = `:green_circle: Delta of - ${deltaPrice.toFixed(2)} %`;
        } else {
            deltaPrice = `:orange_circle: Delta of + ${deltaPrice.toFixed(2).slice(1)} %`;
        }

        for (const user of users) {
            const { lang, userId } = user;
            const member = await guild.members.fetch(userId);
            if (!member) continue;

            member.send(blockQuoteContent(deltaPrice, availableAmount, id, name, lang));
        }
    };
}

client.on('messageReactionAdd', async (reaction, user) => {
    try {
        if (user.bot) return;

        const selectFlag = reaction.emoji.name;

        if (reaction.message.id === messageAlertId && selectFlag === '⏰') {
            const guild = reaction.message.guild;
            if (!guild) return;

            const member = await guild.members.fetch(user.id);
            if (!member) return;

            await member.roles.add(ROLE_ALERT);

            const { deltaMin, quantityMin, blacklist } = params.yamlowprice;

            await UserController.newUser({
                userId: user.id,
                deltaMin,
                quantityMin,
                blacklist
            });
            await user.send('You have activated alerts for YAM offers. To modify your alert settings, go to the channel <#' + CHANNEL_COMMANDS + '> and use the `/edit` command.');
            return;
        }

        if (reaction.message.id === messageLanguageId && flags.includes(selectFlag)) {
            const guild = reaction.message.guild;
            if (!guild) return;

            const member = await guild.members.fetch(user.id);
            if (!member) return;

            const otherFlags = flags.filter((flag) => flag !== selectFlag);

            for (const flag of otherFlags) {
                reaction.message.reactions.cache.get(flag).users.remove(user.id);
            }

            switch (selectFlag) {
                case '🇺🇸':
                    member.roles.add(ROLE_EN);
                    member.roles.remove(ROLE_FR);

                    await UserController.editLang({
                        userId: user.id,
                        lang: 'en'
                    });

                    break;
                case '🇫🇷':
                    member.roles.add(ROLE_FR);
                    member.roles.remove(ROLE_EN);

                    await UserController.editLang({
                        userId: user.id,
                        lang: 'fr'
                    });

                    break;
            }
        }
    } catch (error) {
        console.error(`Failed to add role: ${error}`);
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    try {
        if (user.bot) return;

        if (reaction.message.id === messageAlertId && reaction.emoji.name === '⏰') {
            const guild = reaction.message.guild;
            if (!guild) return;

            const member = await guild.members.fetch(user.id);
            if (!member) return;

            await member.roles.remove(ROLE_ALERT);

            await UserController.archiveUser({
                userId: user.id
            });

            await user.send('You have disabled alerts for YAM offers.');
            return;
        }

        if (reaction.message.id === messageLanguageId && ['🇺🇸', '🇫🇷'].includes(reaction.emoji.name)) {
            const guild = reaction.message.guild;
            if (!guild) return;

            const member = await guild.members.fetch(user.id);
            if (!member) return;

            switch (reaction.emoji.name) {
                case '🇺🇸':
                    await member.roles.remove(ROLE_EN);
                    break;
                case '🇫🇷':
                    await member.roles.remove(ROLE_FR);
                    break;
            }
        }
    } catch (error) {
        console.error(`Failed to remove role: ${error}`);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || CHANNEL_COMMANDS === message.channelId) {
        return;
    }

    message.delete();
});

client.on('interactionCreate', async interaction => {
    const { commandName, channelId, user, options } = interaction;

    if (!interaction.isCommand()) {
        return;
    }

    if (channelId !== CHANNEL_COMMANDS) {
        await interaction.reply({ content: `You can only execute this command in the channel <#${CHANNEL_COMMANDS}>.`, ephemeral: true });
        return;
    }

    switch (commandName) {
        case 'me': {
            const existUser = await UserController.getUser({
                userId: user.id
            });

            if (!existUser) {
                await interaction.reply({ content: `You are not registered. Please register by clicking on the ⏰ reaction in the <#${CHANNEL_INFORMATION}> channel.`, ephemeral: true });
                return;
            }

            const { deltaMin, quantityMin, blacklist } = existUser;

            const blacklistList = blacklist?.join('\n') || 'Aucune';

            const embed = {
                "title": "Your current settings for alerts",
                "color": 16711680,
                "fields": [
                    {
                        "name": "Value (in %) relative to the initial token price that you accept",
                        "value": `${deltaMin}%`
                    },
                    {
                        "name": "Minimum quantity (0 = accepts any quantity)",
                        "value": `${quantityMin}`
                    },
                    {
                        "name": "Blacklisted properties",
                        "value": `${blacklistList}`
                    }
                ]
            };

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        case 'edit': {
            const existUser = await UserController.getUser({
                userId: user.id
            });

            if (!existUser) {
                await interaction.reply({ content: 'You are not registered. Please register by clicking on the ⏰ reaction in the <#' + CHANNEL_INFORMATION + '> channel.', ephemeral: true });
                return;
            }

            const editUser = await UserController.editUser({
                userId: user.id,
                deltaMin: options.getString('delta'),
                quantityMin: options.getNumber('quantity'),
                blacklist: options.getString('blacklist')
            });

            if (!editUser) {
                await interaction.reply({ content: 'Erreur lors de la modification de vos paramètres.', ephemeral: true });
                return;
            }

            await interaction.reply({ content: 'Vos paramètres ont été modifiés.', ephemeral: true });
            return;
        }
        case 'blacklist_add': {
            const existUser = await UserController.getUser({
                userId: user.id
            });

            if (!existUser) {
                await interaction.reply({ content: 'You are not registered. Please register by clicking on the ⏰ reaction in the <#' + CHANNEL_INFORMATION + '> channel.', ephemeral: true });
                return;
            }

            const blacklistAdd = await UserController.addBlacklist({
                userId: user.id,
                id: options.getString('id')
            })

            if (!blacklistAdd) {
                await interaction.reply({ content: 'Error adding the property to the blacklist.', ephemeral: true });
                return;
            }

            await interaction.reply({ content: 'The property has been added to the blacklist.', ephemeral: true });
            return;
        }
        case 'blacklist_delete': {
            const existUser = await UserController.getUser({
                userId: user.id
            });

            if (!existUser) {
                await interaction.reply({ content: 'You are not registered. Please register by clicking on the ⏰ reaction in the <#' + CHANNEL_INFORMATION + '> channel.', ephemeral: true });
                return;
            }

            const blacklistRemove = await UserController.deleteBlacklist({
                userId: user.id,
                id: options.getString('id')
            })

            if (!blacklistRemove) {
                await interaction.reply({ content: 'Error removing the property from the blacklist.', ephemeral: true });
                return;
            }

            await interaction.reply({ content: 'The property has been removed from the blacklist.', ephemeral: true });
            return;
        }
        default:
            await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    }
});

const onReady = async () => {
    if (!existsSync('json')) {
        mkdirSync('json', { recursive: true });
    }

    if (!existsSync('json/lastId.json')) {
        closeSync(openSync('json/lastId.json', 'w'))
        writeFileSync('json/lastId.json', JSON.stringify({ "id": "0" }));
        console.log('json/lastId.json created.');
    }

    if (!existsSync('json/params.json')) {
        closeSync(openSync('json/params.json', 'w'))
        writeFileSync('json/params.json', JSON.stringify({
            yamlowprice: {
                deltaMin: 10,
                quantityMin: 1
            }
        }));
        console.log('json/params.json created.');
    }

    if (!existsSync('json/tokens.json')) {
        closeSync(openSync('json/tokens.json', 'w'))
        writeFileSync('json/tokens.json', JSON.stringify([]));
        console.log('json/tokens.json created.');
    }

    lastIds = JSON.parse(readFileSync('json/lastId.json', 'utf-8'));

    params = JSON.parse(readFileSync('json/params.json', 'utf-8'));
    const { deltaMin, quantityMin } = params.yamlowprice;

    await RealtController.getTokens();

    const channelInformation = client.channels.cache.get(CHANNEL_INFORMATION);
    if (!channelInformation) console.log('Channel not found');

    const messagesInformation = [
        "To receive notifications about YAM offers, click on the **⏰ reaction below.**",
        "Hello, choose the language of your future alerts by reacting with one of the available flags.",
        {
            "title": "Default settings for alerts",
            "color": 16777215,
            "fields": [
                {
                    "name": "Value (in %) relative to the initial token price that you accept",
                    "value": `${deltaMin}%`
                },
                {
                    "name": "Minimum quantity (0 = accepts any quantity)",
                    "value": `${quantityMin}`
                },
                {
                    "name": "Blacklisted properties",
                    "value": "None"
                }
            ]
        },
        "To modify your alert settings, go to the <#" + CHANNEL_COMMANDS + "> channel and use the `/edit` command."
    ];

    const fetchedMessages = Array.from((await channelInformation.messages.fetch({ after: '1', limit: messagesInformation.length })).values()).reverse();

    for (let i = 0; i < messagesInformation.length; i++) {
        const type = typeof messagesInformation[i];
        let message;

        if (fetchedMessages[i]) {
            message = fetchedMessages[i];
            await message.edit(type === 'string' ? messagesInformation[i] : { embeds: [messagesInformation[i]] });
        } else {
            message = await channelInformation.send(type === 'string' ? messagesInformation[i] : { embeds: [messagesInformation[i]] });
        }

        switch (i) {
            case 0:
                await message.react('⏰');
                messageAlertId = message.id;
                break;
            case 1:
                await message.react('🇺🇸');
                await message.react('🇫🇷');
                messageLanguageId = message.id;
                break;
        }
    }

    const rest = new REST({ version: '9' }).setToken(TOKEN);
    try {
        await rest.put(
            Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID),
            { body: commands },
        );
    }
    catch (error) {
        console.error(error);
    }

    schedule('*/30 * * * * *', async () => {
        await yamOffer();
    });
}

client.on("ready", onReady);
client.login(TOKEN);