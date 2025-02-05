import Command from '../../structures/Command';
import { Message, Util } from 'discord.js';
import Agness from '../../bot';
import { Settings } from '../../database/settings';
import { Automods } from '../../database/automod';

export default class SetupCommand extends Command {
    constructor(client: Agness, category: string) {
        super(client, {
            name: 'setup',
            aliases: ['stp', 'config'],
            botGuildPermissions: ['MANAGE_CHANNELS', 'MANAGE_GUILD'],
            memberGuildPermissions: ['MANAGE_GUILD'],
            category
        });
    }

    async run(message: Message, args: string[]): Promise<Message | void> {
        switch (args[0]?.toLowerCase() ?? '') {
            case 'muterole': {
                let model = await Settings.findOne({ guildID: message.guild!.id })
                if (args[1]?.toLowerCase() !== 'none') {
                    let matchRole = args[1]?.match(/^<@&(\d+)>$/)?.[1] ?? args[1]
                    if (model?.muteRoleID) matchRole = args[1]?.match(/^<@&(\d+)>$/)?.[1] ?? args[1]

                    let role = matchRole ? message.guild!.roles.cache.get(matchRole) :
                        (model && model.muteRoleID && message.guild!.roles.cache.get(model.muteRoleID)) ?
                            message.guild!.roles.cache.get(model.muteRoleID) :
                            (await message.guild!.roles.create({
                                name: 'Muted',
                                color: '#616770',
                                mentionable: false
                            }))
                    if (!role) return message.channel.send('<:error:837101355860230154> Specified role or ID is invalid.')
                    if (role.id === model?.modRoleID) return message.channel.send(`You cannot set the moderator role as a muted role.`)
                    if (role.id === model?.muteRoleID && !role.editable) return message.channel.send(`I cannot edit the role already saved. Role: <@&${model!.muteRoleID}>`, {
                        allowedMentions: {
                            roles: []
                        }
                    })
                    if (!role.editable) return message.channel.send('<:error:837101355860230154> I cannot edit the specified ID or role.')
                    const channels = (await message.guild!.channels.fetch()).array().filter(c => c.type === 'text')
                    let msg: Message | void = await message.channel.send('I am preparing everything ... ')
                    const toMute: string[] = []
                    for (const channel of channels) {
                        try {
                            channel.overwritePermissions([
                                {
                                    id: role.id,
                                    deny: ['SEND_MESSAGES']
                                }
                            ])
                            toMute.push(`<:right:837100527816278017> **${channel.name}**`)
                            msg = await (msg as Message).edit(toMute.join('\n')).catch(async () => {
                                msg = await message.channel.send(toMute.join('\n'));
                            });
                        } catch (e) {
                            toMute.push(`<:error:837101355860230154> **${channel.name}**`)
                            msg = await (msg as Message).edit(toMute.join('\n')).catch(async () => {
                                msg = await message.channel.send(toMute.join('\n'));
                            });
                        }
                        await Util.delayFor(1000)
                    }
                    if (!model) model = new Settings({ guildID: message.guild!.id, muteRoleID: role.id })
                    model.muteRoleID = role.id
                    await model.save()
                    message.channel.send(`Finish editing the role **${role}**
                    
||If an error occurs in any channel, check my permissions.||`, {
                        allowedMentions: {
                            roles: []
                        }
                    })
                } else {
                    if (!model) model = new Settings({ guildID: message.guild!.id, muteRoleID: '' })
                    model.muteRoleID = ''
                    await model.save()
                    message.channel.send(`The muted role was successfully deleted from my database.
Remember that it can cause problems when executing the \`tempmute\` and \`mute\` commands.`)
                }
                break;
            }
            case 'modrole': {
                let model = await Settings.findOne({ guildID: message.guild!.id })
                if (args[1]?.toLowerCase() !== 'none') {
                    let matchRole = args[1]?.match(/^<@&(\d+)>$/)?.[1] ?? args[1]
                    let role = matchRole ?
                        message.guild!.roles.cache.get(matchRole) :
                        null
                    if (!role) return message.channel.send('Specified role or ID is invalid.')
                    if (model?.muteRoleID === role.id) return message.channel.send(`<:error:837101355860230154> You cannot set the muted role as the moderator role.`)
                    if (!model) model = new Settings({ guildID: message.guild!.id, modRoleID: role.id })
                    model.modRoleID = role.id
                    await model.save()
                    message.channel.send(`Now the mod role is **${role}**. They can use all moderation commands. `, {
                        allowedMentions: {
                            roles: []
                        }
                    })
                } else {
                    if (!model) model = new Settings({ guildID: message.guild!.id, modRoleID: '' })
                    model.modRoleID = ''
                    await model.save()
                    message.channel.send('Now only users with respective permissions can use my commands.')
                }

                break;
            }
            case 'automod': {
                if (args[1]?.toLowerCase() !== 'reset') {
                    const model = await Automods.findOne({ guildID: message.guild!.id })
                    if (model) return message.channel.send(`There is already an active automod on the server, if you want to restore it to the default use:
> \`${this.prefix}setup automod reset\``)
                } else {
                    await Automods.findOneAndDelete({ guildID: message.guild!.id })
                }
                await Automods.create({ guildID: message.guild!.id })
                message.channel.send(`**AutoMod**
> Message spam: \`5\` messages in \`2\` seconds (\`1 strike\`)
> Anti duplicate: \`1 strike\`
> Anti invites: \`2\` strikes
> Anti zalgo: \`0\` strikes (\`disabled\`)
> Max capital letters: \`10\` uppercase (\`1 strike\`)
> Max attachment: \`4\` attachments (\`1 strike\`)
> Max emojis: \`8\` emojis (\`1 strike\`)
> Max spoiler: \`0\` strikes (\`disabled\`)
> Max Characters: \`250\` characters (\`1 strike\`)
> AntiRaid: \`10\` joins in \`5\` seconds (\`ban\`)
> Ignored Users: \`none\`
> Ignored Roles: \`none\`

**Punishments** ||🚩 refer to strikes.||
> \`🚩[2]\` 🤐 \`tempmute\` - 30m
> \`🚩[3]\` 🤐 \`tempmute\` - 12h
> \`🚩[4]\` 👢 \`kick\`
> \`🚩[6]\` 🔨 \`ban\``)
                break;
            }

            default: {
                return message.channel.send(`You must specify what you want to set, these are the options:
> \`${this.prefix}setup muterole <@Role | ID>\`
> \`${this.prefix}setup modrole <@Role | ID>\`
> \`${this.prefix}setup automod\`

||The places between "<>" do not need to be specified.||`)
            }
        }
    }
}