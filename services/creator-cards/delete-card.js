const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/models/creator-card');
const { CreatorCardMessages } = require('@app/messages');

const deleteCardSpec = `root {
  slug string<minLength:1>
  creator_reference string<length:20>
}`;

const parsedDeleteCardSpec = validator.parse(deleteCardSpec);

function formatResponse(cardData) {
  const data = { ...cardData };
  data.id = data._id;
  delete data._id;
  delete data.__v;
  if (!('access_code' in data) || data.access_code === undefined) {
    data.access_code = null;
  }
  return data;
}

async function deleteCreatorCardService(serviceData, options = {}) {
  let response;

  const data = validator.validate(serviceData, parsedDeleteCardSpec);

  try {
    const card = await CreatorCard.findOne({
      slug: data.slug,
      creator_reference: data.creator_reference,
    });

    if (!card || card.deleted !== null) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
    }

    card.deleted = Date.now();
    await card.save();

    response = formatResponse(card.toObject());
  } catch (error) {
    if (!error.code && !error.errorCode) {
      appLogger.errorX(error, 'delete-card-error');
    }
    throw error;
  }

  return response;
}

module.exports = deleteCreatorCardService;
