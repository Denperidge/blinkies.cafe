/*jslint node */

// Runtime parameters
const prod = true;
const timeGenBlinkie = false;

var express = require("express");
var app = express();
const helmet = require("helmet");
const fs = require("fs");
const options = prod ? {
  key: fs.readFileSync('certs/privkey2.pem'),
  cert: fs.readFileSync('certs/fullchain2.pem')
} : {};
const https = prod ? require("https").createServer(options, app)
                  : require("http").createServer(app);

const util = require('util');
const execFile = util.promisify(require('child_process').execFile);

const siteURL = prod ? 'https://blinkies.cafe' : 'http://localhost:8080';

const styleProps = {
    5:  {style:"0005-citystars", name:"city stars", colour1:"#ffffff", colour2:"#ffffff", font: "04b03", fontsize:"8", x:"6", y:"-1"},
    4:  {style:"0004-peachy", name:"just peachy", colour1:"black", colour2:"black", font:"monaco", fontsize:"16", x:"7", y:"0"},
    1:  {style:"0001-saucer", name:"crash-landed", colour1:"#ff0000", colour2:"#ff4e4e", font: "Perfect DOS VGA 437", fontsize:"16", x:"-14", y:"-1"},
    3:  {style:"0003-ghost", name:"Spooky vibes only!!", colour1:"#e79400", colour2:"#e77400", font: "infernalda", fontsize:"16", x:"-13", y:"-1"},
    6:  {style:"0006-purple", name:"simple purple", colour1:"#800080", colour2:"#800080", font: "monaco", fontsize:"16", x:"0", y:"0"},
    8:  {style:"0008-pink", name:"simple pink", colour1:"#ff40ff", colour2:"#ff40ff", font: "monaco", fontsize:"16", x:"0", y:"0"},
    9:  {style:"0009-gradient-pink", name:"gradient pink", colour1:"#ff40ff", colour2:"#ff40ff", font: "monaco", fontsize:"16", x:"0", y:"0"},
    10: {style:"0010-blue", name:"simple blue", colour1:"#3f3fbf", colour2:"#3f3fbf", font: "monaco", fontsize:"16", x:"0", y:"0"}
};

let styleList = {};
for (const [key, value] of Object.entries(styleProps)) {
  styleList[key] = { style: value.style, name: value.name };
}

function addSlashes(str) {
    return (str + '').replace(/[^a-zA-Z0-9-_'!.? ]/g, '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

function cleanBlinkieID(str) {
    return str.replace(/[^a-zA-Z0-9-.]/g, '');
}

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random()*charactersLength));
    }
    return result;
}

function timeStart (label, timeflag) {
    if (timeflag) { console.time(label); }
}

function timeEnd (label, timeflag) {
    if (timeflag) { console.timeEnd(label); }
}

