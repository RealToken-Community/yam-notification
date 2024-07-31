import {
    YAMcontract,
    formatPrice,
    formatAmount
} from '../controllers/_helpers.js';

class RealtController {
    static getOfferCount = async (request) => {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const offerCount = await YAMcontract.getOfferCount();
                const offer = parseInt(offerCount, 10) - 1;

                if (offer < 0) {
                    throw new Error('cannot get count offer');
                }

                return offer;
            } catch (error) {
                if (attempt === 3) {
                    throw error;
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
    };

    static showOffer = async (request) => {
        const offerId = request.offerId;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const value = await YAMcontract.showOffer(offerId);

                const formattedValue = {
                    offerToken: value[0].toLowerCase(),
                    buyerToken: value[1].toLowerCase(),
                    seller: value[2],
                    buyer: value[3] === '0x0000000000000000000000000000000000000000' ? null : value[3],
                    price: +formatPrice(value[4]),
                    availableAmount: +formatAmount(value[5]),
                };

                return formattedValue;

            } catch (error) {
                if (error.info?.error?.code === -32000) {
                    return null;
                }

                if (attempt === 3) {
                    throw error;
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
    };

};

export default RealtController;