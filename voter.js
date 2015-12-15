const _ = require('lodash');

const assignVotesToGames = function(votes, people, games, allocated) {
  const allocatedGames = allocated;

  const nextVotes = votes.map((vote) => {
    const [interestedGameIndex, ...nextInterestedGameIndexes] = vote.votes;
    const interestedGame = games[interestedGameIndex];

    // Just in case there is no game at the interested index
    if (!interestedGame) {
      return vote;
    }

    // Make sure we have this game set up in our results
    if (!allocatedGames.hasOwnProperty(interestedGame.id)) {
      // Seed with an empty array of players
      allocatedGames[interestedGame.id] = [];
    }

    // Is there room in the game for the player?
    if (allocatedGames[interestedGame.id].length < interestedGame.capacity) {
      allocatedGames[interestedGame.id].push(vote.personId);
    } else {
      // This person didn't get allocated, so return it with remaining choices
      return {
        personId: vote.personId,
        votes: nextInterestedGameIndexes
      };
    }
  }).reduce(function(a, b) {
    if (b) {
      return [...a, b];
    } else {
      return a;
    }
  }, []); // Make sure the array returned has non-null values

  return {
    allocatedGames,
    nextVotes
  };
};

const assignVotes = function(votes, people, games, initialAllocation) {
  var allocatedGames = Object.assign({}, initialAllocation);
  var nextVotes = votes;

  games.forEach(function(game) {
    const returnValue = assignVotesToGames(nextVotes, people, games, allocatedGames);
    allocatedGames = returnValue.allocatedGames;
    nextVotes = returnValue.nextVotes;
  });

  // Fill up any below capacity games with unassigned people
  for (var key in allocatedGames) {
    var allocatedGame = allocatedGames[key];
    while (nextVotes.length > 0 && allocatedGame.length < games[key].capacity) {
      allocatedGame.push(nextVotes.shift().personId);
    }
  }

  // Anybody left in nextVotes didn't get assigned a game.
  // Find their original vote (we've corrupted it - which is naughty!)
  const unallocatedVotes = nextVotes.map((vote) => {
    return _.find(votes, {'personId': vote.personId});
  });

  return {
    allocatedGames,
    unallocatedVotes
  }
};

const removeFromAllocated = function(allocatedGames, peopleIds) {
  var newAllocated = {};
  for (var key in allocatedGames) {
    newAllocated[key] = _.filter(allocatedGames[key], (item) => {
      return !peopleIds.includes(item);
    });
  }
  return newAllocated;
};

const getUnhappyFromAllocated = function(allocatedGames, votes) {
  return votes.map((vote) => {
    // vote = { personId: 0, votes: [2, 1, 3, 0]},
    if (vote.votes.length > 0) {
      var wantedGameId = vote.votes[0];
      // If the person isn't include in the list for their first choice game, they're considered unhappy
      if (allocatedGames.hasOwnProperty(wantedGameId) && !allocatedGames[wantedGameId].includes(vote.personId)){
        return vote.personId;
      }
    }
  }).reduce((a, b) => {
    if (b) {
      return [...a, b];
    } else {
      return a;
    }
  }, []);
};

const votesToString = function(votes, people, games) {
  return votes.map((vote) => {
    const votedPerson = _.find(people, (person) => {
      return person.id === vote.personId;
    });
    const votedGames = _.pluck(_.filter(games, (game) => {
      return vote.votes.includes(game.id);
    }), 'name');
    return `(${votedPerson.name} => [${votedGames}])`;
  }).join('\n\t');
};

const resultsToString = function(allocated, people, games) {
  var result = [];
  for (var key in allocated) {
    var allocation = allocated[key];
    var intKey = parseInt(key, 10);

    var allocatedGame = _.find(games, (game) => {
      return intKey === game.id;
    });

    var allocatedPeople = _.pluck(_.filter(people, (person) => {
      return allocation.includes(person.id);
    }), 'name');

    result.push(`(${allocatedGame.name} => [${allocatedPeople})]`);
  }
  return result.join('\n\t');
};

// The games that are on offer, along with the maximum number of players
const games = [
    {id: 0, name: 'a', capacity: 2},
    {id: 1, name: 'b', capacity: 2},
    {id: 2, name: 'c', capacity: 3},
    {id: 3, name: 'd', capacity: 4},
    {id: 4, name: 'e', capacity: 1}
];

