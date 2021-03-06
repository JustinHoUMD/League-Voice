'use strict';

const DialogflowApp = require('actions-on-google').DialogflowApp;
var admin = require("firebase-admin");
const functions = require('firebase-functions');
const tracking = require('./backend/tracking.js');
const client = require('./backend/client.js');
const champselect = require('./backend/championSelect/championSelect.js');

const gameTimer = require('./backend/currentGame/gameTimer.js');
const firebase = require('firebase');
const fbUser = require('./firebase/user')
const aggregate = require('./backend/aggregate')
const spell = require('./backend/currentGame/spellTimer.js');
const tipBackend = require('./backend/userNotes/enemyTips.js');

const staticIntent = require('./staticIntent');
const notesIntent = require('./notesIntent');
const matchIntent = require('./matchIntent');
const itemIntent = require('./itemIntent');
const championRole = require('./backend/itemization/championRole')
const tipsIntent = require('./tipsIntent')

const welcomeIntent = (app) => {
    app.ask("Welcome to League Voice! How can we help you improve?")
}

const checkUserRanksIntent = (app) => {
  const numeralEnum = {
    "I": "1",
    "II": "2",
    "III": "3",
    "IV": "4",
    "V": "5"
  }
  aggregate.userRanksByQueue(app.getUser()['user_id'])
    .then(function(res){
      var rankArray = res["RANKED_SOLO_5x5"].split(" ")
      var rankStr = rankArray[0].toLowerCase() + " " + numeralEnum[rankArray[1]]
      if (rankArray[0] !== "CHALLENGER"){
        app.tell("You're a " + rankStr + " player. Let's work to get you even higher!")
      }
      else {
        app.tell("You're a " + rankStr + " player. Please teach me how to play, senpai.")
      }
  })
    .catch(function(e) {
      app.tell("I can't get your rank right now. Set up your summoner with me first.")
    });
}

const WhoToPlayAgainstIntent = (app) => {
  console.log(client.getChampionID(app.getArgument('champion').toLowerCase()))
  client.getBestMatchupsByLane(client.getChampionID(app.getArgument('champion').toLowerCase()))
  .then(function(response){
    console.log(response)
    if (response[0].count != 0){
      var name = client.getChampionName(response[0].matchups[0].championID)
      var nice_name = name.charAt(0).toUpperCase() + name.slice(1)
      app.ask("You should play " + nice_name + ". " + nice_name + " has a " + Math.round(response[0].matchups[0].winrate*100) + " percent winrate in this matchup.");
    }
    else {
      app.tell("Welp, I have no clue. Play what feels best!");
    }
  });
}

const RoleChampSuggestIntent = (app) => {
  champselect.suggestChampionToPick(app.getUser()["userId"], app.getArgument('role').toUpperCase())
    .then(function(response){
      console.log(response)
      var champString = ""
      var name;
      var nice_name;
      var i;
      for (i = 0; i < response.length - 1; i++) {
        name = client.getChampionName(response[i])
        nice_name = name.charAt(0).toUpperCase() + name.slice(1)
        champString += nice_name + ", ";
      }
      name = client.getChampionName(response[i])
      nice_name = name.charAt(0).toUpperCase() + name.slice(1)
      champString += "or " + nice_name
      app.ask("Based on your mastery and current winrate, some champs you could play are " + champString)
  })
    .catch(function(e) {
      app.tell("We can't suggest champions for you right now. Make sure that you've registered your summoner with me.")
    })
}

const WhoToBanIntent = (app) => {
  client.getBestMatchupsByLane(client.getChampionID(app.getArgument('champion').toLowerCase()))
  .then(function(response){
if (response[0].count != 0){
      var name = client.getChampionName(response[0].matchups[0].championID)
      var nice_name = name.charAt(0).toUpperCase() + name.slice(1)
      app.ask("You should ban " + nice_name + ". " + nice_name + " has a " + Math.round(response[0].matchups[0].winrate*100) + " percent winrate in this matchup.");
    }
    else {
      app.tell("Welp, I have no clue. Play what feels best!");
    }
  });
}

const SummonerIntent = (app) => {
  app.ask("Your summoner name is set to: " + app.getArgument('summoner') + ". What region do you play in?")
}

const RegionIntent = (app) => {
  fbUser.createFromSummonerName(app.getUser()['userId'], app.getArgument('summoner'), app.getArgument('region')).then(function(res){
    app.ask("Your region is set to: " + app.getArgument('region') + ".")
  });
}

