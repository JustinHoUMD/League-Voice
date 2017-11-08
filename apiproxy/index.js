const express = require('express');
const app = express();

const { RGAPI_KEY, CGGAPI_KEY } = process.env;
const TeemoJS = require('teemojs');
const rgapi = new TeemoJS(RGAPI_KEY);

const cGG = require("cgg").cGG;
const cggapi = new cGG(CGGAPI_KEY);

console.log("RGAPI_KEY: " + (RGAPI_KEY && RGAPI_KEY.replace(/[a-f0-9]/g, '*')));
console.log("CGGAPI_KEY: " + (CGGAPI_KEY && CGGAPI_KEY.replace(/[a-f0-9]/g, '*')));

app.get('/rgapi/:platform/summoner/getBySummonerName/:name', (req, res) => {
  const { platform, name } = req.params;
  console.log(platform, 'summoner.getBySummonerName', name);
  rgapi.get(platform, 'summoner.getBySummonerName', name)
    .then(data => {
      if (!data)
        res.status(404).end();
      else
        res.json(data).end();
    })
    .catch(error => res.status(500).json({ error }).end());
});

app.get('/rgapi/:platform/league/getAllLeaguePositionsForSummoner/:summonerid', (req, res) => {
  const { platform, summonerid } = req.params;
  console.log(platform, 'league.getAllLeaguePositionsForSummoner', summonerid);
  rgapi.get(platform, 'league.getAllLeaguePositionsForSummoner', summonerid)
    .then(data => {
      res.json(data || []).end();
    })
    .catch(error => res.status(500).json({ error }).end());
});

const config = require('../config.json')
const port = config.apiproxy.port;
const mask = '0.0.0.0';
app.listen(port, mask, () => console.log('Listening on ' + mask + ':' + port + '.'));
