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
        const selectClassCollection = client.db('MeditationDB').collection('selectedClasses')


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

        app.get('/approvedClasses', async (req, res) => {
            try {
                const result = await classCollection.find({ status: 'approved' }).toArray();
                res.send(result);
            } catch (error) {
                console.error('Error fetching approved classes:', error);
                res.status(500).json({ message: 'Internal Server Error' });
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

        app.get('/selected', verifyJwt, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden Access' })
            }

            const query = { email: email };
            const result = await selectClassCollection.find(query).toArray();
            res.send(result);
        })




        app.post('/selectedClass', async (req, res) => {
            const classes = req.body;
            const result = await selectClassCollection.insertOne(classes);
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

        //------------------ payment-----------
        // app.get('/enrolled/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const query = { email: email };
        //     const result = await enrolledCollection.find(query).toArray();
        //     res.send(result);
        // })

        // app.patch('/totalStudent/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const filter = { _id: new ObjectId(id) };
        //     const enrollClass = await classCollection.findOne(filter)
        //     const totalStudent = {
        //         $set: {
        //             totalStudent: enrollClass.totalStudent + 1
        //         }
        //     }
        //     const result = await classCollection.updateOne(filter, totalStudent);
        //     res.send(result)
        // })

        // app.post('/create-payment-intent', verifyJwt, async (req, res) => {
        //     const { price } = req.body;
        //     const amount = parseInt(price * 100);
        //     const paymentIntent = await stripe.paymentIntents.create({
        //         amount: amount,
        //         currency: 'usd',
        //         payment_method_types: ['card']
        //     });

        //     res.send({
        //         clientSecret: paymentIntent.client_secret
        //     })
        // })

        // app.post('/payments', verifyJwt, async (req, res) => {
        //     const payment = req.body;
        //     const insertResult = await paymentCollection.insertOne(payment);

        //     const query = { _id: new ObjectId(payment.selectedClass) };
        //     const deleteResult = await selectClassCollection.deleteOne(query);

        //     // Update the seat count for each selected class
        //     const filter = { _id: new ObjectId(payment.enrolledClass) };
        //     const options = {
        //         projection: {
        //             _id: 0,
        //             className: 1,
        //             classImage: 1,
        //             instructorEmail: 1,
        //             instructorName: 1,
        //             price: 1,
        //             seats: 1,
        //         },
        //     };

        //     const enrolled = await classCollection.findOne(filter, options);
        //     enrolled.email = payment.email
        //     const enrolledResult = await enrolledCollection.insertOne(enrolled)

        //     const totalUpdateSeats = {
        //         $set: {
        //             seats: enrolled.seats - 1,
        //         },
        //     };
        //     const updateSeats = await classCollection.updateOne(
        //         filter,
        //         totalUpdateSeats
        //     );

        //     res.send({ insertResult, deleteResult, updateSeats, enrolledResult });
        // });


        // -------------------payment----------





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