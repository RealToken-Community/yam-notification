import axios from 'axios';
import { readFileSync, writeFileSync } from "fs";

class RealtController {
    static getTokens = async () => {
        try {
            const response = await axios.get('https://api.realt.community/v1/token');

            const data = response.data;

            if (!data || !data.length) {
                throw new Error('No data found', response);
            }

            await writeFileSync('json/tokens.json', JSON.stringify(data));
        } catch (error) {
            console.error(error);
        }
    };

    static getOffers = async (request, reply) => {
        const { first = 50, orderBy = 'id', orderDirection = 'desc' } = request;

        try {
            const response = await axios.post('https://api.realtoken.network/graphql', {
                "query": `query getOffers {\n  yamGnosis {\n    offers(first: ${first}, orderBy: ${orderBy}, orderDirection: ${orderDirection}) {\n      id\n      seller {\n        id\n        address\n        __typename\n      }\n      offerToken {\n        address\n        name\n        symbol\n        tokenType\n      }\n      price {\n        price\n        amount\n      }\n      buyerToken {\n        name\n        symbol\n        address\n      }\n      removedAtBlock\n      availableAmount\n      createdAtTimestamp\n    }\n  }\n}`,
                "operationName": "getOffers"
            });

            if (!response.data || !response.data.data || !response.data.data.yamGnosis || !response.data.data.yamGnosis.offers) {
                throw new Error('No data found', response);
            }

            return response.data.data.yamGnosis.offers;
        } catch (error) {
            console.error(error);
        }
    };
}

export default RealtController;