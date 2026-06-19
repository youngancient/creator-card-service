const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { ulid } = require('@app-core/randomness');
const CreatorCard = require('@app/models/creator-card');
const { CreatorCardMessages } = require('@app/messages');

const createCardSpec = `root {
  title string<minLength:3|maxLength:100>
  description? string<maxLength:500>
  slug? string<minLength:5|maxLength:50>
  creator_reference string<length:20>
  links[]? {
    title string<minLength:1|maxLength:100>
    url string<maxLength:200|startsWith:http>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] <minLength:1> {
      name string<minLength:3|maxLength:100>
      description? string<maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;

const parsedCreateCardSpec = validator.parse(createCardSpec);

function generateRandomSuffix() {
  return Math.random().toString(36).substring(2, 8).padEnd(6, '0');
}

async function generateUniqueSlug(title) {
  let baseSlug = title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');

  if (baseSlug.length < 5) {
    baseSlug = `${baseSlug}-${generateRandomSuffix()}`;
  }

  let isUnique = false;
  let finalSlug = baseSlug;

  while (!isUnique) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await CreatorCard.findOne({ slug: finalSlug, deleted: null }).lean();
    if (!existing) {
      isUnique = true;
    } else {
      finalSlug = `${baseSlug}-${generateRandomSuffix()}`;
    }
  }

  return finalSlug;
}

function formatResponse(cardData) {
  const { _id, __v, access_code: accessCode, ...rest } = cardData;
  const data = {
    id: _id,
    ...rest,
  };
  data.access_code = accessCode || null;
  return data;
}

async function createCreatorCardService(serviceData) {
  let response;

  const data = validator.validate(serviceData, parsedCreateCardSpec);

  try {
    const accessType = data.access_type || 'public';

    if (accessType === 'private' && !data.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, ERROR_CODE.AC01);
    }

    if (accessType === 'public' && data.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_NOT_ALLOWED, ERROR_CODE.AC05);
    }

    if (data.access_code && !/^[a-zA-Z0-9]{6}$/.test(data.access_code)) {
      throwAppError('access_code must be exactly 6 alphanumeric characters', ERROR_CODE.INVLDDATA);
    }

    let finalSlug = data.slug;

    if (finalSlug) {
      if (!/^[a-zA-Z0-9-_]+$/.test(finalSlug)) {
        throwAppError(
          'Slug can only contain letters, numbers, hyphens, and underscores',
          ERROR_CODE.INVLDDATA
        );
      }

      const existing = await CreatorCard.findOne({ slug: finalSlug, deleted: null }).lean();
      if (existing) {
        throwAppError(CreatorCardMessages.SLUG_TAKEN, ERROR_CODE.SL02);
      }
    } else {
      finalSlug = await generateUniqueSlug(data.title);
    }

    const now = Date.now();
    const newCardData = {
      _id: ulid(),
      title: data.title,
      description: data.description,
      slug: finalSlug,
      creator_reference: data.creator_reference,
      links: data.links || [],
      status: data.status,
      access_type: accessType,
      created: now,
      updated: now,
      deleted: null,
    };

    if (data.service_rates) {
      newCardData.service_rates = data.service_rates;
    }
    if (data.access_code) {
      newCardData.access_code = data.access_code;
    }

    const newCard = await CreatorCard.create(newCardData);
    response = formatResponse(newCard.toObject());
  } catch (error) {
    if (!error.code && !error.errorCode) {
      appLogger.errorX(error, 'create-card-error');
    }
    throw error;
  }

  return response;
}

module.exports = createCreatorCardService;
