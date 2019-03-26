const Express = require("express");
const BodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;

const CONNECTION_URL = "mongodb+srv://Admin:denzeladmin@cluster0-hyroc.mongodb.net/test?retryWrites=true"
const DATABASE_NAME = "example"
const imdb = require('./src/imdb');
const DENZEL_IMDB_ID = 'nm0000243';

let app = Express();
let database, collection;

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({
  extended: true
}));

//Connecting Mongo Atlas
app.listen(9292, () => {
  MongoClient.connect(CONNECTION_URL, {
    useNewUrlParser: true
  }, (error, client) => {
    if (error) {
      throw error;
    }
    database = client.db(DATABASE_NAME);
    collection = database.collection("people")
    console.log("Connected to " + DATABASE_NAME);
  })
});

async function populateDenzel(actor) {
  try {
    console.log(`📽️  fetching filmography of ${actor}...`);
    return await imdb(actor);
  } catch (e) {
    console.error(e);
  }
}

//GET /movies/populate
app.get("/movies/populate", async (request, response) => {
  const movies = await populateDenzel(DENZEL_IMDB_ID);
  collection.insertMany(movies, (error, result) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send({
      total: result.result.n
    });
  })
})

//GET /movies
app.get("/movies", async (request, response) => {
  let query = {
    "metascore": {
      $gte: 70
    }
  }
  let count = await collection.countDocuments(query);
  let random = Math.floor(Math.random() * count);
  let options = {
    "limit": 1,
    "skip": random
  }
  collection.findOne(query, options, (error, result) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send({
      id: result.id,
      link: result.link,
      metascore: result.metascore,
      poster: result.poster,
      rating: result.rating,
      synopsis: result.synopsis,
      title: result.title,
      votes: result.votes,
      year: result.year
    });
  })
});

//GET /movies/search
app.get("/movies/search", (request, response) => {
  let query = {
    "metascore": {
      $gte: parseInt(request.query.metascore)
    }
  };
  let options = {
    "limit": parseInt(request.query.limit),
    "sort": [
      ['metascore', 'desc']
    ]
  };
  collection.find(query, options).toArray((error, results) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send({
      limit: parseInt(request.query.limit),
      results: results,
      total: results.length
    });
  })
})

//GET /movies/:id
app.get("/movies/:id", (request, response) => {
  collection.findOne({
    "id": request.params.id
  }, (error, result) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send({
      id: result.id,
      link: result.link,
      metascore: result.metascore,
      poster: result.poster,
      rating: result.rating,
      synopsis: result.synopsis,
      title: result.title,
      votes: result.votes,
      year: result.year
    });
  })
})

//POST /movies/:id
app.post("/movies/:id", (request, response) => {
  let selector = {
    "id": request.params.id
  };
  let document = {
    $set: request.body
  };
  let options = {
    "upsert": true
  };
  collection.updateMany(selector, document, options, (error, result) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send(result)
  })
})