import { Client, GatewayIntentBits } from 'discord.js';
import { readFileSync, writeFileSync, existsSync, closeSync, openSync, mkdirSync } from 'fs';
import { schedule } from "node-cron";
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import 'dotenv/config';

import RealtController from '../controllers/realtController.js';
import UserController from '../controllers/userController.js';
import commands from './commands.js';
import { flags, typePropertyNames } from '../_constants/index.js';

const {
    NODE_ENV,
    USER_TEST_ID,
    TOKEN,
    ROLE_ALERT,
    ROLE_FR,
    ROLE_EN,
    GUILD_ID,
    APPLICATION_ID,
    CHANNEL_SETTING
} = process.env;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions
    ]
});

let lastId = {};
let params = {};
let messageAlertId;
let messageLanguageId;

const blockQuoteContent = (delta, quantity, yieldYear, id, name, image, lang = 'en') => {
    let content;
    switch (lang) {
        case 'fr':
            content = {
                title: `:link: ${name}`,
                url: `https://yam.realtoken.network/offer/${id}`,
                description: `:chart_with_upwards_trend: Yield de \`${yieldYear} %\`\n${delta}\n:1234: Quantité disponible : \`${quantity}\``,
                color: 16777215,
                timestamp: new Date(),
                image: {
                    url: image
                },
                footer: {
                    text: 'Clique sur le titre pour accéder à l\'offre'
                }
            }
            break;
        case 'en':
            content = {
                title: `:link: ${name}`,
                url: `https://yam.realtoken.network/offer/${id}`,
                description: `:chart_with_upwards_trend: Offer Yield of \`${yieldYear} %\`\n${delta}\n:1234: Available quantity : \`${quantity}\``,
                color: 16777215,
                timestamp: new Date(),
                image: {
                    url: image
                },
                footer: {
                    text: 'Click on the title to access the offer'
                }
            }
            break;
    }

    return { embeds: [content] };
}

