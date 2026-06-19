const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/models/creator-card');
const { CreatorCardMessages } = require('@app/messages');

const getCardSpec = `root {
  slug string<minLength:1>
  access_code? string<length:6>
}`;

const parsedGetCardSpec = validator.parse(getCardSpec);

function formatResponse(cardData) {
  const data = { ...cardData };
  data.id = data._id;
  delete data._id;
  delete data.__v;
  delete data.access_code;
  return data;
}

async function getCreatorCardService(serviceData, options = {}) {
  let response;

  const data = validator.validate(serviceData, parsedGetCardSpec);

  try {
    const card = await CreatorCard.findOne({ slug: data.slug }).lean();

    if (!card || card.deleted !== null) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
    }

    if (card.status !== 'published') {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF02);
    }

    if (card.access_type === 'private') {
      if (!data.access_code) {
        throwAppError(CreatorCardMessages.CARD_PRIVATE, ERROR_CODE.AC03);
      }
      if (card.access_code !== data.access_code) {
        throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, ERROR_CODE.AC04);
      }
    }

    response = formatResponse(card);
  } catch (error) {
    if (!error.code && !error.errorCode) {
      appLogger.errorX(error, 'get-card-error');
    }
    throw error;
  }

  return response;
}

module.exports = getCreatorCardService;
