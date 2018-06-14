//Set Twitter
var twit = require('twit');
var confTwit = require('./config/twit');
var Twitter = new twit(confTwit);

//Set Discord
var Discord = require('discord.js');
var client = new Discord.Client();
//fichier de config
var confDiscord = require('./config/discord');
var Util = require('./config/util');
//set up du token de connection
client.login(confDiscord.token);

client.on('ready', () => {
    console.log('Logged in as : ' + client.user.tag);
})


var getTweet = function(callback){
    var params = {
        q: '@Action_Insoumis'
    }
    Twitter.get('search/tweets', params, async function(err, data) {
        // Si pas d'erreur
        if (!err) {
        // Grab l'id du dernier tweet
            var retweetId = await data.statuses[0].id_str;
            try{
                callback(retweetId);
            }
            catch(error){
                console.log(error);
            }
        }
        // Erreur de recherche
        else {
            console.log('oups la recherche n\'a pas fonctionné');
        }

    });
}

//bot reponse a getTweet
client.on('message', async message => {
    if (message.content === '!encoreDuTravail'){
        getTweet(function(id) {
            console.log(id);
            message.channel.send('Oui mon Seigneur : https://twitter.com/Action_Insoumis/status/'+id);
        });
    }
    
})

/* Event handlers on bot Ready */

/** Caches des messages et connection au didi discord */
function onReady()
{
    console.log(`Logged entant que ${client.user.tag}; reception des messages...`);
    //set à null
    /** @type {Guild} */
    let guild   = null;
    /** @type {TextChannel|VoiceChannel} */
    let channel = null;

    for ( guild   of client.guilds.values() )
    for ( channel of guild.channels.values() )
    {
        const channelName = channel.name;

        // Skip channels vocale
        if (!channel.fetchMessages) continue;

        //Limite à 100 (restction DiscordJS)
        channel.fetchMessages({limit: 100})
            .then(messages => {
                console.log(`Reçu ${messages.size} messages du channel #${channelName}`)
            })
            .catch(console.error);
    }
}

/**
 * Handles reactions sur les messages 100 'archivé' (en cas de reboot)
 *
 * @param {MessageReaction} react
 * @param {User} user
 */
function onReaction(react, user)
{
    const message = react.message;
    const channel = message.channel;
    const guild   = message.guild;

    // Liste des channels a ignoré pour retour textes
    if ((channel.name.toLowerCase() === confDiscord.pinner.channel.toLowerCase()) )
        return;

    // Ignore si c'est pas le bon pin
    if ((react.emoji.name.toLowerCase() === confDiscord.pinner.emoji.toLowerCase()) )
        return;

    // Ignore user n'as pas le bon rôle
    if ((Util.hasRole(user, guild, confDiscord.pinner.role)) ){
        pinMessage(guild, message, user);}

}

/**
 * Handles  pinning 
 *
 * @param {Guild} guild
 * @param {Message} message
 * @param {User} user
 */
function pinMessage(guild, message, user)
{
    /** @type {TextChannel|VoiceChannel} */
    let channel = null;
    let found   = false;

    // recherche le chan de la cible
    for ( channel of guild.channels.values() )
    {
        if (channel.name.toLowerCase() !== confDiscord.pinner.channel)
            continue;

        // passe les chan vocaux
        if (!channel.send)
        {
            console.error(`Found channel "${channel.name}", but it's not a text one!`);
            continue;
        }

        found = true;
        break;
    }
    
    // Si rien trouvé
    if (!found)
    {
        console.error(`Le message peux pas être pin`);
        return;
    }

    // préparation du message dans le chan de log
    let pinMessage = [
        `${user} a pin un message de ${message.author}:`,
        `---`,
        `<**${message.createdAt.toLocaleString()}**> ${message.content}`
    ];
    channel.send(pinMessage)
        .then(_ => console.log(`Pinned ${user.tag}'s message: "${message.content}"`))
        .then(() =>     {message.pin();}    )
        .catch(console.error);

}

// Finally, attach handlers and begin operation
client.on('ready', onReady);
client.on('messageReactionAdd', onReaction);
