import { SlashCommandBuilder } from '@discordjs/builders';

export default [
    new SlashCommandBuilder()
        .setName('me')
        .setDescription('Get info about yourself'),

    new SlashCommandBuilder()
        .setName('edit')
        .setDescription('Edit parameters for yourself')
        .addStringOption(option =>
            option.setName('delta')
                .setDescription('Minimum delta value (valeur minimale = -100)')
                .setRequired(false))
        .addNumberOption(option =>
            option.setName('quantity')
                .setDescription('Minimum quantity value')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(1000)),

    new SlashCommandBuilder()
        .setName('blacklist_add')
        .setDescription('Add property in blacklist')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Contract id of the property')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('blacklist_delete')
        .setDescription('Delete property in blacklist')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Contract id of the property')
                .setRequired(true))
];
