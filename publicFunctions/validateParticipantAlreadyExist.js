import { MongoClient } from "mongodb";
export default async function validateParticipantAlreadyExist(participant){
    const mongoClient = new MongoClient(process.env.MONGO_URI);
    try {
        await mongoClient.connect()
        const dbParticipants = mongoClient.db("uolProject")
        const participantsCollection = dbParticipants.collection("participants")
        const participantAlreadyExist = await participantsCollection.findOne({name: participant})
        if (participantAlreadyExist){
            return true
        } else{
            return false
        }
        mongoClient.close()
    } catch (error) {
       return false
    }
}