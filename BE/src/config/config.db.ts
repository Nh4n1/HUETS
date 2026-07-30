import dotenv from 'dotenv';
dotenv.config();
interface EnvConfig {
    app: {
        port: string | number;
    };
    db: {
        host: string;
        port: string | number;
        name: string;
        password: string;
        user: string;
    };
}

interface Config {
    dev: EnvConfig;
    prod: EnvConfig;
}

const dev ={
    app:{
        port: process.env.DEV_APP_PORT || 3000,
    },
    db:{
        host: process.env.DEV_DB_HOST || 'localhost',
        port: process.env.DEV_DB_PORT || 5432,
        name: process.env.DEV_DB_NAME || 'mydatabase',
        password: process.env.DEV_DB_PASSWORD || 'mydbpassword',
        user: process.env.DEV_DB_USER || 'postgres',
    }
}

const prod={
    app:{
        port: process.env.PROD_APP_PORT || 3000,
    },
    db:{
        host: process.env.PROD_DB_HOST || 'localhost',
        port: process.env.PROD_DB_PORT || 5432,
        name: process.env.PROD_DB_NAME || 'mydatabase',
        password: process.env.PROD_DB_PASSWORD || 'password',
        user: process.env.PROD_DB_USER || 'postgres',
    }
}

const config: Config = { dev, prod };
const env: keyof Config = process.env.NODE_ENV === 'prod'? 'prod' : 'dev';

export default config[env];