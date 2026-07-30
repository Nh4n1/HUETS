import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import config from '../config/config.db.ts';

class Database {
    private pool: Pool;
    private static instance: Database;

    constructor() {
        this.pool = new Pool({
            host: config.db.host,
            port: Number(config.db.port),
            database: config.db.name,
            user: config.db.user,
            password: config.db.password,
        });

        this.pool.on('error', (err: Error) => {
            console.error('Unexpected PG pool error:', err);
        });

        this.pool.connect()
            .then((client: PoolClient) => {
                console.log('Connected to PostgreSQL');
                client.release();
            })
            .catch((err: Error) => console.error('Error connecting to PostgreSQL:', err));
    }

    getPool() {
        return this.pool;
    }

    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
}

export default Database.getInstance();