const yamOffer = async () => {
    const guild = client.guilds.cache.get(GUILD_ID);

    const offers = await RealtController.getOffers({
        first: 50,
        orderBy: 'id',
        orderDirection: 'desc'
    });

    const newOffer = offers
        .filter((offer) => offer.id > lastId.id)
        .sort((a, b) => a.id - b.id);

    if (!newOffer.length) {
        return;
    }

    const properties = JSON.parse(readFileSync('json/tokens.json', 'utf-8'));

    if (!properties) {
        console.error('No retrieved properties');
        return;
    }


    for (const offer of newOffer) {
        const { id, availableAmount, offerToken, buyer } = offer;
        const { address, name } = offerToken;

        lastId.id = id;
        writeFileSync('json/lastId.json', JSON.stringify(lastId));

        const property = properties.find((prop) => prop.uuid.toLowerCase() === address.toLowerCase());
        if (!property) {
            console.error('No property found');
            continue;
        }

        const { tokenPrice, imageLink, propertyType, annualPercentageYield } = property;

        if (!tokenPrice) {
            console.error('No token price found');
            continue;
        }

        if (buyer) { // if the offer is private
            continue;
        }

        const newYield = (annualPercentageYield * +tokenPrice) / +offer.price.price;
        const deltaPrice = (+tokenPrice / +offer.price.price) * 100 - 100;

        const users = NODE_ENV === 'prod' ? (
            await UserController.getUsersFromParams({
                newYield,
                deltaPrice: deltaPrice * -1,
                availableAmount,
                blacklist: address,
                typeProperty: propertyType
            })
        ) : (
            NODE_ENV === 'dev' && USER_TEST_ID
        ) ? (
            [{ userId: USER_TEST_ID, lang: 'fr' }]) : [];

        if (!users?.length) {
            continue;
        }

        const generateDeltaPrice = (deltaPrice, lang) => {
            const deltaValue = Math.abs(deltaPrice).toFixed(2);
            if (deltaPrice >= 0) {
                return lang === 'fr' ? `:green_circle: Delta de \`- ${deltaValue} %\`` : `:green_circle: Delta of \`- ${deltaValue} %\``;
            } else {
                return lang === 'fr' ? `:orange_circle: Delta de \`+ ${deltaValue} %\`` : `:orange_circle: Delta of \`+ ${deltaValue} %\``;
            }
        }

        for (const user of users) {
            const { lang, userId } = user;
            const member = await guild.members.fetch(userId);
            if (!member) continue;

            const deltaPriceMessage = generateDeltaPrice(deltaPrice, lang);
            member.send(blockQuoteContent(deltaPriceMessage, availableAmount, annualPercentageYield, id, name, imageLink[0], lang));
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

            const { deltaMax, yieldMin, quantityMin, blacklist } = params.yamlowprice;

            await UserController.newUser({
                userId: user.id,
                deltaMax,
                yieldMin,
                quantityMin,
                blacklist
            });
            await user.send('You have activated alerts for YAM offers. To modify your alert settings, go to the channel <#' + CHANNEL_SETTING + '> and use the `/edit` command.');
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
    if (message.author.bot || CHANNEL_SETTING !== message.channelId) {
        return;
    }

    message.delete();
});

client.on('interactionCreate', async interaction => {
    const { commandName, channelId, user, options } = interaction;

    if (!interaction.isCommand()) {
        return;
    }

    if (channelId !== CHANNEL_SETTING) {
        await interaction.reply({ content: `You can only execute this command in the channel <#${CHANNEL_SETTING}>.`, ephemeral: true });
        return;
    }

    switch (commandName) {
        case 'me': {
            const existUser = await UserController.getUser({
                userId: user.id
            });

            if (!existUser) {
                await interaction.reply({ content: `You are not registered. Please register by clicking on the ⏰ reaction in the <#${CHANNEL_SETTING}> channel.`, ephemeral: true });
                return;
            }

            const { deltaMax, yieldMin, quantityMin, blacklist, typeProperty } = existUser;

            const blacklistList = blacklist?.join('\n') || 'None';

            const embed = {
                title: "Your current settings for alerts",
                color: 16711680,
                fields: [
                    {
                        name: "Yield (that you accept with new price of the offer)",
                        value: yieldMin
                    },
                    {
                        name: "Delta Price (max value (in %) relative to the initial token price that you accept)",
                        value: deltaMax
                    },
                    {
                        name: "Minimum quantity (0 = accepts any quantity)",
                        value: quantityMin
                    },
                    {
                        name: "Blacklisted properties",
                        value: blacklistList
                    },
                    {
                        name: "Type property",
                        value: typePropertyNames[typeProperty]
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
                await interaction.reply({ content: 'You are not registered. Please register by clicking on the ⏰ reaction in the <#' + CHANNEL_SETTING + '> channel.', ephemeral: true });
                return;
            }

            const editUser = await UserController.editUser({
                userId: user.id,
                yieldMin: options.getNumber('yield'),
                deltaMax: options.getNumber('delta'),
                quantityMin: options.getNumber('quantity'),
                typeProperty: options.getNumber('type_property'),
                blacklist: options.getString('blacklist')
            });

            if (!editUser) {
                await interaction.reply({ content: 'Error while modifying your settings.', ephemeral: true });
                return;
            }

            await interaction.reply({ content: 'Your settings have been changed.', ephemeral: true });
            return;
        }
        case 'blacklist_add': {
            const existUser = await UserController.getUser({
                userId: user.id
            });

            if (!existUser) {
                await interaction.reply({ content: 'You are not registered. Please register by clicking on the ⏰ reaction in the <#' + CHANNEL_SETTING + '> channel.', ephemeral: true });
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
                await interaction.reply({ content: 'You are not registered. Please register by clicking on the ⏰ reaction in the <#' + CHANNEL_SETTING + '> channel.', ephemeral: true });
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
                deltaMax: 10,
                yieldMin: 0,
                quantityMin: 0
            }
        }));
        console.log('json/params.json created.');
    }

    if (!existsSync('json/tokens.json')) {
        closeSync(openSync('json/tokens.json', 'w'))
        writeFileSync('json/tokens.json', JSON.stringify([]));
        console.log('json/tokens.json created.');
    }

    lastId = JSON.parse(readFileSync('json/lastId.json', 'utf-8'));

    params = JSON.parse(readFileSync('json/params.json', 'utf-8'));
    const { deltaMax, yieldMin, quantityMin } = params.yamlowprice;

    await RealtController.getTokens();

    const channelInformation = client.channels.cache.get(CHANNEL_SETTING);
    if (!channelInformation) console.log('Channel not found');

    const messagesInformation = [
        "To receive notifications about YAM offers, click on the **⏰ reaction below.**",
        "Hello, choose the language of your future alerts by reacting with one of the available flags.",
        {
            title: "Default settings for alerts",
            color: 16777215,
            fields: [
                {
                    name: "Yield (that you accept with new price of the offer)",
                    value: `\`${yieldMin} %\``
                },
                {
                    name: "Delta Price (max value (in %) relative to the initial token price that you accept)",
                    value: `\`${deltaMax} %\``
                },
                {
                    name: "Minimum quantity (0 = accepts any quantity)",
                    value: `\`${quantityMin}\``
                },
                {
                    name: "Blacklisted properties",
                    value: "\`None\`"
                },
                {
                    name: "Type property",
                    value: "\`All\`"
                }
            ]
        },
        "----------------------\n\n**The commands you can use below are only usable in this channel**\n\n\`/me\` : To view your personal settings.\n\n\`/edit\` : To modify your settings\n* **yield** : Yield (that you accept with new price of the offer)\n* **delta** : Delta Price (value (in %) relative to the initial token price that you accept)\n* **quantity** Minimum quantity (0 = accepts any quantity)\n* **type_property** The type of property you want\n\n\`/blacklist_add\` : To add a property to the blacklist\n\n\`/blacklist_delete\` : To remove a property from the blacklist"
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