import express, {json} from "express"
import cors from "cors"
import {MongoClient} from "mongodb"
import dotenv from "dotenv"
import joi from "joi"
import dayjs from "dayjs"

const app = express()
dotenv.config()

app.listen(5000)
app.use(json())
app.use(cors())

const mongoClient = new MongoClient(process.env.MONGO_URI);

const schema = joi.object({
    name: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message","private-message").required()
})
const date = dayjs()
app.get("/participants", async (req,res) => {
    try {
        await mongoClient.connect()
        const dbParticipants = mongoClient.db("uolProject")
        const participantsCollection = dbParticipants.collection("participants")
        const participants = await participantsCollection.find({}).toArray()
        res.status(200).send(participants)
    } catch (error) {
        res.status(500).send(error)
    }
})

app.post("/participants", async (req, res) => {
    const {name} = req.body
    try {
        await schema.validateAsync({name})

        await mongoClient.connect()
        const db = mongoClient.db("uolProject")
        const participantsCollection = db.collection("participants")
        const resultParticipant = await participantsCollection.findOne({name: name})

        if(!resultParticipant){
            const participant = await participantsCollection.insertOne({name, lastStatus: date.locale("pt-br").format("hh:mm:ss")})

            const messagesCollection = db.collection("messages")
            const message = await messagesCollection.insertOne({
                from: name,
                to: "todos",
                text: "entra na sala...",
                type: "status",
                time : date.locale("pt-br").format("hh:mm:ss")
            })
            if(message){
                res.status(201)
            } else{
                res.status(500)
            }
        } else {
            res.status(409).send("Participant already exists")
        }

        mongoClient.close()
    }catch(e){
        res.status(500).send(e)
        mongoClient.close()
    }
})

app.get("/messages", async(req, res) => {
    const {body} = req.body
    const {limit} = req.params
    try{
        await mongoClient.connect()
        const db = mongoClient.db("uolProject")
        const messagesCollection = db.collection("messages")
        const messages = await messagesCollection.find({}).toArray()
        res.send(messages)
    } catch(error){
        res.status(500).send(error)
    }
})

app.post("/messages", (req, res) => {
    const {body} = req.body
    const {to, text} = body
    const {from} = req.headers 
    try{
        mongoClient.connect()

        const db = mongoClient.db("uolProject")
        const messagesCollection = db.collection("messages")
        const message = await messagesCollection.insertOne({
            from,
            to,
            text,
            type,
            time: date.locale("pt-br").format("hh:mm:ss")
        })
    }catch(e){
        res.status(500).send(e)
    }
})

app.post("/status", (req, res) => {

})