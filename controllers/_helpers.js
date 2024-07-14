import mysql from 'mysql';
import { ethers } from 'ethers';
import { 
    GNOSIS_RPC_PROVIDER, 
    GNOSIS_ABI_YAM, 
    GNOSIS_CONTRACT_YAM 
} from '../_constants/index.js';

export const mysqlQuery = async (query, params = null) => {
    return new Promise((resolve, reject) => {
        const con = mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });

        con.connect((err) => {
            if (err) {
                reject(err);
            }
        });

        con.query(query, params, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }

            con.end();
        });
    });
}

export const mysqlQueryMulti = async (queries) => {
    const con = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    });

    con.connect((err) => {
        if (err) {
            throw err;
        }
    });

    return Promise.all(queries.map((query) => {
        return new Promise((resolve, reject) => {
            con.query(query, (err, result) => {
                if (err) {
                    reject(err);

                } else {
                    resolve(result);

                }
            });
        });
    }
    )).then((results) => {
        con.end();
        return results;

    }).catch((err) => {
        con.end();
        throw err;

    });
}

export const YAMcontract = new ethers.Contract(GNOSIS_CONTRACT_YAM, GNOSIS_ABI_YAM, new ethers.JsonRpcProvider(GNOSIS_RPC_PROVIDER));

export const formatPrice = (price) => {
    const priceString = price.toString();
    const integerPart = priceString.slice(0, priceString.length - 6) || "0";
    const decimalPart = priceString.slice(priceString.length - 6).padEnd(6, '0');
    return `${integerPart}.${decimalPart}`;
};

export const formatAmount = (amount) => {
    const amountBigInt = BigInt(amount);
    const amountString = (amountBigInt / 1000000000000000000n).toString();
    const decimalString = (amountBigInt % 1000000000000000000n).toString().padStart(18, '0');
    const formattedDecimal = decimalString.slice(0, 2);
    return `${amountString}.${formattedDecimal}`;
};