const Actions = { // the action names from the DialogFlow intent. actions mapped to functions
    WELCOME_INTENT: 'input.welcome',
    CHECK_USER_RANKS: 'CheckUserRanks',
    STATIC_CHAMPION_ABILITY: 'Static.ChampionAbility',
    STATIC_CHAMPION_ABILITY_COOLDOWN: 'Static.ChampionAbilityCooldown',
    STATIC_CHAMPION_ATTACK_RANGE: 'Static.ChampionAttackRange',
    STATIC_CHAMPION_COUNT: 'Static.ChampionCount',
    STATIC_CHAMPION_ABILITY_COST: 'Static.ChampionAbilityCost',
    STATIC_CHAMPION_ABILITY_DAMAGE: 'Static.ChampionAbilityDamage',
    WHO_TO_PLAY_AGAINST: 'WhoToPlayAgainst',
    ROLE_CHAMP_SUGGEST: "RoleChampSuggest",
    WHO_TO_BAN: 'WhoToBan',
    SS_STORE_INTENT: 'SummonerSpellStore',
    SS_GET_INTENT: 'SummonerSpellGet',
    ENEMY_INFO: 'EnemyInfo',
    SUMMONER: 'Summoner',
    REGION: 'Region',
    ADVICE: 'Advice',
    WRITE_NOTE: 'WriteNote',
    READ_NOTE: 'ReadNote',
    ITEM_SUGGESTION: 'ItemWinLoseEqual',
    ENEMY_TIPS: 'EnemyTips'
}

function initialize() {
  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyB9sQFV5h8cK3kDGkMtKy4-6RK3x7Aados",
    authDomain: "league-voice-7fa50.firebaseapp.com",
    databaseURL: "https://league-voice-7fa50.firebaseio.com",
    projectId: "league-voice-7fa50",
    storageBucket: "league-voice-7fa50.appspot.com",
    messagingSenderId: "702299684043"
  };
  firebase.initializeApp(config);
}

initialize();
const actionMap = new Map();
actionMap.set(Actions.WELCOME_INTENT, welcomeIntent);
actionMap.set(Actions.CHECK_USER_RANKS, checkUserRanksIntent);
actionMap.set(Actions.STATIC_CHAMPION_ABILITY, staticIntent.championAbility);
actionMap.set(Actions.STATIC_CHAMPION_ABILITY_COOLDOWN, staticIntent.championAbilityCooldown);
actionMap.set(Actions.STATIC_CHAMPION_ATTACK_RANGE, staticIntent.championAttackRange);
actionMap.set(Actions.STATIC_CHAMPION_COUNT, staticIntent.championCount);
actionMap.set(Actions.STATIC_CHAMPION_ABILITY_COST, staticIntent.championAbilityCost);
actionMap.set(Actions.STATIC_CHAMPION_ABILITY_DAMAGE, staticIntent.championAbilityDamage);
actionMap.set(Actions.WHO_TO_PLAY_AGAINST, WhoToPlayAgainstIntent);
actionMap.set(Actions.ROLE_CHAMP_SUGGEST, RoleChampSuggestIntent);
actionMap.set(Actions.WHO_TO_BAN, WhoToBanIntent);
actionMap.set(Actions.SS_STORE_INTENT, matchIntent.SummonerSpellStoreIntent);
actionMap.set(Actions.SS_GET_INTENT, matchIntent.SummonerSpellGetIntent);
actionMap.set(Actions.ENEMY_INFO, matchIntent.EnemyInfoIntent);
actionMap.set(Actions.SUMMONER, SummonerIntent);
actionMap.set(Actions.REGION, RegionIntent);
actionMap.set(Actions.ADVICE, matchIntent.AdviceIntent);
actionMap.set(Actions.WRITE_NOTE, notesIntent.WriteNoteIntent);
actionMap.set(Actions.READ_NOTE, notesIntent.ReadNoteIntent);
actionMap.set(Actions.ITEM_SUGGESTION, itemIntent.ItemSuggestion)
actionMap.set(Actions.ENEMY_TIPS, tipsIntent.EnemyTipsIntent)

/* 
fbUser.createFromSummonerName("testfang", "45620", "na1").then(function(res) {
  championRecord.getChampionRecord("testfang", client.getChampionID("jinx")).then(console.log);
});
*/

// classification.getItems('test3');
// checkUserRanksIntent("test").then(function(response){
// 	console.log(JSON.stringify(response));
// }).catch(function(e){
// 	console.log(e);
// });



//tracking.createUser(97, "orkosarkar", "na1")
//tracking.addNewMatches("test2", 230957428, "na1")

//spell.getSpellTime('test', 'annie', 'flash').then(snap=>console.log(snap));

const leagueVoice = functions.https.onRequest((request, response) => {
  const app = new DialogflowApp({request, response});
  app.handleRequest(actionMap);
});

module.exports = {
  leagueVoice
};

// tipBackend.getTipsAgainst("ashe", "jhin").then(function(tips){
//   console.log(tips)
// })


