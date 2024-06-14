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
    userTestId,
    token,
    information,
    alert,
    guildId,
    applicationId,
    channel_commands
} = process.env;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions
    ]
});

let lastIds = {};
let params = {};
let message1Id;

const blockQuoteContent = (delta, quantity, id, name) => {
    const content = `:house_with_garden: :alarm_clock: Nouvelle offre intéressante sur le YAM :alarm_clock: :house_with_garden:\n:house_with_garden: ${name}\n\n${delta}\n:1234: Quantité disponible : ${quantity}\n\n:link: Lien pour y accéder : https://yam.realtoken.network/offer/${id}\n`;

    return blockQuote(content);
}

const yamOffer = async () => {
    const guild = client.guilds.cache.get(guildId);

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
            NODE_ENV === 'dev' && userTestId
        ) ? (
            [{ userId: userTestId }]) : [];

        if (!users?.length) {
            continue;
        }

        if (Math.sign(deltaPrice) > -1) {
            deltaPrice = `:green_circle: Delta de - ${deltaPrice.toFixed(2)} %`;
        } else {
            deltaPrice = `:orange_circle: Delta de + ${deltaPrice.toFixed(2).slice(1)} %`;
        }

        for (const user of users) {
            const member = await guild.members.fetch(user.userId);
            if (!member) continue;

            member.send(blockQuoteContent(deltaPrice, availableAmount, id, name));
        }
    };
}

