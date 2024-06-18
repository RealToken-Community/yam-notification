import { SlashCommandBuilder } from '@discordjs/builders';
import { typePropertyNames } from '../_constants/index.js';

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
                .setMaxValue(1000))
        .addNumberOption(option =>
            option.setName('type_property')
                .setDescription('Property type')
                .setRequired(false)
                .addChoices(
                    ...typePropertyNames.reduce((acc, name, index) => {
                        if (name) {
                            acc.push({ name, value: index });
                        }
                        return acc;
                    }, [])
                )),

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