const people = [
  { id: 0, name: 'Andy' },
  { id: 1, name: 'Bobbi' },
  { id: 2, name: 'Chris' },
  { id: 3, name: 'Dave' },
  { id: 4, name: 'Eddy' },
  { id: 5, name: 'Flo' },
  { id: 6, name: 'Gemma' },
  { id: 7, name: 'Harry' },
  { id: 8, name: 'Isla' },
  { id: 9, name: 'Jenson' },
  { id: 10, name: 'Kreb' },
  { id: 11, name: 'Lemon' },
  { id: 12, name: 'Keith' }
];

const votes = [
  { personId: 0, votes: [2, 1, 3, 0]},
  { personId: 1, votes: [0, 3, 1, 2]},
  { personId: 2, votes: [1, 0, 2]},
  { personId: 3, votes: [0, 3, 1, 2]},
  { personId: 4, votes: [0, 3, 2, 1]},
  { personId: 5, votes: [0, 2, 3, 1]},
  { personId: 6, votes: [0, 1, 2]},
  { personId: 7, votes: [0, 2]},
  { personId: 8, votes: []},
  { personId: 9, votes: [2, 3, 1, 0]},
  { personId: 10, votes: [4, 3, 1]},
  { personId: 11, votes: [2, 3, 0, 1]},
  { personId: 12, votes: [0]},
];

console.log('Games =>', games);

// Randomise the votes
const shuffledVotes = _.sample(votes, votes.length);
console.log('Votes =>', votesToString(shuffledVotes, people, games));

// Allocate the people's votes to the games
const results = assignVotes(shuffledVotes, people, games, {});
console.log('Allocated =>', resultsToString(results.allocatedGames, people, games));
console.log('Unallocated Votes =>', votesToString(results.unallocatedVotes, people, games));

// Retain the id's of those that weren't allocated games
const unallocatedVoters = results.unallocatedVotes.map((unallocatedVote) => {
  return unallocatedVote.personId;
});

// Dave isn't happy and so is going to set up another game (this could happen at conference)
// Remove him from any allocation
const allocatedWithoutDave = removeFromAllocated(results.allocatedGames, [4]);
// Create Dave's new game
const newGames = [...games, {id: 5, name: 'f', capacity: 2
console.log('Adding a new game and some people are going to change their votes.');
console.log('Games =>', newGames);

// Harry, Isla and Jenkins are going to revote now a new game has been announced
// Changing your mind could penalise you
const changedVotes = [
  { personId: 7, votes: [5, 0, 2, 1]},
  { personId: 8, votes: [5]},
  { personId: 9, votes: [5, 2, 3, 1, 0]},
];

// Grab the id's of the voters changing their minds
const changedVoters = changedVotes.map((changedVote) => {
  return changedVote.personId;
});

// Remove the revoters from their currently allocated games
const allocatedWithoutRevoters = removeFromAllocated(results.allocatedGames, changedVoters);
// Shuffle the revoters votes
const shuffledChangedVotes = _.sample(changedVotes, changedVotes.length);

// There may be room now for people who didn't get first choice to get it now
const unhappy = _.difference(getUnhappyFromAllocated(results.allocatedGames, votes), changedVoters);
const allocatedHappy = removeFromAllocated(allocatedWithoutRevoters, unhappy);
// Find the original votes of those who didn't get their first choice
const unhappyVotes = unhappy.map((personId) => {
  return _.find(votes, {'personId': personId});
});
const shuffledUnhappyVotes = _.sample(unhappyVotes, unhappyVotes.length);

// Revoters are given a lower priority to unhappy voters
const revotes = [...unhappyVotes, ...shuffledChangedVotes];
console.log('Votes =>', votesToString(revotes, people, newGames));

// Allocate the people's votes to the games leaving those who got their first choices and didn't revote alone
const newResult = assignVotes(revotes, people, newGames, allocatedHappy);
console.log('Allocated =>', resultsToString(newResult.allocatedGames, people, newGames));
console.log('Unallocated Votes =>', votesToString(newResult.unallocatedVotes, people, newGames));