client.on('messageReactionAdd', async (reaction, user) => {
    try {
        if (user.bot) return;

        if (reaction.message.id === message1Id && reaction.emoji.name === '⏰') {
            const guild = reaction.message.guild;
            if (!guild) return;

            const member = await guild.members.fetch(user.id);
            if (!member) return;

            await member.roles.add(alert);

            const { deltaMin, quantityMin, blacklist } = params.yamlowprice;

            await UserController.newUser({
                userId: user.id,
                deltaMin,
                quantityMin,
                blacklist
            });

            await user.send('Vous avez activé les alertes pour les offres du YAM. Pour modifier les paramètres de vos alertes, allez dans le channel <#' + channel_commands + '> et utilisez la commande `/edit`.');
        }
    } catch (error) {
        console.error(`Failed to add role: ${error}`);
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    try {
        if (user.bot) return;

        if (reaction.message.id === message1Id && reaction.emoji.name === '⏰') {
            const guild = reaction.message.guild;
            if (!guild) return;

            const member = await guild.members.fetch(user.id);
            if (!member) return;

            await member.roles.remove(alert);

            await UserController.archiveUser({
                userId: user.id
            });

            await user.send('Vous avez désactivé les alertes pour les offres du YAM.');
        }
    } catch (error) {
        console.error(`Failed to remove role: ${error}`);
    }
});

client.on('messageCreate', async message => {
    if (message.channelId !== channel_commands || message.author.bot) {
        return;
    }

    message.delete();
});

client.on('interactionCreate', async interaction => {
    const { commandName, channelId, user, options } = interaction;

    if (!interaction.isCommand()) {
        return;
    }

    if (channelId !== channel_commands) {
        await interaction.reply({ content: `Vous ne pouvez exécuter cette commande que dans le channel <#${channel_commands}>.`, ephemeral: true });
        return;
    }

    switch (commandName) {
        case 'me': {
            const existUser = await UserController.getUser({
                userId: user.id
            });

            if (!existUser) {
                await interaction.reply({ content: `Vous n\'êtes pas enregistré. Veuillez vous enregistrer en cliquant sur la réaction ⏰ dans le channel <#${information}>.`, ephemeral: true });
                return;
            }

            const { deltaMin, quantityMin, blacklist } = existUser;

            const blacklistList = blacklist?.join('\n') || 'Aucune';

            const embed = {
                "title": "Vos paramètres actuels pour les alertes",
                "color": 16711680,
                "fields": [
                    {
                        "name": "Valeur (en %) par rapport au prix initial du token que vous acceptez",
                        "value": `${deltaMin}%`
                    },
                    {
                        "name": "Quantité minimum (0 = accepte n'importe quelle quantité)",
                        "value": `${quantityMin}`
                    },
                    {
                        "name": "Propriétés blacklistées",
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
                await interaction.reply({ content: 'Vous n\'êtes pas enregistré. Veuillez vous enregistrer en cliquant sur la réaction ⏰ dans le channel <#' + information + '>.', ephemeral: true });
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
                await interaction.reply({ content: 'Vous n\'êtes pas enregistré. Veuillez vous enregistrer en cliquant sur la réaction ⏰ dans le channel <#' + information + '>.', ephemeral: true });
                return;
            }

            const blacklistAdd = await UserController.addBlacklist({
                userId: user.id,
                id: options.getString('id')
            })

            if (!blacklistAdd) {
                await interaction.reply({ content: 'Erreur lors de l\'ajout de la propriété à la blacklist.', ephemeral: true });
                return;
            }

            await interaction.reply({ content: 'La propriété a été ajoutée à la blacklist.', ephemeral: true });
            return;
        }
        case 'blacklist_delete': {
            const existUser = await UserController.getUser({
                userId: user.id
            });

            if (!existUser) {
                await interaction.reply({ content: 'Vous n\'êtes pas enregistré. Veuillez vous enregistrer en cliquant sur la réaction ⏰ dans le channel <#' + information + '>.', ephemeral: true });
                return;
            }

            const blacklistRemove = await UserController.deleteBlacklist({
                userId: user.id,
                id: options.getString('id')
            })

            if (!blacklistRemove) {
                await interaction.reply({ content: 'Erreur lors de la suppression de la propriété de la blacklist.', ephemeral: true });
                return;
            }

            await interaction.reply({ content: 'La propriété a été supprimée de la blacklist.', ephemeral: true });
            return;
        }
        default:
            await interaction.reply({ content: 'Commande inconnue.', ephemeral: true });
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

    schedule('*/30 * * * * *', async () => {
        await yamOffer();
    });

    const channel = client.channels.cache.get(information);
    if (!channel) return console.log('Canal non trouvé');

    const messages = [
        "Pour recevoir les notifications sur les offres du YAM, cliquez sur la **réaction ⏰ ci-dessous.**",
        {
            "title": "Paramètres par défaut pour les alertes",
            "color": 16777215,
            "fields": [
                {
                    "name": "Valeur (en %) par rapport au prix initial du token que vous acceptez",
                    "value": `${deltaMin}%`
                },
                {
                    "name": "Quantité minimum (0 = accepte n'importe quelle quantité)",
                    "value": `${quantityMin}`
                },
                {
                    "name": "Propriétés blacklistées",
                    "value": "Aucune"
                }
            ]
        },
        "Pour modifier les paramètres de vos alertes, allez dans le channel <#" + channel_commands + "> et utilisez la commande `/edit`."
    ]

    const fetchedMessages = Array.from((await channel.messages.fetch({ after: '1', limit: messages.length })).values()).reverse();

    for (let i = 0; i < messages.length; i++) {
        let message;
        const type = typeof messages[i];

        if (fetchedMessages[i]) {
            message = fetchedMessages[i];
            if (type === 'string') {
                await message.edit(messages[i]);
            } else {
                await message.edit({ embeds: [messages[i]] });
            }
        } else {
            if (type === 'string') {
                message = await channel.send(messages[i]);
            } else {
                message = await channel.send({ embeds: [messages[i]] });
            }
        }

        if (i === 0) {
            await message.react('⏰');
            message1Id = message.id;
        }
    }

    const rest = new REST({ version: '9' }).setToken(token);
    try {
        await rest.put(
            Routes.applicationGuildCommands(applicationId, guildId),
            { body: commands },
        );
    }
    catch (error) {
        console.error(error);
    }
}

client.on("ready", onReady);
client.login(token);