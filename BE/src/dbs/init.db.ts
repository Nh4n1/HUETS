import mongoose from 'mongoose';
import config from '../config/config.db.ts';

class Database {
    private static instance: Database;

    constructor() {
        mongoose.connect(config.mongo.uri)
            .then(() => {
                console.log('Connected to MongoDB successfully');
            })
            .catch((err: Error) => console.error('Error connecting to MongoDB:', err));

        mongoose.connection.on('error', (err: Error) => {
            console.error('Unexpected MongoDB connection error:', err);
        });
    }

    getConnection() {
        return mongoose.connection;
    }

    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
}

export default Database.getInstance();
