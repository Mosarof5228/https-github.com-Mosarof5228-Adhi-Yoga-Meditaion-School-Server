const express = require('express');
const app = express();
const cors = require("cors");
require('dotenv').config()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

//middleware
app.use(cors())
app.use(express.json());


const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorized Access' })
    }

    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'Unauthorized Access' })
        };
        req.decoded = decoded;
        next();
    })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cqf2amb.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const usersCollection = client.db('MeditationDB').collection('users')
        const classCollection = client.db('MeditationDB').collection('classes')


        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })


        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })

        app.get('/users/admin/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };

            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }

            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result)
        })
        app.get('/users/instructor/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result)
        })



        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);
            console.log("existing user:", existingUser);
            if (existingUser) {
                return res.send({ message: 'user already exists' });
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);

        })


        app.get('/myClasses', verifyJwt, async (req, res) => {
            try {
                const email = req.query.email;
                const query = { instructorEmail: email };
                const user = await classCollection.find(query).toArray();
                res.send(user);
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });

        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        })


        app.post('/classes', async (req, res) => {
            const classes = req.body;
            const result = await classCollection.insertOne(classes);
            res.send(result);
        })

        app.patch('/classes', async (req, res) => {
            const id = req.query.id;
            const status = req.query.status;
            let updatedDoc = {};
            if (status === 'approved') {
                updatedDoc = {
                    $set: {
                        status: 'approved'
                    }
                }
            }
            const filter = { _id: new ObjectId(id) };
            const result = await classCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })



        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            };
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'instructor'
                }
            };
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("boss is sitting")
})

app.listen(port, () => {
    console.log(`Adhi Yoga Meditation School ${port}`)
})