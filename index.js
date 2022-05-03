import express, {json} from "express"
import cors from "cors"
import {MongoClient, ObjectId} from "mongodb"
import dotenv from "dotenv"
import joi from "joi"
import dayjs from "dayjs"


import validateParticipantAlreadyExist from "./publicFunctions/validateParticipantAlreadyExist.js"


const app = express()
dotenv.config()

app.listen(5000)
app.use(json())
app.use(cors())

const date = dayjs()

setInterval(async () => {
    const mongoClient = new MongoClient(process.env.MONGO_URI)

    try{
        await mongoClient.connect()
        const db = mongoClient.db("uolProject")
        const participantsCollection= db.collection("participants")
        const participants = await participantsCollection.find({}).toArray()
        const outdatedParticipants = participants.filter(e => {
            if(Date.now() - e.lastStatus > 10000){
                return e
            }
        })
        if(outdatedParticipants.length > 0){
            outdatedParticipants.forEach(async e => {
                const deleted = await participantsCollection.deleteOne({_id: e._id})
                if(deleted){
                    const messagesCollection = db.collection("messages")
                    const messages = await messagesCollection.insertOne({ from: e.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: dayjs().locale("pt-br").format("hh:mm:ss") })
                }
            })
        }
    }catch{

    }
},15000)

app.get("/participants", async (req,res) => {
    const mongoClient = new MongoClient(process.env.MONGO_URI);

    try {
        await mongoClient.connect()
        const dbParticipants = mongoClient.db("uolProject")
        const participantsCollection = dbParticipants.collection("participants")
        const participants = await participantsCollection.find({}).toArray()
        res.send(participants)
        mongoClient.close()
    } catch (error) {
        res.status(500).send(error)
        mongoClient.close()
    }
})

app.post("/participants", async (req, res) => {
    const {name} = req.body
    const pasticipantsSchema = joi.object({
        name: joi.string().required()
    })
    const validate = pasticipantsSchema.validate({name})
    if (validate.error) {
        res.status(422).send(validate.error)
        return;
    }
    const mongoClient = new MongoClient(process.env.MONGO_URI);

    try {
        await mongoClient.connect()
        const db = mongoClient.db("uolProject")
        const participantsCollection = db.collection("participants")
        const resultParticipant = await participantsCollection.findOne({name: name})

        if(!resultParticipant){
            await participantsCollection.insertOne({name, lastStatus: Date.now()})

            const messagesCollection = db.collection("messages")
            const message = await messagesCollection.insertOne({
                from: name,
                to: "todos",
                text: "entra na sala...",
                type: "status",
                time : dayjs().locale("pt-br").format("hh:mm:ss")
            })
        } else {
            res.status(409).send("Participant already exists")
            mongoClient.close()
        }
        res.sendStatus(201)
        mongoClient.close()

    }catch(e){
        res.status(500).send(e)
        mongoClient.close()
    }
})

app.get("/messages", async(req, res) => {
    let {limit} = req.query
    const {user} = req.headers
    limit ? limit : limit = 100
    const mongoClient = new MongoClient(process.env.MONGO_URI);
    try{
        await mongoClient.connect()
        const db = mongoClient.db("uolProject")
        const messagesCollection = db.collection("messages")
        const messages = await messagesCollection.find({$or:[{to:user},{from:user},{type: "message"},{type:"status"}]}).toArray()
        messages.length > 100 ?res.send(messages.slice(messages.length-limit, messages.length)) : res.send(messages.slice(0, messages.length))
        }
    catch(error){
        res.status(500).send(error)
    }
})

app.post("/messages", async (req, res) => {x
    const {to, text, type} = req.body
    const {user} = req.headers 
    const mongoClient = new MongoClient(process.env.MONGO_URI);

    const messagesSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid("message", "private-message").required()
    })
    const validation =  messagesSchema.validate({to, text, type})
    
    if(validation.error){
        res.status(422).send(validation.error)
        return;
    }

    const participantAlreadyExist =  await validateParticipantAlreadyExist(user)
    console.log(participantAlreadyExist)
    if(participantAlreadyExist){
    try{
        await mongoClient.connect()

        const db = mongoClient.db("uolProject")
        const messagesCollection = db.collection("messages")
        const message = await messagesCollection.insertOne({
            from: user,
            to,
            text,
            type,
            time: dayjs().locale("pt-br").format("hh:mm:ss")
        })
        res.sendStatus(201)
        mongoClient.close()
    }catch(e){
        res.status(500).send(e)
        mongoClient.close()
    }
} else{
    res.status(403).send("Participant not found")
    mongoClient.close()
}
})

app.post("/status", async (req, res) => {
    const {user} = req.headers
    const mongoClient = new MongoClient(process.env.MONGO_URI);

    try{
        await mongoClient.connect()
        const db = mongoClient.db("uolProject")
        const participantsCollection = db.collection("participants")
        const resultParticipant = await participantsCollection.findOne({name: user})
        if(resultParticipant){
            await participantsCollection.updateOne({name: user}, {$set: {lastStatus: Date.now()}})
            res.sendStatus(200)
            mongoClient.close()
        } else{
            res.sendStatus(404)
        }
    }catch{
        res.sendStatus(500)
    }
})