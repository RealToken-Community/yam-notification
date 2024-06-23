import { mysqlQuery } from './_helpers.js';

class UserController {
    static getUser = async (request) => {
        try {
            const { userId } = request;

            const user = await mysqlQuery(`
                select 
                    yieldMin,
                    deltaMax,
                    quantityMin,
                    typeProperty
                from 
                    user u
                where u.userId = ${userId}
                limit 1
            `);

            const blacklist = await mysqlQuery(`
                select
                    item
                from
                    blacklist
                where
                    userId = ${userId}
            `);

            return user && user.length ? { ...user[0], blacklist: blacklist.map(bl => bl.item) } : null;
        } catch (error) {
            console.error(error);
        }
    };

    static getUsersFromParams = async (request) => {
        try {
            const { newYield, deltaPrice, availableAmount, blacklist, typeProperty } = request;

            const users = await mysqlQuery(`
            SELECT 
                u.userId,
                u.lang
            FROM 
                user u
            LEFT JOIN 
                blacklist b ON u.userId = b.userId
            WHERE 
                u.yieldMin <= ?
                AND u.deltaMax >= ?
                AND u.quantityMin <= ?
                AND u.archivedAt IS NULL
                AND NOT EXISTS (
                    SELECT 1 
                    FROM blacklist b2 
                    WHERE b2.userId = u.userId 
                    AND b2.item = ?
                )
                AND (
                    typeProperty = ? 
                    OR typeProperty = 0
                )
            GROUP BY 
                u.userId;
            `, [newYield, deltaPrice, availableAmount, blacklist, +typeProperty]);

            return users;
        } catch (error) {
            console.error(error);
        }
    };

    static editUser = async (request) => {
        try {
            const { yieldMin, userId, deltaMax, quantityMin, typeProperty } = request;

            const user = {};

            if (yieldMin !== null && yieldMin !== undefined) {
                user.yieldMin = yieldMin;
            }

            if (deltaMax !== null && deltaMax !== undefined) {
                user.deltaMax = deltaMax;
            }

            if (quantityMin !== null && quantityMin !== undefined) {
                user.quantityMin = quantityMin;
            }

            if (typeProperty !== null && typeProperty !== undefined) {
                user.typeProperty = typeProperty;
            }

            if (Object.keys(user).length === 0) {
                return false;
            }

            await mysqlQuery(`
                update user
                set ${Object.keys(user).map(key => `${key} = ?`).join(', ')}
                where userId = ${userId}
            `, Object.values(user));

            return true;
        } catch (error) {
            console.error(error);
        }
    };

    static newUser = async (request) => {
        try {
            const { userId, deltaMax, yieldMin, quantityMin } = request;

            await mysqlQuery(`
                INSERT INTO user (userId, deltaMax, yieldMin, quantityMin)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE archivedAt = NULL
            `, [userId, deltaMax, yieldMin, quantityMin]);

            return true;
        } catch (error) {
            console.error(error);
        }
    };

    static archiveUser = async (request) => {
        try {
            const { userId } = request;

            await mysqlQuery(`
                update user
                set archivedAt = now()
                where userId = ${userId}
            `);

            return true;
        } catch (error) {
            console.error(error);
        }
    };

    static addBlacklist = async (request) => {
        try {
            const { userId, id } = request;

            if (id.length !== 42) {
                throw new Error('Invalid contract id');
            }

            await mysqlQuery(`
                insert into blacklist (userId, item)
                values (?, ?)
            `, [userId, id, id]);

            return true;
        } catch (error) {
            console.error(error);
        }
    };

    static deleteBlacklist = async (request) => {
        try {
            const { userId, id } = request;

            if (id.length !== 42) {
                throw new Error('Invalid contract id');
            }

            await mysqlQuery(`
                delete from blacklist
                where
                    userId = ?
                    AND item = ?
            `, [userId, id]);

            return true;
        } catch (error) {
            console.error(error);
        }
    };

    static editLang = async (request) => {
        try {
            const { userId, lang } = request;

            await mysqlQuery(`
                update user
                set lang = ?
                where userId = ?
            `, [lang, userId]);

            return true;
        } catch (error) {
            console.error(error);
        }
    };
}

export default UserController;