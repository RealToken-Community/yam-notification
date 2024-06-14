import mysql from 'mysql';
export const mysqlQuery = async (query, params = null) => {
    return new Promise((resolve, reject) => {
        const con = mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PWD,
            database: process.env.MYSQL_BASE
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
        password: process.env.MYSQL_PWD,
        database: process.env.MYSQL_BASE
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