async function genBlinkie(instyle, intext, time) {
    let blinkieLink = ''

    try {
        const styleNumber = parseInt(instyle);
        if (styleNumber in styleProps) {
            timeStart('  generating blinkie', time);
            const style = styleProps[styleNumber].style
            const colour1 = styleProps[styleNumber].colour1;
            const colour2 = styleProps[styleNumber].colour2;
            const font = styleProps[styleNumber].font;
            const fontsize = styleProps[styleNumber].fontsize;
            const x = styleProps[styleNumber].x;
            const y = styleProps[styleNumber].y;

            let cleantext = addSlashes(intext);
            if (cleantext.replace(/\s/g, '').length == 0) {
                cleantext = addSlashes(styleProps[styleNumber].name);
            }

            const blinkieID = makeid(2);
            blinkieLink = siteURL + '/b/blinkiesCafe-' + blinkieID + '.gif';

            const args1 =
                ['-pointsize',fontsize,
                 '+antialias',
                 '-page','+'+x+'+'+y,
                 '-gravity','Center',
                 '-family',font,
                 '-fill',colour1,
                 '-draw',"text 0,0 '" + cleantext + "'",
                 './assets/blinkies-bg/png/' + style + '-1.png',
                 './assets/blinkies-frames/' + blinkieID + '-1.png'
                ]
            const args2 =[
                '-pointsize',fontsize,
                '+antialias',
                '-page','+'+x+'+'+y,
                '-gravity','Center',
                '-family',font,
                '-fill',colour2,
                '-draw',"text 0,0 '" + cleantext + "'",
                './assets/blinkies-bg/png/' + style + '-2.png',
                './assets/blinkies-frames/' + blinkieID + '-2.png'
            ]
            const args3 = [
                '-page','+0+0',
                '-delay','10',
                '-loop','0',
                './assets/blinkies-frames/' + blinkieID + '*',
                './assets/blinkies-output/blinkiesCafe-' + blinkieID + '.gif'
            ]

            const stdout1 = execFile('convert', args1);
            const stdout2 = execFile('convert', args2);

            await Promise.all([stdout1, stdout2]).then(async function() {
                const { stdout3, stderr3 } = await execFile('convert', args3);
                if (stderr3) { console.error(stderr3); }
                timeEnd('  generating blinkie', time);
            });
            fs.unlink('./assets/blinkies-frames/' + blinkieID + '-1.png', function(err) {
                if (err) { return console.error(err); }
            });
            fs.unlink('./assets/blinkies-frames/' + blinkieID + '-2.png', function(err) {
                if (err) { return console.error(err); }
            });
            return blinkieLink;
        }  // end if

        else {
            console.error('error: style not cataloged')
            blinkieLink = siteURL + '/b/display/blinkiesCafe-error.gif';
        }  // end else

    }  // end try

    catch (err) {
        console.error(err);
        blinkieLink = siteURL + '/b/display/blinkiesCafe-error.gif';
    }
};

app.use(express.json());
app.use(helmet());

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/views/pages/generate/blinkiegen.html");
});

app.get("/about", function (req, res) {
    res.sendFile(__dirname + "/views/pages/about.html");
});

app.get("/blinkiegen", function (req, res) {
    res.sendFile(__dirname + "/views/pages/generate/blinkiegen.html");
});

app.get("/sitemap.txt", function (req, res) {
    res.sendFile(__dirname + "/views/pages/sitemap.txt");
});

app.get("/sources.txt", function (req, res) {
    res.sendFile(__dirname + "/views/pages/sources.txt");
});

app.get("/privacy.txt", function (req, res) {
    res.sendFile(__dirname + "/views/pages/privacy.txt");
});

app.get("/blinkieList.json", function (req, res) {
    res.contentType("application/json");
    res.set('Access-Control-Allow-Origin','*')
    res.send(JSON.stringify(styleList));
});

app.get("/blinkiegen.js", function (req, res) {
    res.sendFile(__dirname + "/src/client/blinkiegen.js");
});

app.get('/b/display/:blinkieName', function (req, res) {
    blinkieID = cleanBlinkieID(req.params['blinkieName']);
    res.sendFile(__dirname + "/assets/blinkies-display/" + blinkieID);
});

app.get('/b/:blinkieName', function (req, res) {
    blinkieID = cleanBlinkieID(req.params['blinkieName']);
    res.sendFile(__dirname + "/assets/blinkies-output/" + blinkieID);
});

app.get('/favicon.ico', function (req, res) {
    res.sendFile(__dirname + "/assets/favicon.ico");
});

app.post("/api/blinkiegen", async function (req, res) {
    const style = req.body.blinkieStyle;
    const intext = req.body.blinkieText;
    console.log(req.body);

    res.set('Content-Type', 'application/json');
    res.set('Access-Control-Allow-Origin','*')
    genBlinkie(style, intext, timeGenBlinkie).then(function(blinkieID) {
        console.log(blinkieID);
        console.log();
        res.end(blinkieID);
    });
});

app.options("/blinkieList.json", function(req, res, next){
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.sendStatus(200);
});

app.options("/api/blinkiegen", function(req, res, next){
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.sendStatus(200);
});

app.get("/robots.txt", function (req, res) {
    res.sendFile(__dirname + "/robots.txt");
});

app.use(function(req,res){
    res.status(404).sendFile(__dirname + "/views/pages/e404.html");
});

https.listen(8080, function () {
    console.log("https listening on *:8080\n");
});

if (prod) {
    // Redirect from http port 80 to https
    var http  = require("http")
    http.createServer(function (req, res) {
        res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
        res.end();
    }).listen(3000);
}
