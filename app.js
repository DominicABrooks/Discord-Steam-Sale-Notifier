const tracking = require('./tracking.json');
const webhookURLs = require('./webhooks.json');
const fs = require('fs');

const getCurrentSpecials = async () => {
    let dataJson = await getSteamFeatured();
    let newReleasesJson = dataJson['specials']['items'];
    createWebhook(newReleasesJson);
}

const getSteamFeatured = async (req, res) => {
    let featuredCategories = await fetch(`https://store.steampowered.com/api/featuredcategories`)
    let featuredCategoriesJson = await featuredCategories.json();
    return featuredCategoriesJson;
}

let createWebhook = async (releasesJson) => {
    let data = {
        "username": 'JavaScript Bot',
        "avatar_url": "https://oyster.ignimgs.com/mediawiki/apis.ign.com/genshin-impact/8/81/Wanderer_%28Scaramouche%29_Guide.jpg",
        "embeds": [],
    }

    let i = 0;
    releasesJson.forEach(async (game) => {
        if(tracking.find(tracking => tracking.id == game.id))
        {
            console.log("Game ID " + game.id + " already tracked");
        }
        else
        {
            var expires = new Date(game.discount_expiration * 1000).toLocaleString()
            if(data.embeds.length >= 10)
            {
                postToDiscord(data);
                data.embeds = [];
                i = 0;
            }

            data["embeds"][i] = 
            {
                "title": game.name,
                "description": "~~$" + (game.original_price / 100).toFixed(2) +
                "~~\n" + "$" + (game.final_price / 100).toFixed(2) + " (-" + game.discount_percent + "%)",
                "url": "https://store.steampowered.com/app/" + game.id,
                "color": null,
                "footer": 
                {
                    "text": "Last until " + expires
                },
                "image": 
                {
                    "url": game.header_image
                }
            }

            i++;
            let id = game.id;
            let expireEpoch = game.discount_expiration;
            tracking[tracking.length] = {"id": id, "expires": expireEpoch};
        }
    });

    // Remove expired deals
    fs.readFile("./tracking.json", (err, data) => {
        if (err) throw err;
        var date = Math.floor(Date.now() / 1000);
        let obj = JSON.parse(data);

        // Load updated list into new obj
        const updatedData = Object.values(obj).filter(item => date < item.expires);
        const newData = {};
        updatedData.forEach((item, index) => {
            newData[index + 1] = item;
        });
      
        // Write the modified object back to the file
        fs.writeFileSync("./tracking.json", JSON.stringify(updatedData), err => {
          if (err) throw err;
          console.log('Removed Expired');
        });
    });

    // Jsonify tracking list, print, and write to tracking json
    var track = JSON.stringify(tracking);
    fs.writeFileSync("./tracking.json", track);

    postToDiscord(data);
}

// Post passed webhook JSON to webhook urls
const postToDiscord = async (data) => {
    webhookURLs.forEach(async WEBHOOK_URL => {
        console.log("New Specials: " + data.embeds);
        await fetch(WEBHOOK_URL.url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
            })
            .catch(error => {
                console.error('Error:', error);
            });
    });
}

// Initial request, update every 100,000 milliseconds
getCurrentSpecials();
setInterval(getCurrentSpecials, 100000);