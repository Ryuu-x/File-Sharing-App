import mongoose from 'mongoose'

const DBConnection = async () => {

    const MONGDB_URL = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@file-sharing.14oavqg.mongodb.net/?retryWrites=true&w=majority&appName=file-sharing`;


    try {
        await mongoose.connect(MONGDB_URL, { useNewUrlParser: true })
        console.log('Database connected successfully');
        
    } catch (e) {
        console.error("Error while connecting to the database", e.message)
    }
}

export default DBConnection;