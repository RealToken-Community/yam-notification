import axios from 'axios';
import { writeFileSync } from "fs";
import 'dotenv/config';

const {
    COMMUNITY_API_KEY
} = process.env;

class RealtController {
    static getTokens = async () => {
        try {
            const response = await axios.get('https://api.realt.community/v1/token', {
                headers: {
                    'X-AUTH-REALT-TOKEN': COMMUNITY_API_KEY
                }
            });

            const data = response?.data?.map((token) => ({
                uuid: token.uuid,
                tokenPrice: token.tokenPrice,
                imageLink: token.imageLink,
                propertyType: token.propertyType,
                annualPercentageYield: token.annualPercentageYield
            }));

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
                "query": `query getOffers {\n  yamGnosis {\n    offers(first: ${first}, orderBy: ${orderBy}, orderDirection: ${orderDirection}) {\n      id\n      seller {\n        id\n        address\n        __typename\n      }\n      offerToken {\n        address\n        name\n        decimals\n        symbol\n        tokenType\n        __typename\n      }\n      price {\n        price\n        amount\n        __typename\n      }\n      buyerToken {\n        name\n        symbol\n        address\n        decimals\n        tokenType\n        __typename\n      }\n      buyer {\n        address\n        __typename\n      }\n      removedAtBlock\n      availableAmount\n      createdAtTimestamp\n      __typename\n    }\n    __typename\n  }\n}`,
                "operationName": "getOffers"
            });

            if (!response?.data?.data?.yamGnosis?.offers) {
                throw new Error('No data found', response);
            }

            return response.data.data.yamGnosis.offers;
        } catch (error) {
            console.error(error);
        }
    };
}

export default RealtController;
